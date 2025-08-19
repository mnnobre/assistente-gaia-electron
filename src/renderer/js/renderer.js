// =================================================================================
// MAIN RENDERER SCRIPT
// Descrição: Ponto de entrada principal para o processo de renderização.
// =================================================================================

import { store } from './modules/store.js';
import * as ui from './modules/ui.js';
import { setupEventListeners } from './modules/events.js';

document.addEventListener("DOMContentLoaded", async () => {
  
  // 1. Inicializa a aplicação
  // Carrega dados assíncronos e define o estado inicial da UI.
  try {
    const commands = await window.api.getCommands();
    store.getState().setCommands(commands);
  } catch (error) {
    // Nenhum console.log aqui
  }
  
  ui.updateSpeechBubble("Olá! Estou pronto para ajudar.", false);
  ui.showInputSection();
  ui.scheduleInputHidden(); // Inicia o timer para o comportamento de auto-hide
  ui.autoResizeTextarea();
  ui.updateAiStatus();

  // 2. Conecta todos os eventos
  // Registra todos os listeners para cliques, inputs, etc.
  setupEventListeners();

  // 3. Configura a reatividade da UI
  // Esta seção define como a UI deve reagir automaticamente a mudanças no estado.
  store.subscribe(
    (state) => state.selectedSuggestionIndex,
    () => ui.updateSuggestionSelection()
  );

  // "Sempre que o estado do player mudar, execute a função de atualização da UI do player"
  store.subscribe(
    (state) => state.currentPlaybackState,
    () => ui.updateMiniPlayerUI()
  );

  // --- NOVA ASSINATURA PARA O POMODORO ---
  // "Sempre que os dados do pomodoro mudarem no store, chame a função para atualizar o widget"
  store.subscribe(
    (state) => state.currentPomodoroData,
    (data) => ui.updatePomodoroWidget(data)
  );
  // --- FIM DA NOVA ASSINATURA ---

});