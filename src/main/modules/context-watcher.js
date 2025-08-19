// /modules/context-watcher.js (VERSÃO CORRIGIDA)
const { desktopCapturer, screen, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

async function captureScreen() {
    try {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;

        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width, height }
        });

        const primaryScreenSource = sources.find(source => 
            source.display_id === String(primaryDisplay.id)
        );

        if (primaryScreenSource) {
            return primaryScreenSource.thumbnail.toDataURL();
        } else {
            console.error('[Context Watcher] Tela principal não encontrada.');
            return null;
        }
    } catch (error) {
        console.error('[Context Watcher] Erro ao capturar a tela:', error);
        return null;
    }
}

async function captureActiveWindow() {
    try {
        const sources = await desktopCapturer.getSources({ types: ['window'] });
        
        const activeSource = sources.find(s => s.name !== 'Assistente Virtual');

        if (activeSource) {
            const { width, height } = screen.getPrimaryDisplay().size;
            // Pega a thumbnail no maior tamanho possível para melhor qualidade
            const fullSizeSources = await desktopCapturer.getSources({
                types: ['window'],
                thumbnailSize: { width, height }
            });
            const bestSource = fullSizeSources.find(s => s.id === activeSource.id);
            return bestSource ? bestSource.thumbnail.toDataURL() : activeSource.thumbnail.toDataURL();
        } else {
            console.warn('[Context Watcher] Nenhuma janela ativa encontrada. Capturando tela inteira.');
            return captureScreen();
        }
    } catch (error) {
        console.error('[Context Watcher] Erro ao capturar a janela ativa:', error);
        return null;
    }
}

let selectionWindow = null;
function captureSelection() {
    return new Promise(async (resolve) => {
        const fullScreenshotDataUrl = await captureScreen();
        if (!fullScreenshotDataUrl) {
            console.error("[Context Watcher] Não foi possível tirar o screenshot base para a seleção.");
            resolve(null);
            return;
        }

        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;

        selectionWindow = new BrowserWindow({
            width,
            height,
            x: 0,
            y: 0,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            resizable: false,
            movable: false,
            webPreferences: {
                preload: path.join(__dirname, 'selection-preload.js')
            }
        });

        selectionWindow.loadFile(path.join(__dirname, 'selection.html'));

        ipcMain.once('selection-complete', (event, rect) => {
            if (selectionWindow && !selectionWindow.isDestroyed()) {
                selectionWindow.close();
            }
            
            if (!rect || rect.width === 0 || rect.height === 0) {
                resolve(null);
                return;
            }

            // A lógica de recorte agora é mais robusta e não depende de uma segunda janela.
            // Usamos a API 'nativeImage' do Electron, que é mais confiável.
            const { nativeImage } = require('electron');
            const image = nativeImage.createFromDataURL(fullScreenshotDataUrl);
            const croppedImage = image.crop(rect);
            const croppedDataUrl = croppedImage.toDataURL();
            resolve(croppedDataUrl);
        });

        selectionWindow.on('closed', () => {
            selectionWindow = null;
            // Garante que o listener seja removido se a janela for fechada
            ipcMain.removeAllListeners('selection-complete');
            // Resolve como nulo se ainda não tiver sido resolvido
            resolve(null); 
        });
    });
}

module.exports = {
    captureScreen,
    captureActiveWindow,
    captureSelection,
};