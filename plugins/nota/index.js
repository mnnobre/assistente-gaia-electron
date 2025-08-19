const path = require('path');
// CORREÇÃO: Adiciona '..', 'src', 'main' ao caminho para encontrar os módulos
const notesManager = require(path.join(__dirname, '..', '..', 'src', 'main', 'modules', 'notes-manager.js'));
const dbManager = require(path.join(__dirname, '..', '..', 'src', 'main', 'modules', 'database-manager.js'));

module.exports = {
    command: "nota",
    description: "Adiciona, lista, deleta ou limpa notas.",
    subcommands: {
        'adicionar': 'Adiciona uma nova nota. (Ex: /nota adicionar Lembrete importante)',
        'listar': 'Lista todas as suas notas salvas.',
        'limpar': 'Apaga permanentemente todas as suas notas.',
        'deletar': 'Apaga uma nota específica pelo ID. (Ex: /nota deletar 1)'
    },
    
    execute: async (args) => {
        let subcommand, content, id;
        
        const commandMap = { 'adicionar': 'adicionar', 'add': 'adicionar', 'listar': 'listar', 'list': 'listar', 'limpar': 'limpar', 'clear': 'limpar', 'deletar': 'deletar', 'del': 'deletar', 'rm': 'deletar' };
        const firstArg = args[0]?.toLowerCase();
        
        if (commandMap[firstArg]) {
            subcommand = commandMap[firstArg];
            const rest = args.slice(1).join(" ");
            id = parseInt(rest, 10);
            content = rest;
        } else {
            subcommand = 'adicionar';
            content = args.join(" ");
        }

        try {
            // Passa o dbManager real para as funções
            switch (subcommand) {
                case "adicionar":
                    return await notesManager.addNote(dbManager, content);
                case "listar":
                    return await notesManager.listNotes(dbManager);
                case "limpar":
                    return await notesManager.clearNotes(dbManager);
                case "deletar":
                    return await notesManager.deleteNote(dbManager, id);
                default:
                    return { success: false, message: "Comando /nota incompleto. Use: adicionar, listar, limpar ou deletar." };
            }
        } catch (error) {
            console.error("[Notes Plugin] Erro ao executar comando:", error);
            return { success: false, message: "Ocorreu um erro ao gerenciar suas notas." };
        }
    }
};