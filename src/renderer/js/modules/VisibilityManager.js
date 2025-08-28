// /src/renderer/js/modules/VisibilityManager.js
// =================================================================================
// MODULE: VISIBILITY MANAGER
// Descrição: Centraliza a lógica de agendamento e cancelamento de timers
// para esconder elementos da UI, interagindo com o uiSlice do store.
// =================================================================================

import { store } from './store.js';

/**
 * Um gerenciador para encapsular a lógica de timeouts da UI.
 */
const VisibilityManager = {
  /**
   * Agenda uma função para ser executada após um delay, cancelando qualquer
   * timer anterior associado à mesma chave de ID.
   * @param {'chat' | 'input' | 'bubble'} type - O tipo de timer, que corresponde à chave no store.
   * @param {function} callback - A função a ser executada quando o timer disparar.
   * @param {number} delay - O tempo em milissegundos para esperar.
   */
  schedule(type, callback, delay) {
    // A ação `setTimeoutId` já lida com a limpeza do timer antigo.
    // Ela é importada do `uiSlice` e disponibilizada no `store`.
    const newTimeoutId = setTimeout(callback, delay);
    store.getState().setTimeoutId(type, newTimeoutId);
  },

  /**
   * Cancela um timer agendado, impedindo que sua função seja executada.
   * @param {'chat' | 'input' | 'bubble'} type - O tipo de timer a ser cancelado.
   */
  clear(type) {
    // A ação `clearTimeoutId` lida com a limpeza e a atualização do estado.
    store.getState().clearTimeoutId(type);
  },
};

export default VisibilityManager;