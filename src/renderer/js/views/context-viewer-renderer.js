// /src/renderer/js/views/context-viewer-renderer.js

// --- Função de Inicialização ---

export function initialize() {
    // --- Seletores de Elementos do Modal ---
    const imagePreview = document.getElementById('context-image-preview');
    const deleteButton = document.getElementById('context-delete-button');
    const recaptureWindowButton = document.getElementById('context-recapture-window-button');
    const recaptureScreenButton = document.getElementById('context-recapture-screen-button');
    const recaptureSelectionButton = document.getElementById('context-recapture-selection-button');

    // --- Lógica de Inicialização ---
    const urlParams = new URLSearchParams(window.location.search);
    const imageData = urlParams.get('imageData');

    if (imageData) {
        imagePreview.innerHTML = `<img src="${decodeURIComponent(imageData)}" />`;
    }

    // --- Event Listeners ---
    deleteButton.addEventListener('click', () => {
        window.api.send('context:delete-attachment'); 
        window.api.send('modal:close');
    });
    
    // CORREÇÃO: Os botões agora enviam APENAS a mensagem de recaptura.
    // O main.js cuidará do fechamento do modal.
    recaptureWindowButton.addEventListener('click', () => {
        window.api.send('context:recapture', 'window');
    });
    
    recaptureScreenButton.addEventListener('click', () => {
        window.api.send('context:recapture', 'screen');
    });
    
    recaptureSelectionButton.addEventListener('click', () => {
        window.api.send('context:recapture', 'selection');
    });
}