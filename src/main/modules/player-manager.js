// /modules/player-manager.js (COMUNICAÇÃO CORRIGIDA)
const { BrowserWindow, BrowserView, session } = require('electron');
const path = require('path');

class PlayerManager {
    constructor() {
        this.window = null;
        this.view = null;
        this.mainWindow = null;
    }

    setMainWindow(win) {
        this.mainWindow = win;
    }
    
    loadUrl(url) {
        this.show();
        setTimeout(() => {
            if (this.view && this.view.webContents && !this.view.webContents.isDestroyed()) {
                console.log(`[PlayerManager] Carregando URL: ${url}`);
                this.view.webContents.loadURL(url);
            } else {
                console.error('[PlayerManager] Tentou carregar URL, mas a BrowserView não está disponível.');
            }
        }, 500);
    }

    getView() { return this.view; }
    getWindow() { return this.window; }

    hide() {
        if (this.window && !this.window.isDestroyed()) {
            this.window.hide();
            console.log('[PlayerManager] Janela do player escondida.');
        }
    }

    destroy() {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('playback-state-updated', { title: null, artist: null, isPlaying: false });
        }
        if (!this.window) {
            return;
        }
        this.window.removeAllListeners('closed');
        if (this.view && this.view.webContents && !this.view.webContents.isDestroyed()) {
            this.view.webContents.destroy();
        }
        if (!this.window.isDestroyed()) {
            this.window.destroy();
        }
        this.window = null;
        this.view = null;
    }

    show() {
        if (this.window && !this.window.isDestroyed()) {
            this.window.show();
            this.window.focus();
            return;
        }

        this.window = new BrowserWindow({
            width: 800,
            height: 600,
            title: "Player de Música",
            frame: false,
            webPreferences: {
                // O preload principal é necessário para a `window.api` funcionar no player.html
                preload: path.join(__dirname, '..', '..', 'preload', 'preload.js'),
            },
        });

        this.window.loadFile(path.join(__dirname, '..', '..', '..', 'player.html'));

        const youtubeSession = session.fromPartition("persist:youtube");
        this.view = new BrowserView({
            webPreferences: {
                session: youtubeSession,
                // O preload da view é para interagir com o site do YouTube
                preload: path.join(__dirname, '..', '..', 'preload', 'player-preload.js'),
            },
        });

        this.window.setBrowserView(this.view);

        this.view.webContents.on('did-finish-load', () => {
            if (this.window && !this.window.isDestroyed()) {
                const titleBarHeight = 30;
                const bounds = this.window.getBounds();
                this.view.setBounds({ x: 0, y: titleBarHeight, width: bounds.width, height: bounds.height - titleBarHeight });
            }
        });

        this.view.webContents.loadURL("https://music.youtube.com");

        this.window.on("resize", () => {
            if (this.view) {
                const titleBarHeight = 30;
                const newBounds = this.window.getBounds();
                this.view.setBounds({ x: 0, y: titleBarHeight, width: newBounds.width, height: newBounds.height - titleBarHeight });
            }
        });

        this.window.on("closed", () => {
            this.destroy();
        });
    }
}

module.exports = new PlayerManager();