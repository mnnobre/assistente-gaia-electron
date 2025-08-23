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

    // --- Módulo de memória exposto para o renderer ---
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

    // --- Módulo G.A.I.A. (para o Dashboard) ---
    gaia: {
        getGames: () => ipcRenderer.invoke('gaia:get-games'),
        // --- INÍCIO DA ALTERAÇÃO (FASE 9) ---
        getGameLogs: () => ipcRenderer.invoke('gaia:get-game-logs'),
        // --- FIM DA ALTERAÇÃO ---
    },

    // --- Módulo de Comandos (para o Hub de IA) ---
    commands: {
        getPinned: (aiModelKey) => ipcRenderer.invoke('commands:get-pinned', aiModelKey),
        setPinned: (aiModelKey, commandsArray) => ipcRenderer.invoke('commands:set-pinned', { aiModelKey, commandsArray }),
    },

    // --- Função genérica para ENVIAR mensagens One-Way (Apenas envia) ---
    send: (channel, data) => {
        const validChannels = [
            'pomodoro-control',
            'control-player-action',
            'player:minimize',
            'player:close',
            'player:show',
            'modal:open',
            'modal:close',
            'memory:selection-changed',
            'context:delete-attachment',
            'context:recapture',
            'scribe:resize'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },

    // --- Função genérica para OUVIR canais (Apenas recebe) ---
    on: (channel, callback) => {
        const validChannels = [
            'playback-state-updated', 
            'meal-reminder', 
            'window-focus-changed', 
            'list-response',
            'pomodoro-tick',
            'pomodoro-state-changed',
            'pomodoro-show-widget',
            'ai-model-changed',
            'ai-chunk',
            'ai-stream-end',
            'memory:update-in-main-window',
            'context:attachment-deleted',
            'context:do-recapture',
            'scribe:live-update',
            'scribe:analysis-result',
            'proactive-memory',
        ];
        if (validChannels.includes(channel)) {
            console.log(`[PRELOAD] Registrando listener para o canal: "${channel}"`);
            ipcRenderer.removeAllListeners(channel);
            ipcRenderer.on(channel, (event, ...args) => {
                console.log(`[PRELOAD] Evento recebido no canal: "${channel}" com os dados:`, ...args);
                callback(...args);
            });
        }
    },
})
