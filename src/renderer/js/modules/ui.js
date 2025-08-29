// /src/renderer/js/modules/ui.js (Refatorado para Piper TTS)
// =================================================================================
// MODULE: UI MANAGEMENT
// =================================================================================

import * as elements from './elements.js';
import { store } from './store.js';
import { marked } from '../vendor/marked.esm.js'; 
import { selectIsMiniPlayerVisible } from './storeSlices/playerSlice.js';
import VisibilityManager from './VisibilityManager.js';
import { checkVisibility } from './visibilityRules.js';

// =================================================================================
// NEW: MÓDULO DE TEXT-TO-SPEECH (TTS) COM PIPER
// =================================================================================

let ttsButton = null;
let isTtsEnabled = true;
let isActuallySpeaking = false;
// --- INÍCIO DA ALTERAÇÃO ---
let audioContext = null; // Contexto de áudio global
let currentAudioSource = null; // Referência à fonte de áudio atual para podermos pará-la
// --- FIM DA ALTERAÇÃO ---
const ttsIcon = '🔊';

/**
 * Toca um buffer de áudio recebido do processo principal usando a Web Audio API.
 * @param {Buffer} audioBuffer - O buffer de áudio em formato .wav.
 */
async function playAudio(audioBuffer) {
    if (!audioBuffer) return;
    
    cancelSpeech();

    // Inicializa o AudioContext no primeiro uso (requer interação do usuário)
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    try {
        // O IPC do Electron pode serializar o Buffer. Precisamos garantir que seja um ArrayBuffer.
        const arrayBuffer = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength);

        // Decodifica os dados de áudio brutos para um formato que a placa de som entende.
        const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);

        currentAudioSource = audioContext.createBufferSource();
        currentAudioSource.buffer = decodedAudio;
        currentAudioSource.connect(audioContext.destination);
        
        isActuallySpeaking = true;
        updateTtsButtonUI();
        
        currentAudioSource.onended = () => {
            isActuallySpeaking = false;
            window.api.send('tts:playback-finished');
            updateTtsButtonUI();
            currentAudioSource = null;
        };

        currentAudioSource.start(0);

    } catch (e) {
        console.error("Erro ao decodificar ou tocar áudio com AudioContext:", e);
        // Garante que o estado seja resetado em caso de erro.
        isActuallySpeaking = false;
        window.api.send('tts:playback-finished');
        updateTtsButtonUI();
    }
}

/**
 * Para a reprodução de áudio atual.
 */
export function cancelSpeech() {
    if (currentAudioSource) {
        currentAudioSource.stop(); // .stop() é o método para interromper a fonte no AudioContext
        // O evento 'onended' será disparado automaticamente, limpando o estado.
    }
}
// --- FIM DA SEÇÃO ALTERADA ---

/**
 * Atualiza o estado visual do botão TTS (cor, animação).
 */
function updateTtsButtonUI() {
    if (!ttsButton) return;
    ttsButton.classList.toggle('active', isTtsEnabled);
    ttsButton.classList.toggle('speaking', isActuallySpeaking);
    ttsButton.title = `Síntese de Voz (${isTtsEnabled ? 'Ativada' : 'Desativada'})`;
}

/**
 * Lida com o clique no botão TTS, implementando a lógica de interrupção/toggle.
 */
function handleTtsButtonClick() {
    if (isActuallySpeaking) {
        cancelSpeech();
    } else {
        isTtsEnabled = !isTtsEnabled;
        window.api.send('tts:set-enabled', { isEnabled: isTtsEnabled });
        updateTtsButtonUI();
    }
}

/**
 * Cria o botão TTS, o insere no DOM e configura os listeners da API.
 */
