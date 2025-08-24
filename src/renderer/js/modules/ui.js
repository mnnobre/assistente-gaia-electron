// =================================================================================
// MODULE: UI MANAGEMENT
// =================================================================================

import * as elements from './elements.js';
import { store } from './store.js';

export function setInputState(isLoading) {
    if (!elements.messageInput || !elements.sendButton || !elements.inputContainer) {
        return;
    }
    if (isLoading) {
        elements.messageInput.disabled = true;
        elements.sendButton.disabled = true;
        elements.inputContainer.classList.add('loading');
        addTypingIndicator();
    } else {
        removeTypingIndicator();
        elements.messageInput.disabled = false;
        elements.sendButton.disabled = false;
        elements.inputContainer.classList.remove('loading');
        setTimeout(() => elements.messageInput.focus(), 0);
    }
}

export function autoResizeTextarea() {
    if (!elements.messageInput) return;
    elements.messageInput.style.height = 'auto';
    elements.messageInput.style.height = elements.messageInput.scrollHeight + 'px';
    if (!elements.inputContainer || !elements.actionsBar || !elements.aiStatusBar || !elements.characterContainer || !elements.autocompleteContainer) return;
    const inputHeight = elements.inputContainer.offsetHeight;
    const actionsBarHeight = elements.actionsBar.offsetHeight;
    const aiBarHeight = elements.aiStatusBar.offsetHeight;
    const totalBarHeight = actionsBarHeight + inputHeight + aiBarHeight;
    elements.characterContainer.style.bottom = `${totalBarHeight}px`;
    elements.autocompleteContainer.style.bottom = `${totalBarHeight}px`;
}

export function removeThumbnail() {
    store.getState().detachImage();
    if (!elements.thumbnailContainer || !elements.contextMenuButton) return;
    elements.thumbnailContainer.innerHTML = '';
    elements.thumbnailContainer.classList.add('hidden');
    elements.contextMenuButton.classList.remove('active');
}

export function showThumbnail(imageData) {
    if (!imageData) {
        removeThumbnail();
        return;
    }
    if (!elements.thumbnailContainer || !elements.contextMenuButton) return;
    store.getState().attachImage(imageData);
    elements.thumbnailContainer.innerHTML = '';
    const img = document.createElement('img');
    img.src = imageData;
    const removeBtn = document.createElement('div');
    removeBtn.className = 'remove-thumbnail-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeThumbnail();
    });
    elements.thumbnailContainer.appendChild(img);
    elements.thumbnailContainer.appendChild(removeBtn);
    elements.thumbnailContainer.classList.remove('hidden');
    elements.contextMenuButton.classList.add('active');
}

export function renderSuggestions(onSelect) {
    if (!elements.autocompleteContainer) return;
    const getState = store.getState;
    elements.autocompleteContainer.innerHTML = "";
    if (getState().currentSuggestions.length === 0) {
        elements.autocompleteContainer.classList.add("hidden");
        return;
    }
    getState().currentSuggestions.forEach((suggestion, index) => {
        const el = document.createElement("div");
        el.classList.add("autocomplete-suggestion");
        el.innerHTML = `<span class="command">${suggestion.name}</span><span class="description">${suggestion.description}</span>`;
        el.addEventListener("click", () => onSelect(index));
        elements.autocompleteContainer.appendChild(el);
    });
    elements.autocompleteContainer.classList.remove("hidden");
    getState().setSelectedSuggestionIndex(-1);
}

export function updateSuggestionSelection() {
    if (!elements.autocompleteContainer) return;
    const getState = store.getState;
    const suggestionsElements = elements.autocompleteContainer.querySelectorAll(".autocomplete-suggestion");
    suggestionsElements.forEach((el, index) => {
        el.classList.toggle("selected", index === getState().selectedSuggestionIndex);
        if (index === getState().selectedSuggestionIndex) {
            el.scrollIntoView({ block: "nearest" });
        }
    });
}

