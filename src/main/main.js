// /src/main/main.js (Refatorado para LanceDB)
const { app, ipcMain, BrowserWindow } = require("electron");
const path = require("path");
// REMOVIDO: const { spawn } = require("child_process");

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

try {
  require('electron-reloader')(module);
} catch (_) {}

// --- Módulos ---
const dbManager = require("./modules/database-manager.js");
const pluginManager = require("./modules/plugin-manager.js");
const aiManager = require("./modules/ai-manager.js");
const audioManager = require("./modules/audio-manager.js");
const PomodoroManager = require("./modules/pomodoro-manager.js");
const playerManager = require("./modules/player-manager.js");
const { initializeReminders } = require("./modules/reminder-manager.js");
const windowManager = require("./modules/window-manager.js");
const vectorDBManager = require("./modules/vector-db-manager.js");
const contextWatcher = require("./modules/context-watcher.js");
const todoManager = require("./modules/todo-manager.js");
const taskHubManager = require("./modules/task-hub-manager.js");
const memoryManager = require("./modules/memory-manager.js");
const piperManager = require("./modules/piper-manager.js");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");

// --- VARIÁVEIS DE ESTADO ---
let pomodoroManager;
let modalWindow = null;
let io;
// REMOVIDO: let chromaServerProcess = null;

// REMOVIDA: A função startChromaServer foi completamente removida.

const actionHandlers = {
    pomodoro_show: () => {
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('pomodoro-show-widget');
        }
        if (pomodoroManager) {
            pomodoroManager.start();
        }
    },
    pomodoro_control: (payload) => {
        if (pomodoroManager && typeof pomodoroManager[payload] === 'function') {
            pomodoroManager[payload]();
        }
    },
    pomodoro_leisure_start: (payload) => {
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('pomodoro-show-widget');
        }
        if (pomodoroManager) {
            pomodoroManager.startLeisure(payload);
        }
    },
    player_show: () => {
        playerManager.show();
    },
    player_control: (payload) => {
        const playerView = playerManager.getView();
        if (playerView?.webContents && !playerView.webContents.isDestroyed()) {
            playerView.webContents.send('execute-player-control', payload);
        }
    },
    player_search: (payload) => {
        const url = `https://music.youtube.com/search?q=${encodeURIComponent(payload)}`;
        playerManager.loadUrl(url);
    },
    todo_show_widget: () => {
        windowManager.createTodoWindow();
    },
};


// --- INICIALIZAÇÃO ---
app.whenReady().then(async () => {
  try {
    piperManager.start();

    // --- FLUXO DE INICIALIZAÇÃO SIMPLIFICADO ---
    await dbManager.initializeDatabase(app);

    const userDataPath = app.getPath("userData");
    // O VectorDBManager (LanceDB) agora só precisa do caminho para salvar seus arquivos.
    await vectorDBManager.initialize(userDataPath);
    // --- FIM DA ALTERAÇÃO ---
    
    audioManager.initialize(app, { piperManager });
    
    await pluginManager.initializeAll(app, {});
    
    await aiManager.initializeAI(vectorDBManager, { audioManager });
    
    taskHubManager.initialize();
    memoryManager.initialize();
    
    const geminiApiKey = await dbManager.settings.get('api_key_gemini');
    const openaiApiKey = await dbManager.settings.get('api_key_openai');
    await aiManager.initializeModels({ geminiApiKey, openaiApiKey });

    const mainWindow = windowManager.createWindow();
    pomodoroManager = new PomodoroManager(mainWindow);
    playerManager.setMainWindow(mainWindow);
    initializeReminders(mainWindow);

    startWebServer();
    
  } catch (error) {
    console.error("FALHA CRÍTICA AO INICIAR O APP:", error);
    app.quit();
  }
});

app.on('quit', () => {
  piperManager.stop();
  // REMOVIDO: O encerramento do processo do ChromaDB não é mais necessário.
});

async function handleCommandProcessing(payload, source = 'desktop') {
    try {
        let { userInput } = payload;
        const activeModel = aiManager.getActiveModel();

        if (source === 'desktop' && activeModel && activeModel.key === 'gaia' && !userInput.trim().startsWith('/')) {
            userInput = `/gaia ${userInput}`;
        }

        if (userInput.trim().startsWith('/')) {
            const dependencies = {
                createScribeWindow: windowManager.createScribeWindow,
                createLiveScribeWindow: windowManager.createLiveScribeWindow,
                audioManager: audioManager
            };
            const response = await pluginManager.handleCommand(userInput, app, dependencies);
            
            const finalResponse = await processPluginResponse(response);
            
            if (source === 'mobile' && io && finalResponse && finalResponse.html) {
                io.emit('assistant-response', finalResponse.html);
            }
            
            return finalResponse;

        } else {
            const mainWindow = windowManager.getMainWindow();
            if (source === 'desktop' && mainWindow) {
                aiManager.generateResponse(payload, mainWindow);
                return { action: "stream_started" };
            }
        }
    } catch (error) {
        console.error("[Main Process] Erro no handleCommandProcessing:", error);
        return { type: 'final_action', error: "Ocorreu um erro interno ao processar o comando." };
    }
}


