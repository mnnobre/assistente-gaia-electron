// /plugins/dashboard-gaia/index.js

const { BrowserWindow } = require('electron');
const path = require('path');

let dashboardWindow = null;

// Função que cria e gerencia a janela do Dashboard
function createDashboardWindow() {
    // Se a janela já estiver aberta, apenas a foque.
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
        dashboardWindow.focus();
        return;
    }

    dashboardWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        title: "G.A.I.A. - Dashboard de Lazer",
        webPreferences: {
            // Usamos o preload principal para ter acesso à `window.api`
            preload: path.join(__dirname, '..', '..', 'src', 'preload', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Carrega o nosso arquivo HTML do dashboard
    dashboardWindow.loadFile(path.join(__dirname, "dashboard.html"));

    // Limpa a referência da janela quando ela for fechada
    dashboardWindow.on("closed", () => {
        dashboardWindow = null;
    });
}

module.exports = {
  // Este plugin não tem um comando próprio, ele "adiciona" um subcomando ao /gaia
  // A lógica de roteamento será feita no plugin principal da G.A.I.A.
  // Por enquanto, vamos criar um comando temporário para teste.
  command: "dashboard", // Temporário: /dashboard
  description: "Abre o Dashboard de Lazer da G.A.I.A.",
  
  subcommands: {
    'abrir': 'Abre o Dashboard de Lazer da G.A.I.A.',
  },

  execute: async (args) => {
    // A ação é simplesmente chamar a função para criar a janela.
    createDashboardWindow();

    // Suprime qualquer resposta no chat principal.
    return { type: 'action', action: 'suppress_chat_response' };
  },
};