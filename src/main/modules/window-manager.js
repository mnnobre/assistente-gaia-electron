// /src/main/modules/window-manager.js (Atualizado)

const { BrowserWindow, screen, ipcMain } = require("electron");
const path = require("path");

let mainWindow = null;
let scribeWindow = null;
let liveScribeWindow = null;
let currentScribeMeetingId = null;

// --- INÍCIO DA ALTERAÇÃO ---
// Variável para manter a referência da nossa nova janela do widget
let todoWindow = null; 
// --- FIM DA ALTERAÇÃO ---


function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const winWidth = 500;
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


// --- INÍCIO DA ALTERAÇÃO ---
/**
 * Cria e gerencia a janela do widget de To-Do.
 * Se a janela já existir, ela é apenas focada.
 */
function createTodoWindow() {
    if (todoWindow && !todoWindow.isDestroyed()) {
        todoWindow.focus();
        return;
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const winWidth = 320;
    const winHeight = 450;

    todoWindow = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        x: width - winWidth - 20, // Posição inicial no canto superior direito
        y: 20,
        frame: false,          // Janela sem a barra de título padrão
        transparent: true,     // Fundo transparente para o efeito "glassmorphism"
        alwaysOnTop: true,     // Fica acima de outras janelas
        resizable: true,      // Permite redimensionar (opcional)
        movable: true,         // Permite mover
        webPreferences: {
            preload: path.join(__dirname, "..", "..", "preload", "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Futuramente, este será o caminho para nosso widget.
    // Por enquanto, podemos usar um placeholder ou criar o arquivo vazio.
    // O caminho sobe 3 níveis para chegar na raiz do projeto e depois desce.
    todoWindow.loadFile(path.join(__dirname, "..", "..", "..", "plugins", "todo", "todo.html"));

    todoWindow.on("closed", () => {
        todoWindow = null;
    });
}
// --- FIM DA ALTERAÇÃO ---


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
            scribeWindow.loadFile(path.join(__dirname, "..", "..", "..", "scribe.html"), {
                query: { meetingId: meetingId }
            });
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

    scribeWindow.loadFile(path.join(__dirname, "..", "..", "..", "scribe.html"), {
        query: { meetingId: meetingId }
    });

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
    // --- INÍCIO DA ALTERAÇÃO ---
    createTodoWindow, // Exportamos a nova função
    // --- FIM DA ALTERAÇÃO ---
    getMainWindow,
    getLiveScribeWindow,
};