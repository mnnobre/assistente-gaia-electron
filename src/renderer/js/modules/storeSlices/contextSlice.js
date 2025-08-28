// /src/renderer/js/modules/storeSlices/contextSlice.js

export const createContextSlice = (set, get) => ({
  attachedImageData: null,
  selectedMemoryContent: new Map(),

  // ACTIONS
  attachImage: (imageData) => set({ attachedImageData: imageData }),
  detachImage: () => set({ attachedImageData: null }),
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
});