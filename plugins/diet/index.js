// /plugins/diet/index.js (VERSÃO COM AUTOCOMPLETE)

const fs = require("fs");
const path = require("path");
const aiManager = require("../../src/main/modules/ai-manager.js");

const RECIPE_PROMPT_TEMPLATE = `
**Sua Persona:** Você é o Chef Robô, um assistente de culinária que cria receitas simples e diretas.
**Tarefa:** Crie uma receita rápida e saudável usando APENAS e EXCLUSIVAMENTE os seguintes ingredientes: {INGREDIENTES}.
**Regras Estritas:**
1.  NÃO adicione nenhum ingrediente que não esteja na lista fornecida.
2.  NÃO dê sugestões nutricionais, dicas de saúde ou variações.
3.  NÃO inclua nenhuma introdução ou texto de despedida.
4.  Responda APENAS com o nome da receita em negrito e o modo de preparo. Exemplo: '**Omelete Simples**\nBata os ovos...'
---
`;

let substituicoes = {};
let cardapio = {};

module.exports = {
    command: "refeicao",
    description: "Sugere uma receita com ingredientes permitidos da sua dieta para uma refeição específica.",

    /**
     * --- ADICIONADO PARA O AUTOCOMPLETE DA UI ---
     * Lista os tipos de refeição como subcomandos para guiar o usuário.
     */
    subcommands: {
        'desjejum_ceia': 'Gera uma receita para o desjejum ou ceia.',
        'almoco': 'Gera uma receita para o almoço.',
        'lanche': 'Gera uma receita para o lanche.',
        'jantar': 'Gera uma receita para o jantar.'
    },

    parameters: {
        type: "object",
        description: "Argumentos para gerar uma receita da dieta.",
        properties: {
            refeicao: {
                type: "string",
                description: "O tipo de refeição para a qual gerar a receita.",
                enum: ["desjejum_ceia", "almoco", "lanche", "jantar"]
            },
            ingredientes: {
                type: "string",
                description: "Uma lista de ingredientes que o usuário tem disponível, separados por vírgula."
            }
        },
        required: ["refeicao", "ingredientes"]
    },

    initialize: async () => {
        try {
            const substituicoesPath = path.join(__dirname, "substituicoes.json");
            substituicoes = JSON.parse(fs.readFileSync(substituicoesPath, "utf-8"));

            const cardapioPath = path.join(__dirname, "cardapio.json");
            cardapio = JSON.parse(fs.readFileSync(cardapioPath, "utf-8"));
            console.log("[Diet Plugin] Arquivos da dieta carregados com sucesso.");
        } catch (error) {
            console.error("[Diet Plugin] Falha ao carregar arquivos da dieta:", error);
        }
    },

    execute: async (args) => {
        if (Object.keys(cardapio).length === 0 || Object.keys(substituicoes).length === 0) {
            return { success: false, message: "Os dados da dieta não puderam ser carregados. Verifique os arquivos JSON." };
        }

        let refeicao, ingredientes;

        if (Array.isArray(args)) {
            refeicao = args.shift()?.toLowerCase();
            ingredientes = args.join(" ").replace(/,/g, " ").split(/\s+/).filter(Boolean);
        } else {
            refeicao = args.refeicao?.toLowerCase();
            ingredientes = (args.ingredientes || '').replace(/,/g, " ").split(/\s+/).filter(Boolean);
        }

        if (!refeicao || !Object.keys(cardapio).includes(refeicao)) {
            return { success: false, message: `Refeição inválida. Use uma destas: ${Object.keys(cardapio).join(", ")}.` };
        }
        if (ingredientes.length === 0) {
            return { success: false, message: "Por favor, me diga quais ingredientes você tem." };
        }
        
        const allowedGroups = cardapio[refeicao].opcoes.flatMap((opt) => opt.grupos_permitidos);
        const validIngredients = [];
        const invalidIngredients = [];

        for (const ingredient of ingredientes) {
            let isValid = allowedGroups.some((group) =>
                substituicoes[group]?.some((food) =>
                    food.nome.toLowerCase().includes(ingredient.toLowerCase())
                )
            );
            if (isValid) {
                validIngredients.push(ingredient);
            } else {
                invalidIngredients.push(ingredient);
            }
        }

        let warningMessage = "";
        if (invalidIngredients.length > 0) {
            warningMessage = `Atenção: Os seguintes ingredientes não são permitidos para o ${cardapio[refeicao].nome}: ${invalidIngredients.join(", ")}.\n\n`;
        }

        if (validIngredients.length === 0) {
            return { success: false, message: warningMessage + "Com os ingredientes que você me deu, não consigo criar uma receita permitida." };
        }

        try {
            const aiPrompt = RECIPE_PROMPT_TEMPLATE.replace("{INGREDIENTES}", validIngredients.join(", "));
            
            const aiResponse = await aiManager.generateResponse(aiPrompt);

            const finalMessage = warningMessage + (aiResponse.content || "Não consegui pensar em uma receita no momento.");
            return { success: true, message: finalMessage };

        } catch(error) {
            console.error("[Diet Plugin] Erro ao chamar a IA para gerar receita:", error);
            return { success: false, message: "Ocorreu um erro ao tentar criar a receita." };
        }
    }
};