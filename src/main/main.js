const { app, ipcMain, BrowserWindow } = require("electron");
const path = require("path");
require("dotenv").config();

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

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");

// --- VARIÁVEIS DE ESTADO ---
let pomodoroManager;
let modalWindow = null;

// --- INICIALIZAÇÃO ---
app.whenReady().then(async () => {
  try {
    await dbManager.initializeDatabase(app);
    await vectorDBManager.initialize();
    
    audioManager.initialize(app);
    
    await pluginManager.initializeAll(app, {});
    
    await aiManager.initializeAI(vectorDBManager);

    const mainWindow = windowManager.createWindow();
    pomodoroManager = new PomodoroManager(mainWindow);
    playerManager.setMainWindow(mainWindow);
    initializeReminders(mainWindow);
    
  } catch (error) {
    console.error("FALHA CRÍTICA AO INICIAR O APP:", error);
    app.quit();
  }
});

// --- LÓGICA DA JANELA MODAL ---
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

ipcMain.handle('log-debug', (event, message) => {
    // Log removido para produção
});


ipcMain.on('modal:open', (event, options) => {
    createModalWindow(options);
});
ipcMain.on('modal:close', () => {
    if (modalWindow) {
        modalWindow.close();
    }
});

ipcMain.on('scribe:resize', (event, { height }) => {
    const liveScribeWindow = windowManager.getLiveScribeWindow();
    if (liveScribeWindow && !liveScribeWindow.isDestroyed()) {
        const bounds = liveScribeWindow.getBounds();
        const newY = bounds.y + bounds.height - height;
        liveScribeWindow.setBounds({
            y: newY,
            height: height
        });
    }
});


// --- Handlers para o Contexto Visual ---
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
  const playerView = playerManager.getView();
  if (playerView?.webContents && !playerView.webContents.isDestroyed()) {
    playerView.webContents.executeJavaScript(
      `window.playerControls.${action}`
    );
  }
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
    const prompt = `
        Com base nos seguintes trechos de uma transcrição de reunião, responda à pergunta do usuário.
        Seja conciso e direto. Use markdown para formatar a resposta.

        **Contexto da Reunião:**
        ---
        ${context}
        ---

        **Pergunta do Usuário:**
        ${question}
    `;
    
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
  if (pomodoroManager && typeof pomodoroManager[action] === "function") {
    pomodoroManager[action]();
  }
});

// --- Handlers para o sistema de memória ---
ipcMain.handle('memory:get-sessions', async () => {
    return await dbManager.memory.getSessions();
});
ipcMain.handle('memory:get-turns', async (event, sessionId) => {
    return await dbManager.memory.getTurnsForSession(sessionId);
});
ipcMain.handle('memory:update-turn', async (event, { id, user_prompt, model_response }) => {
    return await dbManager.memory.updateTurnContent(id, user_prompt, model_response);
});
ipcMain.handle('memory:set-pinned', async (event, { id, is_pinned }) => {
    return await dbManager.memory.setTurnPinnedStatus(id, is_pinned);
});
ipcMain.handle('memory:search', async (event, query) => {
    if (!vectorDBManager) return [];
    return await vectorDBManager.searchRelevantMemories('main', query, 5);
});
ipcMain.handle('memory:get-pinned-turns', async () => {
    return await dbManager.memory.getPinnedTurns();
});
ipcMain.on('memory:selection-changed', (event, selectionData) => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('memory:update-in-main-window', selectionData);
    }
});


