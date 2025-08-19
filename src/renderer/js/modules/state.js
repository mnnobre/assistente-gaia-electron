// =================================================================================
// MODULE: APPLICATION STATE
// Descrição: Centraliza todas as variáveis de estado mutáveis da aplicação.
// =================================================================================

export const state = {
  // --- Timeouts e IDs ---
  chatTimeoutId: null,
  bubbleTimeoutId: null,
  inputTimeoutId: null,
  pomodoroAnimationId: null,

  // --- Flags de Estado da UI ---
  hasWindowFocus: true,
  isPlayerManuallyStopped: false,

  // --- Estado dos Módulos ---
  currentPomodoroState: "stopped",
  currentPlaybackState: { isPlaying: false },

  // --- Dados da Aplicação ---
  commands: [],
  attachedImageData: null,

  // --- Autocomplete ---
  currentSuggestions: [],
  selectedSuggestionIndex: -1,
  
  // --- Memória ---
  selectedMemoryContent: new Map(),
};