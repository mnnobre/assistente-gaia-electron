// /player-renderer.js (VERSÃO CORRIGIDA)

let songState = { isPlaying: false };

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de elementos ---
    const playerContainer = document.getElementById('player-container');
    const prevButton = document.getElementById('prev-button');
    const playPauseButton = document.getElementById('play-pause-button');
    const nextButton = document.getElementById('next-button');
    const minimizeButton = document.getElementById('minimize-button');
    const closeButton = document.getElementById('close-button');

    // --- Event Listeners dos controles da janela ---
    minimizeButton.addEventListener('click', () => {
        // CORREÇÃO: Usa a função genérica 'send' do preload
        window.api.send('player:minimize');
    });
    closeButton.addEventListener('click', () => {
        // CORREÇÃO: Usa a função genérica 'send' do preload
        window.api.send('player:close');
    });

    function updateControlsVisibility() {
        if (songState.isPlaying) {
            playerContainer.classList.add('show-controls');
        } else {
            playerContainer.classList.remove('show-controls');
        }
    }

    document.body.addEventListener('mouseenter', () => {
        playerContainer.classList.remove('show-controls');
    });

    document.body.addEventListener('mouseleave', () => {
        updateControlsVisibility();
    });

    // --- Controles de música ---
    // CORREÇÃO: Usa a função genérica 'send' com o canal e o payload corretos
    prevButton.addEventListener('click', () => window.api.send('control-player-action', 'prev'));
    playPauseButton.addEventListener('click', () => window.api.send('control-player-action', 'playPause'));
    nextButton.addEventListener('click', () => window.api.send('control-player-action', 'next'));

    // Ouve o canal 'playback-state-updated' para receber os dados da música
    window.api.on('playback-state-updated', (newState) => {
        songState = newState;
        
        document.getElementById('song-title').innerText = newState.title || 'Carregando...';
        document.getElementById('song-artist').innerText = newState.artist || '';
        
        updateControlsVisibility();
    });
});