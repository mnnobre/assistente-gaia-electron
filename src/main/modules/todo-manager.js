// /modules/todo-manager.js

function formatTodoList(todos) {
    if (todos.length === 0) {
        return "Você não tem nenhuma tarefa pendente.";
    }
    let todoList = "### Sua lista de tarefas:\n\n";
    todos.forEach(todo => {
        const icon = todo.status === 'done' ? '✅' : '🔲';
        const taskText = todo.status === 'done' ? `~~${todo.task}~~` : todo.task; 
        todoList += `* ${icon} **[ID: ${todo.id}]** - ${taskText}\n`;
    });
    return todoList;
}

async function addTodo(dbManager, task) {
    if (!task) {
        return { success: false, message: "Por favor, me diga qual tarefa você quer adicionar." };
    }
    await dbManager.todos.add(task);
    return { success: true, message: `Tarefa "${task}" adicionada com sucesso.` };
}

async function listTodos(dbManager) {
    const todos = await dbManager.todos.list();
    const formattedList = formatTodoList(todos);
    return { success: true, message: formattedList };
}

async function completeTodo(dbManager, id) {
    if (!id || isNaN(id)) {
        return { success: false, message: "Por favor, especifique o número (ID) da tarefa a ser concluída." };
    }
    const changes = await dbManager.todos.update(id, 'done');
    return { 
        success: true, 
        message: changes > 0 
            ? `Tarefa ${id} marcada como concluída!` 
            : `Não encontrei nenhuma tarefa com o ID ${id}.` 
    };
}

async function removeTodo(dbManager, id) {
    if (!id || isNaN(id)) {
        return { success: false, message: "Por favor, especifique o número (ID) da tarefa a ser removida." };
    }
    const changes = await dbManager.todos.delete(id);
    return { 
        success: true, 
        message: changes > 0 
            ? `Tarefa ${id} removida.` 
            : `Não encontrei nenhuma tarefa com o ID ${id}.` 
    };
}

module.exports = {
    addTodo,
    listTodos,
    completeTodo,
    removeTodo,
};