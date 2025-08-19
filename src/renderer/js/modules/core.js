// =================================================================================
// MODULE: CORE INTERACTION LOGIC
// Descrição: Contém a lógica principal da aplicação.
// =================================================================================

import * as elements from './elements.js';
import { store } from './store.js';
import * as ui from './ui.js';

export async function handleContextCapture(mode) {
    let imageData = null;
    ui.updateSpeechBubble("Capturando tela...", true);

    try {
        switch (mode) {
            case 'screen':
                imageData = await window.api.context.captureScreen();
                break;
            case 'window':
                imageData = await window.api.context.captureActiveWindow();
                break;
            case 'selection':
                imageData = await window.api.context.captureSelection();
                break;
        }
    } catch (error) {
        console.error(`Falha ao capturar no modo ${mode}:`, error);
    }

    if (imageData) {
        ui.showThumbnail(imageData);
        ui.updateSpeechBubble("Contexto visual anexado!", false);
    } else {
        ui.removeThumbnail();
        ui.updateSpeechBubble("Captura cancelada ou falhou.", false);
    }
}

export async function sendMessage() {
    const getState = store.getState;
    if (!elements.messageInput || elements.messageInput.disabled) return; 
    
    const userInput = elements.messageInput.value.trim();
    if (userInput === "" && !getState().attachedImageData) return;

    ui.hideAutocomplete();
    // Apenas para comandos, a mensagem do usuário não é salva no histórico principal do DB
    // mas ainda é adicionada visualmente ao chat.
    ui.addMessageToChat(userInput, "user", false);

    elements.messageInput.value = "";
    ui.autoResizeTextarea();
    
    ui.setInputState(true); // Desabilita o input e mostra o indicador de digitação
    ui.updateSpeechBubble("Processando...", true);

    try {
        let manualContext = "";
        if (elements.memoryToggleButton.classList.contains('active') && getState().selectedMemoryContent.size > 0) {
            manualContext = Array.from(getState().selectedMemoryContent.values()).join('\n');
        }

        const imageDataToSend = getState().attachedImageData ? getState().attachedImageData.split(',')[1] : null;

        const result = await window.api.sendMessageToAI({ userInput, manualContext, imageData: imageDataToSend });
        
        ui.removeThumbnail(); // Limpa o anexo de imagem após o envio

        // --- INÍCIO DA LÓGICA DE RESPOSTA REATORADA ---

        // CASO 1: A resposta é um STREAM da IA da nuvem.
        // O `main.js` retorna `action: "stream_started"`. A UI fica bloqueada e espera
        // pelo evento `ai-stream-end` para ser desbloqueada.
        if (result.action === "stream_started") {
            return;
        }
        
        // CASO 2: A resposta é de um PLUGIN ou da G.A.I.A. (Não-streaming).
        // O `main.js` agora retorna um objeto com `type: 'final_action'`.
        if (result.type === 'final_action') {
            const bubbleText = result.text || "Ação concluída.";

            if (result.action === 'suppress_chat_response') {
                // Se a ação não deve mostrar nada no chat, apenas atualizamos o balão de fala.
                ui.updateSpeechBubble(bubbleText, false);
            } else if (result.html) {
                // Se houver conteúdo HTML, nós o adicionamos ao chat.
                const messageDiv = ui.addMessageToChat(result.html, "assistant", true);
                ui.finalizeStreamedMessage(messageDiv);
                // Usamos o texto sem formatação para o balão, se disponível.
                ui.updateSpeechBubble(result.text || result.html.replace(/<[^>]*>?/gm, ''), false); 
            } else if (result.error) {
                // Se for uma mensagem de erro.
                const messageDiv = ui.addMessageToChat(result.error, "assistant", false);
                ui.finalizeStreamedMessage(messageDiv);
                ui.updateSpeechBubble(result.error, false);
            }

            // A parte MAIS IMPORTANTE: Desbloqueia a UI para respostas FINAIS.
            ui.setInputState(false); 
            ui.showInputSection();
            return; // Encerra a função aqui.
        }
        
        // --- FIM DA LÓGICA DE RESPOSTA REATORADA ---

    } catch (error) {
        console.error("Erro ao enviar mensagem para a IA:", error);
        ui.addMessageToChat("Ocorreu um erro crítico ao processar sua solicitação.", "assistant", false);
        
        // Garante que a UI seja reativada em caso de erro.
        ui.setInputState(false);
        ui.showInputSection();
    }
}

export function selectSuggestion(index) {
    const getState = store.getState;
    const suggestions = getState().currentSuggestions;

    if (index > -1 && index < suggestions.length) {
        const suggestion = suggestions[index];
        if (suggestion.type === "command") {
            elements.messageInput.value = suggestion.name;
        } else {
            const parts = elements.messageInput.value.split(" ");
            parts[1] = suggestion.name;
            elements.messageInput.value = parts.slice(0, 2).join(" ");
        }
        elements.messageInput.focus();
        ui.hideAutocomplete();
    }
}