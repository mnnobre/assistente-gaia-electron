// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from 'vitest';

// 1. Mock do database-manager
// CORREÇÃO: O caminho para o mock agora aponta para a nova localização
vi.mock('../src/main/modules/database-manager.js', () => ({
  default: {
    todos: {
      add: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  }
}));

// 2. Importa os módulos APÓS a definição do mock
// CORREÇÃO: Os caminhos de importação também foram atualizados
import dbManager from '../src/main/modules/database-manager.js';
import todoManager from '../src/main/modules/todo-manager.js';

describe('Todo Manager', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call dbManager.todos.add with correct task content', async () => {
    const task = 'Comprar pão';
    await todoManager.addTodo(dbManager, task);

    expect(dbManager.todos.add).toHaveBeenCalled();
    expect(dbManager.todos.add).toHaveBeenCalledWith(task);
  });

  it('should format the todo list correctly', async () => {
    const mockTodos = [
      { id: 1, task: 'Comprar pão', status: 'pending' },
      { id: 2, task: 'Pagar conta', status: 'done' },
    ];
    dbManager.todos.list.mockResolvedValue(mockTodos);

    const result = await todoManager.listTodos(dbManager);

    expect(dbManager.todos.list).toHaveBeenCalled();
    expect(result.message).toContain('🔲 **[ID: 1]** - Comprar pão');
    expect(result.message).toContain('✅ **[ID: 2]** - ~~Pagar conta~~');
  });

  it('should call dbManager.todos.update with the correct ID and status', async () => {
    const todoId = 5;
    await todoManager.completeTodo(dbManager, todoId);
    
    expect(dbManager.todos.update).toHaveBeenCalled();
    expect(dbManager.todos.update).toHaveBeenCalledWith(todoId, 'done');
  });

  it('should call dbManager.todos.delete with the correct ID', async () => {
    const todoId = 7;
    await todoManager.removeTodo(dbManager, todoId);
    
    expect(dbManager.todos.delete).toHaveBeenCalled();
    expect(dbManager.todos.delete).toHaveBeenCalledWith(todoId);
  });
});