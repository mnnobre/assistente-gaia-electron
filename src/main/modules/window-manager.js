// /src/main/modules/window-manager.js

const { BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");

let mainWindow = null;
let scribeWindow = null;
let liveScribeWindow = null;
let currentScribeMeetingId = null;

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const winWidth = 320;
    const winHeight = 1200;
    const margin = 20;
    mainWindow = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        x: width - winWidth - margin,
        y: height - winHeight - margin,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, "..", "..", "preload", "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.loadFile(path.join(__dirname, "..", "..", "renderer", "index.html"));

    mainWindow.on("focus", () =>
        mainWindow.webContents.send("window-focus-changed", { hasFocus: true })
    );
    mainWindow.on("blur", () =>
        mainWindow.webContents.send("window-focus-changed", { hasFocus: false })
    );

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

    return mainWindow;
}

function createLiveScribeWindow() {
    if (liveScribeWindow && !liveScribeWindow.isDestroyed()) {
        liveScribeWindow.focus();
        return liveScribeWindow;
    }

    if (!mainWindow) {
        return null;
    }

    const mainBounds = mainWindow.getBounds();
    const winWidth = 350;
    const winHeight = 400;
    const margin = 10;

    const x = mainBounds.x - winWidth - margin;
    const y = mainBounds.y + mainBounds.height - winHeight;

    liveScribeWindow = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        x: x,
        y: y,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, "..", "..", "preload", "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    liveScribeWindow.loadFile(path.join(__dirname, "..", "..", "renderer", "scribe-live.html"));

    liveScribeWindow.on("closed", () => {
        liveScribeWindow = null;
    });

    return liveScribeWindow;
}

function createScribeWindow(meetingId) {
    if (scribeWindow && !scribeWindow.isDestroyed()) {
        scribeWindow.focus();
        if (currentScribeMeetingId !== meetingId) {
            currentScribeMeetingId = meetingId;
            // --- INÍCIO DA CORREÇÃO DE CAMINHO ---
            scribeWindow.loadFile(path.join(__dirname, "..", "..", "..", "scribe.html"), {
                query: { meetingId: meetingId }
            });
            // --- FIM DA CORREÇÃO DE CAMINHO ---
        }
        return;
    }

    currentScribeMeetingId = meetingId;
    scribeWindow = new BrowserWindow({
        width: 600,
        height: 800,
        title: "Transcrição da Reunião",
        webPreferences: {
            preload: path.join(__dirname, "..", "..", "preload", "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false
        },
    });

    // --- INÍCIO DA CORREÇÃO DE CAMINHO ---
    scribeWindow.loadFile(path.join(__dirname, "..", "..", "..", "scribe.html"), {
        query: { meetingId: meetingId }
    });
    // --- FIM DA CORREÇÃO DE CAMINHO ---

    scribeWindow.on("closed", () => {
        scribeWindow = null;
        currentScribeMeetingId = null;
    });
}

function getMainWindow() {
    return mainWindow;
}

function getLiveScribeWindow() {
    return liveScribeWindow;
}

module.exports = {
    createWindow,
    createScribeWindow,
    createLiveScribeWindow,
    getMainWindow,
    getLiveScribeWindow,
};