// /src/renderer/js/renderer.js (Refatorado com Bindings)
// =================================================================================
// MAIN RENDERER SCRIPT
// =================================================================================

import { store } from './modules/store.js';
import * as ui from './modules/ui.js';
import { setupEventListeners } from './modules/events.js';
// --- INÍCIO DA ALTERAÇÃO ---
// Importamos a função que inicializa nosso sistema de reatividade.
import { initializeBindings } from './modules/uiBindings.js';
// --- FIM DA ALTERAÇÃO ---


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

// --- INÍCIO DA ALTERAÇÃO ---
// A função updateCommandModeUI foi movida para ui.js e não é mais necessária aqui.
// --- FIM DA ALTERAÇÃO ---


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

  // --- INÍCIO DA ALTERAÇÃO ---
  // Substituímos todos os 'store.subscribe' individuais por uma única
  // chamada que configura toda a reatividade da UI.
  initializeBindings();
  // --- FIM DA ALTERAÇÃO ---

  // Os listeners de eventos da API do Electron que acionam a renderização
  // permanecem aqui, pois são um ponto de entrada para a aplicação.
  window.api.on('ai-model-changed', renderQuickActions);
  window.api.on('commands:refresh-quick-actions', renderQuickActions);
});