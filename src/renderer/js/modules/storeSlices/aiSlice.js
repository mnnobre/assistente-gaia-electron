// /src/renderer/js/modules/storeSlices/aiSlice.js

export const createAiSlice = (set, get) => ({
  ai: {
    activeModel: null,
  },
  currentMessageWrapper: null,
  
  // ACTIONS
  setCurrentMessageWrapper: (wrapper) => set({ currentMessageWrapper: wrapper }),
  setActiveModel: (model) => set((state) => ({ ai: { ...state.ai, activeModel: model } })),
});