export function updateMiniPlayerUI() {
    if (!elements.miniPlayer) return;
    const { currentPlaybackState, isPlayerManuallyStopped } = store.getState();
    const { getState } = store;
    if (isPlayerManuallyStopped) {
        elements.miniPlayer.classList.add("hidden");
        if(document.querySelector('#app-container')) document.querySelector('#app-container').style.bottom = '0px';
        showInputSection();
        return;
    }
    if (currentPlaybackState && currentPlaybackState.title) {
        elements.miniPlayer.classList.remove("hidden");
        if(elements.miniPlayerTitle) elements.miniPlayerTitle.innerHTML = `<span>${currentPlaybackState.title}</span>`;
        if(elements.miniPlayerArtist) elements.miniPlayerArtist.textContent = currentPlaybackState.artist || "Artista desconhecido";
        if(elements.miniPlayPauseButton) elements.miniPlayPauseButton.classList.toggle('is-playing', currentPlaybackState.isPlaying);
        if(document.querySelector('#app-container')) document.querySelector('#app-container').style.bottom = '60px';
        getState().clearTimeoutId('input');
        if(elements.inputSection) elements.inputSection.classList.remove("hidden");
    } else {
        elements.miniPlayer.classList.add("hidden");
        if(document.querySelector('#app-container')) document.querySelector('#app-container').style.bottom = '0px';
        showInputSection();
    }
}

export function addMessageToChat(text, sender, isHtml = false) {
    if (!elements.chatContainer) return null;
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender === "user" ? "user-message" : "assistant-message");
    const contentDiv = document.createElement("div");
    contentDiv.classList.add("message-content");
    messageDiv.appendChild(contentDiv);
    if (isHtml) {
        contentDiv.innerHTML = text;
    } else {
        contentDiv.textContent = text;
    }
    elements.chatContainer.prepend(messageDiv);
    showAndAutoHideChat();
    if (sender === "assistant") {
        messageDiv.dataset.fullText = text;
        if (text) {
             finalizeStreamedMessage(messageDiv);
        }
    }
    return messageDiv;
}

export async function updateStreamedMessage(messageDiv, chunk) {
    if (!messageDiv) return;
    const contentDiv = messageDiv.querySelector('.message-content');
    if (contentDiv) {
        if (!messageDiv.dataset.fullText) messageDiv.dataset.fullText = "";
        messageDiv.dataset.fullText += chunk;
        const { marked } = await import('../../../../node_modules/marked/lib/marked.esm.js');
        contentDiv.innerHTML = marked.parse(messageDiv.dataset.fullText);
    }
}

export function finalizeStreamedMessage(messageDiv) {
    if (!messageDiv || messageDiv.querySelector('.code-block-header')) return; 
    const fullText = messageDiv.dataset.fullText || messageDiv.querySelector('.message-content').innerText;
    const copyButton = document.createElement("button");
    copyButton.classList.add("copy-button");
    copyButton.innerHTML = "Copiar";
    copyButton.addEventListener("click", (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(fullText).then(() => {
            copyButton.textContent = "Copiado!";
            setTimeout(() => { copyButton.textContent = "Copiar"; }, 2000);
        });
    });
    messageDiv.appendChild(copyButton);
    messageDiv.querySelectorAll('pre').forEach(preBlock => {
        const codeText = preBlock.querySelector('code').innerText;
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        const header = document.createElement('div');
        header.className = 'code-block-header';
        const languageLabel = document.createElement('span');
        languageLabel.className = 'language-label';
        languageLabel.innerHTML = '&lt;>&nbsp;Code';
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'code-block-actions';
        const expandButton = document.createElement("button");
        expandButton.className = "code-action-button";
        expandButton.title = "Expandir em nova janela";
        expandButton.innerHTML = "↗️";
        expandButton.addEventListener("click", (e) => {
            e.stopPropagation();
            openModal({ view: 'code-viewer', width: 800, height: 700, data: { code: encodeURIComponent(codeText) } });
        });
        const copyCodeButton = document.createElement("button");
        copyCodeButton.className = "code-action-button";
        copyCodeButton.title = "Copiar código";
        copyCodeButton.innerHTML = "📋";
        copyCodeButton.addEventListener("click", (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(codeText).then(() => {
                copyCodeButton.innerHTML = "✅";
                setTimeout(() => { copyCodeButton.innerHTML = "📋"; }, 2000);
            });
        });
        const collapseButton = document.createElement("button");
        collapseButton.className = "code-action-button";
        collapseButton.title = "Recolher/Expandir";
        collapseButton.innerHTML = "🔼";
        collapseButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isCollapsed = wrapper.classList.toggle('collapsed');
            collapseButton.innerHTML = isCollapsed ? '🔽' : '🔼';
        });
        actionsContainer.appendChild(expandButton);
        actionsContainer.appendChild(copyCodeButton);
        actionsContainer.appendChild(collapseButton);
        header.appendChild(languageLabel);
        header.appendChild(actionsContainer);
        preBlock.parentNode.replaceChild(wrapper, preBlock);
        wrapper.appendChild(header);
        wrapper.appendChild(preBlock);
    });
    updateSpeechBubble(fullText.substring(0, 120) + "...", false);
}

