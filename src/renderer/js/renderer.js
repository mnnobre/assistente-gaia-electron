// =================================================================================
// MAIN RENDERER SCRIPT
// =================================================================================

import { store } from './modules/store.js';
import * as ui from './modules/ui.js';
import { setupEventListeners } from './modules/events.js';

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

async function renderQuickActions() {
    const quickActionsBar = document.getElementById('quick-actions-bar');
    if (!quickActionsBar) return;

    const activeModel = await window.api.ai.getActiveModel();
    if (!activeModel) {
        quickActionsBar.classList.add('hidden');
        return;
    }

    const commandSettingsObject = await window.api.commands.getSettingsForModel(activeModel.key);
    const commandSettings = new Map(Object.entries(commandSettingsObject));

    const quickActionCommands = Array.from(commandSettings.entries())
        .filter(([_, settings]) => settings.is_quick_action);
    
    quickActionsBar.innerHTML = ''; 
    if (quickActionCommands.length === 0) {
        quickActionsBar.classList.add('hidden');
    } else {
        quickActionCommands.forEach(([commandString, settings]) => {
            const button = document.createElement('button');
            const icon = Object.entries(commandIcons).find(([key, _]) => commandString.startsWith(key))?.[1] || commandIcons.default;
            
            button.className = 'action-button';
            button.textContent = icon;
            button.title = commandString;

            button.dataset.commandString = commandString;
            button.dataset.isDirectAction = settings.is_direct_action;

            quickActionsBar.appendChild(button);
        });
        quickActionsBar.classList.remove('hidden');
    }
}

function updateCommandModeUI() {
    const { activeCommandMode } = store.getState();
    const inputContainer = document.getElementById('input-container');
    const messageInput = document.getElementById('message-input');
    
    const existingBadge = document.getElementById('command-mode-badge');
    if (existingBadge) existingBadge.remove();

    if (activeCommandMode) {
        inputContainer.classList.add('command-mode-active');
        const badge = document.createElement('div');
        badge.id = 'command-mode-badge';
        badge.innerHTML = `<span>${activeCommandMode}</span><button id="exit-mode-btn">&times;</button>`;
        inputContainer.prepend(badge);

        messageInput.placeholder = 'Digite o restante do comando...';
        messageInput.focus();

        document.getElementById('exit-mode-btn').addEventListener('click', () => {
            store.getState().setActiveCommandMode(null);
        });
    } else {
        inputContainer.classList.remove('command-mode-active');
        messageInput.placeholder = 'Digite sua mensagem...';
    }
}


document.addEventListener("DOMContentLoaded", async () => {
  
  try {
    const commands = await window.api.getCommands();
    store.getState().setCommands(commands);
  } catch (error) {
    console.error("Falha ao carregar lista de comandos:", error);
  }
  
  ui.updateSpeechBubble("Olá! Estou pronto para ajudar.", false);
  ui.showInputSection();
  ui.scheduleInputHidden();
  ui.autoResizeTextarea();
  await ui.updateAiStatus();
  await renderQuickActions();

  setupEventListeners();

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

  store.subscribe(
    (state) => state.activeCommandMode,
    () => updateCommandModeUI()
  );

  // --- INÍCIO DA ALTERAÇÃO ---
  // Ouve pelos eventos de mudança de IA e de mudança de configuração
  // e chama a função para re-renderizar a barra de ações.
  window.api.on('ai-model-changed', renderQuickActions);
  window.api.on('commands:refresh-quick-actions', renderQuickActions);
  // --- FIM DA ALTERAÇÃO ---

});