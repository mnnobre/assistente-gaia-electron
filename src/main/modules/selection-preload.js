// /modules/selection-preload.js
const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    const selectionBox = document.getElementById('selection-box');
    let startX, startY, isDrawing = false;

    document.body.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startY = e.clientY;
        isDrawing = true;
        selectionBox.style.left = `${startX}px`;
        selectionBox.style.top = `${startY}px`;
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
    });

    document.body.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        
        const currentX = e.clientX;
        const currentY = e.clientY;
        
        const width = currentX - startX;
        const height = currentY - startY;

        selectionBox.style.width = `${Math.abs(width)}px`;
        selectionBox.style.height = `${Math.abs(height)}px`;
        selectionBox.style.left = `${width > 0 ? startX : currentX}px`;
        selectionBox.style.top = `${height > 0 ? startY : currentY}px`;
    });

    document.body.addEventListener('mouseup', (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        
        const finalRect = {
            x: parseInt(selectionBox.style.left, 10),
            y: parseInt(selectionBox.style.top, 10),
            width: parseInt(selectionBox.style.width, 10),
            height: parseInt(selectionBox.style.height, 10),
        };
        
        // Envia as coordenadas finais para o processo principal
        ipcRenderer.send('selection-complete', finalRect);
    });

    // Permite cancelar a seleção com a tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            ipcRenderer.send('selection-complete', null);
        }
    });
});