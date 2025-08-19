// =================================================================================
// MODULE: ELEMENT SELECTORS
// Descrição: Centraliza a seleção de todos os elementos do DOM.
// =================================================================================

// --- Contêineres Principais ---
export const chatContainer = document.getElementById("chat-container");
export const appContainer = document.getElementById("app-container");
export const characterContainer = document.getElementById("character-container");
export const autocompleteContainer = document.getElementById("autocomplete-container");
export const thumbnailContainer = document.getElementById("thumbnail-container");
export const inputSection = document.getElementById("input-section");
export const inputContainer = document.getElementById("input-container");
export const actionsBar = document.getElementById("actions-bar");

// --- Personagem e Balão ---
export const characterImage = document.getElementById("character-image");
export const speechBubble = document.getElementById("speech-bubble");
export const speechBubbleP = speechBubble ? speechBubble.querySelector("p") : null;

// --- Input e Botões de Ação ---
export const messageInput = document.getElementById("message-input");
export const sendButton = document.getElementById("send-button");
export const memoryToggleButton = document.getElementById("memory-toggle-button");
export const contextMenuButton = document.getElementById("context-menu-button");
export const memoryWindowButton = document.getElementById("memory-window-button");
export const aiHubButton = document.getElementById("ai-hub-button");

// --- Mini Player de Música ---
export const miniPlayer = document.getElementById("mini-player");
export const miniPlayerInfo = document.getElementById("mini-player-info");
export const miniPlayerTitle = document.getElementById("mini-player-title");
export const miniPlayerArtist = document.getElementById("mini-player-artist");
export const miniPrevButton = document.getElementById("mini-prev-button");
export const miniPlayPauseButton = document.getElementById("mini-play-pause-button");
export const miniNextButton = document.getElementById("mini-next-button");
export const miniStopButton = document.getElementById("mini-stop-button");

// --- Widget Pomodoro ---
export const pomodoroWidget = document.getElementById("pomodoro-widget");
export const pomodoroTime = document.getElementById("pomodoro-time");
export const pomodoroState = document.getElementById("pomodoro-state");
export const pomodoroStartPauseBtn = document.getElementById("pomodoro-start-pause");
export const pomodoroResetBtn = document.getElementById("pomodoro-reset");
export const progressRing = document.querySelector(".pomodoro-progress-ring__circle");

// --- Constantes Derivadas (Pomodoro) ---
let radiusValue = 0;
let circumferenceValue = 0;

// Verifica se progressRing existe antes de tentar usá-lo.
if (progressRing) {
  radiusValue = progressRing.r.baseVal.value;
  circumferenceValue = radiusValue * 2 * Math.PI;
  progressRing.style.strokeDasharray = `${circumferenceValue} ${circumferenceValue}`; // Efeito colateral de inicialização
}

export const radius = radiusValue;
export const circumference = circumferenceValue;

// --- Modal de Memória ---
export const memoryModalOverlay = document.getElementById("memory-modal-overlay");
export const memoryModalCloseButton = document.getElementById("memory-modal-close-button");
export const memorySessionsList = document.getElementById("memory-sessions-list");
export const memorySearchInput = document.getElementById("memory-search-input");
export const showPinnedButton = document.getElementById("show-pinned-button");
export const backToSessionsButton = document.getElementById("back-to-sessions-button");

// --- Barra de Status e Hub de IA ---
export const aiStatusBar = document.getElementById("ai-status-bar");
export const aiStatusText = document.getElementById("ai-status-text");
export const aiHubModalOverlay = document.getElementById("ai-hub-modal-overlay");
export const aiHubModalCloseButton = document.getElementById("ai-hub-modal-close-button");
export const aiModelSelect = document.getElementById("ai-model-select");

// --- Modal de Contexto Visual ---
export const contextModalOverlay = document.getElementById("context-modal-overlay");
export const contextModalCloseButton = document.getElementById("context-modal-close-button");
export const contextImagePreview = document.getElementById("context-image-preview");
export const contextDeleteButton = document.getElementById("context-delete-button");
export const contextRecaptureWindowButton = document.getElementById("context-recapture-window-button");
export const contextRecaptureScreenButton = document.getElementById("context-recapture-screen-button");
export const contextRecaptureSelectionButton = document.getElementById("context-recapture-selection-button");

// --- Modal de Código ---
export const codeModalOverlay = document.getElementById("code-modal-overlay");
export const codeModalCloseButton = document.getElementById("code-modal-close-button");
export const codeModalContent = document.getElementById("code-modal-content");