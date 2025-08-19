const { ChromaClient } = require("chromadb");
const aiManager = require("./ai-manager.js");

class GeminiEmbeddingFunction {
    async generate(texts) {
        const embeddings = [];
        for (const text of texts) {
            const embedding = await aiManager.generateEmbedding(text);
            if (embedding) {
                embeddings.push(embedding);
            } else {
                embeddings.push(new Array(768).fill(0)); 
            }
        }
        return embeddings;
    }
}

class VectorDBManager {
    constructor() {
        const chromaUrl = "http://localhost:8000";
        this.client = new ChromaClient({ path: chromaUrl });
        this.embeddingFunction = new GeminiEmbeddingFunction();
        this.mainAssistantCollection = null;
        this.gaiaCollection = null;
        this.mainAssistantCollectionName = "chat_memories_main";
        this.gaiaCollectionName = "gaia_memories";
    }

    async initialize() {
        try {
            this.mainAssistantCollection = await this.client.getOrCreateCollection({
                name: this.mainAssistantCollectionName,
                embeddingFunction: this.embeddingFunction,
                metadata: { "description": "Memórias de longo prazo para o assistente de produtividade" }
            });
            console.log(`[VectorDB] Coleção de Produtividade "${this.mainAssistantCollectionName}" carregada.`);

            this.gaiaCollection = await this.client.getOrCreateCollection({
                name: this.gaiaCollectionName,
                embeddingFunction: this.embeddingFunction,
                metadata: { "description": "Memórias pessoais de jogo para a G.A.I.A." }
            });
            console.log(`[VectorDB] Coleção da G.A.I.A. "${this.gaiaCollectionName}" carregada.`);
            
            return true;
        } catch (error) {
            console.error("[VectorDB] Falha CRÍTICA ao inicializar coleções. O container Docker do ChromaDB está rodando? Use 'docker-compose up -d'.", error);
            return false;
        }
    }

    // --- NOVA FUNÇÃO DE LIMPEZA ---
    /**
     * Deleta e recria uma coleção para limpar todos os seus dados.
     * @param {'main' | 'gaia'} target - A coleção a ser limpa.
     */
    async clearCollection(target) {
        try {
            if (target === 'gaia') {
                console.log(`[VectorDB] Limpando a coleção da G.A.I.A.: "${this.gaiaCollectionName}"...`);
                await this.client.deleteCollection({ name: this.gaiaCollectionName });
                this.gaiaCollection = await this.client.getOrCreateCollection({
                    name: this.gaiaCollectionName,
                    embeddingFunction: this.embeddingFunction,
                    metadata: { "description": "Memórias pessoais de jogo para a G.A.I.A." }
                });
                console.log(`[VectorDB] Coleção da G.A.I.A. recriada com sucesso.`);
                return true;
            } else if (target === 'main') {
                // Adicionamos a lógica para a coleção principal por segurança, caso precise no futuro.
                console.log(`[VectorDB] Limpando a coleção Principal: "${this.mainAssistantCollectionName}"...`);
                await this.client.deleteCollection({ name: this.mainAssistantCollectionName });
                this.mainAssistantCollection = await this.client.getOrCreateCollection({
                    name: this.mainAssistantCollectionName,
                    embeddingFunction: this.embeddingFunction,
                    metadata: { "description": "Memórias de longo prazo para o assistente de produtividade" }
                });
                console.log(`[VectorDB] Coleção Principal recriada com sucesso.`);
                return true;
            }
            console.warn(`[VectorDB] Tentativa de limpar coleção desconhecida: ${target}`);
            return false;
        } catch (error) {
            console.error(`[VectorDB] Erro ao limpar a coleção '${target}':`, error);
            return false;
        }
    }
    // --- FIM DA NOVA FUNÇÃO ---

    async addMemory(target, id, content) {
        const collection = target === 'gaia' ? this.gaiaCollection : this.mainAssistantCollection;
        if (!collection) {
            console.error(`[VectorDB] A coleção '${target}' não foi inicializada. Não é possível adicionar memória.`);
            return;
        }
        try {
            await collection.add({
                ids: [id],
                metadatas: [{ "source": target, "created_at": Date.now() }],
                documents: [content]
            });
        } catch (error) {
            console.error(`[VectorDB] Erro ao adicionar memória com ID ${id} à coleção '${target}':`, error);
        }
    }

    async searchRelevantMemories(target, queryText, numResults = 3) {
        const collection = target === 'gaia' ? this.gaiaCollection : this.mainAssistantCollection;
        if (!collection) {
            console.error(`[VectorDB] A coleção '${target}' não foi inicializada. Não é possível buscar memórias.`);
            return [];
        }
        try {
            const results = await collection.query({
                queryTexts: [queryText],
                nResults: numResults
            });
            return results.documents[0] || [];
        } catch (error) {
            console.error(`[VectorDB] Erro ao buscar memórias na coleção '${target}':`, error);
            return [];
        }
    }
}

module.exports = new VectorDBManager();