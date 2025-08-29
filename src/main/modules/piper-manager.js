// /src/main/modules/piper-manager.js (Estratégia Final: Geração Sob Demanda com Cabeçalho WAV)
const { app } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Cria um cabeçalho WAV de 44 bytes para dados de áudio PCM brutos.
 * @param {object} options As opções do áudio.
 * @param {number} options.numChannels Número de canais (1 para mono).
 * @param {number} options.sampleRate Taxa de amostragem (ex: 22050).
 * @param {number} options.bitsPerSample Profundidade de bits (ex: 16).
 * @param {number} dataLength O tamanho dos dados de áudio brutos em bytes.
 * @returns {Buffer} O cabeçalho WAV de 44 bytes.
 */
function createWavHeader({ numChannels, sampleRate, bitsPerSample }, dataLength) {
    const header = Buffer.alloc(44);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;

    // RIFF identifier
    header.write('RIFF', 0);
    // RIFF chunk size
    header.writeUInt32LE(36 + dataLength, 4);
    // RIFF type
    header.write('WAVE', 8);
    // format chunk identifier
    header.write('fmt ', 12);
    // format chunk length
    header.writeUInt32LE(16, 16);
    // sample format (raw)
    header.writeUInt16LE(1, 20);
    // channel count
    header.writeUInt16LE(numChannels, 22);
    // sample rate
    header.writeUInt32LE(sampleRate, 24);
    // byte rate (sample rate * block align)
    header.writeUInt32LE(byteRate, 28);
    // block align (channel count * bytes per sample)
    header.writeUInt16LE(blockAlign, 32);
    // bits per sample
    header.writeUInt16LE(bitsPerSample, 34);
    // data chunk identifier
    header.write('data', 36);
    // data chunk length
    header.writeUInt32LE(dataLength, 40);

    return header;
}


class PiperManager {
    constructor() {}

    start() {
        return Promise.resolve();
    }

    stop() {}

    generateAudio(text) {
        return new Promise((resolve, reject) => {
            const piperExePath = path.join(app.getAppPath(), 'vendor', 'piper', 'piper.exe');
            const modelRelativePath = path.join('models', 'pt_BR-faber-medium.onnx');
            const piperCwd = path.dirname(piperExePath);

            // --- INÍCIO DA ALTERAÇÃO ---
            const piperArgs = [
                '--model', modelRelativePath,
                '--output-raw',
                '--length-scale', '1.1' // <-- Aumenta a velocidade da fala em ~10%
            ];
            // --- FIM DA ALTERAÇÃO ---

            const piperProcess = spawn(piperExePath, piperArgs, { cwd: piperCwd });

            const audioChunks = [];
            
            piperProcess.stdout.on('data', (chunk) => {
                audioChunks.push(chunk);
            });
            
            piperProcess.stderr.on('data', (data) => {
                // console.error(`[Piper Process ERROR]: ${data.toString().trim()}`);
            });

            piperProcess.on('error', (err) => {
                console.error('[Piper Manager] Falha ao iniciar o processo do Piper:', err);
                reject(err);
            });

            piperProcess.on('close', (code) => {
                if (code === 0 && audioChunks.length > 0) {
                    const rawAudioData = Buffer.concat(audioChunks);

                    const audioOptions = {
                        numChannels: 1,
                        sampleRate: 22050,
                        bitsPerSample: 16,
                    };

                    const header = createWavHeader(audioOptions, rawAudioData.length);
                    
                    const finalWavBuffer = Buffer.concat([header, rawAudioData]);
                    
                    resolve(finalWavBuffer);

                } else {
                    console.error(`[Piper Manager] Processo finalizado com código de erro: ${code}`);
                    resolve(null); 
                }
            });

            piperProcess.stdin.write(text, 'utf-8');
            piperProcess.stdin.end();
        });
    }
}

module.exports = new PiperManager();