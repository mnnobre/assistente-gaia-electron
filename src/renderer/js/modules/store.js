// =================================================================================
// MODULE: APPLICATION STORE (Zustand)
// =================================================================================

import { createStore } from "../../../../node_modules/zustand/esm/vanilla.mjs";
import { subscribeWithSelector } from "../../../../node_modules/zustand/esm/middleware.mjs";

const initialState = {
  chatTimeoutId: null,
  bubbleTimeoutId: null,
  inputTimeoutId: null,
  pomodoroAnimationId: null,
  hasWindowFocus: true,
  isPlayerManuallyStopped: false,
  currentPomodoroState: "stopped",
  currentPlaybackState: { isPlaying: false },
  currentPomodoroData: { timeLeft: 0, totalTime: 1, state: 'stopped', mode: 'focus' },
  commands: [],
  attachedImageData: null,
  currentSuggestions: [],
  selectedSuggestionIndex: -1,
  selectedMemoryContent: new Map(),
  // --- INÍCIO DA ALTERAÇÃO (FASE 7) ---
  activeCommandMode: null, // Guarda a string do comando em modo, ex: '/ia var'
  // --- FIM DA ALTERAÇÃO ---
};

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
  setPomodoroData: (data) => set({ currentPomodoroData: data }),
  setPomodoroAnimationId: (id) => set({ pomodoroAnimationId: id }),
  setPlaybackState: (playbackState) => set({ currentPlaybackState: playbackState }),
  attachImage: (imageData) => set({ attachedImageData: imageData }),
  detachImage: () => set({ attachedImageData: null }),
  setSuggestions: (suggestions) => set({ currentSuggestions: suggestions, selectedSuggestionIndex: -1 }),
  clearSuggestions: () => set({ currentSuggestions: [], selectedSuggestionIndex: -1 }),
  setSelectedSuggestionIndex: (index) => set({ selectedSuggestionIndex: index }),
  
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

  // --- INÍCIO DA ALTERAÇÃO (FASE 7) ---
  setActiveCommandMode: (commandString) => set({ activeCommandMode: commandString }),
  // --- FIM DA ALTERAÇÃO ---

  reset: () => set(initialState),
});

export const store = createStore(subscribeWithSelector(storeDefinition));
export const getState = store.getState;