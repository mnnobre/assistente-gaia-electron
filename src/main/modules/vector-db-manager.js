// src/main/modules/vector-db-manager.js

/**
 * VectorDBManager
 * 
 * Gerencia o banco de dados vetorial local usando LanceDB.
 * 
 * ⚠️ No Node.js não existe register_embedding_function.
 * O embedding deve ser gerado manualmente antes de salvar no banco.
 */

const { connect } = require("vectordb");
const aiManager = require("./ai-manager.js");
const path = require("path");
const fs = require('fs').promises;

class VectorDBManager {
    constructor() {
        this.db = null;
        this.mainAssistantTable = null;
        this.gaiaTable = null;
        this.mainAssistantTableName = "chat_memories_main";
        this.gaiaTableName = "gaia_memories";
    }

    /**
     * Inicializa o LanceDB com persistência local.
     */
    async initialize(userDataPath) {
        if (!userDataPath) {
            throw new Error("[VectorDB] userDataPath não fornecido.");
        }

        const dbPath = path.join(userDataPath, 'lancedb_data');

        try {
            await fs.mkdir(dbPath, { recursive: true });

            this.db = await connect(dbPath);
            console.log(`[VectorDB] Conexão com LanceDB estabelecida em: ${dbPath}`);

            const tableNames = await this.db.tableNames();

            // --- INÍCIO DA ALTERAÇÃO ---
            // Define o schema completo para os dados iniciais
            const initialMainData = [{
                id: 'init_id_main',
                text: "initial text",
                vector: new Array(768).fill(0),
                source: 'main',
                created_at: 0
            }];

            const initialGaiaData = [{
                id: 'init_id_gaia',
                text: "initial game log",
                vector: new Array(768).fill(0),
                source: 'gaia',
                created_at: 0
            }];
            // --- FIM DA ALTERAÇÃO ---

            // Criar/abrir tabela principal
            if (tableNames.includes(this.mainAssistantTableName)) {
                this.mainAssistantTable = await this.db.openTable(this.mainAssistantTableName);
            } else {
                console.log(`[VectorDB] Criando tabela "${this.mainAssistantTableName}" com schema completo.`);
                this.mainAssistantTable = await this.db.createTable(
                    this.mainAssistantTableName,
                    initialMainData // <-- Usa os dados iniciais com o schema completo
                );
            }

            // Criar/abrir tabela da GAIA
            if (tableNames.includes(this.gaiaTableName)) {
                this.gaiaTable = await this.db.openTable(this.gaiaTableName);
            } else {
                console.log(`[VectorDB] Criando tabela "${this.gaiaTableName}" com schema completo.`);
                this.gaiaTable = await this.db.createTable(
                    this.gaiaTableName,
                    initialGaiaData // <-- Usa os dados iniciais com o schema completo
                );
            }

            console.log(`[VectorDB] Tabelas inicializadas com sucesso.`);
            return true;
        } catch (error) {
            console.error("[VectorDB] Falha CRÍTICA ao inicializar o LanceDB.", error);
            return false;
        }
    }

    /**
     * Adiciona memória (gera embedding manualmente e salva no banco)
     */
    async addMemory(target, id, content) {
        const table = target === 'gaia' ? this.gaiaTable : this.mainAssistantTable;
        if (!table) {
            console.error(`[VectorDB] Tabela '${target}' não inicializada.`);
            return;
        }

        try {
            const embedding = await aiManager.generateEmbedding(content);
            
            // Garante que o embedding seja um array válido
            if (!embedding || embedding.length !== 768) {
                console.error(`[VectorDB] Falha ao gerar embedding para o conteúdo. Usando fallback.`);
                embedding = new Array(768).fill(0);
            }

            await table.add([{
                id,
                text: content,
                vector: embedding,
                source: target,
                created_at: Date.now()
            }]);
        } catch (error) {
            console.error(`[VectorDB] Erro ao adicionar memória à tabela '${target}':`, error);
        }
    }

    /**
     * Busca memórias relevantes
     */
    async searchRelevantMemories(target, queryText, numResults = 3) {
        const table = target === 'gaia' ? this.gaiaTable : this.mainAssistantTable;
        if (!table) {
            console.error(`[VectorDB] Tabela '${target}' não inicializada.`);
            return [];
        }

        try {
            const queryEmbedding = await aiManager.generateEmbedding(queryText);
            
            // Garante que a busca não falhe se o embedding da query falhar
            if (!queryEmbedding || queryEmbedding.length !== 768) {
                console.error(`[VectorDB] Falha ao gerar embedding para a query de busca.`);
                return [];
            }

            const results = await table.search(queryEmbedding).limit(numResults).execute();
            return results.map(r => r.text);
        } catch (error) {
            console.error(`[VectorDB] Erro ao buscar memórias na tabela '${target}':`, error);
            return [];
        }
    }
}

module.exports = new VectorDBManager();