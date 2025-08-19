// =================================================================================
// MODULE: APPLICATION STORE (Zustand)
// =================================================================================

// CORREÇÃO: Usa um caminho relativo correto para sair da estrutura /src/renderer/js/modules/
import { createStore } from "../../../../node_modules/zustand/esm/vanilla.mjs";
import { subscribeWithSelector } from "../../../../node_modules/zustand/esm/middleware.mjs";

// Define o estado inicial como um objeto separado.
const initialState = {
  chatTimeoutId: null,
  bubbleTimeoutId: null,
  inputTimeoutId: null,
  pomodoroAnimationId: null,
  hasWindowFocus: true,
  isPlayerManuallyStopped: false,
  currentPomodoroState: "stopped",
  currentPlaybackState: { isPlaying: false },
  // --- NOVA PROPRIEDADE PARA OS DADOS COMPLETOS DO POMODORO ---
  currentPomodoroData: { timeLeft: 0, totalTime: 1, state: 'stopped', mode: 'focus' },
  commands: [],
  attachedImageData: null,
  currentSuggestions: [],
  selectedSuggestionIndex: -1,
  selectedMemoryContent: new Map(),
};

// Cria a definição do store, incluindo a ação de reset.
const storeDefinition = (set, get) => ({
  ...initialState,

  // ACTIONS
  setCommands: (commands) => set({ commands }),
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
  setPlayerManuallyStopped: (isStopped) => set({ isPlayerManuallyStopped: isStopped }),
  setPomodoroState: (pomodoroState) => set({ currentPomodoroState: pomodoroState }),
  // --- NOVA AÇÃO PARA ATUALIZAR OS DADOS DO POMODORO ---
  setPomodoroData: (data) => set({ currentPomodoroData: data }),
  setPomodoroAnimationId: (id) => set({ pomodoroAnimationId: id }),
  setPlaybackState: (playbackState) => set({ currentPlaybackState: playbackState }),
  attachImage: (imageData) => set({ attachedImageData: imageData }),
  detachImage: () => set({ attachedImageData: null }),
  setSuggestions: (suggestions) => set({ currentSuggestions: suggestions, selectedSuggestionIndex: -1 }),
  clearSuggestions: () => set({ currentSuggestions: [], selectedSuggestionIndex: -1 }),
  setSelectedSuggestionIndex: (index) => set({ selectedSuggestionIndex: index }),
  
  // Agora aceita um objeto com dados em vez de um elemento do DOM
  updateMemorySelection: (selectionData) => {
    const { uniqueId, isChecked, textContent, sender } = selectionData;
    const senderPrefix = sender === 'user' ? 'Usuário' : 'Assistente';
    const formattedContent = `${senderPrefix}: "${textContent}"`;
    
    const newMap = new Map(get().selectedMemoryContent);
    if (isChecked) {
      newMap.set(uniqueId, formattedContent);
    } else {
      newMap.delete(uniqueId);
    }
    set({ selectedMemoryContent: newMap });
  },

  reset: () => set(initialState),
});

export const store = createStore(subscribeWithSelector(storeDefinition));
export const getState = store.getState;