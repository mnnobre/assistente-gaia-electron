const { ipcRenderer } = require('electron');

let micProcessor = null;
let desktopProcessor = null;
let micStream = null;
let desktopStream = null;

let micRecorder = null;
let desktopRecorder = null;
let micChunks = [];
let desktopChunks = [];

class AudioProcessor {
    constructor(stream, speaker) {
        this.stream = stream;
        this.speaker = speaker;
        this.audioContext = new AudioContext();
        
        this.inputSampleRate = this.audioContext.sampleRate;
        this.outputSampleRate = 16000;

        this.bufferSize = 4096;
        this.accumulationThreshold = this.outputSampleRate * 5; 
        this.accumulatedData = [];
        this.accumulatedLength = 0;

        // --- INÍCIO DA LÓGICA DO PORTÃO DE RUÍDO ---
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.volumeData = new Uint8Array(this.analyser.frequencyBinCount);
        // O limiar de volume. Valores abaixo disso são considerados silêncio.
        // 1.5 é um bom ponto de partida. Aumente se ainda pegar ruído, diminua se cortar o início da fala.
        this.volumeThreshold = 1.5; 
        // --- FIM DA LÓGICA DO PORTÃO DE RUÍDO ---
        
        this.source = this.audioContext.createMediaStreamSource(this.stream);
        this.processor = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);

        this.processor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            
            // --- VERIFICAÇÃO DE VOLUME ---
            // Mede o volume ANTES de fazer o processamento pesado de downsampling.
            this.analyser.getByteFrequencyData(this.volumeData);
            let sum = 0;
            for(const amplitude of this.volumeData) {
                sum += amplitude * amplitude;
            }
            const volume = Math.sqrt(sum / this.volumeData.length);

            // Se o volume for menor que o limiar, simplesmente ignora este chunk de áudio.
            if (volume < this.volumeThreshold) {
                return;
            }
            // --- FIM DA VERIFICAÇÃO DE VOLUME ---

            const outputData = this.downsampleBuffer(inputData);

            this.accumulatedData.push(outputData);
            this.accumulatedLength += outputData.length;

            if (this.accumulatedLength >= this.accumulationThreshold) {
                const finalBuffer = new Float32Array(this.accumulatedLength);
                let offset = 0;
                for (const buffer of this.accumulatedData) {
                    finalBuffer.set(buffer, offset);
                    offset += buffer.length;
                }
                
                // --- CÓDIGO RESTAURADO ---
                // Enviando o ArrayBuffer como um "transferable object"
                ipcRenderer.invoke('audio-data-float32', { speaker: this.speaker, buffer: finalBuffer.buffer }, [finalBuffer.buffer]);
                // --- FIM DA RESTAURAÇÃO ---

                this.accumulatedData = [];
                this.accumulatedLength = 0;
            }
        };

        this.source.connect(this.analyser); // Conecta a fonte ao analisador
        this.analyser.connect(this.processor); // Conecta o analisador ao processador
        this.processor.connect(this.audioContext.destination); // Conecta o processador ao destino (necessário para o processamento ocorrer)
    }
    
    downsampleBuffer(buffer) {
        if (this.inputSampleRate === this.outputSampleRate) return buffer;
        const sampleRateRatio = this.inputSampleRate / this.outputSampleRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);
        let offsetResult = 0, offsetBuffer = 0;
        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
            let accum = 0, count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }
            result[offsetResult] = accum / count;
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }
        return result;
    }

    stop() {
        this.source.disconnect();
        this.processor.disconnect();
        this.analyser.disconnect();
        this.audioContext.close();
    }
}

function startFullRecording(stream, chunksArray) {
    if (!stream) return null;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return null;

    const recorder = new MediaRecorder(new MediaStream(audioTracks), { mimeType: 'audio/webm' });
    
    recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            chunksArray.push(event.data);
        }
    };
    
    recorder.start(1000);
    return recorder;
}

async function processAndSendFullTrack(chunksArray, speaker) {
    if (chunksArray.length === 0) return;
    try {
        const audioBlob = new Blob(chunksArray, { type: 'audio/webm' });
        const buffer = Buffer.from(await audioBlob.arrayBuffer());
        await ipcRenderer.invoke('audio-track-final', { speaker, buffer });
        chunksArray.length = 0;
    } catch (error) {
        console.error(`[Background] Erro ao processar a track completa para '${speaker}':`, error);
    }
}

async function getMicrophoneStream() {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const fifineMic = audioInputs.find(device => 
            device.label && device.label.toLowerCase().includes('fifine') && device.deviceId !== 'default'
        );
        let constraints = fifineMic ? { audio: { deviceId: { exact: fifineMic.deviceId } } } : { audio: true };
        return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
        console.error('[Background] FALHA ao obter stream de áudio do microfone:', e.name, e.message);
        return null;
    }
}

ipcRenderer.on('start-capture', async (event, desktopSourceId) => {
    micStream = await getMicrophoneStream();
    if (micStream) {
        micProcessor = new AudioProcessor(micStream, 'me');
        micRecorder = startFullRecording(micStream, micChunks);
    }

    try {
        const desktopConstraints = {
            audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: desktopSourceId } },
            video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: desktopSourceId } }
        };
        desktopStream = await navigator.mediaDevices.getUserMedia(desktopConstraints);
        if (desktopStream) {
            desktopProcessor = new AudioProcessor(desktopStream, 'other');
            desktopRecorder = startFullRecording(desktopStream, desktopChunks);
        }
    } catch (e) {
        console.error('[Background] FALHA ao capturar áudio do sistema:', e.name, e.message);
    }
});

ipcRenderer.on('stop-capture', () => {
    if (micProcessor) micProcessor.stop();
    if (desktopProcessor) desktopProcessor.stop();

    const stopRecorders = [];
    if (micRecorder) stopRecorders.push(new Promise(resolve => { micRecorder.onstop = resolve; micRecorder.stop(); }));
    if (desktopRecorder) stopRecorders.push(new Promise(resolve => { desktopRecorder.onstop = resolve; desktopRecorder.stop(); }));

    Promise.all(stopRecorders).then(async () => {
        await processAndSendFullTrack(micChunks, 'me');
        await processAndSendFullTrack(desktopChunks, 'other');

        micStream?.getTracks().forEach(track => track.stop());
        desktopStream?.getTracks().forEach(track => track.stop());
        ipcRenderer.send('capture-finished');
    });
});