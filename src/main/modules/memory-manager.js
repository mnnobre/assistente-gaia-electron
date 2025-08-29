// /src/main/modules/memory-manager.js (NOVO ARQUIVO)
const { ipcMain } = require('electron');
const dbManager = require('./database-manager.js');
const vectorDBManager = require('./vector-db-manager.js');
const windowManager = require('./window-manager.js');

const MemoryManager = {
    initialize() {
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
    }
};

module.exports = MemoryManager;