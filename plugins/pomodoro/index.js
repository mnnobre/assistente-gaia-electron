// /plugins/pomodoro/index.js (VERSÃO CORRIGIDA)

module.exports = {
    command: "pomodoro",
    description: "Gerencia o timer de produtividade Pomodoro, permitindo iniciar, pausar ou resetar.",

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
        // --- INÍCIO DA CORREÇÃO ---
        let subcommand;

        if (Array.isArray(args) && args.length > 0) {
            // Usa o argumento diretamente, se for válido.
            const arg = args[0]?.toLowerCase();
            if (['iniciar', 'start', 'pausar', 'pause', 'resetar', 'reset', 'parar', 'stop'].includes(arg)) {
                subcommand = arg;
            }
        } else if (args.subcommand) {
            subcommand = args.subcommand.toLowerCase();
        }

        // Mapeia todos os sinônimos para os casos do switch
        switch (subcommand || 'iniciar') {
            case "iniciar":
            case "start":
                return { type: 'action', action: 'pomodoro_show' };

            case "pausar":
            case "pause":
                return { type: 'action', action: 'pomodoro_control', payload: 'pause' };

            case "resetar":
            case "reset":
            case "parar":
            case "stop":
                 return { type: 'action', action: 'pomodoro_control', payload: 'reset' };
        
            default:
                return { type: 'action', action: 'pomodoro_show' };
        }
        // --- FIM DA CORREÇÃO ---
    }
};