function startWebServer() {
    const serverApp = express();
    const httpServer = http.createServer(serverApp);
    io = new Server(httpServer);
    const port = 3131;
    serverApp.use(express.json());
    serverApp.get('/mobile-client', (req, res) => {
        res.sendFile(path.join(__dirname, '..', '..', 'public', 'overlay', 'index.html'));
    });
    serverApp.use('/overlay', express.static(path.join(__dirname, '..', '..', 'public', 'overlay')));
    serverApp.post('/webhook', async (req, res) => {
        const apiKey = req.headers['x-api-key'];
        if (apiKey !== 'teste') { 
            return res.status(401).send('Acesso não autorizado.');
        }
        let userInput = req.body.command;
        if (!userInput) {
            return res.status(400).send('O corpo da requisição precisa conter a chave "command".');
        }
        const commandForGaia = userInput.trim().startsWith('/gaia') ? userInput : `/gaia ${userInput}`;
        handleCommandProcessing({ userInput: commandForGaia }, 'mobile');
        res.status(200).send({ message: "Comando recebido e sendo processado." });
    });
    io.on('connection', (socket) => {
        console.log('[Socket.io] Um cliente web se conectou!');
        socket.on('send-command', (userInput) => {
            const commandForGaia = userInput.trim().startsWith('/gaia') ? userInput : `/gaia ${userInput}`;
            handleCommandProcessing({ userInput: commandForGaia }, 'mobile');
        });
    });
    httpServer.listen(port, '0.0.0.0', () => {
        console.log(`[Servidor Web] Assistente ouvindo em http://localhost:${port}`);
    });
}

function createModalWindow(options) {
    if (modalWindow) {
        modalWindow.focus();
        return;
    }
    const mainWindow = windowManager.getMainWindow();
    modalWindow = new BrowserWindow({
        width: options.width || 600,
        height: options.height || 700,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        parent: mainWindow,
        modal: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false
        },
    });
    const modalPath = path.join(__dirname, '..', 'renderer', 'modal.html');
    const url = new URL(`file://${modalPath}`);
    url.searchParams.append('view', options.view);
    url.searchParams.append('root', path.join(__dirname, '..', 'renderer')); 
    if (options.data) {
        Object.entries(options.data).forEach(([key, value]) => {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            url.searchParams.append(key, stringValue);
        });
    }
    modalWindow.loadURL(url.href);
    modalWindow.once('ready-to-show', () => {
        modalWindow.show();
    });
    modalWindow.on('closed', () => {
        modalWindow = null;
    });
}


// --- LÓGICA DE COMUNICAÇÃO (IPC) ---
ipcMain.on('modal:open', (event, options) => {
    createModalWindow(options);
});
ipcMain.on('modal:close', () => {
    if (modalWindow) {
        modalWindow.close();
    }
});

ipcMain.handle('todo:getLists', async () => {
    return await todoManager.getLists(dbManager);
});

ipcMain.handle('todo:createList', async (event, name) => {
    return await todoManager.createList(dbManager, name);
});

ipcMain.handle('todo:removeList', async (event, listId) => {
    return await todoManager.removeList(dbManager, listId);
});

ipcMain.handle('todo:getTasksForList', async (event, listId) => {
    return await todoManager.getTasksForList(dbManager, listId);
});

ipcMain.handle('todo:addTask', async (event, { listId, task }) => {
    return await todoManager.addTask(dbManager, listId, task);
});

ipcMain.handle('todo:updateTaskStatus', async (event, { taskId, isDone }) => {
    return await todoManager.updateTaskStatus(dbManager, taskId, isDone);
});

ipcMain.handle('todo:removeTask', async (event, taskId) => {
    return await todoManager.removeTask(dbManager, taskId);
});

ipcMain.on('commands:settings-changed', () => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('commands:refresh-quick-actions');
    }
});

