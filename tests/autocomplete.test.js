import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// CORREÇÃO AQUI: O caminho agora aponta para a nova localização do store.js
import { store } from '../src/renderer/js/modules/store.js';

// --- Configuração do Ambiente JSDOM ---
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;

// --- A Lógica a ser Testada ---
// Copiamos a lógica do event listener para uma função pura que podemos testar.
function getAutocompleteSuggestions(inputValue, allCommands) {
    const parts = inputValue.split(" ");
    let newSuggestions = [];

    if (inputValue.startsWith("/") && parts.length < 3) {
        if (parts.length === 1) {
            const searchTerm = inputValue.substring(1);
            newSuggestions = allCommands.filter((cmd) => cmd.command.substring(1).startsWith(searchTerm))
                .map((cmd) => ({ name: cmd.command, description: cmd.description, type: "command" }));
        }
        // ... outras lógicas de subcomando iriam aqui
    }
    return newSuggestions;
}


// --- Suíte de Testes ---
describe('Autocomplete Logic', () => {

  // Reseta o estado antes de cada teste
  beforeEach(() => {
    store.getState().reset();
  });

  it('should return a matching command when user types "/"', () => {
    // 1. Setup
    const mockCommands = [{ command: '/nota', description: 'Nota' }];
    const inputValue = "/";

    // 2. Ação
    const suggestions = getAutocompleteSuggestions(inputValue, mockCommands);

    // 3. Verificação
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].name).toBe('/nota');
  });

  it('should return a matching command when user types a partial command', () => {
    // 1. Setup
    const mockCommands = [{ command: '/nota', description: 'Nota' }, { command: '/todo', description: 'Todo' }];
    const inputValue = "/no";

    // 2. Ação
    const suggestions = getAutocompleteSuggestions(inputValue, mockCommands);

    // 3. Verificação
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].name).toBe('/nota');
  });

  it('should return multiple matches if they exist', () => {
    // 1. Setup
    const mockCommands = [{ command: '/player play', description: 'Play' }, { command: '/player show', description: 'Show' }];
    const inputValue = "/p";

    // 2. Ação
    const suggestions = getAutocompleteSuggestions(inputValue, mockCommands);

    // 3. Verificação
    expect(suggestions.length).toBe(2);
  });

  it('should return an empty array if no match is found', () => {
    // 1. Setup
    const mockCommands = [{ command: '/nota', description: 'Nota' }];
    const inputValue = "/xyz";
    
    // 2. Ação
    const suggestions = getAutocompleteSuggestions(inputValue, mockCommands);

    // 3. Verificação
    expect(suggestions.length).toBe(0);
  });

});