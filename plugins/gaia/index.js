// /plugins/gaia/index.js (VERSÃO FINAL DA FASE 4)

// Importa todos os "sentidos" da G.A.I.A.
const aiManager = require('../../src/main/modules/ai-manager.js');
const vectorDBManager = require('../../src/main/modules/vector-db-manager.js');
const dbManager = require('../../src/main/modules/database-manager.js');

// --- ESTADO INTERNO DO PLUGIN ---
let conversationState = {
    expecting: null,
    data: {}
};

// --- FUNÇÕES UTILITÁRIAS ---

function clearConversation() {
    conversationState.expecting = null;
    conversationState.data = {};
}

function parseArgs(args) {
    const result = { main: [], params: {} };
    let currentParam = null;
    for (const arg of args) {
        if (arg.startsWith('--')) {
            currentParam = arg.substring(2).toLowerCase();
            result.params[currentParam] = '';
        } else if (currentParam) {
            result.params[currentParam] = (result.params[currentParam] ? result.params[currentParam] + ' ' : '') + arg;
        } else {
            result.main.push(arg);
        }
    }
    for (const key in result.params) {
        result.params[key] = result.params[key].replace(/"/g, '').trim();
    }
    result.main = result.main.join(' ').trim();
    return result;
}

/**
 * Função centralizada para salvar o log em ambos os bancos de dados.
 */
async function saveGameLog(gameName, logText, moodRating) {
    const game = await dbManager.hobbie.findGameByTitle(gameName);

    if (!game) {
        return { success: false, message: `Humm, não encontrei "${gameName}" na sua estante. Que tal adicioná-lo com o comando \`/hobbie add "${gameName}" --platform ...\`? Assim podemos guardar essa memória.` };
    }

    // 1. Salva no banco de dados factual (SQLite)
    await dbManager.hobbie.addGameLog(game.id, logText, moodRating);
    
    // --- INÍCIO DA ALTERAÇÃO (AÇÃO 3) ---
    // 2. Salva no banco de dados semântico (ChromaDB) para futuras associações.
    //    Criamos um texto mais rico em contexto para ser vetorizado.
    const memoryContent = `Anotação sobre o jogo ${game.title}: "${logText}"`;
    await vectorDBManager.addMemory('gaia', `log-${Date.now()}`, memoryContent);
    // --- FIM DA ALTERAÇÃO (AÇÃO 3) ---

    return { success: true, message: `Anotado! Registrei essa memória sobre **${game.title}**. Momento épico!` };
}

// --- LÓGICA DE EXECUÇÃO PRINCIPAL ---

module.exports = {
    command: "gaia",
    description: "Ativa a G.A.I.A., sua companheira de lazer para conversas sobre jogos.",
    
    subcommands: {
        'log': 'Registra uma anotação. Ex: /gaia log venci um chefe --jogo "Nome do Jogo" --humor 5',
        'sugestao': 'Pede uma sugestão de jogo com base no seu humor.',
        'timer': 'Inicia um timer de lazer.',
        'clear': 'Limpa o estado da conversa atual com a G.A.I.A.',
        'reset': 'APAGA permanentemente todas as memórias e logs da G.A.I.A.'
    },
    
    execute: async (args) => {
        const subcommand = args[0]?.toLowerCase();
        const userInput = args.join(' ');

        // --- ROTEADOR DE CONVERSA CONTEXTUAL ---
        if (conversationState.expecting === 'mood_for_suggestion') {
            const moodDescription = userInput;
            clearConversation();
            
            const tags = (await aiManager.generateGaiaResponse({ userInput: `Analise: "${moodDescription}". Responda SÓ com tags de jogo separadas por vírgula. Ex: relaxante, casual, curto.` })).split(',').map(t => t.trim().toLowerCase());
            
            if (tags.length === 0) return { success: true, message: "Não consegui entender bem o sentimento para sugerir algo. Podemos tentar de novo?" };
            
            const gamesFound = await dbManager.hobbie.findGamesByTags(tags);
            
            if (gamesFound.length > 0) {
                const randomGame = gamesFound[Math.floor(Math.random() * gamesFound.length)];
                return { success: true, message: `Entendido! Buscando por algo com a vibe **${tags.join(', ')}**... \n\nEncontrei uma ótima opção na sua estante: que tal revisitar **${randomGame.title}** (${randomGame.platform})?` };
            } else {
                return { success: true, message: `Hmm, procurei na sua estante por algo com a vibe **${tags.join(', ')}**, mas não encontrei nada ainda.` };
            }
        }

        if (conversationState.expecting === 'game_for_log') {
            const gameName = userInput;
            const { logText, mood } = conversationState.data;
            clearConversation();
            
            return await saveGameLog(gameName, logText, mood);
        }

        // --- ROTEADOR DE COMANDOS DIRETOS ---
        switch (subcommand) {
            case 'sugestao':
                conversationState.expecting = 'mood_for_suggestion';
                return { success: true, message: "Com certeza! Para eu poder te dar uma boa sugestão, como você está se sentindo agora?\n\nPor exemplo: `Cansado e querendo relaxar` ou `Animado para um desafio`." };

            case 'log':
                const parsed = parseArgs(args.slice(1));
                const logText = parsed.main;
                const gameName = parsed.params.jogo;
                const mood = parsed.params.humor ? parseInt(parsed.params.humor, 10) : null;

                if (!logText) {
                    return { success: true, message: "O que você gostaria de registrar no seu diário de jogos?" };
                }
                if (mood && (isNaN(mood) || mood < 1 || mood > 5)) {
                    return { success: false, message: "O humor precisa ser um número entre 1 e 5." };
                }

                if (gameName) {
                    return await saveGameLog(gameName, logText, mood);
                } else {
                    conversationState.expecting = 'game_for_log';
                    conversationState.data = { logText, mood };
                    return { success: true, message: `Legal! Sobre qual jogo é essa anotação?` };
                }

            case 'clear':
                clearConversation();
                return { success: true, message: "Ok, limpei o contexto da nossa conversa." };

            case 'reset':
                clearConversation();
                await vectorDBManager.clearCollection('gaia');
                // Adicionar aqui a limpeza da tabela `game_logs` no futuro se desejado
                return { success: true, message: "Memória reiniciada. Todas as minhas lembranças foram limpas. Estou pronta para começar novas aventuras com você!" };

            default:
                if (!userInput) {
                    return { success: true, message: "Olá! Sou a G.A.I.A., sua companheira de aventuras. Sobre qual jogo ou momento legal vamos conversar hoje?" };
                }

                const memories = await vectorDBManager.searchRelevantMemories('gaia', userInput, 3);
                const gaiaResponse = await aiManager.generateGaiaResponse({ userInput, memoryContext: memories });
                await vectorDBManager.addMemory('gaia', `chat-${Date.now()}`, `A conversa foi: ${userInput}. A resposta foi: ${gaiaResponse}`);
                
                return { success: true, message: gaiaResponse };
        }
    }
};