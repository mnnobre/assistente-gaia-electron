// /src/renderer/js/modules/visibilityRules.js
// =================================================================================
// MODULE: VISIBILITY RULES
// Descrição: Única fonte da verdade para determinar se um componente da UI
// deve estar visível. Cada regra é mapeada para um seletor de estado.
// =================================================================================

import { selectIsMiniPlayerVisible } from './storeSlices/playerSlice.js';
import { selectShouldScheduleChatHidden } from './storeSlices/uiSlice.js';
import { store } from './store.js';

/**
 * Um mapa que associa um identificador de componente de UI à sua função
 * seletora de visibilidade. A UI usará este mapa para decidir o que renderizar.
 */
export const visibilityRules = {
  /**
   * Determina se o componente mini-player deve ser visível.
   * @param {object} state - O estado completo da store.
   * @returns {boolean}
   */
  miniPlayer: (state) => selectIsMiniPlayerVisible(state),

  /**
   * Determina se o agendamento para esconder o chat deve ser ativado.
   * @param {object} state - O estado completo da store.
   * @returns {boolean}
   */
  scheduleChatHidden: (state) => selectShouldScheduleChatHidden(state),
  
  // Adicionaremos mais regras aqui conforme refatoramos outros componentes.
};

/**
 * Função utilitária para verificar uma regra específica usando o estado atual.
 * @param {'miniPlayer' | 'scheduleChatHidden'} ruleName - O nome da regra a ser verificada.
 * @returns {boolean} - O resultado da regra.
 */
export function checkVisibility(ruleName) {
  if (!visibilityRules[ruleName]) {
    console.warn(`[VisibilityRules] A regra "${ruleName}" não foi encontrada.`);
    return false;
  }
  return visibilityRules[ruleName](store.getState());
}