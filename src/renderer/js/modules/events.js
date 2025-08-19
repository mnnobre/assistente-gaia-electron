// =================================================================================
// MODULE: EVENT LISTENERS
// Descrição: Configura todos os event listeners da aplicação, conectando
// as interações do usuário com as funções principais.
// =================================================================================

import * as elements from './elements.js';
import { store } from './store.js';
import * as ui from './ui.js';
import * as core from './core.js';

export function setupEventListeners() {
    const getState = store.getState;

    // --- General UI Listeners ---
    if (elements.characterImage) {
        elements.characterImage.addEventListener("mouseenter", ui.showInputSection);
        elements.characterImage.addEventListener("click", ui.showInputSection);
    }
    if (elements.sendButton) elements.sendButton.addEventListener("click", core.sendMessage);
    if (elements.speechBubble) {
        elements.speechBubble.addEventListener("mouseenter", () => getState().clearTimeoutId('bubble'));
        elements.speechBubble.addEventListener("mouseleave", () => ui.scheduleBubbleHide());
    }
    
    // --- Auto-hide logic for Chat and Input ---
    if (elements.chatContainer) {
        elements.chatContainer.addEventListener("mouseenter", () => getState().clearTimeoutId('chat'));
        elements.chatContainer.addEventListener("mouseleave", () => ui.scheduleChatHidden());
    }
    if (elements.inputSection) {
        elements.inputSection.addEventListener("mouseenter", () => getState().clearTimeoutId('input'));
        elements.inputSection.addEventListener("mouseleave", () => ui.scheduleInputHidden());
    }


    // --- Action Button Listeners ---
    if (elements.memoryToggleButton) {
        elements.memoryToggleButton.addEventListener('click', () => {
            const isActive = elements.memoryToggleButton.classList.toggle('active');
            elements.memoryToggleButton.title = `Usar Memória (${isActive ? 'Ativado' : 'Desativado'})`;
        });
    }

    if (elements.contextMenuButton) {
        elements.contextMenuButton.addEventListener('click', () => core.handleContextCapture('screen'));
    }

    if (elements.thumbnailContainer) {
        elements.thumbnailContainer.addEventListener('click', ui.openContextModal);
    }

    // --- Input and Autocomplete Listeners ---
    if (elements.messageInput) {
        elements.messageInput.addEventListener('focus', () => getState().clearTimeoutId('input'));
        elements.messageInput.addEventListener('blur', () => ui.scheduleInputHidden());

        elements.messageInput.addEventListener('input', ui.autoResizeTextarea);
        elements.messageInput.addEventListener("input", () => {
            const value = elements.messageInput.value;
            const parts = value.split(" ");
            let newSuggestions = [];

            if (value.startsWith("/") && parts.length < 3) {
                if (parts.length === 1) {
                    const searchTerm = value.substring(1);
                    newSuggestions = getState().commands.filter((cmd) => cmd.command.substring(1).startsWith(searchTerm)).map((cmd) => ({ name: cmd.command, description: cmd.description, type: "command" }));
                } else if (parts.length === 2 && value.endsWith(" ")) {
                    const mainCommand = parts[0];
                    const commandData = getState().commands.find((cmd) => cmd.command === mainCommand);
                    if (commandData && commandData.subcommands) {
                        newSuggestions = Object.entries(commandData.subcommands).map(([name, description]) => ({ name, description, type: "subcommand" }));
                    }
                } else if (parts.length === 2 && !value.endsWith(" ")) {
                    const mainCommand = parts[0];
                    const subCommandSearch = parts[1];
                    const commandData = getState().commands.find((cmd) => cmd.command === mainCommand);
                    if (commandData && commandData.subcommands) {
                        newSuggestions = Object.entries(commandData.subcommands).filter(([name]) => name.startsWith(subCommandSearch)).map(([name, description]) => ({ name, description, type: "subcommand" }));
                    }
                }
            }
            
            getState().setSuggestions(newSuggestions);
            ui.renderSuggestions(core.selectSuggestion);
        });
        elements.messageInput.addEventListener("keydown", (event) => {
            if (!elements.autocompleteContainer.classList.contains("hidden")) {
                const suggestions = getState().currentSuggestions;
                let currentIndex = getState().selectedSuggestionIndex;

                if (event.key === "ArrowDown") {
                    event.preventDefault();
                    currentIndex = (currentIndex + 1) % suggestions.length;
                    getState().setSelectedSuggestionIndex(currentIndex);
                } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    currentIndex = (currentIndex - 1 + suggestions.length) % suggestions.length;
                    getState().setSelectedSuggestionIndex(currentIndex);
                } else if (event.key === "Enter" || event.key === "Tab") {
                    event.preventDefault();
                    if (currentIndex > -1) {
                        core.selectSuggestion(currentIndex);
                    } else { core.sendMessage(); }
                } else if (event.key === "Escape") {
                    ui.hideAutocomplete();
                }
                return;
            }
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                core.sendMessage();
            }
        });
        elements.messageInput.addEventListener("blur", () => { setTimeout(ui.hideAutocomplete, 150); });
    }

    // --- Mini Player Listeners ---
    if (elements.miniPlayerInfo) elements.miniPlayerInfo.addEventListener("click", () => window.api.send("player:show"));
    if (elements.miniPrevButton) elements.miniPrevButton.addEventListener("click", () => window.api.send("control-player-action", "prev"));
    if (elements.miniPlayPauseButton) elements.miniPlayPauseButton.addEventListener("click", () => window.api.send("control-player-action", "playPause"));
    if (elements.miniNextButton) elements.miniNextButton.addEventListener("click", () => window.api.send("control-player-action", "next"));
    if (elements.miniStopButton) {
        elements.miniStopButton.addEventListener("click", () => {
            getState().setPlayerManuallyStopped(true);
            if (getState().currentPlaybackState.isPlaying) {
                window.api.send("control-player-action", "playPause");
            }
            window.api.send("player:minimize");
        });
    }

    // --- Pomodoro Listeners ---
    if (elements.pomodoroStartPauseBtn) {
        elements.pomodoroStartPauseBtn.addEventListener("click", () => {
            const action = getState().currentPomodoroState === "running" ? "pause" : "start";
            window.api.send("pomodoro-control", action);
        });
    }
    if (elements.pomodoroResetBtn) {
        elements.pomodoroResetBtn.addEventListener("click", () => {
            window.api.send("pomodoro-control", "reset");
            ui.showPomodoroWidget(false);
        });
    }

    // --- Botões da UI principal que abrem modais ---
    if (elements.memoryWindowButton) {
        elements.memoryWindowButton.addEventListener("click", ui.openMemoryWindow);
    }
    if (elements.aiHubButton) {
        elements.aiHubButton.addEventListener('click', ui.openAiHub);
    }

    // --- Electron API Listeners (window.api) ---
    if (window.api) {
        window.api.on("window-focus-changed", ({ hasFocus }) => {
            getState().setWindowFocus(hasFocus);
            if (hasFocus) {
                getState().clearTimeoutId('chat');
                if (elements.chatContainer) elements.chatContainer.classList.remove("hidden");
            } else { 
                ui.scheduleChatHidden();
            }
        });
        window.api.on("meal-reminder", (message) => { ui.updateSpeechBubble(message, false); });
        
        window.api.on("playback-state-updated", (newState) => {
            getState().setPlaybackState(newState || { isPlaying: false });
        });

        window.api.on("list-response", (meetings) => { ui.renderMeetingList(meetings); });

        // --- LÓGICA DO POMODORO REATORA ---
        // Agora, os listeners apenas atualizam o estado central no store.
        window.api.on("pomodoro-tick", (data) => {
            store.getState().setPomodoroData(data);
        });
        window.api.on("pomodoro-state-changed", (data) => {
            // Também atualiza o estado antigo para manter o botão de play/pause funcionando
            getState().setPomodoroState(data.state);
            store.getState().setPomodoroData(data);
        });
        // --- FIM DA LÓGICA DO POMODORO ---

        window.api.on('ai-model-changed', (activeModel) => {
            if (activeModel) {
                ui.updateAiStatus();
                ui.updateSpeechBubble(`IA alterada para ${activeModel.name}.`, false);
            }
        });

        let currentMessageDiv = null;
        window.api.on('ai-chunk', (chunk) => {
            if (!currentMessageDiv) {
                ui.removeTypingIndicator();
                currentMessageDiv = ui.addMessageToChat("", "assistant");
            }
            ui.updateStreamedMessage(currentMessageDiv, chunk);
        });

        window.api.on('ai-stream-end', () => {
            ui.finalizeStreamedMessage(currentMessageDiv);
            currentMessageDiv = null; 
             ui.setInputState(false);
            ui.showInputSection();
        });

        window.api.on('memory:update-in-main-window', (selectionData) => {
            store.getState().updateMemorySelection(selectionData);
        });

        window.api.on('context:attachment-deleted', () => {
            ui.removeThumbnail();
        });

        // --- NOVO LISTENER PARA RECAPTURA ---
        window.api.on('context:do-recapture', (mode) => {
            core.handleContextCapture(mode);
        });
    }
}