export function setupTts() {
    if (document.getElementById('tts-toggle-button')) return;

    ttsButton = document.createElement('button');
    ttsButton.id = 'tts-toggle-button';
    ttsButton.className = 'action-button tts-pulse';
    ttsButton.innerHTML = ttsIcon;

    const memoryButton = elements.memoryWindowButton;
    if (memoryButton) {
        memoryButton.parentElement.insertBefore(ttsButton, memoryButton);
    }

    ttsButton.addEventListener('click', handleTtsButtonClick);

    window.api.on('tts:play-audio', (audioBuffer) => {
        if (isTtsEnabled) {
            playAudio(audioBuffer);
        }
    });
    window.api.on('tts:cancel', () => cancelSpeech());

    window.api.on('tts:speaking-state-changed', ({ isSpeaking }) => {
        isActuallySpeaking = isSpeaking;
        updateTtsButtonUI();
    });

    elements.messageInput.addEventListener('input', () => {
        if (isActuallySpeaking) {
            cancelSpeech();
        }
    });
    
    window.api.send('tts:set-enabled', { isEnabled: isTtsEnabled });
    updateTtsButtonUI();
}

// =================================================================================
// SEÇÃO DE UI EXISTENTE (SEM ALTERAÇÕES)
// =================================================================================

export function addMessageToChat(text, sender, { imageData = null, isHtml = false } = {}) {
    if (!elements.chatContainer) return null;

    if (sender === 'assistant') {
        cancelSpeech();
    }

    const activeModel = store.getState().ai.activeModel;
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const messageWrapper = document.createElement('div');
    messageWrapper.className = sender === 'user' ? 'chat chat-end' : 'chat chat-start';

    const bubbleColor = sender === 'user' ? 'chat-bubble-primary' : '';
    const senderName = sender === 'user' ? 'Você' : (activeModel?.name || 'Assistente');
    
    const finalContent = (sender === 'assistant' && text === '')
        ? '<span class="loading loading-dots loading-md"></span>'
        : (isHtml ? text : escapeHtml(text));

    const dropdownMenuHTML = `
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-300 rounded-box w-32">
            <li><a class="action-copy">Copiar</a></li>
        </ul>
    `;
    const dropdownPosition = sender === 'user' ? 'dropdown-left' : 'dropdown-right';
    const dropdownHTML = `
        <div class="dropdown ${dropdownPosition}">
            <div tabindex="0" role="button" class="btn btn-ghost btn-circle btn-xs">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
            </div>
            ${dropdownMenuHTML}
        </div>
    `;
    
    const bubbleHTML = `
        <div class="chat-bubble ${bubbleColor}">
            ${imageData ? `<img src="${imageData}" class="rounded-lg mb-2 max-w-xs" alt="Contexto enviado">` : ''}
            <div class="message-content">${finalContent}</div>
        </div>
    `;

    const messageContentWrapper = document.createElement('div');
    messageContentWrapper.className = 'flex items-center gap-1';
    if (sender === 'user') {
        messageContentWrapper.innerHTML = dropdownHTML + bubbleHTML;
    } else {
        messageContentWrapper.innerHTML = bubbleHTML + dropdownHTML;
    }
    
    messageWrapper.innerHTML = `
        <div class="chat-header">
            ${senderName}
            <time class="text-xs opacity-50 ml-2">${timeString}</time>
        </div>
    `;
    messageWrapper.appendChild(messageContentWrapper);

    elements.chatContainer.prepend(messageWrapper);
    showAndAutoHideChat();

    if (sender === "assistant") {
        const bubble = messageWrapper.querySelector('.chat-bubble');
        bubble.dataset.fullText = text;
        if (text) {
             finalizeStreamedMessage(messageWrapper);
        }
    }
    
    return messageWrapper;
}


export async function updateStreamedMessage(messageWrapper, chunk) {
    if (!messageWrapper) return;
    const contentDiv = messageWrapper.querySelector('.chat-bubble .message-content');
    if (contentDiv) {
        const bubble = contentDiv.closest('.chat-bubble');
        
        if (!bubble.dataset.fullText) {
            bubble.dataset.fullText = "";
            contentDiv.innerHTML = "";
        }
        
        bubble.dataset.fullText += chunk;
        contentDiv.innerHTML = marked.parse(bubble.dataset.fullText);
    }
}

