// /src/renderer/js/modules/uiBindings.js (Corrigido)
// =================================================================================
// MODULE: UI BINDINGS
// Descrição: O coração da UI reativa. Este mapa declarativo conecta fatias
// do estado (ou seletores) a funções da UI que atualizam o DOM.
// Um único 'subscribe' no renderer principal irá iterar sobre este mapa.
// =================================================================================

import * as ui from './ui.js';
import { store } from './store.js';
import { selectIsMiniPlayerVisible } from './storeSlices/playerSlice.js';

/**
 * Mapeia uma chave de seletor ou estado a uma função da UI que deve ser
 * executada quando o valor correspondente no estado muda.
 */
export const uiBindings = {
  // --- Player Slice Bindings ---
  currentPlaybackState: (state) => {
    // A função `updateMiniPlayerUI` já usa o seletor internamente,
    // então podemos simplesmente chamá-la quando qualquer parte
    // do estado do player mudar.
    ui.updateMiniPlayerUI();
  },

  // --- Pomodoro Slice Bindings ---
  currentPomodoroData: (data) => {
    ui.updatePomodoroWidget(data);
  },

  // --- Command Slice Bindings ---
  activeCommandMode: (commandMode) => {
    ui.updateCommandModeUI(commandMode);
  },
  
  // --- INÍCIO DA CORREÇÃO ---
  // Adicionamos o binding para o índice da sugestão selecionada.
  // Sempre que `selectedSuggestionIndex` mudar no store...
  selectedSuggestionIndex: () => {
    // ...chamamos a função `updateSuggestionSelection` para atualizar o visual.
    ui.updateSuggestionSelection();
  },
  // --- FIM DA CORREÇÃO ---
};

/**
 * Função utilitária para inicializar a reatividade.
 * Percorre todos os listeners do seletor e os anexa ao store.
 */
export function initializeBindings() {
  for (const [stateKey, handler] of Object.entries(uiBindings)) {
    // Usamos o `subscribeWithSelector` do Zustand.
    // Ele nos permite ouvir mudanças em uma parte específica do estado.
    store.subscribe(
      (state) => state[stateKey],
      (newValue, oldValue) => {
        // O handler é chamado apenas se o valor realmente mudou.
        handler(newValue);
      }
    );
  }
}