// --- Handlers para o Task Hub ---
ipcMain.handle('task:get-companies', async () => {
    return await dbManager.taskHub.companies.list();
});
ipcMain.handle('task:add-company', async (event, name) => {
    return await dbManager.taskHub.companies.add(name);
});
ipcMain.handle('task:get-projects', async (event, companyId) => {
    return await dbManager.taskHub.projects.listByCompany(companyId);
});
ipcMain.handle('task:add-project', async (event, projectData) => {
    return await dbManager.taskHub.projects.add(projectData.name, projectData.companyId);
});
ipcMain.handle('task:add-task', async (event, taskData) => {
    return await dbManager.taskHub.tasks.add(taskData.title, taskData.clickup_url, taskData.project_id);
});
ipcMain.handle('task:get-tasks', async () => {
    return await dbManager.taskHub.tasks.list();
});
ipcMain.handle('task:add-work-log', async (event, logData) => {
    const { taskId, documentation, hours, date } = logData;
    return await dbManager.taskHub.workLogs.add(taskId, documentation, hours, date);
});
ipcMain.handle('task:update-task', async (event, taskData) => {
    return await dbManager.taskHub.tasks.update(taskData);
});
ipcMain.handle('task:delete-task', async (event, taskId) => {
    return await dbManager.taskHub.tasks.delete(taskId);
});
ipcMain.handle('task:get-work-logs', async (event, taskId) => {
    return await dbManager.taskHub.workLogs.getForTask(taskId);
});

// --- Handlers para o AI MANAGER ---
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

// --- LÓGICA CENTRAL DE PROCESSAMENTO DE MENSAGENS (COM AS CORREÇÕES) ---
ipcMain.handle("call-ai", async (event, payload) => {
    try {
        let { userInput } = payload;
        const activeModel = aiManager.getActiveModel();

        if (activeModel && activeModel.key === 'gaia') {
            if (!userInput.trim().startsWith('/gaia')) {
                userInput = `/gaia ${userInput}`;
            }
        }

        if (userInput.trim().startsWith('/')) {
            const mainProcessContext = { 
                createScribeWindow: windowManager.createScribeWindow,
                createLiveScribeWindow: windowManager.createLiveScribeWindow 
            };
            const response = await pluginManager.handleCommand(userInput, app, mainProcessContext);
            return await processPluginResponse(response); // Mudança para a nova função
        } else {
            const mainWindow = windowManager.getMainWindow();
            aiManager.generateResponse(payload, mainWindow);
            return { action: "stream_started" };
        }
    } catch (error) {
        console.error("[Main Process] Erro no handler 'call-ai':", error);
        return { type: 'final_action', error: "Ocorreu um erro interno." };
    }
});

// --- NOVA FUNÇÃO DE PROCESSAMENTO, MAIS ROBUSTA E CLARA ---
async function processPluginResponse(response) {
    // Caso de NADA ser retornado
    if (!response) {
        return { type: 'final_action', html: "O comando não retornou uma resposta válida." };
    }

    // Caso de ações que não mostram nada no chat
    if (response.type === 'action') {
        if(response.action === 'suppress_chat_response') {
            return { type: 'final_action', action: 'suppress_chat_response' };
        }
        // Se for uma ação que TEM uma resposta, como /player show, etc.
        // A lógica original não lidava com isso bem, então criamos uma resposta padrão
        const actionText = response.payload ? `Ação '${response.action}' com '${response.payload}' executada.` : `Ação '${response.action}' executada.`;
        return { type: 'final_action', html: actionText };
    }

    // Caso de uma lista (ex: /reuniao listar)
    if (response.type === "list_response") {
        const mainWindow = windowManager.getMainWindow();
        mainWindow.webContents.send("list-response", response.content);
        return { type: 'final_action', action: 'suppress_chat_response' };
    }

    // O "catch-all" para a maioria dos plugins (gaia, hobbie, nota, etc.)
    // Eles retornam um objeto com `success` e `message`.
    const messageContent = response.message || response.content || "Ocorreu um erro no plugin.";

    if (response.success === false) {
        return { type: 'final_action', html: `<strong>Erro:</strong> ${messageContent}` };
    }

    // Se tudo deu certo, formatamos para HTML e enviamos.
    const finalHtml = await aiManager.formatToHtml(messageContent);
    return { type: 'final_action', html: finalHtml };
}

// --- EVENTOS DO CICLO DE VIDA ---
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createWindow();
    }
});