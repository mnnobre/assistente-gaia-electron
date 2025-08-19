// /plugins/player/index.js (VERSÃO COM AUTOCOMPLETE)

module.exports = {
    command: "player",
    description: "Controla o player de música. Permite mostrar, tocar, pausar, pular e buscar músicas ou artistas.",

    /**
     * --- ADICIONADO PARA O AUTOCOMPLETE DA UI ---
     * Descreve os subcomandos para o usuário final.
     */
    subcommands: {
        'play': 'Busca e toca uma música ou artista. (Ex: /player play Queen)',
        'show': 'Mostra a janela do player de música.',
        'pause': 'Pausa ou retoma a música que está tocando.',
        'next': 'Pula para a próxima música da fila.',
        'prev': 'Volta para a música anterior.'
    },

    parameters: {
        type: "object",
        description: "Argumentos para controlar o player de música.",
        properties: {
            subcommand: {
                type: "string",
                "enum": ["show", "play", "pause", "next", "prev"],
                description: "A ação a ser executada (ex: 'play', 'show')."
            },
            query: {
                type: "string",
                description: "O nome da música, artista, ou álbum a ser buscado."
            }
        },
        required: [] 
    },
    
    execute: async (args) => {
        let subcommand;
        let query;

        if (Array.isArray(args)) {
            subcommand = args[0]?.toLowerCase();
            query = args.slice(1).join(" ");
        } else {
            subcommand = args.subcommand?.toLowerCase();
            query = args.query;
        }

        // Prioridade 1: Se uma consulta/busca foi fornecida, a intenção é buscar.
        if (query) {
            console.log(`[Player Plugin] Intenção de busca detectada para: "${query}"`);
            return { type: 'action', action: 'player_search', payload: query };
        }

        // Prioridade 2: Se não há consulta, usamos o subcomando.
        switch (subcommand || 'show') {
            case 'show':
                return { type: 'action', action: 'player_show' };

            case 'play':
                return { type: 'action', action: 'player_control', payload: 'playPause' };

            case 'pause':
                return { type: 'action', action: 'player_control', payload: 'playPause' };

            case 'next':
                return { type: 'action', action: 'player_control', payload: 'next' };

            case 'prev':
                return { type: 'action', action: 'player_control', payload: 'prev' };

            default:
                // Se o usuário digitar um comando como /player algo_desconhecido
                // a ação mais segura é apenas mostrar o player.
                return { type: 'action', action: 'player_show' };
        }
    }
};