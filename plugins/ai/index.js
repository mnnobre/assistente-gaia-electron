// /plugins/ai/index.js (NOVO ARQUIVO)

const aiManager = require("../../src/main/modules/ai-manager.js");

// Objeto de configuração para todas as "habilidades" de IA
const aiSkills = {
  'css': {
    description: 'Gera um nome de classe CSS BEM a partir de uma descrição.',
    promptTemplate: `
      Você é um assistente especialista em CSS que cria nomes de classe.
      Sua única tarefa é gerar um nome de classe CSS apropriado, preferencialmente no estilo BEM, com base na descrição fornecida.
      Responda APENAS com o nome da classe, começando com um ponto (.), e nada mais. Não inclua explicações, markdown ou qualquer texto adicional.
      Descrição do usuário: "{QUERY}"`,
    format: 'css' // Usado para formatar a saída em um bloco de código
  },
  'var': {
    description: 'Gera um nome de variável camelCase a partir de uma descrição.',
    promptTemplate: `
      Você é um assistente de programação especialista em convenções de nomenclatura.
      Sua única tarefa é gerar um nome de variável universalmente compreensível, preferencialmente no formato camelCase, com base na descrição fornecida.
      Responda APENAS com o nome da variável e nada mais. Não inclua explicações, markdown, aspas ou qualquer texto adicional.
      Descrição do usuário: "{QUERY}"`,
    format: 'javascript'
  },
  'regex': {
    description: 'Gera uma expressão regular (Regex) a partir de uma descrição.',
    promptTemplate: `
      Você é um especialista em expressões regulares (Regex).
      Sua tarefa é criar a expressão regular exata que corresponda à necessidade descrita pelo usuário.
      Responda APENAS com a expressão regular. Não inclua delimitadores como /.../, explicações ou qualquer texto adicional.
      Descrição: "{QUERY}"`,
    format: 'text'
  },
  'explicar': {
    description: 'Explica um trecho de código ou uma mensagem de erro.',
    promptTemplate: `
      Aja como um desenvolvedor sênior e mentor de programação.
      Analise o seguinte trecho de código ou mensagem de erro e explique-o de forma clara e concisa.
      Se for um erro, sugira as causas mais prováveis e como corrigi-lo.
      Use formatação markdown para clareza.
      Código/Erro a ser explicado:
      \`\`\`
      {QUERY}
      \`\`\``,
    format: 'markdown' // O markdown já vem da IA, então não precisa de bloco
  },
  'git': {
    description: 'Gera o comando Git correto para uma ação descrita.',
    promptTemplate: `
      Você é um especialista em Git.
      Sua tarefa é fornecer o comando Git exato para realizar a ação descrita pelo usuário.
      Responda APENAS com o(s) comando(s) de terminal. Não inclua explicações.
      Ação desejada: "{QUERY}"`,
    format: 'shell'
  }
};

module.exports = {
  command: "ai",
  description: "Acessa ferramentas de IA para gerar código, explicações e mais.",

  // Gera os subcomandos dinamicamente para o autocomplete da UI
  subcommands: Object.keys(aiSkills).reduce((acc, key) => {
    acc[key] = aiSkills[key].description;
    return acc;
  }, {}),

  execute: async (args) => {
    const subcommand = args.shift()?.toLowerCase();
    const query = args.join(" ");

    if (!subcommand || !aiSkills[subcommand]) {
      const availableCommands = Object.keys(aiSkills).join(', ');
      return { success: false, message: `Subcomando inválido. Use um destes: ${availableCommands}.` };
    }

    if (!query) {
      return { success: false, message: `Por favor, forneça uma descrição para o subcomando '${subcommand}'.` };
    }

    const skill = aiSkills[subcommand];
    const finalPrompt = skill.promptTemplate.replace("{QUERY}", query);

    try {
      // Por enquanto, chamamos o generateResponse padrão. No Passo 2, poderemos passar o modelo aqui.
      const aiResponse = await aiManager.generateResponse(finalPrompt);
      let responseContent = aiResponse.content || "Não foi possível gerar uma resposta.";

      // Formata a saída se necessário
      if (skill.format && skill.format !== 'markdown') {
        responseContent = `\`\`\`${skill.format}\n${responseContent}\n\`\`\``;
      }
      
      return { success: true, message: responseContent };

    } catch (error) {
      console.error(`[AI Plugin] Erro ao executar o subcomando "${subcommand}":`, error);
      return { success: false, message: "Ocorreu um erro ao se comunicar com a IA." };
    }
  }
};