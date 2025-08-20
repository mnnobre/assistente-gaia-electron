// =================================================================================
// MAIN RENDERER SCRIPT
// =================================================================================

import { store } from './modules/store.js';
import * as ui from './modules/ui.js';
import { setupEventListeners } from './modules/events.js';

// --- INÍCIO DA ALTERAÇÃO (FASE 7) ---
// Mapeamento de comandos para ícones (pode ser expandido)
const commandIcons = {
    '/nota': '📝',
    '/task': '✅',
    '/reuniao': '🎙️',
    '/ia var': 'v',
    '/ia css': '🎨',
    '/gaia log': '📓',
    '/dashboard': '📊',
    'default': '⚡'
};

/**
 * Busca os comandos fixados e renderiza a barra de ações rápidas.
 */
async function renderQuickActions() {
    const quickActionsBar = document.getElementById('quick-actions-bar');
    if (!quickActionsBar) return;

    const activeModel = await window.api.ai.getActiveModel();
    if (!activeModel) {
        quickActionsBar.classList.add('hidden');
        return;
    }

    const pinnedCommands = await window.api.commands.getPinned(activeModel.key);
    
    quickActionsBar.innerHTML = ''; // Limpa a barra
    if (pinnedCommands.length === 0) {
        quickActionsBar.classList.add('hidden');
    } else {
        pinnedCommands.forEach(command => {
            const button = document.createElement('button');
            const icon = Object.entries(commandIcons).find(([key, val]) => command.startsWith(key))?.[1] || commandIcons.default;
            button.className = 'action-button';
            button.textContent = icon;
            button.title = command;

            button.addEventListener('click', () => {
                // Para comandos simples sem argumentos, executa direto
                if (['/task', '/dashboard'].includes(command)) {
                     window.api.sendMessageToAI({ userInput: command });
                } else {
                    // Para outros, ativa o modo de comando
                    store.getState().setActiveCommandMode(command);
                }
            });
            quickActionsBar.appendChild(button);
        });
        quickActionsBar.classList.remove('hidden');
    }
}

/**
 * Atualiza a UI da barra de input com base no modo de comando ativo.
 */
function updateCommandModeUI() {
    const { activeCommandMode } = store.getState();
    const inputContainer = document.getElementById('input-container');
    
    // Limpa o indicador de modo anterior, se houver
    const existingBadge = document.getElementById('command-mode-badge');
    if (existingBadge) existingBadge.remove();

    if (activeCommandMode) {
        inputContainer.classList.add('command-mode-active');
        const badge = document.createElement('div');
        badge.id = 'command-mode-badge';
        badge.innerHTML = `<span>${activeCommandMode}</span><button id="exit-mode-btn">&times;</button>`;
        inputContainer.prepend(badge);

        document.getElementById('exit-mode-btn').addEventListener('click', () => {
            store.getState().setActiveCommandMode(null);
        });
    } else {
        inputContainer.classList.remove('command-mode-active');
    }
}
// --- FIM DA ALTERAÇÃO ---


document.addEventListener("DOMContentLoaded", async () => {
  
  // 1. Inicializa a aplicação
  try {
    const commands = await window.api.getCommands();
    store.getState().setCommands(commands);
  } catch (error) {
    // Nenhum log
  }
  
  ui.updateSpeechBubble("Olá! Estou pronto para ajudar.", false);
  ui.showInputSection();
  ui.scheduleInputHidden();
  ui.autoResizeTextarea();
  await ui.updateAiStatus();
  await renderQuickActions(); // <-- Adicionado

  // 2. Conecta todos os eventos
  setupEventListeners();

  // 3. Configura a reatividade da UI
  store.subscribe(
    (state) => state.selectedSuggestionIndex,
    () => ui.updateSuggestionSelection()
  );

  store.subscribe(
    (state) => state.currentPlaybackState,
    () => ui.updateMiniPlayerUI()
  );

  store.subscribe(
    (state) => state.currentPomodoroData,
    (data) => ui.updatePomodoroWidget(data)
  );

  // --- INÍCIO DA ALTERAÇÃO (FASE 7) ---
  // Re-renderiza as ações rápidas sempre que o modelo de IA mudar
  window.api.on('ai-model-changed', renderQuickActions);
  
  // Atualiza a UI do input sempre que o modo de comando mudar
  store.subscribe(
    (state) => state.activeCommandMode,
    () => updateCommandModeUI()
  );
  // --- FIM DA ALTERAÇÃO ---

});