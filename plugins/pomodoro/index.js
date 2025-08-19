// /plugins/pomodoro/index.js (VERSÃO COM AUTOCOMPLETE)

module.exports = {
    command: "pomodoro",
    description: "Gerencia o timer de produtividade Pomodoro, permitindo iniciar, pausar ou resetar.",

    /**
     * --- ADICIONADO PARA O AUTOCOMPLETE DA UI ---
     * Descreve os subcomandos para o usuário final.
     */
    subcommands: {
        'iniciar': 'Mostra e inicia o timer Pomodoro.',
        'pausar': 'Pausa o timer Pomodoro em execução.',
        'resetar': 'Para e reseta o timer Pomodoro para o início.'
    },

    parameters: {
        type: "object",
        description: "Argumentos para o timer Pomodoro.",
        properties: {
            subcommand: {
                type: "string",
                description: "A ação a ser executada no timer.",
                enum: ["iniciar", "pausar", "resetar"]
            }
        },
        required: []
    },

    execute: async (args) => {
        let subcommand;

        if (Array.isArray(args)) {
            const commandMap = { 'start': 'iniciar', 'pause': 'pausar', 'reset': 'resetar', 'parar': 'resetar' };
            subcommand = commandMap[args[0]?.toLowerCase()];
        } else {
            subcommand = args.subcommand?.toLowerCase();
        }

        switch (subcommand || 'iniciar') {
            case "iniciar":
                return { type: 'action', action: 'pomodoro_show' };

            case "pausar":
                return { type: 'action', action: 'pomodoro_control', payload: 'pause' };

            case "resetar":
                 return { type: 'action', action: 'pomodoro_control', payload: 'reset' };
        
            default:
                return { type: 'action', action: 'pomodoro_show' };
        }
    }
};