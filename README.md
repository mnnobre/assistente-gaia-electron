# Assistente de Desktop Pessoal G.A.I.A.

Um assistente de desktop multifuncional construído com Electron, focado em produtividade e bem-estar, com uma IA de personalidade dupla para trabalho e lazer.

## ✨ Funcionalidades Principais

*   **IA Multi-Provedor:** Alterna entre modelos de IA na nuvem (Gemini, OpenAI) e um modelo local (Ollama) para a persona G.A.I.A.
*   **Memória Híbrida:** Utiliza SQLite para dados estruturados e ChromaDB para memória semântica de longo prazo.
*   **Sistema de Plugins:** Arquitetura modular que permite a fácil adição de novos comandos e funcionalidades.
*   **Foco em Lazer e Produtividade:** Inclui ferramentas como a Central de Tarefas, um assistente de jogos (G.A.I.A.), transcrição de reuniões e mais.

## 🚀 Roadmap de Desenvolvimento

O projeto está em constante evolução. O plano atual pode ser visualizado nas issues e projetos do GitHub.

## 🛠️ Configuração do Projeto

1.  Clone o repositório: `git clone [URL_DO_SEU_REPOSITORIO]`
2.  Instale as dependências: `npm install`
3.  Crie um arquivo `.env` na raiz e adicione suas chaves de API:
    ```
    GEMINI_API_KEY=SUA_CHAVE_AQUI
    OPENAI_API_KEY=SUA_CHAVE_AQUI
    ```
4.  Inicie a aplicação: `npm start`