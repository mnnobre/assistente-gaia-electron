//player-preload.js
const { contextBridge, ipcRenderer } = require('electron');

function sendPlaybackState() {
    const playPauseButton = document.querySelector('#play-pause-button button');
    const titleElement = document.querySelector('ytmusic-player-bar .title');
    const artistElement = document.querySelector('ytmusic-player-bar .byline');
    
    if (titleElement && playPauseButton) {
        const title = titleElement.innerText;
        const artist = artistElement ? artistElement.innerText : '';
        const label = playPauseButton.getAttribute('aria-label') || '';
        const isPlaying = label.toLowerCase().includes('pausar');
        const state = { title, artist, isPlaying };
        ipcRenderer.send('playback-state-changed', state);
    }
}

// Objeto com as funções de controle, para serem chamadas pelo listener
const playerControls = {
    playPause: () => {
        const el = document.querySelector('#play-pause-button button');
        el?.click();
    },
    next: () => {
        const el = document.querySelector('.next-button button');
        el?.click();
    },
    prev: () => {
        const el = document.querySelector('.previous-button button');
        el?.click();
    }
};

window.addEventListener('load', () => {
    setTimeout(() => {
        const playerBar = document.querySelector('ytmusic-player-bar');
        if (playerBar) {
            const observer = new MutationObserver(sendPlaybackState);
            observer.observe(playerBar, { childList: true, characterData: true, subtree: true, attributes: true });
            sendPlaybackState();
        }
    }, 2000);

    // --- INÍCIO DA CORREÇÃO ---
    // Ouve o evento vindo do main.js e chama a função de controle correspondente
    ipcRenderer.on('execute-player-control', (event, action) => {
        if (playerControls[action]) {
            playerControls[action]();
        }
    });
    // --- FIM DA CORREÇÃO ---

    // Expondo os controles via contextBridge não é mais necessário para este fluxo,
    // mas vamos manter caso seja útil para alguma depuração futura.
    contextBridge.exposeInMainWorld('playerControls', playerControls);
});