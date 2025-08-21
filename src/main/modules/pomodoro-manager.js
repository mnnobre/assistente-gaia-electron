// /modules/pomodoro-manager.js

const { Notification } = require("electron");

class PomodoroManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.timerId = null;
        // --- INÍCIO DA ALTERAÇÃO (FASE 9) ---
        // Adicionamos a configuração para o modo de lazer
        this.settings = { 
            focus: 25 * 60, 
            short_break: 5 * 60, 
            long_break: 15 * 60,
            leisure: 30 * 60 // 30 minutos de lazer
        };
        // --- FIM DA ALTERAÇÃO ---
        this.totalTime = this.settings.focus;
        this.timeLeft = this.settings.focus;
        this.state = 'stopped';
        this.mode = 'focus';
    }

    start() {
        if (this.state === 'running') return;
        this.state = 'running';
        this.timerId = setInterval(() => this.tick(), 1000);
        this.broadcastState();
    }
    
    // --- INÍCIO DA ALTERAÇÃO (FASE 9) ---
    /**
     * Inicia um novo modo de timer de Lazer.
     * @param {number} [durationInMinutes=30] - A duração do timer em minutos.
     */
    startLeisure(durationInMinutes) {
        // Se a duração não for fornecida ou for inválida, usa o padrão.
        const durationSeconds = durationInMinutes && durationInMinutes > 0 
            ? durationInMinutes * 60 
            : this.settings.leisure;

        this.state = 'running';
        this.mode = 'leisure'; // Novo modo
        this.totalTime = durationSeconds;
        this.timeLeft = this.totalTime;
        
        // Limpa qualquer timer antigo antes de iniciar um novo
        if (this.timerId) clearInterval(this.timerId);

        this.timerId = setInterval(() => this.tick(), 1000);
        this.broadcastState(); // Notifica a UI sobre o novo estado
    }
    // --- FIM DA ALTERAÇÃO ---

    pause() {
        if (this.state !== 'running') return;
        this.state = 'paused';
        clearInterval(this.timerId);
        this.broadcastState();
    }
    
    reset() {
        this.state = 'stopped';
        clearInterval(this.timerId);
        this.mode = 'focus';
        this.totalTime = this.settings.focus;
        this.timeLeft = this.totalTime;
        this.broadcastState();
    }
    
    tick() {
        this.timeLeft--;
        if (this.timeLeft < 0) {
            this.handleCompletion();
        }
        this.broadcastTick();
    }
    
    handleCompletion() {
        this.pause();
        const previousMode = this.mode;
        
        // --- INÍCIO DA ALTERAÇÃO (FASE 9) ---
        // Ajusta a notificação e o comportamento para o novo modo
        let notificationTitle = 'Pomodoro Finalizado!';
        let notificationBody = '';

        if (previousMode === 'leisure') {
            notificationTitle = 'Sessão de Lazer Concluída!';
            notificationBody = 'Ótimo descanso! Agora você pode voltar às suas tarefas com a mente renovada.';
            this.reset(); // Reseta para o modo de foco padrão após o lazer
        } else {
            // Lógica original do pomodoro de produtividade
            this.mode = (this.mode === 'focus') ? 'short_break' : 'focus';
            this.totalTime = this.settings[this.mode];
            this.timeLeft = this.totalTime;
            notificationBody = `Sessão de ${previousMode === 'focus' ? 'Foco' : 'Descanso'} concluída. Iniciando ${this.mode === 'focus' ? 'Foco' : 'Descanso'}.`;
        }
        
        new Notification({
            title: notificationTitle,
            body: notificationBody
        }).show();
        // --- FIM DA ALTERAÇÃO ---

        this.broadcastState();
    }

    getState() {
        return { timeLeft: this.timeLeft, totalTime: this.totalTime, state: this.state, mode: this.mode };
    }

    broadcastState() {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('pomodoro-state-changed', this.getState());
        }
    }

    broadcastTick() {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('pomodoro-tick', this.getState());
        }
    }
}

module.exports = PomodoroManager;