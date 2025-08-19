const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { execFile } = require('child_process');
const { WaveFile } = require('wavefile');

// --- CONFIGURAÇÃO ---
const whisperCppDir = path.join('C:', 'Projetos', 'whisper.cpp'); 
const whisperExe = 'whisper-cli.exe';
const modelName = 'ggml-small.bin';

// --- INÍCIO DA CORREÇÃO ---
// O caminho do executável foi corrigido para remover a pasta 'Release',
// conforme descobrimos durante a compilação.
const whisperExecutablePath = path.join(whisperCppDir, 'build', 'bin', whisperExe);
// --- FIM DA CORREÇÃO ---
const modelPath = path.join(whisperCppDir, 'models', modelName);


class TranscriptionEngine {
    constructor() {
        this.ready = false;
        // A trava 'isBusy' foi removida para permitir o processamento paralelo dos dois canais de áudio.
    }

    async initialize() {
        try {
            await fs.access(whisperExecutablePath);
            await fs.access(modelPath);
            this.ready = true;
            console.log('[TranscriptionEngine] whisper.cpp pronto para uso.');
        } catch (error) {
            console.error('[TranscriptionEngine] ERRO: Não foi possível encontrar o executável do whisper.cpp ou o modelo.', {
                executable: whisperExecutablePath,
                model: modelPath,
            });
            this.ready = false;
        }
        // A função initialize não precisa mais ser assíncrona da mesma forma,
        // mas manteremos o Promise.resolve() para consistência caso seja necessário no futuro.
        return Promise.resolve();
    }

    async transcribe(audioFloat32Array) {
        // A verificação 'isBusy' foi removida.
        if (!this.ready) {
            return null;
        }
        // A linha 'this.isBusy = true;' foi removida.

        const tempDir = app.getPath('temp');
        const tempWavPath = path.join(tempDir, `scribe-input-${Date.now()}-${Math.random()}.wav`);

        try {
            const wav = new WaveFile();
            wav.fromScratch(1, 16000, '32f', audioFloat32Array);
            await fs.writeFile(tempWavPath, wav.toBuffer());

            const transcriberPromise = new Promise((resolve, reject) => {
                const args = [
                    '-m', modelPath,
                    '-f', tempWavPath,
                    '-nt',
                    '-l', 'pt'
                ];

                execFile(whisperExecutablePath, args, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`[whisper.cpp stderr] ${stderr}`);
                        return reject(new Error(`Erro ao executar whisper.cpp: ${error.message}`));
                    }
                    const cleanedOutput = stdout.split('\n').filter(line => line.trim().length > 0 && !line.startsWith('[')).join(' ').trim();
                    resolve(cleanedOutput);
                });
            });

            return await transcriberPromise;

        } catch (error) {
            console.error('[TranscriptionEngine] Erro durante a transcrição com whisper.cpp:', error);
            return null;
        } finally {
            try {
                await fs.unlink(tempWavPath);
            } catch (e) { /* Ignora erro */ }
            // A linha 'this.isBusy = false;' foi removida.
        }
    }
}

module.exports = new TranscriptionEngine();