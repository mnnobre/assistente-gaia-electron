// /src/renderer/js/modules/storeSlices/uiSlice.js (Com Seletor)

export const createUiSlice = (set, get) => ({
  chatTimeoutId: null,
  bubbleTimeoutId: null,
  inputTimeoutId: null,
  hasWindowFocus: true,

  // ACTIONS
  setTimeoutId: (type, id) => {
    const existingId = get()[`${type}TimeoutId`];
    if (existingId) clearTimeout(existingId);
    set({ [`${type}TimeoutId`]: id });
  },
  clearTimeoutId: (type) => {
    const existingId = get()[`${type}TimeoutId`];
    if (existingId) clearTimeout(existingId);
    set({ [`${type}TimeoutId`]: null });
  },
  setWindowFocus: (hasFocus) => set({ hasWindowFocus: hasFocus }),
});

// --- SELETOR DE ESTADO DERIVADO ---
/**
 * Determina se o chat deve ser agendado para auto-esconder.
 * A regra é: apenas agende se a janela do assistente NÃO estiver em foco.
 * @param {object} state - O estado completo da store.
 * @returns {boolean} - Verdadeiro se o agendamento para esconder deve ocorrer.
 */
export const selectShouldScheduleChatHidden = (state) => !state.hasWindowFocus;