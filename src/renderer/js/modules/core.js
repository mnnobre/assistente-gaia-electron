// =================================================================================
// MODULE: CORE INTERACTION LOGIC (CORRIGIDO PARA O NOVO CHAT)
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
    const { getState, setState } = store;
    if (!elements.messageInput || elements.messageInput.disabled) return; 
    
    const userInputText = elements.messageInput.value.trim();
    const activeCommand = getState().activeCommandMode;
    // Pega a imagem anexada ANTES de enviá-la, para que possamos exibi-la no chat.
    const attachedImageData = getState().attachedImageData;

    // --- INÍCIO DA CORREÇÃO ---
    // Constrói o comando final
    let finalUserInput;
    if (activeCommand) {
        finalUserInput = `${activeCommand} ${userInputText}`.trim();
        // Não exibe a imagem aqui, pois o comando ativo tem precedência
        ui.addMessageToChat(finalUserInput, "user"); 
    } else {
        finalUserInput = userInputText;
        // Exibe o texto do usuário JUNTO com a imagem que foi anexada
        ui.addMessageToChat(userInputText, "user", { imageData: attachedImageData });
    }

    if (finalUserInput === "" && !attachedImageData) return;

    elements.messageInput.value = "";
    ui.autoResizeTextarea();
    if (activeCommand) {
        setState({ activeCommandMode: null });
    }
    // --- FIM DA CORREÇÃO ---

    ui.hideAutocomplete();
    ui.setInputState(true); 
    ui.updateSpeechBubble("Processando...", true);

    try {
        let manualContext = "";
        if (elements.memoryToggleButton.classList.contains('active') && getState().selectedMemoryContent.size > 0) {
            manualContext = Array.from(getState().selectedMemoryContent.values()).join('\n');
        }

        const imageDataToSend = attachedImageData ? attachedImageData.split(',')[1] : null;

        const result = await window.api.sendMessageToAI({ userInput: finalUserInput, manualContext, imageData: imageDataToSend });
        
        ui.removeThumbnail(); 

        if (result.action === "stream_started") {
            // No stream, criamos a bolha vazia e deixamos o `ai-chunk` preenchê-la
            const messageWrapper = ui.addMessageToChat("", "assistant", { isHtml: true });
            getState().setCurrentMessageWrapper(messageWrapper); // Guarda a referência
            return;
        }
        
        if (result.type === 'final_action') {
            const bubbleText = result.text || "Ação concluída.";

            if (result.action === 'suppress_chat_response') {
                ui.updateSpeechBubble(bubbleText, false);
            } else if (result.html) {
                // Para plugins, passa o HTML diretamente
                const messageWrapper = ui.addMessageToChat(result.html, "assistant", { isHtml: true });
                ui.finalizeStreamedMessage(messageWrapper);
                ui.updateSpeechBubble(result.text || result.html.replace(/<[^>]*>?/gm, ''), false); 
            } else if (result.error) {
                const messageWrapper = ui.addMessageToChat(result.error, "assistant");
                ui.finalizeStreamedMessage(messageWrapper);
                ui.updateSpeechBubble(result.error, false);
            }

            ui.setInputState(false); 
            ui.showInputSection();
            return; 
        }

    } catch (error) {
        console.error("Erro ao enviar mensagem para a IA:", error);
        ui.addMessageToChat("Ocorreu um erro crítico ao processar sua solicitação.", "assistant", { isHtml: false });
        
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