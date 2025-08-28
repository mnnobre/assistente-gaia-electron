// /src/renderer/js/modules/storeSlices/commandSlice.js

export const createCommandSlice = (set, get) => ({
  commands: [],
  currentSuggestions: [],
  selectedSuggestionIndex: -1,
  activeCommandMode: null,

  // ACTIONS
  setCommands: (commands) => set({ commands }),
  setSuggestions: (suggestions) => set({ currentSuggestions: suggestions, selectedSuggestionIndex: -1 }),
  clearSuggestions: () => set({ currentSuggestions: [], selectedSuggestionIndex: -1 }),
  setSelectedSuggestionIndex: (index) => set({ selectedSuggestionIndex: index }),
  setActiveCommandMode: (commandString) => set({ activeCommandMode: commandString }),
});