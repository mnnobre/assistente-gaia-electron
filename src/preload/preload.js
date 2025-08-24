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
        addWorkLog: (logData) => ipcRenderer.invoke('task:add-work-log', logData),
        updateTask: (taskData) => ipcRenderer.invoke('task:update-task', taskData),
        deleteTask: (taskId) => ipcRenderer.invoke('task:delete-task', taskId),
        getWorkLogs: (taskId) => ipcRenderer.invoke('task:get-work-logs', taskId),
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
    
    // --- INÍCIO DA ALTERAÇÃO ---
    // --- Módulo de Configurações ---
    settings: {
        get: (key) => ipcRenderer.invoke('settings:get', key),
        set: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
    },
    // --- FIM DA ALTERAÇÃO ---
    
    // --- Função genérica para ENVIAR mensagens One-Way ---
    send: (channel, data) => {
        const validChannels = [
            'pomodoro-control', 'control-player-action', 'player:minimize',
            'player:close', 'player:show', 'modal:open', 'modal:close',
            'memory:selection-changed', 'context:delete-attachment',
            'context:recapture', 'scribe:resize', 'commands:settings-changed'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },

    // --- Função genérica para OUVIR canais ---
    on: (channel, callback) => {
        const validChannels = [
            'playback-state-updated', 'meal-reminder', 'window-focus-changed', 
            'list-response', 'pomodoro-tick', 'pomodoro-state-changed',
            'pomodoro-show-widget', 'ai-model-changed', 'ai-chunk',
            'ai-stream-end', 'memory:update-in-main-window', 'context:attachment-deleted',
            'context:do-recapture', 'scribe:live-update', 'scribe:analysis-result',
            'proactive-memory', 'commands:refresh-quick-actions'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
});