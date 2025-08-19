import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// CORREÇÃO: Os caminhos agora apontam para a nova estrutura de pastas em /src/renderer/
import { store } from '../src/renderer/js/modules/store.js';
import { setupEventListeners } from '../src/renderer/js/modules/events.js';
import * as ui from '../src/renderer/js/modules/ui.js';

// Configuração do ambiente JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;

describe('Mini Player Reactivity', () => {

  let apiOnCallback; // Variável para capturar a função de callback do listener

  beforeEach(() => {
    // Reseta o HTML para um estado limpo
    document.body.innerHTML = '';
    // Reseta o store
    store.getState().reset();
    // Limpa mocks de execuções anteriores
    vi.clearAllMocks();

    // Mock da window.api, mas com uma implementação especial para 'on'
    window.api = {
      // O espião de 'on' agora captura a função (callback) que é passada para ele.
      // Isso nos permite simular o Electron enviando um evento.
      on: vi.fn((channel, callback) => {
        if (channel === 'playback-state-updated') {
          apiOnCallback = callback;
        }
      }),
      send: vi.fn(),
    };

    // Espiona a função de UI que queremos verificar se é chamada reativamente
    vi.spyOn(ui, 'updateMiniPlayerUI').mockImplementation(() => {});

    // Configura os event listeners
    setupEventListeners();
  });

  it('should call the setPlaybackState action when a playback-state-updated event is received', () => {
    // 1. Setup: Espiona a ação que queremos testar
    vi.spyOn(store.getState(), 'setPlaybackState');

    // 2. Ação: Simula o Electron enviando um novo estado de música
    const mockPlaybackState = { title: 'Bohemian Rhapsody', artist: 'Queen', isPlaying: true };
    apiOnCallback(mockPlaybackState); // Chama o callback capturado

    // 3. Verificação: A ação setPlaybackState foi chamada?
    expect(store.getState().setPlaybackState).toHaveBeenCalled();
    // E foi chamada com os dados corretos?
    expect(store.getState().setPlaybackState).toHaveBeenCalledWith(mockPlaybackState);
  });

  it('should call updateMiniPlayerUI reactively when currentPlaybackState changes', () => {
    // 1. Setup: Configura a assinatura (subscribe) para a reatividade
    store.subscribe(
      (state) => state.currentPlaybackState,
      ui.updateMiniPlayerUI
    );

    // 2. Ação: Modifica diretamente o estado, simulando o que o listener faria
    const mockPlaybackState = { title: 'Another One Bites the Dust', artist: 'Queen', isPlaying: false };
    store.getState().setPlaybackState(mockPlaybackState);

    // 3. Verificação: A função de UI foi chamada automaticamente como resultado da mudança de estado?
    expect(ui.updateMiniPlayerUI).toHaveBeenCalled();
    expect(ui.updateMiniPlayerUI).toHaveBeenCalledTimes(1);
  });
});