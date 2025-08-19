const { BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const transcriptionEngine = require('./transcription-engine');
const dbManager = require('./database-manager');
const windowManager = require('./window-manager');

class AudioManager {
    constructor() {
        this.workerWindow = null;
        this.isRecording = false;
        this.currentMeetingId = null;
        this.aiPostProcessor = null;
        this.useAIPostProcessing = false;
    }

    initialize(app) {
        // --- LOG DE DEBUG ADICIONADO AQUI ---
        // Este é o canal que a versão com MediaRecorder envia a cada 5 segundos
        ipcMain.handle('audio-data-float32', async (event, { speaker, buffer }) => {
            const meetingId = this.currentMeetingId;
            if (!meetingId) return false;

            // O 'buffer' aqui é o ArrayBuffer de um Float32Array. Precisamos reconstruí-lo.
            const audioData = new Float32Array(buffer);
            
            const rawText = await transcriptionEngine.transcribe(audioData);
        

            if (rawText && rawText.trim().length > 0) {
                let finalText = rawText;
                
                if (this.useAIPostProcessing && this.aiPostProcessor) {
                    finalText = await this.aiPostProcessor(rawText);
                }
                
                await dbManager.scribe.addTranscript(meetingId, speaker, finalText, null);

                const liveScribeWindow = windowManager.getLiveScribeWindow();
                if (liveScribeWindow && !liveScribeWindow.isDestroyed()) {
                    liveScribeWindow.webContents.send('scribe:live-update', { speaker, text: finalText });
                }
            } else {
            }
            return true;
        });

        ipcMain.handle('audio-track-final', async (event, { speaker, buffer }) => {
            const meetingId = this.currentMeetingId;
            if (!meetingId) return false;
            try {
                await dbManager.scribe.updateMeetingFullAudio(meetingId, speaker, buffer);
            } catch(e) {
                console.error(`Erro ao salvar a track de áudio completa para ${speaker}:`, e);
            }
            return true;
        });

        ipcMain.on('capture-finished', () => {
            if (this.workerWindow && !this.workerWindow.isDestroyed()) {
                this.workerWindow.destroy();
            }
            this.workerWindow = null;
            this.currentMeetingId = null;
            
            const liveScribeWindow = windowManager.getLiveScribeWindow();
            if (liveScribeWindow && !liveScribeWindow.isDestroyed()) {
                liveScribeWindow.close();
            }
        });
    }

    setAIPostProcessor(processorFunction) {
        this.aiPostProcessor = processorFunction;
    }

    toggleAIPostProcessing(isEnabled) {
        this.useAIPostProcessing = isEnabled;
    }

    async start() {
        if (this.isRecording) return;
        
        // A inicialização agora acontece no transcription-engine quando ele é 'requerido'
        // e verificamos o 'ready' status.
        await transcriptionEngine.initialize();
        
        if (!transcriptionEngine.ready) {
            console.error('[AudioManager] Não foi possível iniciar a gravação, motor de transcrição falhou.');
            return;
        }

        const meetingTitle = `Reunião - ${new Date().toLocaleString('pt-BR')}`;
        this.currentMeetingId = await dbManager.scribe.createMeeting(meetingTitle);
        this.isRecording = true;
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        const primarySource = sources.find(source => source.display_id);
        
        if (!primarySource) {
            console.error('[AudioManager] Nenhuma fonte de captura de tela encontrada.');
            this.isRecording = false;
            return;
        }
        
        this.workerWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                preload: path.join(__dirname, '..', '..', '..', 'background-preload.js')
            }
        });
        this.workerWindow.loadFile(path.join(__dirname, '..', '..', '..', 'background.html'));
        this.workerWindow.webContents.on('did-finish-load', () => {
            this.workerWindow.webContents.send('start-capture', primarySource.id);
        });
    }

    stop() {
        if (!this.isRecording) return;
        if (this.workerWindow && !this.workerWindow.isDestroyed()) {
            this.workerWindow.webContents.send('stop-capture');
        }
        this.isRecording = false;
    }
}

module.exports = new AudioManager();