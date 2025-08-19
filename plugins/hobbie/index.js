// Importa o nosso gerenciador de banco de dados, focando no novo módulo 'hobbie'.
const dbManager = require('../../src/main/modules/database-manager.js');

/**
 * Uma função utilitária para analisar argumentos complexos.
 * Ex: 'add "The Witcher 3" --platform PC --tags exploração, RPG'
 * Retorna: { command: 'add', main: '"The Witcher 3"', params: { platform: 'PC', tags: 'exploração, RPG' } }
 */
function parseArgs(args) {
    const result = {
        command: args[0]?.toLowerCase() || null,
        main: [],
        params: {}
    };

    let currentParam = null;
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            currentParam = arg.substring(2).toLowerCase();
            result.params[currentParam] = '';
        } else if (currentParam) {
            result.params[currentParam] += (result.params[currentParam] ? ' ' : '') + arg;
        } else {
            result.main.push(arg);
        }
    }
    result.main = result.main.join(' ');
    return result;
}

// Definição do plugin
module.exports = {
    command: "hobbie",
    description: "Gerencia sua biblioteca pessoal de jogos e hobbies.",
    
    subcommands: {
        'add': 'Adiciona um novo jogo. Ex: /hobbie add "Nome do Jogo" --platform [PC/PS5/Switch] --tags [tag1, tag2]',
        'list': 'Lista todos os jogos da sua biblioteca.'
    },
    
    execute: async (args) => {
        if (args.length === 0) {
            return { success: true, message: "Este é o seu gerenciador de Hobbies. Use `add` para adicionar um jogo ou `list` para ver sua coleção." };
        }
        
        const parsed = parseArgs(args);

        switch (parsed.command) {
            case 'add':
                const title = parsed.main.replace(/"/g, ''); // Remove aspas do título
                const platform = parsed.params.platform;
                const tags = parsed.params.tags ? parsed.params.tags.split(',').map(t => t.trim()) : [];

                if (!title || !platform) {
                    return { success: false, message: 'Para adicionar, preciso do título e da plataforma. Ex: `/hobbie add "Meu Jogo" --platform PC`' };
                }

                try {
                    await dbManager.hobbie.addGame(title, platform, tags);
                    return { success: true, message: `"${title}" foi adicionado à sua estante de jogos com sucesso!` };
                } catch (error) {
                    console.error("[Hobbie Plugin] Erro ao adicionar jogo:", error);
                    return { success: false, message: `Não consegui adicionar "${title}". Ele já existe na sua estante?` };
                }

            case 'list':
                try {
                    const games = await dbManager.hobbie.listGames();
                    if (games.length === 0) {
                        return { success: true, message: "Sua estante de jogos ainda está vazia. Use `/hobbie add` para começar a coleção!" };
                    }
                    
                    let response = "### 📚 Sua Estante de Jogos\n\n";
                    games.forEach(game => {
                        response += `*   **${game.title}** (${game.platform})\n`;
                        if (game.tags) {
                            response += `    *Tags: ${game.tags}*\n`;
                        }
                    });
                    
                    return { success: true, message: response };
                } catch (error) {
                    console.error("[Hobbie Plugin] Erro ao listar jogos:", error);
                    return { success: false, message: "Ocorreu um erro ao tentar buscar sua estante de jogos." };
                }

            default:
                return { success: false, message: `Subcomando "${parsed.command}" não reconhecido. Use \`add\` ou \`list\`.` };
        }
    }
};