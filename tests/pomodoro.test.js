// /tests/pomodoro.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Importa os módulos que vamos testar ou mockar
import { store } from '../src/renderer/js/modules/store.js';
import { setupEventListeners } from '../src/renderer/js/modules/events.js';
import * as ui from '../src/renderer/js/modules/ui.js';

// Configuração do ambiente JSDOM para simular um navegador
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;

describe('Pomodoro Reactive Logic', () => {
  // Variável para capturar a função de callback que o listener registra
  let apiOnCallback;

  // Roda antes de cada teste ('it') para garantir um ambiente limpo
  beforeEach(() => {
    // Reseta o store para o estado inicial
    store.getState().reset();
    // Limpa todos os mocks de execuções anteriores
    vi.clearAllMocks();

    // Cria um mock (uma imitação) da API do Electron (window.api)
    global.window.api = {
      on: vi.fn((channel, callback) => {
        // Capturamos o callback dos eventos de pomodoro para podermos simular
        // a chegada de um evento do processo principal.
        if (channel === 'pomodoro-state-changed' || channel === 'pomodoro-tick') {
          apiOnCallback = callback;
        }
      }),
      send: vi.fn(), // Mock da função de envio, não a usamos neste teste
    };

    // Espiona a função de UI. Não queremos que ela manipule o DOM real durante o teste,
    // apenas queremos saber se ela foi chamada.
    vi.spyOn(ui, 'updatePomodoroWidget').mockImplementation(() => {});

    // Executa a função que registra os event listeners.
    // Agora, ela vai usar nosso 'window.api' mockado.
    setupEventListeners();
  });

  it('should update the store when a "pomodoro-state-changed" event is received', () => {
    // 1. Setup: Prepara os dados de teste
    const mockPomodoroData = { timeLeft: 1500, totalTime: 1500, state: 'running', mode: 'focus' };

    // 2. Ação: Simula o Electron enviando um evento, chamando o callback que capturamos.
    // Isso imita o que aconteceria quando `win.webContents.send('pomodoro-state-changed', ...)` é chamado no main.js
    apiOnCallback(mockPomodoroData);

    // 3. Verificação: O estado no store foi realmente atualizado com os dados corretos?
    expect(store.getState().currentPomodoroData).toEqual(mockPomodoroData);
  });

  it('should call ui.updatePomodoroWidget reactively when state changes', () => {
    // 1. Setup: Configura a assinatura reativa, que é o que o renderer.js faz
    store.subscribe(
      (state) => state.currentPomodoroData,
      (data) => ui.updatePomodoroWidget(data)
    );
    const mockPomodoroData = { timeLeft: 299, totalTime: 300, state: 'running', mode: 'short_break' };

    // 2. Ação: Altera o estado diretamente no store.
    // Isso simula o que aconteceu no teste anterior: o evento chegou e atualizou o estado.
    store.getState().setPomodoroData(mockPomodoroData);

    // 3. Verificação: A função de UI (updatePomodoroWidget) foi chamada automaticamente como resultado da mudança de estado?
    expect(ui.updatePomodoroWidget).toHaveBeenCalled();
    // E foi chamada com os dados corretos?
    expect(ui.updatePomodoroWidget).toHaveBeenCalledWith(mockPomodoroData);
  });
});