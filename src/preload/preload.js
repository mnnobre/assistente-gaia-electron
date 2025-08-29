// /src/preload/preload.js (Com canais TTS adicionados)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // --- Funções de comunicação Two-Way (Invocam e esperam uma resposta) ---
    
    sendMessageToAI: (data) => ipcRenderer.invoke('call-ai', data),
    getScribeData: (data) => ipcRenderer.invoke('scribe:get-data', data),
    analyzeScribeText: (data) => ipcRenderer.invoke('scribe:analyze-text', data),
    getCommands: () => ipcRenderer.invoke('get-commands'),

    // --- Módulo de IA ---
    ai: {
        getModels: () => ipcRenderer.invoke('ai:get-models'),
        getActiveModel: () => ipcRenderer.invoke('ai:get-active-model'),
        setModel: (modelKey) => ipcRenderer.invoke('ai:set-model', modelKey),
    },

    // --- Módulo de Contexto ---
    context: {
        captureScreen: () => ipcRenderer.invoke('context:capture-screen'),
        captureActiveWindow: () => ipcRenderer.invoke('context:capture-active-window'),
        captureSelection: () => ipcRenderer.invoke('context:capture-selection'),
    },

    // --- Módulo de memória ---
    memory: {
        getSessions: () => ipcRenderer.invoke('memory:get-sessions'),
        getTurns: (sessionId) => ipcRenderer.invoke('memory:get-turns', sessionId),
        updateTurn: (turnData) => ipcRenderer.invoke('memory:update-turn', turnData),
        setPinned: (pinData) => ipcRenderer.invoke('memory:set-pinned', pinData),
        search: (query) => ipcRenderer.invoke('memory:search', query),
        getPinnedTurns: () => ipcRenderer.invoke('memory:get-pinned-turns'),
    },

    // --- Módulo Task Hub ---
    taskHub: {
        getCompanies: () => ipcRenderer.invoke('task:get-companies'),
        addCompany: (name) => ipcRenderer.invoke('task:add-company', name),
        getProjects: (companyId) => ipcRenderer.invoke('task:get-projects', companyId),
        addProject: (projectData) => ipcRenderer.invoke('task:add-project', projectData),
        addTask: (taskData) => ipcRenderer.invoke('task:add-task', taskData),
        getTasks: () => ipcRenderer.invoke('task:get-tasks'),
        getTaskById: (taskId) => ipcRenderer.invoke('task:getTaskById', taskId),
        updateTask: (taskData) => ipcRenderer.invoke('task:update-task', taskData),
        deleteTask: (taskId) => ipcRenderer.invoke('task:delete-task', taskId),
        getWorkLogs: (taskId) => ipcRenderer.invoke('task:get-work-logs', taskId),
        addWorkLogs: (data) => ipcRenderer.invoke('task:add-work-logs', data),
        getClickUpTask: (taskId) => ipcRenderer.invoke('task:getClickUpTask', taskId),
        findOrCreateTaskFromClickUp: (clickUpTaskId) => ipcRenderer.invoke('task:findOrCreateTaskFromClickUp', clickUpTaskId),
        syncCommentToClickUp: (data) => ipcRenderer.invoke('task:syncCommentToClickUp', data),
        syncTimeToClickUp: (data) => ipcRenderer.invoke('task:syncTimeToClickUp', data),
        syncClockifyProjects: () => ipcRenderer.invoke('task:syncClockifyProjects'),
        getClockifyTasksForProject: (projectId) => ipcRenderer.invoke('task:getClockifyTasksForProject', projectId),
        syncToClockify: (logData) => ipcRenderer.invoke('task:syncToClockify', logData)
    },

    // --- Módulo To-Do ---
    todo: {
        getLists: () => ipcRenderer.invoke('todo:getLists'),
        createList: (name) => ipcRenderer.invoke('todo:createList', name),
        removeList: (listId) => ipcRenderer.invoke('todo:removeList', listId),
        getTasksForList: (listId) => ipcRenderer.invoke('todo:getTasksForList', listId),
        addTask: (listId, task) => ipcRenderer.invoke('todo:addTask', { listId, task }),
        updateTaskStatus: (taskId, isDone) => ipcRenderer.invoke('todo:updateTaskStatus', { taskId, isDone }),
        removeTask: (taskId) => ipcRenderer.invoke('todo:removeTask', taskId),
    },

    // --- Módulo G.A.I.A. ---
    gaia: {
        getGames: () => ipcRenderer.invoke('gaia:get-games'),
        getGameLogs: () => ipcRenderer.invoke('gaia:get-game-logs'),
    },

    // --- Módulo de Comandos ---
    commands: {
        getSettingsForModel: (aiModelKey) => ipcRenderer.invoke('commands:get-settings-for-model', aiModelKey),
        updateCommandSetting: (aiModelKey, commandString, settings) => ipcRenderer.invoke('commands:update-command-setting', { aiModelKey, commandString, settings }),
    },
    
    // --- Módulo de Configurações ---
    settings: {
        get: (key) => ipcRenderer.invoke('settings:get', key),
        set: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
    },
    
    // --- Função genérica para ENVIAR mensagens One-Way ---
    send: (channel, data) => {
        // ADICIONADOS os canais de TTS
        const validChannels = [
            'pomodoro-control', 'control-player-action', 'player:minimize',
            'player:close', 'player:show', 'modal:open', 'modal:close',
            'memory:selection-changed', 'context:delete-attachment',
            'context:recapture', 'scribe:resize', 'commands:settings-changed',
            'tts:set-enabled', 'tts:playback-finished' // <-- Canais de envio de TTS
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },

    // --- Função genérica para OUVIR canais ---
    on: (channel, callback) => {
        // ADICIONADOS os canais de TTS
        const validChannels = [
            'playback-state-updated', 'meal-reminder', 'window-focus-changed', 
            'list-response', 'pomodoro-tick', 'pomodoro-state-changed',
            'pomodoro-show-widget', 'ai-model-changed', 'ai-chunk',
            'ai-stream-end', 'memory:update-in-main-window', 'context:attachment-deleted',
            'context:do-recapture', 'scribe:live-update', 'scribe:analysis-result',
            'proactive-memory', 'commands:refresh-quick-actions',
            'settings:models-reinitialized',
            'tts:play-audio', 'tts:cancel', 'tts:speaking-state-changed' // <-- Canais de recebimento de TTS
        ];
        if (validChannels.includes(channel)) {
            // A lógica de callback aqui está correta, não precisa mudar.
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
});