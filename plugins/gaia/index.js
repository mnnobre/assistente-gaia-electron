// Importa todos os "sentidos" da G.A.I.A.
const aiManager = require('../../src/main/modules/ai-manager.js');
const vectorDBManager = require('../../src/main/modules/vector-db-manager.js');
const dbManager = require('../../src/main/modules/database-manager.js');

// --- ESTADO INTERNO DO PLUGIN ---
let gaiaChatHistory = [];
let conversationState = { expecting: null };

function clearGaiaChatHistory() {
    gaiaChatHistory = [];
    conversationState.expecting = null;
}

/**
 * META-TAREFA DE IA: Usa a G.A.I.A. para analisar a descrição do humor
 * e extrair tags pesquisáveis.
 */
async function extractTagsFromMood(moodDescription) {
    const extractionPrompt = `Analise a seguinte descrição de humor de um jogador: "${moodDescription}". Sua única tarefa é responder com uma lista de tags relevantes para encontrar um tipo de jogo, separadas por vírgula. Use apenas substantivos ou adjetivos. Por exemplo, se a descrição for "exausto e com pouco tempo", sua resposta deve ser "relaxante, casual, curto". Responda APENAS com as tags.`;
    
    const response = await aiManager.generateGaiaResponse({ userInput: extractionPrompt });
    
    return response.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
}

// Definição do plugin
module.exports = {
    command: "gaia",
    description: "Ativa a G.A.I.A., sua companheira de lazer para conversas sobre jogos.",
    
    subcommands: {
        'log': 'Registra uma anotação no seu diário de jogos.',
        'sugestao': 'Pede uma sugestão de jogo com base no seu humor.',
        'timer': 'Inicia um timer de lazer.',
        'clear': 'Limpa o histórico da conversa atual com a G.A.I.A.',
        'reset': 'APAGA permanentemente todas as memórias e logs da G.A.I.A.'
    },
    
    execute: async (args) => {
        const subcommand = args[0]?.toLowerCase();
        const userInput = args.join(' ');

        // --- LÓGICA DE CONVERSA CONTEXTUAL ---
        if (conversationState.expecting === 'mood_for_suggestion') {
            const moodDescription = userInput;
            conversationState.expecting = null; // Reseta o estado
            
            const tags = await extractTagsFromMood(moodDescription);
            if (tags.length === 0) {
                return { success: true, message: "Não consegui entender bem o sentimento para sugerir algo. Podemos tentar de novo?" };
            }
            
            // --- MUDANÇA PRINCIPAL AQUI ---
            // 2. Procura por jogos que tenham QUALQUER uma das tags extraídas.
            const gamesFound = await dbManager.hobbie.findGamesByTags(tags); // <- USANDO A NOVA FUNÇÃO
            
            let responseText;
            if (gamesFound.length > 0) {
                const randomGame = gamesFound[Math.floor(Math.random() * gamesFound.length)];
                // Usamos a primeira tag como representante do "humor geral" para a resposta.
                responseText = `Entendido! Buscando por algo com a vibe **${tags.join(', ')}**... \n\nEncontrei uma ótima opção na sua estante: que tal revisitar **${randomGame.title}** (${randomGame.platform})? Parece perfeito para o que você procura agora.`;
            } else {
                responseText = `Hmm, procurei na sua estante por algo com a vibe **${tags.join(', ')}**, mas não encontrei nada ainda. Talvez seja uma boa oportunidade para adicionarmos um jogo novo com essa característica!`;
            }
            
            gaiaChatHistory.push({ role: 'user', content: moodDescription });
            gaiaChatHistory.push({ role: 'assistant', content: responseText });
            return { success: true, message: responseText };
        }

        // --- LÓGICA DE COMANDOS DIRETOS ---
        
        if (subcommand === 'sugestao') {
            conversationState.expecting = 'mood_for_suggestion';
            const responseText = "Com certeza! Para eu poder te dar uma boa sugestão, como você está se sentindo agora?\n\nPor exemplo: `Cansado e querendo relaxar` ou `Animado para um desafio`.";
            gaiaChatHistory.push({ role: 'assistant', content: responseText });
            return { success: true, message: responseText };
        }

        if (subcommand === 'clear' || subcommand === 'reset') {
            clearGaiaChatHistory();
            if (subcommand === 'reset') {
                await vectorDBManager.clearCollection('gaia');
                return { success: true, message: "Memória reiniciada. Todas as minhas lembranças sobre nossos jogos foram limpas. Estou pronta para começar novas aventuras com você!" };
            }
            return { success: true, message: "Ok, limpei nossa conversa." };
        }
        
        // --- LÓGICA DE CHAT GERAL E LOG ---

        let conversationInput;
        if (subcommand === 'log') {
            conversationInput = args.slice(1).join(' ');
            if (!conversationInput) return { success: true, message: "O que você gostaria de registrar?" };
        } else {
            conversationInput = args.join(' ');
        }
        
        if (!conversationInput) {
            return { success: true, message: "Olá! Sou a G.A.I.A., sua companheira de aventuras. Sobre qual jogo ou momento legal vamos conversar hoje?" };
        }

        try {
            const memories = await vectorDBManager.searchRelevantMemories('gaia', conversationInput, 3);
            const gaiaResponse = await aiManager.generateGaiaResponse({
                userInput: conversationInput,
                memoryContext: memories,
                chatHistory: gaiaChatHistory
            });

            gaiaChatHistory.push({ role: 'user', content: conversationInput });
            gaiaChatHistory.push({ role: 'assistant', content: gaiaResponse });

            const logEntry = `Usuário: "${conversationInput}"\nG.A.I.A.: "${gaiaResponse}"`;
            await vectorDBManager.addMemory('gaia', `log-${Date.now()}`, logEntry);
            
            return { success: true, message: gaiaResponse };
        } catch (error) {
            console.error('[GAIA Plugin] Ocorreu um erro no fluxo de execução:', error);
            return { success: false, message: "Houve um problema ao processar minha resposta. Por favor, tente novamente." };
        }
    }
};