ipcMain.on('scribe:resize', (event, { height }) => {
    const liveScribeWindow = windowManager.getLiveScribeWindow();
    if (liveScribeWindow && !liveScribeWindow.isDestroyed()) {
        const bounds = liveScribeWindow.getBounds();
        const newY = bounds.y + bounds.height - height;
        liveScribeWindow.setBounds({ y: newY, height: height });
    }
});
ipcMain.handle('context:capture-screen', async () => {
    return await contextWatcher.captureScreen();
});
ipcMain.handle('context:capture-active-window', async () => {
    return await contextWatcher.captureActiveWindow();
});
ipcMain.handle('context:capture-selection', async () => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) mainWindow.hide();
    const result = await contextWatcher.captureSelection();
    if (mainWindow) mainWindow.show();
    return result;
});
ipcMain.on('context:delete-attachment', () => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('context:attachment-deleted');
    }
});
ipcMain.on('context:recapture', async (event, mode) => {
    const mainWindow = windowManager.getMainWindow();
    if (modalWindow && !modalWindow.isDestroyed()) {
        await new Promise(resolve => {
            modalWindow.once('closed', resolve);
            modalWindow.close();
        });
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('context:do-recapture', mode);
    }
});
ipcMain.handle('get-commands', async () => {
  return pluginManager.getCommandList();
});
ipcMain.on("player:minimize", () => playerManager.hide());
ipcMain.on("player:close", () => playerManager.destroy());
ipcMain.on("player:show", () => playerManager.show());
ipcMain.on("control-player-action", (event, action) => {
  actionHandlers.player_control(action);
});
ipcMain.on("playback-state-changed", (event, state) => {
  playerManager.getWindow()?.webContents.send("playback-state-updated", state);
  const mainWindow = windowManager.getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("playback-state-updated", state);
  }
});
ipcMain.handle("scribe:get-data", async (event, { meetingId }) => {
  if (!meetingId) return null;
  const meeting = await dbManager.scribe.getMeetingById(meetingId);
  const transcripts = await dbManager.scribe.getTranscriptsForMeeting(meetingId);
  return { meeting, transcripts };
});
ipcMain.handle('scribe:analyze-text', async (event, { context, question }) => {
    const prompt = `Contexto da Reunião:\n---\n${context}\n---\nPergunta: ${question}`;
    const answerText = await aiManager.getCompleteResponse(prompt);
    const answerHtml = await aiManager.formatToHtml(answerText);
    const liveScribeWindow = windowManager.getLiveScribeWindow();
    if (liveScribeWindow && !liveScribeWindow.isDestroyed()) {
        liveScribeWindow.webContents.send('scribe:analysis-result', {
            question: question,
            context: context,
            answer: answerHtml,
        });
    }
    return { success: true };
});
ipcMain.on("pomodoro-control", (event, action) => {
  actionHandlers.pomodoro_control(action);
});
ipcMain.handle('commands:get-settings-for-model', async (event, aiModelKey) => {
    const settingsMap = await dbManager.commands.getSettingsForModel(aiModelKey);
    return Object.fromEntries(settingsMap);
});
ipcMain.handle('commands:update-command-setting', async (event, { aiModelKey, commandString, settings }) => {
    return await dbManager.commands.updateCommandSetting(aiModelKey, commandString, settings);
});
ipcMain.handle('ai:get-models', () => {
    return aiManager.getAvailableModels();
});
ipcMain.handle('ai:get-active-model', () => {
    return aiManager.getActiveModel();
});
ipcMain.handle('ai:set-model', (event, modelKey) => {
    const success = aiManager.setActiveModel(modelKey);
    if (success) {
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai-model-changed', aiManager.getActiveModel());
        }
    }
    return success;
});
ipcMain.handle("call-ai", (event, payload) => {
    return handleCommandProcessing(payload, 'desktop');
});

ipcMain.handle('settings:get', async (event, key) => {
    return await dbManager.settings.get(key);
});

ipcMain.handle('settings:set', async (event, { key, value }) => {
    const result = await dbManager.settings.set(key, value);
    if (key.startsWith('api_key_')) {
        await aiManager.reinitializeModels();
        if (modalWindow && !modalWindow.isDestroyed()) {
            modalWindow.webContents.send('settings:models-reinitialized');
        }
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ai-model-changed', aiManager.getActiveModel());
        }
    }
    return result;
});

async function processPluginResponse(response) {
    if (!response) {
        return { type: 'final_action', html: "O comando não retornou uma resposta válida." };
    }
    if (response.type === 'action') {
        if (actionHandlers[response.action]) {
            actionHandlers[response.action](response.payload);
            return { type: 'final_action', action: 'suppress_chat_response' };
        }
        const actionText = response.payload ? `Ação '${response.action}' com '${response.payload}' executada.` : `Ação '${response.action}' executada.`;
        return { type: 'final_action', html: actionText };
    }
    if (response.type === "list_response") {
        const mainWindow = windowManager.getMainWindow();
        mainWindow.webContents.send("list-response", response.content);
        return { type: 'final_action', action: 'suppress_chat_response' };
    }
    const messageContent = response.message || response.content || "Ocorreu um erro no plugin.";
    if (response.success === false) {
        return { type: 'final_action', html: `<strong>Erro:</strong> ${messageContent}` };
    }
    const finalHtml = await aiManager.formatToHtml(messageContent);
    
    if (messageContent) {
        const textToSpeak = messageContent
            .replace(/(\*\*|__|### |## |# |\*|_)/g, '')
            .replace(/\n+/g, ' ');
        audioManager.speak(textToSpeak);
    }

    return { type: 'final_action', html: finalHtml };
}
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createWindow();
    }
});