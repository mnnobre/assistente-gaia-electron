// /src/main/main.js (VERSÃO FINAL COM GERENCIAMENTO DE EMPRESAS)
const { app, ipcMain, BrowserWindow } = require("electron");
const path = require("path");

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
const integrationManager = require("./modules/integration-manager.js");


app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");

// --- VARIÁVEIS DE ESTADO ---
let pomodoroManager;
let modalWindow = null;
let io; 

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
    }
};


// --- INICIALIZAÇÃO ---
app.whenReady().then(async () => {
  try {
    await dbManager.initializeDatabase(app);
    await vectorDBManager.initialize();
    
    audioManager.initialize(app);
    
    await pluginManager.initializeAll(app, {});
    
    await aiManager.initializeAI(vectorDBManager);
    
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

async function handleCommandProcessing(payload, source = 'desktop') {
    try {
        let { userInput } = payload;
        const activeModel = aiManager.getActiveModel();

        if (source === 'desktop' && activeModel && activeModel.key === 'gaia' && !userInput.trim().startsWith('/')) {
            userInput = `/gaia ${userInput}`;
        }

        if (userInput.trim().startsWith('/')) {
            const mainProcessContext = {
                createScribeWindow: windowManager.createScribeWindow,
                createLiveScribeWindow: windowManager.createLiveScribeWindow
            };
            const response = await pluginManager.handleCommand(userInput, app, mainProcessContext);
            
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
ipcMain.handle('task:get-companies', async () => {
    return await dbManager.taskHub.companies.list();
});
ipcMain.handle('task:add-company', async (event, companyData) => {
    return await dbManager.taskHub.companies.add(companyData);
});
ipcMain.handle('task:get-projects', async (event, companyId) => {
    return await dbManager.taskHub.projects.listByCompany(companyId);
});
ipcMain.handle('task:add-project', async (event, projectData) => {
    return await dbManager.taskHub.projects.add(projectData.name, projectData.companyId);
});
ipcMain.handle('task:add-task', async (event, taskData) => {
    return await dbManager.taskHub.tasks.add(taskData);
});
ipcMain.handle('task:get-tasks', async () => {
    return await dbManager.taskHub.tasks.list();
});
ipcMain.handle('task:getTaskById', async (event, taskId) => {
    return await dbManager.taskHub.tasks.getById(taskId);
});
ipcMain.handle('task:add-work-logs', async (event, { taskId, entries, documentation, flags }) => {
    for (const entry of entries) {
        await dbManager.taskHub.workLogs.add(taskId, documentation, entry.hours, entry.date, flags);
    }
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
ipcMain.handle('gaia:get-games', async () => {
    return await dbManager.hobbie.listGames();
});
ipcMain.handle('gaia:get-game-logs', async () => {
    return await dbManager.hobbie.getGameLogs();
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

// --- Handlers para Integrações ---
ipcMain.handle('task:getClickUpTask', async (event, taskId) => {
    const apiKey = await dbManager.settings.get('api_key_clickup');
    if (!apiKey) throw new Error("Chave de API do ClickUp não configurada.");
    return await integrationManager.clickup.getTask(taskId, apiKey);
});

ipcMain.handle('task:findOrCreateTaskFromClickUp', async (event, clickUpTaskId) => {
    const apiKey = await dbManager.settings.get('api_key_clickup');
    if (!apiKey) throw new Error("Chave de API do ClickUp não configurada.");
    
    const clickUpTaskData = await integrationManager.clickup.getTask(clickUpTaskId, apiKey);
    if (!clickUpTaskData) throw new Error(`Tarefa com ID "${clickUpTaskId}" não encontrada no ClickUp.`);

    let localTask = await dbManager.taskHub.tasks.findByClickUpUrl(clickUpTaskData.url);
    if (localTask) {
        return localTask;
    }

    let companyId = null;
    let projectId = null;

    if (clickUpTaskData.space?.name) {
        const company = await dbManager.taskHub.companies.findByName(clickUpTaskData.space.name);
        if (company) {
            companyId = company.id;
            if (clickUpTaskData.list?.name) {
                const project = await dbManager.taskHub.projects.findByName(clickUpTaskData.list.name, companyId);
                if (project) {
                    projectId = project.id;
                }
            }
        }
    }
    
    const newTaskData = {
        title: clickUpTaskData.name,
        description: clickUpTaskData.description,
        clickup_url: clickUpTaskData.url,
        clickup_task_id: clickUpTaskData.id,
        project_id: projectId
    };

    const newTaskId = await dbManager.taskHub.tasks.add(newTaskData);
    return await dbManager.taskHub.tasks.getById(newTaskId);
});

ipcMain.handle('task:syncCommentToClickUp', async (event, { clickupTaskId, localTaskId, documentation }) => {
    const apiKey = await dbManager.settings.get('api_key_clickup');
    if (!apiKey) throw new Error("Chave de API do ClickUp não configurada.");

    try {
        const clickupResponse = await integrationManager.clickup.addComment(clickupTaskId, documentation, apiKey);
        await dbManager.taskHub.workLogs.add(
            localTaskId,
            documentation,
            0,
            new Date().toISOString(),
            { is_clickup_synced: 1 }
        );
        return clickupResponse;
    } catch (error) {
        console.error("[Main Process] Erro ao sincronizar e salvar comentário:", error);
        throw error;
    }
});

ipcMain.handle('task:syncTimeToClickUp', async (event, { clickupTaskId, localTaskId, date, startTime, endTime }) => {
    const apiKey = await dbManager.settings.get('api_key_clickup');
    // Busca o teamId da empresa associada à tarefa local
    const localTask = await dbManager.taskHub.tasks.getById(localTaskId);
    if (!localTask || !localTask.company_id) throw new Error("A tarefa não está associada a uma empresa.");
    const company = await dbManager.taskHub.companies.getById(localTask.company_id);
    if (!company || !company.clickup_team_id) throw new Error("A empresa associada não tem um Team ID do ClickUp configurado.");
    
    const teamId = company.clickup_team_id;
    
    try {
        const timeEntry = { date, startTime, endTime };
        const clickupResponse = await integrationManager.clickup.addTimeEntry(clickupTaskId, timeEntry, apiKey, teamId);

        const start = new Date(`${date}T${startTime}:00`);
        const end = new Date(`${date}T${endTime}:00`);
        const durationMs = end - start;
        const durationHours = (durationMs / (1000 * 60 * 60));

        await dbManager.taskHub.workLogs.add(
            localTaskId,
            `[ClickUp] Entrada de tempo de ${durationHours.toFixed(2)}h.`,
            durationHours,
            new Date(date).toISOString(),
            { is_clickup_synced: 1 }
        );

        return clickupResponse;
    } catch (error) {
        console.error("[Main Process] Erro ao sincronizar e salvar tempo:", error);
        throw error;
    }
});


ipcMain.handle('task:syncClockifyProjects', async () => {
    const apiKey = await dbManager.settings.get('api_key_clockify');
    const companies = await dbManager.taskHub.companies.list();
    if (!apiKey || companies.length === 0) {
        throw new Error("API Key do Clockify ou nenhuma empresa configurada.");
    }

    console.log(`[Clockify Sync] Iniciando sincronização para ${companies.length} empresa(s)...`);
    let totalUpdatedCount = 0;

    for (const company of companies) {
        if (!company.clockify_workspace_id) {
            console.warn(`[Clockify Sync] Pulando empresa "${company.name}" por não ter Workspace ID.`);
            continue;
        }

        const clockifyProjects = await integrationManager.clockify.getProjects(company.clockify_workspace_id, apiKey);
        
        for (const clockifyProject of clockifyProjects) {
            let localProject = await dbManager.taskHub.projects.findByName(clockifyProject.name, company.id);

            if (!localProject) {
                const newProjectId = await dbManager.taskHub.projects.add(clockifyProject.name, company.id);
                localProject = { id: newProjectId };
                console.log(`[Clockify Sync] Projeto local "${clockifyProject.name}" criado.`);
            }

            const customFields = await integrationManager.clockify.getCustomFieldsForProject(company.clockify_workspace_id, clockifyProject.id, apiKey);
            const clickUpField = customFields.find(cf => cf.name === "ClickUp Task (Link)");
            
            if (clickUpField) {
                await dbManager.taskHub.projects.updateClockifyIds(localProject.id, clockifyProject.id, clickUpField.id);
                totalUpdatedCount++;
                console.log(`[Clockify Sync] Projeto "${clockifyProject.name}" atualizado com IDs.`);
            } else {
                console.warn(`[Clockify Sync] Projeto "${clockifyProject.name}" encontrado, mas o Custom Field "ClickUp Task (Link)" não foi localizado.`);
            }
        }
    }
    
    console.log(`[Clockify Sync] Sincronização concluída. ${totalUpdatedCount} projetos foram atualizados/criados.`);
    return { updatedCount: totalUpdatedCount };
});

ipcMain.handle('task:getClockifyTasksForProject', async (event, localProjectId) => {
    const apiKey = await dbManager.settings.get('api_key_clockify');
    if (!apiKey) throw new Error("API Key do Clockify não configurada.");

    const localProject = await dbManager.taskHub.projects.getById(localProjectId);
    if (!localProject || !localProject.company_id || !localProject.clockify_project_id) {
        return [];
    }
    
    const company = await dbManager.taskHub.companies.getById(localProject.company_id);
    if (!company || !company.clockify_workspace_id) {
        return [];
    }
    
    return await integrationManager.clockify.getTasksForProject(company.clockify_workspace_id, localProject.clockify_project_id, apiKey);
});

ipcMain.handle('task:syncToClockify', async (event, logData) => {
    const apiKey = await dbManager.settings.get('api_key_clockify');
    if (!apiKey) throw new Error("API Key do Clockify não configurada.");

    const { localTaskId, date, startTime, endTime, description, clockifyTaskId, clickupTaskUrl } = logData;

    const localTask = await dbManager.taskHub.tasks.getById(localTaskId);
    if (!localTask || !localTask.project_id) throw new Error("Tarefa ou projeto local não encontrado.");
    
    const localProject = await dbManager.taskHub.projects.getById(localTask.project_id);
    if (!localProject || !localProject.company_id || !localProject.clockify_project_id || !localProject.clockify_custom_field_id) {
        throw new Error("Este projeto não está sincronizado com o Clockify. Sincronize primeiro.");
    }
    
    const company = await dbManager.taskHub.companies.getById(localProject.company_id);
    if (!company || !company.clockify_workspace_id) {
        throw new Error("A empresa deste projeto não tem um Workspace ID do Clockify configurado.");
    }
    
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    const durationHours = (end - start) / (1000 * 60 * 60);

    const entryData = {
        start: start.getTime(),
        end: end.getTime(),
        description: description || localTask.title,
        projectId: localProject.clockify_project_id,
        taskId: clockifyTaskId,
        customFieldId: localProject.clockify_custom_field_id,
        clickupTaskUrl: clickupTaskUrl,
    };

    const clockifyResponse = await integrationManager.clockify.addTimeEntry(company.clockify_workspace_id, entryData, apiKey);

    await dbManager.taskHub.workLogs.add(
        localTaskId,
        `[Clockify] ${description || 'Registro de tempo'}.`,
        durationHours,
        start.toISOString(),
        { is_clockify_synced: 1 }
    );

    return clockifyResponse;
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