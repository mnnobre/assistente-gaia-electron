// /src/renderer/js/modules/storeSlices/playerSlice.js

export const createPlayerSlice = (set, get) => ({
  isPlayerManuallyStopped: false,
  currentPlaybackState: { isPlaying: false },

  // ACTIONS
  setPlayerManuallyStopped: (isStopped) => set({ isPlayerManuallyStopped: isStopped }),
  setPlaybackState: (playbackState) => set({ currentPlaybackState: playbackState }),
});

// --- SELETOR DE ESTADO DERIVADO ---
// Esta função "calcula" um estado derivado a partir do estado bruto.
// Ela centraliza a lógica de negócio de "quando o mini-player deve estar visível".
// O '?' no 'state.currentPlaybackState?.title' é uma proteção para caso o objeto seja nulo.
export const selectIsMiniPlayerVisible = (state) => 
  !!state.currentPlaybackState?.title && !state.isPlayerManuallyStopped;