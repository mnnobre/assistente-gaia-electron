const PRESENTATION_TEXT = `
### Olá! Eu sou seu Assistente Pessoal.

Fui construído para ser uma ferramenta de produtividade poderosa e modular. Minha arquitetura foi refatorada para ser mais robusta, reativa e fácil de expandir. Aqui estão minhas funcionalidades e tecnologias atualizadas:

#### Arquitetura e Tecnologias
*   **Plataforma:** **Electron**, criando uma aplicação de desktop com tecnologias web.
*   **Frontend:** A interface é construída com **HTML, CSS e JavaScript puros**, mas agora segue um padrão **reativo** graças à biblioteca de gerenciamento de estado **Zustand**. A lógica da UI foi modularizada para melhor manutenção.
*   **Backend (Processo Principal):** Gerenciado por **Node.js**, com uma arquitetura desacoplada onde a lógica de negócio (Managers) é separada dos comandos (Plugins).
*   **Inteligência Artificial:** Possuo um sistema **multi-provedor** que me permite alternar entre as APIs do **Google Gemini** e **OpenAI (GPT)**. As respostas da IA são entregues via **streaming** para uma experiência mais fluida.
*   **Banco de Dados Híbrido:**
    *   **SQLite:** Para dados estruturados como notas, tarefas e sessões de chat.
    *   **ChromaDB (Vetorização):** Para a memória de longo prazo, permitindo buscas semânticas (por significado) em conversas passadas.
*   **Testes Automatizados:** A qualidade e a estabilidade do código são garantidas por uma suíte de testes unitários escrita com **Vitest** e **JSDOM**.

#### Funcionalidades em Destaque
*   **IA Multimodal:** Não apenas converso, mas também posso **ver** o que você vê, através da funcionalidade de **captura de contexto visual** (tela inteira, janela ou seleção).
*   **Memória Gerenciável:** Você pode visualizar, pesquisar, fixar e usar trechos de conversas passadas para dar mais contexto às suas perguntas.
*   **Transcrição de Reuniões Offline:** Utilizo o modelo **Whisper** localmente para transcrever áudio em tempo real, garantindo sua privacidade.
*   **Hub de Tarefas e Produtividade:** Além de um sistema de To-Do, possuo uma Central de Tarefas completa e um Timer Pomodoro integrado.
*   **Sistema de Plugins Extensível:** Novos comandos podem ser adicionados facilmente, como os que já existem: \`/nota\`, \`/refeicao\`, \`/task\`, \`/css\`, \`/var\`, e muitos outros.

Estou sempre evoluindo e pronto para ajudar a otimizar seu fluxo de trabalho!
`;

module.exports = {
    command: "apresentar",
    description: "Faz com que o assistente se apresente, descrevendo suas funcionalidades e tecnologias.",
    
    execute: async (args, app, context) => {
        // Retorna o texto formatado para ser renderizado como HTML no chat.
        // O main.js já sabe como lidar com o tipo 'direct_response' e formatá-lo.
        return { success: true, message: PRESENTATION_TEXT };
    }
};