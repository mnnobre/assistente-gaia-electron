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

window.addEventListener('load', () => {
    setTimeout(() => {
        const playerBar = document.querySelector('ytmusic-player-bar');
        if (playerBar) {
            const observer = new MutationObserver(sendPlaybackState);
            observer.observe(playerBar, { childList: true, characterData: true, subtree: true, attributes: true });
            sendPlaybackState();
        }
    }, 2000);

    // Expondo os controles com os seletores corretos e logs de debug
    contextBridge.exposeInMainWorld('playerControls', {
        playPause: () => {
            const el = document.querySelector('#play-pause-button button');
            // console.log('Tentando clicar no Play/Pause. Elemento encontrado:', el);
            el?.click();
        },
        next: () => {
            const el = document.querySelector('.next-button button');
            // console.log('Tentando clicar em Próximo. Elemento encontrado:', el);
            el?.click();
        },
        prev: () => {
            const el = document.querySelector('.previous-button button');
            // console.log('Tentando clicar em Anterior. Elemento encontrado:', el);
            el?.click();
        }
    });
});