// /tests/ui.test.js
import { describe, it, expect, beforeEach } from 'vitest';

// Importamos o store para manipular o estado e o seletor para testá-lo.
import { store } from '../src/renderer/js/modules/store.js';
import { selectShouldScheduleChatHidden } from '../src/renderer/js/modules/storeSlices/uiSlice.js';

describe('UI Slice Logic', () => {

  beforeEach(() => {
    // Garante que cada teste comece com um estado limpo.
    store.getState().reset();
  });

  it('should have a correct initial state', () => {
    const state = store.getState();
    expect(state.hasWindowFocus).toBe(true);
    expect(state.chatTimeoutId).toBe(null);
    expect(state.inputTimeoutId).toBe(null);
    expect(state.bubbleTimeoutId).toBe(null);
  });

  it('should update window focus state when setWindowFocus action is called', () => {
    // Ação
    store.getState().setWindowFocus(false);
    // Verificação
    expect(store.getState().hasWindowFocus).toBe(false);

    // Ação
    store.getState().setWindowFocus(true);
    // Verificação
    expect(store.getState().hasWindowFocus).toBe(true);
  });

  it('should correctly set and clear timeout IDs', () => {
    // Simula a obtenção de um ID de timeout
    const fakeTimeoutId = 123;

    // Testa a ação de definir o ID
    store.getState().setTimeoutId('chat', fakeTimeoutId);
    expect(store.getState().chatTimeoutId).toBe(fakeTimeoutId);

    // Testa a ação de limpar o ID
    store.getState().clearTimeoutId('chat');
    expect(store.getState().chatTimeoutId).toBe(null);
  });

  // Testes dedicados ao nosso novo seletor de estado derivado
  describe('selectShouldScheduleChatHidden selector', () => {
    it('should return FALSE when the window has focus', () => {
      // Setup: Criamos um objeto de estado que simula a condição.
      const stateWithFocus = { hasWindowFocus: true };
      
      // Ação e Verificação
      expect(selectShouldScheduleChatHidden(stateWithFocus)).toBe(false);
    });

    it('should return TRUE when the window does NOT have focus', () => {
      // Setup
      const stateWithoutFocus = { hasWindowFocus: false };
      
      // Ação e Verificação
      expect(selectShouldScheduleChatHidden(stateWithoutFocus)).toBe(true);
    });
  });

});