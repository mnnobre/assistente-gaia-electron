// /plugins/gaia/index.js (VERSÃO FINAL DA FASE 8)

const aiManager = require('../../src/main/modules/ai-manager.js');
const vectorDBManager = require('../../src/main/modules/vector-db-manager.js');
const dbManager = require('../../src/main/modules/database-manager.js');

let conversationState = {
    expecting: null,
    data: {}
};

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

async function saveGameLog(gameName, logText, moodRating) {
    const game = await dbManager.hobbie.findGameByTitle(gameName);
    if (!game) {
        return { success: false, message: `Humm, não encontrei "${gameName}" na sua estante. Que tal adicioná-lo com \`/hobbie add\`?` };
    }
    await dbManager.hobbie.addGameLog(game.id, logText, moodRating);
    const memoryContent = `Anotação sobre o jogo ${game.title}: "${logText}"`;
    await vectorDBManager.addMemory('gaia', `log-${Date.now()}`, memoryContent);
    return { success: true, message: `Anotado! Registrei essa memória sobre **${game.title}**. Momento épico!` };
}

async function handleStatusChange(args, status, statusMessages) {
    const gameName = args.slice(1).join(' ').replace(/"/g, '').trim();
    if (!gameName) {
        return { success: false, message: "Preciso saber o nome do jogo para atualizar o status." };
    }
    const changes = await dbManager.hobbie.updateGameStatus(gameName, status);
    if (changes > 0) {
        const message = statusMessages[status].replace('{gameName}', gameName);
        return { success: true, message };
    } else {
        return { success: false, message: `Não encontrei o jogo "${gameName}" na sua estante.` };
    }
}

module.exports = {
    command: "gaia",
    description: "Ativa a G.A.I.A., sua companheira de lazer para conversas sobre jogos.",
    
    subcommands: {
        'log': 'Registra uma anotação sobre um jogo.',
        'sugestao': 'Pede uma sugestão de jogo com base no seu humor.',
        'jogando': 'Define um jogo como "Jogando Atualmente". Ex: /gaia jogando Elden Ring',
        'zerei': 'Define o status de um jogo como "Finalizado".',
        'pausei': 'Define o status de um jogo como "Pausado".',
        'larguei': 'Define o status de um jogo como "Abandonado".',
        'estante': 'Retorna um jogo para o status padrão "Na Estante".',
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
            if (tags.length === 0) return { success: true, message: "Não consegui entender bem o sentimento." };
            const gamesFound = await dbManager.hobbie.findGamesByTags(tags);
            if (gamesFound.length > 0) {
                const randomGame = gamesFound[Math.floor(Math.random() * gamesFound.length)];
                return { success: true, message: `Entendido! Buscando algo **${tags.join(', ')}**... Que tal revisitar **${randomGame.title}**?` };
            } else {
                return { success: true, message: `Hmm, não encontrei nada com a vibe **${tags.join(', ')}** na sua estante.` };
            }
        }
        
        // --- INÍCIO DA ALTERAÇÃO (FASE 8) ---
        // Agora temos dois tipos de contexto de log
        if (conversationState.expecting === 'game_for_log' || conversationState.expecting === 'game_disambiguation_for_log') {
            const gameName = userInput;
            const { logText, mood } = conversationState.data;
            clearConversation();
            return await saveGameLog(gameName, logText, mood);
        }
        // --- FIM DA ALTERAÇÃO ---

        // --- ROTEADOR DE COMANDOS DIRETOS ---
        const statusCommands = ['jogando', 'zerei', 'pausei', 'larguei', 'estante'];
        const statusMap = { 'jogando': 'Jogando Atualmente', 'zerei': 'Finalizado', 'pausei': 'Pausado', 'larguei': 'Abandonado', 'estante': 'Na Estante' };
        const statusMessages = {
            'Jogando Atualmente': `Boa! Marquei **{gameName}** como seu foco atual. Boa jogatina!`,
            'Finalizado': `Parabéns por zerar **{gameName}**! Memória registrada com sucesso.`,
            'Pausado': `Ok, **{gameName}** foi para a "geladeira". A gente volta pra ele depois.`,
            'Abandonado': `Entendido. Nem todo jogo é pra gente. Marquei **{gameName}** como abandonado.`,
            'Na Estante': `Certo, **{gameName}** voltou para a estante, pronto para uma futura aventura.`
        };
        if (statusCommands.includes(subcommand)) {
            return await handleStatusChange(args, statusMap[subcommand], statusMessages);
        }

        switch (subcommand) {
            case 'sugestao':
                conversationState.expecting = 'mood_for_suggestion';
                return { success: true, message: "Com certeza! Como você está se sentindo agora?" };

            case 'log':
                const parsed = parseArgs(args.slice(1));
                const logText = parsed.main;
                const gameNameParam = parsed.params.jogo;
                const mood = parsed.params.humor ? parseInt(parsed.params.humor, 10) : null;
                if (!logText) return { success: true, message: "O que você gostaria de registrar?" };
                if (mood && (isNaN(mood) || mood < 1 || mood > 5)) return { success: false, message: "O humor precisa ser um número entre 1 e 5." };
                
                // Se o usuário especificou um jogo com --jogo, a prioridade é dele.
                if (gameNameParam) return await saveGameLog(gameNameParam, logText, mood);
                
                // --- INÍCIO DA ALTERAÇÃO (FASE 8) ---
                // Se não, tentamos adivinhar pelo contexto.
                const activeGames = await dbManager.hobbie.getActiveGames();

                if (activeGames.length === 1) {
                    // Cenário 2: Um jogo ativo. Assume o contexto e salva direto.
                    return await saveGameLog(activeGames[0].title, logText, mood);
                } else if (activeGames.length > 1) {
                    // Cenário 3: Múltiplos jogos ativos. Pede para desambiguar.
                    conversationState.expecting = 'game_disambiguation_for_log';
                    conversationState.data = { logText, mood };
                    const gameTitles = activeGames.map(g => `**${g.title}**`).join(' ou ');
                    return { success: true, message: `Legal! Essa anotação é sobre ${gameTitles}?` };
                } else {
                    // Cenário 1: Nenhum jogo ativo. Pergunta qual é.
                    conversationState.expecting = 'game_for_log';
                    conversationState.data = { logText, mood };
                    return { success: true, message: `Legal! Sobre qual jogo é essa anotação?` };
                }
                // --- FIM DA ALTERAÇÃO ---

            case 'clear':
                clearConversation();
                return { success: true, message: "Ok, limpei o contexto da nossa conversa." };

            case 'reset':
                clearConversation();
                await vectorDBManager.clearCollection('gaia');
                return { success: true, message: "Memória reiniciada." };

            default:
                // --- INÍCIO DA ALTERAÇÃO (CHAT CONTEXTUAL) ---
                if (!userInput) return { success: true, message: "Olá! Sou a G.A.I.A. Vamos conversar sobre seus jogos?" };

                const activeGamesForChat = await dbManager.hobbie.getActiveGames();
                let contextMessage = "";
                if (activeGamesForChat.length > 0) {
                    const gameTitles = activeGamesForChat.map(g => g.title).join(' e ');
                    contextMessage = `Lembrete: Atualmente, estou jogando ${gameTitles}. Use isso como contexto principal para a conversa.`;
                }

                const memories = await vectorDBManager.searchRelevantMemories('gaia', userInput, 3);
                const gaiaResponse = await aiManager.generateGaiaResponse({ userInput: `${contextMessage}\n\n${userInput}`, memoryContext: memories });
                await vectorDBManager.addMemory('gaia', `chat-${Date.now()}`, `A conversa foi: ${userInput}. A resposta foi: ${gaiaResponse}`);
                return { success: true, message: gaiaResponse };
                // --- FIM DA ALTERAÇÃO ---
        }
    }
};