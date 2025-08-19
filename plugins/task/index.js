// /plugins/task/index.js
const { BrowserWindow } = require('electron');
const path = require('path');

let taskWindow = null;

function createTaskWindow() {
    if (taskWindow && !taskWindow.isDestroyed()) {
        taskWindow.focus();
        return;
    }

    taskWindow = new BrowserWindow({
        width: 800,
        height: 700,
        title: "Central de Tarefas",
        webPreferences: {
            preload: path.join(__dirname, '..', '..', 'preload.js'), // Reutiliza o preload principal
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    taskWindow.loadFile(path.join(__dirname, "task.html"));

    taskWindow.on("closed", () => {
        taskWindow = null;
    });
}


module.exports = {
  command: "task",
  description: "Abre a Central de Tarefas para registrar e sincronizar o trabalho.",
  
  subcommands: {
    'abrir': 'Abre a janela da Central de Tarefas.',
    'listar': 'Lista as tarefas recentes no chat.' // (Funcionalidade futura)
  },

  execute: async (args) => {
    // Por enquanto, qualquer comando /task apenas abre a janela.
    createTaskWindow();

    // Retorna uma ação para que nada seja exibido no chat.
    return { type: 'action', action: 'suppress_chat_response' };
  },
};