export function finalizeStreamedMessage(messageWrapper) {
    if (!messageWrapper) return;
    const bubble = messageWrapper.querySelector('.chat-bubble');
    if (!bubble || bubble.dataset.finalized) return;
    
    bubble.querySelectorAll('pre').forEach((preBlock) => {
        if (preBlock.parentElement.classList.contains('mockup-code')) return;
        const codeText = preBlock.querySelector('code').innerText;
        const mockupDiv = document.createElement('div');
        mockupDiv.className = 'mockup-code before:hidden my-2';
        mockupDiv.innerHTML = `<pre><code>${escapeHtml(codeText)}</code></pre>`;
        const header = document.createElement('div');
        header.className = 'code-block-header';
        header.innerHTML = `
            <span class="language-label">&lt;>&nbsp;Code</span>
            <div class="code-block-actions">
                <button class="btn btn-xs btn-ghost" title="Expandir em nova janela">↗️</button>
                <button class="btn btn-xs btn-ghost" title="Copiar código">📋</button>
            </div>
        `;
        header.querySelector('[title="Expandir em nova janela"]').addEventListener('click', (e) => {
            e.stopPropagation();
            openModal({ view: 'code-viewer', width: 800, height: 700, data: { code: encodeURIComponent(codeText) } });
        });
        const copyBtn = header.querySelector('[title="Copiar código"]');
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(codeText).then(() => {
                copyBtn.innerHTML = "✅";
                setTimeout(() => { copyBtn.innerHTML = "📋"; }, 2000);
            });
        });
        mockupDiv.prepend(header);
        preBlock.replaceWith(mockupDiv);
    });
    const fullText = bubble.dataset.fullText || "";
    
    updateSpeechBubble(fullText.substring(0, 120) + (fullText.length > 120 ? "..." : ""), false);
    bubble.dataset.finalized = "true";
}

function escapeHtml(unsafe) { return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

export function setInputState(isLoading) { 
    if (!elements.messageInput || !elements.sendButton || !elements.inputContainer) return; 
    if (isLoading) { 
        elements.messageInput.disabled = true; 
        elements.sendButton.disabled = true; 
        elements.inputContainer.classList.add('loading');
    } else { 
        elements.messageInput.disabled = false; 
        elements.sendButton.disabled = false; 
        elements.inputContainer.classList.remove('loading'); 
        setTimeout(() => elements.messageInput.focus(), 0); 
    } 
}

export function autoResizeTextarea() { if (!elements.messageInput) return; elements.messageInput.style.height = 'auto'; elements.messageInput.style.height = elements.messageInput.scrollHeight + 'px'; if (!elements.inputContainer || !elements.actionsBar || !elements.aiStatusBar || !elements.characterContainer || !elements.autocompleteContainer) return; const inputHeight = elements.inputContainer.offsetHeight; const actionsBarHeight = elements.actionsBar.offsetHeight; const aiBarHeight = elements.aiStatusBar.offsetHeight; const totalBarHeight = actionsBarHeight + inputHeight + aiBarHeight; elements.characterContainer.style.bottom = `${totalBarHeight}px`; elements.autocompleteContainer.style.bottom = `${totalBarHeight}px`; }
export function removeThumbnail() { store.getState().detachImage(); if (!elements.thumbnailContainer || !elements.contextMenuButton) return; elements.thumbnailContainer.innerHTML = ''; elements.thumbnailContainer.classList.add('hidden'); elements.contextMenuButton.classList.remove('active'); }
export function showThumbnail(imageData) { if (!imageData) { removeThumbnail(); return; } if (!elements.thumbnailContainer || !elements.contextMenuButton) return; store.getState().attachImage(imageData); elements.thumbnailContainer.innerHTML = ''; const img = document.createElement('img'); img.src = imageData; const removeBtn = document.createElement('div'); removeBtn.className = 'remove-thumbnail-btn'; removeBtn.innerHTML = '&times;'; removeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeThumbnail(); }); elements.thumbnailContainer.appendChild(img); elements.thumbnailContainer.appendChild(removeBtn); elements.thumbnailContainer.classList.remove('hidden'); elements.contextMenuButton.classList.add('active'); }
export function renderSuggestions(onSelect) { if (!elements.autocompleteContainer) return; const getState = store.getState; elements.autocompleteContainer.innerHTML = ""; if (getState().currentSuggestions.length === 0) { elements.autocompleteContainer.classList.add("hidden"); return; } getState().currentSuggestions.forEach((suggestion, index) => { const el = document.createElement("div"); el.classList.add("autocomplete-suggestion"); el.innerHTML = `<span class="command">${suggestion.name}</span><span class="description">${suggestion.description}</span>`; el.addEventListener("click", () => onSelect(index)); elements.autocompleteContainer.appendChild(el); }); elements.autocompleteContainer.classList.remove("hidden"); getState().setSelectedSuggestionIndex(-1); }

