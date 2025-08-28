// /tests/player.test.js (Refatorado para Teste Unitário de Slice)
import { describe, it, expect, beforeEach } from 'vitest';

// --- INÍCIO DA ALTERAÇÃO ---
// Importamos o store para controlar o estado, mas o mais importante,
// importamos nosso seletor para testá-lo diretamente.
import { store } from '../src/renderer/js/modules/store.js';
import { selectIsMiniPlayerVisible } from '../src/renderer/js/modules/storeSlices/playerSlice.js';
// --- FIM DA ALTERAÇÃO ---

// Não precisamos mais do JSDOM, pois não vamos interagir com a UI.
// describe('Player Slice Logic', () => { // Poderíamos renomear, mas manteremos por consistência.
describe('Mini Player Reactivity', () => {

  beforeEach(() => {
    // A única coisa que precisamos fazer antes de cada teste é resetar o estado.
    store.getState().reset();
  });

  // --- INÍCIO DOS NOVOS TESTES ---

  it('should have a correct initial state', () => {
    const state = store.getState();
    expect(state.isPlayerManuallyStopped).toBe(false);
    expect(state.currentPlaybackState).toEqual({ isPlaying: false });
  });

  it('should update playback state when setPlaybackState action is called', () => {
    const mockPlaybackState = { title: 'Bohemian Rhapsody', artist: 'Queen', isPlaying: true };
    
    // Ação
    store.getState().setPlaybackState(mockPlaybackState);

    // Verificação
    expect(store.getState().currentPlaybackState).toEqual(mockPlaybackState);
  });
  
  it('should update manually stopped state when setPlayerManuallyStopped action is called', () => {
    // Ação
    store.getState().setPlayerManuallyStopped(true);

    // Verificação
    expect(store.getState().isPlayerManuallyStopped).toBe(true);
  });

  // Teste crucial para nosso seletor
  describe('selectIsMiniPlayerVisible selector', () => {
    it('should return true when a song is playing and not manually stopped', () => {
      const state = {
        currentPlaybackState: { title: 'A Kind of Magic', isPlaying: true },
        isPlayerManuallyStopped: false,
      };
      expect(selectIsMiniPlayerVisible(state)).toBe(true);
    });

    it('should return false when there is no song title', () => {
      const state = {
        currentPlaybackState: { title: null, isPlaying: false },
        isPlayerManuallyStopped: false,
      };
      expect(selectIsMiniPlayerVisible(state)).toBe(false);
    });

    it('should return false when the player was manually stopped, even if a song is playing', () => {
      const state = {
        currentPlaybackState: { title: 'The Show Must Go On', isPlaying: true },
        isPlayerManuallyStopped: true,
      };
      expect(selectIsMiniPlayerVisible(state)).toBe(false);
    });

    it('should return false for all other combinations', () => {
      const state1 = { currentPlaybackState: {}, isPlayerManuallyStopped: false };
      const state2 = { currentPlaybackState: {}, isPlayerManuallyStopped: true };
      
      expect(selectIsMiniPlayerVisible(state1)).toBe(false);
      expect(selectIsMiniPlayerVisible(state2)).toBe(false);
    });
  });
  // --- FIM DOS NOVOS TESTES ---
});