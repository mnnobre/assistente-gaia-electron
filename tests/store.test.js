import { describe, it, expect, beforeEach } from 'vitest';
// CORREÇÃO AQUI: O caminho agora aponta para a nova localização do store.js
import { store } from '../src/renderer/js/modules/store.js';

// 'describe' agrupa testes relacionados. Estamos testando nosso "Application Store".
describe('Application Store (Zustand)', () => {

  // 'beforeEach' é uma função especial que roda ANTES de CADA teste ('it').
  // Isso garante que cada teste comece com o estado limpo e não interfira nos outros.
  beforeEach(() => {
    store.getState().reset();
  });

  // 'it' define um teste individual. A descrição deve dizer o que ele testa.
  it('should initialize with an empty commands array', () => {
    // 'expect' é onde fazemos a verificação.
    // Estamos esperando que a propriedade 'commands' do estado...
    const commands = store.getState().commands;
    // ...seja um array.
    expect(Array.isArray(commands)).toBe(true);
    // ...e que seu tamanho seja 0.
    expect(commands.length).toBe(0);
  });

  it('should update commands when setCommands action is called', () => {
    // 1. Prepara dados de teste (um mock).
    const mockCommands = [{ command: '/test', description: 'A test command' }];

    // 2. Executa a ação que queremos testar.
    store.getState().setCommands(mockCommands);

    // 3. Verifica o resultado.
    // Esperamos que a propriedade 'commands' agora seja igual ao nosso mock.
    expect(store.getState().commands).toEqual(mockCommands);
    expect(store.getState().commands.length).toBe(1);
  });

  it('should attach and detach image data correctly', () => {
    // Verifica o estado inicial
    expect(store.getState().attachedImageData).toBe(null);

    // Executa a ação de anexar
    const mockImageData = 'data:image/png;base64,mock-data';
    store.getState().attachImage(mockImageData);

    // Verifica se a imagem foi anexada
    expect(store.getState().attachedImageData).toBe(mockImageData);

    // Executa a ação de remover
    store.getState().detachImage();

    // Verifica se a imagem foi removida
    expect(store.getState().attachedImageData).toBe(null);
  });

});