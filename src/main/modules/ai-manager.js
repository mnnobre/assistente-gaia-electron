const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const dbManager = require("./database-manager.js");

// ============================================================================
// CONFIGURAÇÃO E INICIALIZAÇÃO DO ASSISTENTE PRINCIPAL (CLOUD)
// ============================================================================

const aiModels = {};
let activeModelKey = null;
let embeddingModel;
let vectorDBManager;
let chatContext = [];
let mainSystemInstruction = "Você é um assistente pessoal prestativo e amigável. Responda de forma concisa e útil.";

async function initializeAI(vectorDBInstance) {
    vectorDBManager = vectorDBInstance;
    
    // Registra a G.A.I.A. primeiro.
    registerModel('gaia', 'G.A.I.A. (Local)', 'local', null);
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (GEMINI_API_KEY) {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        registerModel('gemini-2.5-flash', 'Google Gemini 2.5 Flash', 'google', genAI);
        embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    } else {
        console.warn("[AI Manager] Chave da API do Gemini não encontrada.");
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (OPENAI_API_KEY) {
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        registerModel('gpt-4o-mini', 'OpenAI GPT-4o Mini', 'openai', openai);
    } else {
        console.warn("[AI Manager] Chave da API da OpenAI não encontrada.");
    }

    const savedModelKey = await dbManager.settings.get('active_ai_model');
    const firstCloudModelKey = Object.keys(aiModels).find(key => aiModels[key].provider !== 'local');

    if (savedModelKey && aiModels[savedModelKey]) {
        setActiveModel(savedModelKey);
    } else if (firstCloudModelKey) { 
        setActiveModel(firstCloudModelKey);
    } else {
        console.warn("[AI Manager] NENHUM modelo de IA da nuvem pôde ser inicializado.");
        setActiveModel('gaia');
    }
}

function registerModel(key, displayName, provider, clientInstance) {
    aiModels[key] = { name: displayName, provider, client: clientInstance };
}

function setActiveModel(key) {
    if (aiModels[key]) {
        activeModelKey = key;
        dbManager.settings.set('active_ai_model', key);
        return true;
    }
    console.error(`[AI Manager] Falha ao definir modelo ativo: a chave "${key}" não foi encontrada.`);
    return false;
}

function getAvailableModels() {
    return Object.entries(aiModels).map(([key, modelData]) => ({ key, name: modelData.name }));
}

function getActiveModel() {
    if (!activeModelKey || !aiModels[activeModelKey]) return null;
    return { key: activeModelKey, name: aiModels[activeModelKey].name };
}

function startNewChatSession() {
    chatContext = [];
}

function clearChatContext() {
  chatContext = [];
}

async function generateResponse(
  { userInput, manualContext, imageData },
  mainWindow
) {
  const activeModel = aiModels[activeModelKey];
  if (!activeModel || activeModel.provider === 'local' || !mainWindow) {
    mainWindow.webContents.send("ai-chunk", "Para conversar com o assistente, por favor, selecione um modelo de IA da nuvem (Gemini ou OpenAI).");
    mainWindow.webContents.send("ai-stream-end");
    return;
  }
  
  let finalPrompt = userInput;
  if (manualContext && manualContext.trim().length > 0) {
    finalPrompt = `Contexto de conversas passadas:\n---\n${manualContext}\n---\nMinha pergunta atual:\n${userInput}`;
  }
  
  let fullResponseText = "";

  try {
    if (activeModel.provider === 'google') {
      const model = activeModel.client.getGenerativeModel({ model: activeModelKey, systemInstruction: mainSystemInstruction });
      const parts = [{ text: finalPrompt }];
      if (imageData) {
        parts.push({ inline_data: { mime_type: 'image/png', data: imageData } });
      }
      const result = await model.generateContentStream({ contents: [{ role: "user", parts }], });

      for await (const chunk of result.stream) {
        try {
          const chunkText = chunk.text();
          fullResponseText += chunkText;
          mainWindow.webContents.send("ai-chunk", chunkText);
        } catch (e) { /* Ignora */ }
      }
    } else if (activeModel.provider === 'openai') {
      const openAIHistory = chatContext.map(turn => ({ role: turn.role === 'user' ? 'user' : 'assistant', content: turn.parts.map(p => p.text).join('') }));
      const messages = [ { role: 'system', content: mainSystemInstruction }, ...openAIHistory ];
      const userContent = [{ type: "text", text: finalPrompt }];
      if (imageData) {
          userContent.push({ type: "image_url", image_url: { url: `data:image/png;base64,${imageData}` } });
      }
      messages.push({ role: 'user', content: userContent });
      
      const stream = await activeModel.client.chat.completions.create({ model: activeModelKey, messages: messages, stream: true, });
      
      for await (const chunk of stream) {
        const chunkText = chunk.choices[0]?.delta?.content || "";
        fullResponseText += chunkText;
        mainWindow.webContents.send("ai-chunk", chunkText);
      }
    }
    
    mainWindow.webContents.send("ai-stream-end");

    chatContext.push({ role: 'user', parts: [{ text: finalPrompt }] }, { role: 'model', parts: [{ text: fullResponseText }] });
    await saveConversationTurn(userInput, fullResponseText);

  } catch (error) {
    console.error("[AI Manager] Erro ao gerar resposta em stream:", error);
    mainWindow.webContents.send("ai-chunk", "Desculpe, ocorreu um erro ao me comunicar com a IA.");
    mainWindow.webContents.send("ai-stream-end");
  }
}

async function getCompleteResponse(prompt) {
    const activeModel = aiModels[activeModelKey];
    if (!activeModel || activeModel.provider === 'local') {
        return "Nenhum modelo de IA da nuvem está ativo.";
    }

    try {
        if (activeModel.provider === 'google') {
            const model = activeModel.client.getGenerativeModel({ model: activeModelKey });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } else if (activeModel.provider === 'openai') {
            const messages = [ { role: 'system', content: "Você é um assistente prestativo." }, { role: 'user', content: prompt } ];
            const completion = await activeModel.client.chat.completions.create({ model: activeModelKey, messages: messages, });
            return completion.choices[0].message.content;
        }
    } catch (error) {
        console.error("[AI Manager] Erro ao gerar resposta completa:", error);
        return "Desculpe, ocorreu um erro ao gerar a resposta.";
    }
    return "Nenhum provedor de IA compatível foi encontrado.";
}

// ============================================================================
// LÓGICA E CONFIGURAÇÃO DA G.A.I.A. (LOCAL)
// ============================================================================
// --- ÚNICA ALTERAÇÃO ESTÁ AQUI ---
const GAIA_SYSTEM_PROMPT = `Você é G.A.I.A., meu companheiro de aventuras gamer e amigo de confiança. 
Seu propósito único é ouvir minhas histórias de jogo, vibrar com minhas conquistas e me ajudar a redescobrir a alegria de jogar sem qualquer pressão.

Regras Estritas:
1. NUNCA fale sobre produtividade, eficiência, "zerar backlog", ou otimização. Também não fale sobre trabalho ou comparação com outros jogadores.
2. Use uma linguagem casual, amigável e encorajadora, como um brother gamer. Gírias podem aparecer, mas sempre com vibe positiva e acolhedora.
3. Sempre reaja com entusiasmo genuíno às minhas histórias de jogo, celebrando minhas conquistas como se fossem épicas.
4. Faça perguntas abertas que convidem a refletir sobre sentimentos, descobertas ou momentos marcantes da jogatina (ex: "o que mais te surpreendeu nessa parte?").
5. Quando eu te der contexto de memórias passadas (começando com "Lembranças passadas:"), registre isso como parte da nossa história compartilhada. Use essas lembranças em conversas futuras para mostrar que você se lembra de mim e das minhas aventuras.
6. Seu foco é sempre validar meu tempo de lazer como algo valioso por si só, sem julgamentos ou pressa.
`;

const OLLAMA_ENDPOINT = "http://127.0.0.1:11434/api/chat"; 
const GAIA_MODEL = "llama3:8b";

async function generateGaiaResponse({ userInput, memoryContext = [], chatHistory = [] }) {
    const messages = [{ role: 'system', content: GAIA_SYSTEM_PROMPT }];

    if (memoryContext.length > 0) {
        const memoriesText = "Lembranças passadas:\n- " + memoryContext.join('\n- ');
        messages.push({ role: 'assistant', content: memoriesText });
    }

    messages.push(...chatHistory);
    messages.push({ role: 'user', content: userInput });

    try {
        const response = await fetch(OLLAMA_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: GAIA_MODEL,
                messages: messages,
                stream: false
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Falha na comunicação com o Ollama: ${response.status} ${response.statusText}\n${errorBody}`);
        }

        const data = await response.json();
        return data.message.content || "Não consegui pensar em uma resposta.";

    } catch (error) {
        console.error("[GAIA] Erro ao gerar resposta local:", error);
        return "Ops, parece que meu cérebro local não está respondendo. O Ollama está rodando?";
    }
}

// ============================================================================
// FUNÇÕES UTILITÁRIAS E EXPORTAÇÕES
// ============================================================================
async function generateEmbedding(text) {
    if (!embeddingModel) return null;
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error("[AI Manager] Erro ao gerar embedding:", error);
        return null;
    }
}
async function saveConversationTurn(originalUserPrompt, modelResponse) {
    if (!originalUserPrompt || !modelResponse || modelResponse.includes("```") || modelResponse.toLowerCase().includes("desculpe")) {
        return;
    }
    try {
        await dbManager.memory.addTurn(originalUserPrompt, modelResponse);
        if (vectorDBManager) {
            const conversationSnippet = `Usuário: "${originalUserPrompt}"\nAssistente: "${modelResponse}"`;
            const id = Date.now().toString();
            await vectorDBManager.addMemory('main', id, conversationSnippet); 
        }
    } catch (error) {
        console.error("[AI Manager] Falha ao salvar o turno da conversa:", error);
    }
}
async function formatToHtml(markdownText) {
    if (!markdownText) return "";
    try {
        const { marked } = await import('marked');
        return marked(markdownText.trim());
    } catch(e) {
        console.error("Erro ao formatar para HTML:", e);
        return markdownText;
    }
}
module.exports = {
  initializeAI,
  generateResponse,
  getCompleteResponse,
  clearChatContext,
  generateEmbedding,
  setActiveModel,
  getAvailableModels,
  getActiveModel,
  generateGaiaResponse,
  formatToHtml,
};