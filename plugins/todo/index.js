// /plugins/todo/index.js

const path = require('path');
// CORREÇÃO: Adiciona '..', 'src', 'main' ao caminho para encontrar os módulos
const todoManager = require(path.join(__dirname, '..', '..', 'src', 'main', 'modules', 'todo-manager.js'));
const dbManager = require(path.join(__dirname, '..', '..', 'src', 'main', 'modules', 'database-manager.js'));

module.exports = {
    command: "todo",
    description: "Gerencia sua lista de tarefas (To-Do).",
    subcommands: {
        'adicionar': 'Adiciona uma nova tarefa. (Ex: /todo adicionar Comprar pão)',
        'listar': 'Lista todas as suas tarefas.',
        'concluir': 'Marca uma tarefa como concluída. (Ex: /todo concluir 3)',
        'remover': 'Remove uma tarefa da lista. (Ex: /todo remover 3)'
    },
    
    execute: async (args) => {
        let subcommand, task, id;

        // Lógica de análise de argumentos
        if (Array.isArray(args)) {
            const commandMap = { 'add': 'adicionar', 'list': 'listar', 'done': 'concluir', 'rm': 'remover', 'del': 'remover' };
            const firstArg = args[0]?.toLowerCase();
            subcommand = commandMap[firstArg];
            
            const rest = args.slice(1).join(" ");
            task = rest;
            id = parseInt(rest, 10);
        } else {
            subcommand = args.subcommand?.toLowerCase();
            task = args.subcommand?.toLowerCase();
            task = args.task;
            id = args.id;
        }

        try {
            switch (subcommand || 'listar') {
                case "adicionar":
                    return await todoManager.addTodo(dbManager, task);
                case "listar":
                    return await todoManager.listTodos(dbManager);
                case "concluir":
                    return await todoManager.completeTodo(dbManager, id);
                case "remover":
                    return await todoManager.removeTodo(dbManager, id);
                default:
                    return { success: false, message: `Comando /todo incompleto. Use: adicionar, listar, concluir, ou remover.` };
            }
        } catch (error) {
            console.error("[Todo Plugin] Erro:", error);
            return { success: false, message: "Ocorreu um erro interno no plugin de tarefas." };
        }
    }
};