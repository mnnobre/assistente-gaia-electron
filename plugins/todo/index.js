// /plugins/todo/index.js (Refatorado para Widget)

module.exports = {
    command: "todo",
    description: "Abre ou foca o widget flutuante de tarefas (To-Do).",
    
    // Mantemos um subcomando simples para clareza no menu /help.
    // Qualquer variação do comando /todo agora resultará na mesma ação.
    subcommands: {
        'abrir': 'Abre o widget de To-Do.'
    },
    
    execute: async (args) => {
        // A única responsabilidade deste plugin agora é retornar uma "ação" para
        // o processo principal (main.js). O main.js será o responsável por
        // chamar a função que cria ou foca a janela do widget.
        return { 
            type: 'action', 
            action: 'todo_show_widget' 
        };
    }
};