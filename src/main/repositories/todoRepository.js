// /src/main/repositories/todoRepository.js (Com deleteList)
module.exports = (db) => ({
    // --- Funções para Gerenciar Listas ---

    /**
     * Busca todas as listas de tarefas.
     * @returns {Promise<Array>}
     */
    getLists: async () => {
        return await db.all("SELECT * FROM todo_lists ORDER BY name ASC");
    },

    /**
     * Cria uma nova lista de tarefas.
     * @param {string} name - O nome da nova lista.
     * @returns {Promise<number>} O ID da lista criada.
     */
    createList: async (name) => {
        const result = await db.run("INSERT INTO todo_lists (name) VALUES (?)", [name]);
        return result.lastID;
    },

    /**
     * Deleta uma lista de tarefas pelo seu ID.
     * Graças ao 'ON DELETE CASCADE' no banco de dados, todas as tarefas
     * associadas a esta lista serão automaticamente removidas.
     * @param {number} listId - O ID da lista a ser deletada.
     * @returns {Promise<number>} O número de listas afetadas (deve ser 1 ou 0).
     */
    deleteList: async (listId) => {
        // Não podemos deletar a lista "Geral" padrão, que tem ID 1.
        if (listId === 1) {
            console.warn("Tentativa de deletar a lista padrão 'Geral'. Ação bloqueada.");
            return 0;
        }
        const result = await db.run("DELETE FROM todo_lists WHERE id = ?", [listId]);
        return result.changes;
    },

    // --- Funções para Gerenciar Tarefas ---

    /**
     * Adiciona uma nova tarefa a uma lista específica.
     * @param {number} listId - O ID da lista.
     * @param {string} task - O texto da tarefa.
     * @returns {Promise<number>} O ID da tarefa criada.
     */
    add: async (listId, task) => {
        const result = await db.run("INSERT INTO todos (list_id, task) VALUES (?, ?)", [listId, task]);
        return result.lastID;
    },

    /**
     * Busca uma única tarefa pelo seu ID.
     * @param {number} taskId - O ID da tarefa.
     * @returns {Promise<object>}
     */
    getTaskById: async (taskId) => {
        return await db.get("SELECT * FROM todos WHERE id = ?", [taskId]);
    },
    
    /**
     * Busca todas as tarefas de uma lista específica.
     * @param {number} listId - O ID da lista.
     * @returns {Promise<Array>}
     */
    getTasksByList: async (listId) => {
        return await db.all("SELECT * FROM todos WHERE list_id = ? ORDER BY status ASC, created_at DESC", [listId]);
    },

    /**
     * Atualiza o status de uma tarefa.
     * @param {number} id - O ID da tarefa.
     * @param {string} status - O novo status ('pending' ou 'done').
     * @returns {Promise<number>} O número de linhas afetadas.
     */
    update: async (id, status) => {
        const result = await db.run("UPDATE todos SET status = ? WHERE id = ?", [status, id]);
        return result.changes;
    },

    /**
     * Deleta uma tarefa pelo seu ID.
     * @param {number} id - O ID da tarefa.
     * @returns {Promise<number>} O número de linhas afetadas.
     */
    delete: async (id) => {
        const result = await db.run("DELETE FROM todos WHERE id = ?", [id]);
        return result.changes;
    }
});