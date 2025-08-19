// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from 'vitest';

// CORREÇÃO AQUI: O caminho agora aponta para a nova localização do notes-manager.js
import notesManager from '../src/main/modules/notes-manager.js';

describe('Notes Manager', () => {
  let mockDbManager; // Variável para o nosso dbManager falso

  // Antes de cada teste, criamos um novo dbManager falso e limpo
  beforeEach(() => {
    mockDbManager = {
      notes: {
        add: vi.fn(),
        list: vi.fn(),
        clear: vi.fn(),
        delete: vi.fn(),
      }
    };
  });

  it('should call dbManager.notes.add with correct content', async () => {
    const content = 'Nova nota de teste';
    // Passamos o nosso mock como argumento
    await notesManager.addNote(mockDbManager, content);

    expect(mockDbManager.notes.add).toHaveBeenCalled();
    expect(mockDbManager.notes.add).toHaveBeenCalledWith(content);
  });

  it('should format notes correctly when listNotes is called', async () => {
    const mockNotes = [
      { id: 1, content: 'Nota 1' },
      { id: 2, content: 'Nota 2' },
    ];
    mockDbManager.notes.list.mockResolvedValue(mockNotes);

    const result = await notesManager.listNotes(mockDbManager);

    expect(mockDbManager.notes.list).toHaveBeenCalled();
    expect(result.message).toContain('[ID: 1] - Nota 1');
    expect(result.message).toContain('[ID: 2] - Nota 2');
  });
  
  it('should return a specific message when no notes exist', async () => {
    mockDbManager.notes.list.mockResolvedValue([]);
    const result = await notesManager.listNotes(mockDbManager);
    expect(result.message).toBe('Você ainda não tem nenhuma nota.');
  });

  it('should call dbManager.notes.delete with the correct ID', async () => {
    const noteId = 42;
    await notesManager.deleteNote(mockDbManager, noteId);
    
    expect(mockDbManager.notes.delete).toHaveBeenCalled();
    expect(mockDbManager.notes.delete).toHaveBeenCalledWith(noteId);
  });

  it('should call dbManager.notes.clear', async () => {
    await notesManager.clearNotes(mockDbManager);
    expect(mockDbManager.notes.clear).toHaveBeenCalled();
  });
});