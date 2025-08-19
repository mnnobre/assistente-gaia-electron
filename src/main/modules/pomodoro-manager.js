// /modules/pomodoro-manager.js

const { Notification } = require("electron");

class PomodoroManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.timerId = null;
        this.settings = { focus: 25 * 60, short_break: 5 * 60, long_break: 15 * 60 };
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
        this.mode = (this.mode === 'focus') ? 'short_break' : 'focus';
        this.totalTime = this.settings[this.mode];
        this.timeLeft = this.totalTime;
        
        new Notification({
            title: 'Pomodoro Finalizado!',
            body: `Sessão de ${previousMode === 'focus' ? 'Foco' : 'Descanso'} concluída. Iniciando ${this.mode === 'focus' ? 'Foco' : 'Descanso'}.`
        }).show();
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