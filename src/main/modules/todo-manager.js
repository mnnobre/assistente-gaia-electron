// /src/main/modules/todo-manager.js (Com removeList)

/**
 * Busca todas as listas de tarefas disponíveis.
 * @param {object} dbManager - A instância do gerenciador de banco de dados.
 * @returns {Promise<Array>} Uma lista de objetos, cada um contendo { id, name }.
 */
async function getLists(dbManager) {
    return await dbManager.todos.getLists();
}

/**
 * Cria uma nova lista de tarefas.
 * @param {object} dbManager - A instância do gerenciador de banco de dados.
 * @param {string} name - O nome da nova lista.
 * @returns {Promise<number>} O ID da nova lista criada.
 */
async function createList(dbManager, name) {
    if (!name || name.trim() === '') {
        throw new Error("O nome da lista não pode estar vazio.");
    }
    return await dbManager.todos.createList(name.trim());
}

// --- INÍCIO DA ALTERAÇÃO ---
/**
 * Remove uma lista de tarefas e todas as suas tarefas associadas.
 * @param {object} dbManager - A instância do gerenciador de banco de dados.
 * @param {number} listId - O ID da lista a ser removida.
 * @returns {Promise<number>} O número de listas afetadas.
 */
async function removeList(dbManager, listId) {
    if (!listId) {
        throw new Error("O ID da lista é obrigatório para remoção.");
    }
    return await dbManager.todos.deleteList(listId);
}
// --- FIM DA ALTERAÇÃO ---

/**
 * Busca todas as tarefas para uma lista específica.
 * @param {object} dbManager - A instância do gerenciador de banco de dados.
 * @param {number} listId - O ID da lista.
 * @returns {Promise<Array>} Uma lista de tarefas.
 */
async function getTasksForList(dbManager, listId) {
    if (!listId) {
        throw new Error("É necessário fornecer o ID da lista.");
    }
    return await dbManager.todos.getTasksByList(listId);
}

/**
 * Adiciona uma nova tarefa a uma lista.
 * @param {object} dbManager - A instância do gerenciador de banco de dados.
 * @param {number} listId - O ID da lista onde a tarefa será adicionada.
 * @param {string} task - O texto da tarefa.
 * @returns {Promise<object>} O objeto da tarefa recém-criada.
 */
async function addTask(dbManager, listId, task) {
    if (!listId || !task || task.trim() === '') {
        throw new Error("ID da lista e texto da tarefa são obrigatórios.");
    }
    const newTaskId = await dbManager.todos.add(listId, task.trim());
    return await dbManager.todos.getTaskById(newTaskId);
}

/**
 * Atualiza o status de uma tarefa (concluída ou pendente).
 * @param {object} dbManager - A instância do gerenciador de banco de dados.
 * @param {number} taskId - O ID da tarefa.
 * @param {boolean} isDone - True se a tarefa deve ser marcada como 'done', false para 'pending'.
 * @returns {Promise<number>} O número de linhas afetadas.
 */
async function updateTaskStatus(dbManager, taskId, isDone) {
    if (!taskId) {
        throw new Error("O ID da tarefa é obrigatório.");
    }
    const newStatus = isDone ? 'done' : 'pending';
    return await dbManager.todos.update(taskId, newStatus);
}

/**
 * Remove uma tarefa permanentemente.
 * @param {object} dbManager - A instância do gerenciador de banco de dados.
 * @param {number} taskId - O ID da tarefa a ser removida.
 * @returns {Promise<number>} O número de linhas afetadas.
 */
async function removeTask(dbManager, taskId) {
    if (!taskId) {
        throw new Error("O ID da tarefa é obrigatório.");
    }
    return await dbManager.todos.delete(taskId);
}

module.exports = {
    getLists,
    createList,
    removeList, // Exportamos a nova função
    getTasksForList,
    addTask,
    updateTaskStatus,
    removeTask,
};