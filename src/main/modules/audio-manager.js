// /src/main/modules/audio-manager.js (Refatorado para usar PiperManager)
const { BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const transcriptionEngine = require('./transcription-engine');
const dbManager = require('./database-manager');
const windowManager = require('./window-manager');
const piperManager = require(path.join(__dirname, 'piper-manager.js'));

class AudioManager {
    constructor() {
        // Propriedades de Transcrição
        this.workerWindow = null;
        this.isRecording = false;
        this.currentMeetingId = null;
        this.aiPostProcessor = null;
        this.useAIPostProcessing = false;

        // Propriedades de TTS
        this.isSpeaking = false;
        this.isTtsEnabled = false;
    }

    initialize(app) {
        // --- Handlers de Transcrição (sem alteração) ---
        ipcMain.handle('audio-data-float32', async (event, { speaker, buffer }) => {
            const meetingId = this.currentMeetingId;
            if (!meetingId) return false;

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

        // --- Handlers de TTS ---
        ipcMain.on('tts:set-enabled', (event, { isEnabled }) => {
            this.setTtsEnabled(isEnabled);
        });

        ipcMain.on('tts:playback-finished', () => {
            this.isSpeaking = false;
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('tts:speaking-state-changed', { isSpeaking: false });
            }
        });
    }

    // --- Métodos de Transcrição (sem alteração) ---
    setAIPostProcessor(processorFunction) { this.aiPostProcessor = processorFunction; }
    toggleAIPostProcessing(isEnabled) { this.useAIPostProcessing = isEnabled; }
    async start() {
        if (this.isRecording) return;
        
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

    // --- MÉTODOS DE TTS USANDO O PIPER MANAGER ---

    async speak(text) {
        if (!this.isTtsEnabled || !text) {
            return;
        }
        
        // Interrompe qualquer áudio anterior antes de gerar um novo.
        this.stopSpeaking();
        
        // Delega a geração do áudio para o PiperManager
        const audioBuffer = await piperManager.generateAudio(text);

        if (audioBuffer) {
            const mainWindow = windowManager.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                // Envia o buffer de áudio para a UI tocar
                mainWindow.webContents.send('tts:play-audio', audioBuffer);
                
                // Atualiza o estado e notifica a UI para a animação
                this.isSpeaking = true;
                mainWindow.webContents.send('tts:speaking-state-changed', { isSpeaking: true });
            }
        } else {
            console.error('[AudioManager] Não foi possível gerar o áudio via PiperManager.');
        }
    }

    stopSpeaking() {
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('tts:cancel');
        }
    }

    setTtsEnabled(isEnabled) {
        this.isTtsEnabled = isEnabled;
        if (!isEnabled) {
            this.stopSpeaking();
        }
    }
}

module.exports = new AudioManager();