export function updateSuggestionSelection() { 
    if (!elements.autocompleteContainer) return;
    const { selectedSuggestionIndex } = store.getState();
    const suggestionsElements = elements.autocompleteContainer.querySelectorAll(".autocomplete-suggestion"); 
    
    suggestionsElements.forEach((el, index) => { 
        el.classList.toggle("selected", index === selectedSuggestionIndex); 
        if (index === selectedSuggestionIndex) { 
            el.scrollIntoView({ block: "nearest" }); 
        } 
    }); 
}

export function updateMiniPlayerUI() { 
    if (!elements.miniPlayer) return; 

    const state = store.getState();
    const isVisible = selectIsMiniPlayerVisible(state);

    elements.miniPlayer.classList.toggle("hidden", !isVisible);

    if (document.querySelector('#app-container')) {
        document.querySelector('#app-container').style.bottom = isVisible ? '60px' : '0px';
    }

    if (isVisible) {
        const { currentPlaybackState } = state;
        if (elements.miniPlayerTitle) elements.miniPlayerTitle.innerHTML = `<span>${currentPlaybackState.title}</span>`; 
        if (elements.miniPlayerArtist) elements.miniPlayerArtist.textContent = currentPlaybackState.artist || "Artista desconhecido"; 
        if (elements.miniPlayPauseButton) elements.miniPlayPauseButton.classList.toggle('is-playing', currentPlaybackState.isPlaying); 
        
        VisibilityManager.clear('input'); 
        if (elements.inputSection) elements.inputSection.classList.remove("hidden"); 
    } else {
        showInputSection();
    }
}
export function renderMeetingList(meetings) { if (!elements.chatContainer) return; const messageDiv = document.createElement("div"); messageDiv.classList.add("chat", "chat-start"); const listWrapper = document.createElement("div"); listWrapper.className = "chat-bubble"; listWrapper.innerHTML = '<h3>Reuniões Gravadas</h3>'; meetings.forEach((meeting) => { const item = document.createElement("div"); item.classList.add("meeting-list-item"); const textSpan = document.createElement("span"); const formattedDate = new Date(meeting.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); textSpan.textContent = `[ID: ${meeting.id}] - ${meeting.title} (${formattedDate})`; const button = document.createElement("button"); button.className = "btn btn-xs btn-ghost"; button.title = `Visualizar Reunião ID ${meeting.id}`; button.innerHTML = "👁️"; button.addEventListener("click", () => { const command = `/reuniao mostrar ${meeting.id}`; addMessageToChat(command, "user"); window.api.sendMessageToAI({ userInput: command, manualContext: '' }); }); item.appendChild(textSpan); item.appendChild(button); listWrapper.appendChild(item); }); messageDiv.appendChild(listWrapper); elements.chatContainer.prepend(messageDiv); showAndAutoHideChat(); }
export function hideInputSection() { if (elements.inputSection) elements.inputSection.classList.add("hidden"); }
export function showInputSection() { if (elements.inputSection) elements.inputSection.classList.remove("hidden"); }
export function scheduleInputHidden() { VisibilityManager.schedule('input', hideInputSection, 20000); }
export function hideChat() { if (elements.chatContainer) elements.chatContainer.classList.add("hidden"); }
export function showAndAutoHideChat() { 
    VisibilityManager.clear('chat');
    if (elements.chatContainer) elements.chatContainer.classList.remove("hidden");
}
export function scheduleChatHidden() { 
    if (checkVisibility('scheduleChatHidden')) {
        VisibilityManager.schedule('chat', hideChat, 20000); 
    }
}
function hideSpeechBubble() { 
    if (elements.speechBubbleContainer) elements.speechBubbleContainer.classList.add('hidden'); 
    VisibilityManager.clear('bubble'); 
}
export function scheduleBubbleHide() { VisibilityManager.schedule('bubble', hideSpeechBubble, 60000); }
export function updateSpeechBubble(text, isLoading = false) { 
    if (!elements.speechBubbleContainer || !elements.speechBubbleText) return; 
    VisibilityManager.clear('bubble'); 
    elements.speechBubbleText.textContent = text; 
    elements.speechBubbleContainer.classList.remove("hidden"); 
    if (elements.speechBubbleClose && !elements.speechBubbleClose.dataset.listenerAttached) { 
        elements.speechBubbleClose.addEventListener('click', hideSpeechBubble); 
        elements.speechBubbleClose.dataset.listenerAttached = 'true'; 
    } 
    if (!isLoading) { 
        scheduleBubbleHide(); 
    } 
}
function animationLoop() { const newId = requestAnimationFrame(animationLoop); store.getState().setPomodoroAnimationId(newId); }
export function showPomodoroWidget(show) { if (!elements.pomodoroWidget) return; if (show) { elements.pomodoroWidget.classList.remove("hidden"); if (!store.getState().pomodoroAnimationId) { animationLoop(); } } else { elements.pomodoroWidget.classList.add("hidden"); if (store.getState().pomodoroAnimationId) { cancelAnimationFrame(store.getState().pomodoroAnimationId); store.getState().setPomodoroAnimationId(null); } } }
export function updatePomodoroWidget(data) { if (!elements.pomodoroWidget || !elements.pomodoroTime || !elements.progressRing || !elements.pomodoroState || !elements.pomodoroStartPauseBtn) return; const minutes = Math.floor(data.timeLeft / 60); const seconds = data.timeLeft % 60; elements.pomodoroTime.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`; const offset = elements.circumference - (data.timeLeft / data.totalTime) * elements.circumference; elements.progressRing.style.strokeDashoffset = offset; const modeMap = { focus: "Foco", short_break: "Pausa Curta", long_break: "Pausa Longa", leisure: "Lazer" }; elements.pomodoroState.textContent = modeMap[data.mode] || "Foco"; elements.pomodoroStartPauseBtn.textContent = data.state === "running" ? "⏸️ Pausar" : "▶️ Iniciar"; }
export function openModal(options) { window.api.send('modal:open', options); }
export function openMemoryWindow() { openModal({ view: 'memory', width: 600, height: 700, data: { initialSelection: JSON.stringify(Array.from(store.getState().selectedMemoryContent.keys())) } }); }
export function openAiHub() { openModal({ view: 'ai-hub', width: 450, height: 550 }); }
export function openContextModal() { const imageData = store.getState().attachedImageData; if (!imageData) return; openModal({ view: 'context-viewer', width: 700, height: 600, data: { imageData: encodeURIComponent(imageData) } }); }
export async function updateAiStatus() { const activeModel = await window.api.ai.getActiveModel(); if(activeModel) { store.getState().setActiveModel(activeModel); } if (activeModel && elements.aiStatusText) { elements.aiStatusText.textContent = `IA Ativa: ${activeModel.name}`; } else if (elements.aiStatusText) { elements.aiStatusText.textContent = `IA Inativa`; } }
export function hideAutocomplete() { if (!elements.autocompleteContainer) return; store.getState().clearSuggestions(); elements.autocompleteContainer.classList.add("hidden"); }

export function updateCommandModeUI(activeCommandMode) {
    if (!elements.inputContainer || !elements.messageInput) return;

    const existingBadge = document.getElementById('command-mode-badge');
    if (existingBadge) existingBadge.remove();

    if (activeCommandMode) {
        elements.inputContainer.classList.add('command-mode-active');
        const badge = document.createElement('div');
        badge.id = 'command-mode-badge';
        badge.innerHTML = `<span>${activeCommandMode}</span><button id="exit-mode-btn">&times;</button>`;
        elements.inputContainer.prepend(badge);

        elements.messageInput.placeholder = 'Digite o restante do comando...';
        elements.messageInput.focus();

        document.getElementById('exit-mode-btn').addEventListener('click', () => {
            store.getState().setActiveCommandMode(null);
        });
    } else {
        elements.inputContainer.classList.remove('command-mode-active');
        elements.messageInput.placeholder = 'Digite sua mensagem...';
    }
}