export function renderMeetingList(meetings) {
    if (!elements.chatContainer) return;
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", "assistant-message");
    const listWrapper = document.createElement("div");
    listWrapper.classList.add("meeting-list-wrapper");
    meetings.forEach((meeting) => {
        const item = document.createElement("div");
        item.classList.add("meeting-list-item");
        const textSpan = document.createElement("span");
        const formattedDate = new Date(meeting.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
        textSpan.textContent = `[ID: ${meeting.id}] - ${meeting.title} (${formattedDate})`;
        const button = document.createElement("button");
        button.classList.add("meeting-show-button");
        button.title = `Visualizar Reunião ID ${meeting.id}`;
        button.innerHTML = "👁️";
        button.addEventListener("click", () => {
            const command = `/reuniao mostrar ${meeting.id}`;
            addMessageToChat(command, "user", false);
            window.api.sendMessageToAI({ userInput: command, manualContext: '' });
        });
        item.appendChild(textSpan);
        item.appendChild(button);
        listWrapper.appendChild(item);
    });
    messageDiv.appendChild(listWrapper);
    elements.chatContainer.prepend(messageDiv);
    showAndAutoHideChat();
}

export function addTypingIndicator() {
    if (document.getElementById("typing-indicator")) return;
    if (!elements.chatContainer) return;
    const messageDiv = document.createElement("div");
    messageDiv.id = "typing-indicator";
    messageDiv.classList.add("message", "assistant-message");
    messageDiv.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
    elements.chatContainer.prepend(messageDiv);
    showAndAutoHideChat();
}

export function removeTypingIndicator() {
    const indicator = document.getElementById("typing-indicator");
    if (indicator) {
        indicator.remove();
    }
}

export function hideInputSection() {
    if (elements.inputSection) elements.inputSection.classList.add("hidden");
}

export function showInputSection() {
    if (elements.inputSection) elements.inputSection.classList.remove("hidden");
}

export function scheduleInputHidden() {
    const { getState } = store;
    getState().setTimeoutId('input', setTimeout(hideInputSection, 20000));
}

export function hideChat() {
    if (elements.chatContainer) elements.chatContainer.classList.add("hidden");
}

export function showAndAutoHideChat() {
    const { getState } = store;
    if (!elements.chatContainer) return;
    getState().clearTimeoutId('chat'); 
    elements.chatContainer.classList.remove("hidden");
}

export function scheduleChatHidden() {
    const { getState } = store;
    if (!getState().hasWindowFocus) {
        getState().setTimeoutId('chat', setTimeout(hideChat, 20000));
    }
}

function hideSpeechBubble() {
    const speechBubble = document.getElementById('speech-bubble');
    if (speechBubble) {
        speechBubble.parentElement.parentElement.classList.add('hidden');
    }
    store.getState().clearTimeoutId('bubble');
}

export function scheduleBubbleHide() {
    store.getState().setTimeoutId('bubble', setTimeout(hideSpeechBubble, 60000));
}

export function updateSpeechBubble(text, isLoading = false) {
    const speechBubbleContainer = document.getElementById('speech-bubble-container');
    const speechBubbleText = document.getElementById('speech-bubble-text');
    const speechBubbleClose = document.getElementById('speech-bubble-close');

    if (!speechBubbleContainer || !speechBubbleText) return;

    store.getState().clearTimeoutId('bubble');
    
    speechBubbleText.textContent = text;
    speechBubbleContainer.classList.remove("hidden");

    if (speechBubbleClose && !speechBubbleClose.dataset.listenerAttached) {
        speechBubbleClose.addEventListener('click', hideSpeechBubble);
        speechBubbleClose.dataset.listenerAttached = 'true';
    }

    if (!isLoading) {
        scheduleBubbleHide();
    }
}

function updatePomodoroPosition() {
    if (!elements.pomodoroWidget || !elements.chatContainer) return;
    if (elements.pomodoroWidget.classList.contains("hidden")) return;
    let pomodoroBottomPosition;
    if (!elements.chatContainer.classList.contains("hidden")) {
        const chatRect = elements.chatContainer.getBoundingClientRect();
        pomodoroBottomPosition = window.innerHeight - chatRect.top + 16;
    } else {
        pomodoroBottomPosition = 276;
    }
    elements.pomodoroWidget.style.bottom = `${pomodoroBottomPosition}px`;
}

function animationLoop() {
    updatePomodoroPosition();
    const newId = requestAnimationFrame(animationLoop);
    store.getState().setPomodoroAnimationId(newId);
}

export function showPomodoroWidget(show) {
    const getState = store.getState;
    if (!elements.pomodoroWidget) return;
    if (show) {
        elements.pomodoroWidget.classList.remove("hidden");
        if (!getState().pomodoroAnimationId) {
            animationLoop();
        }
    } else {
        elements.pomodoroWidget.classList.add("hidden");
        if (getState().pomodoroAnimationId) {
            cancelAnimationFrame(getState().pomodoroAnimationId);
            getState().setPomodoroAnimationId(null);
        }
    }
}

export function updatePomodoroWidget(data) {
    if (!elements.pomodoroWidget || !elements.pomodoroTime || !elements.progressRing || !elements.pomodoroState || !elements.pomodoroStartPauseBtn) return;
    const minutes = Math.floor(data.timeLeft / 60);
    const seconds = data.timeLeft % 60;
    elements.pomodoroTime.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const offset = elements.circumference - (data.timeLeft / data.totalTime) * elements.circumference;
    elements.progressRing.style.strokeDashoffset = offset;
    const modeMap = { focus: "Foco", short_break: "Pausa Curta", long_break: "Pausa Longa" };
    elements.pomodoroState.textContent = modeMap[data.mode] || "Foco";
    elements.pomodoroStartPauseBtn.textContent = data.state === "running" ? "⏸️ Pausar" : "▶️ Iniciar";
}

export function openModal(options) {
    window.api.send('modal:open', options);
}

export function openMemoryWindow() {
    const { getState } = store;
    openModal({
        view: 'memory',
        width: 600,
        height: 700,
        data: {
            initialSelection: JSON.stringify(Array.from(getState().selectedMemoryContent.keys()))
        }
    });
}

export function openAiHub() {
    // --- CORREÇÃO DO TAMANHO ---
    // Aumentamos a altura para acomodar melhor o conteúdo das abas.
    openModal({ view: 'ai-hub', width: 450, height: 550 });
}

export function openContextModal() {
    const { getState } = store;
    const imageData = getState().attachedImageData;
    if (!imageData) return;
    openModal({
        view: 'context-viewer',
        width: 700,
        height: 600,
        data: {
            imageData: encodeURIComponent(imageData)
        }
    });
}

export async function updateAiStatus() {
    const activeModel = await window.api.ai.getActiveModel();
    if (activeModel && elements.aiStatusText) {
        elements.aiStatusText.textContent = `IA Ativa: ${activeModel.name}`;
    } else if (elements.aiStatusText) {
        elements.aiStatusText.textContent = `IA Inativa`;
    }
}

export function hideAutocomplete() {
    if (!elements.autocompleteContainer) return;
    store.getState().clearSuggestions();
    elements.autocompleteContainer.classList.add("hidden");
}