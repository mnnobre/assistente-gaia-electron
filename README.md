# Assistente Pessoal G.A.I.A. 🧠✨

Assistente de desktop multifuncional construído com Electron, focado em produtividade e bem-estar, com uma arquitetura de IA híbrida para trabalho e lazer.

✅ **Status:** Funcionalidades Principais Implementadas

---

## 🚀 Como Rodar Localmente

#### **Pré-requisitos**
*   **Node.js** (v18+)
*   **npm** ou **yarn**
*   **Docker e Docker Compose** (para o banco de dados vetorial ChromaDB)

#### **Instalação Rápida**
1.  **Clone o repositório**
    ```bash
    git clone <URL_DO_SEU_REPOSITORIO>
    cd Assistente-electron
    ```
2.  **Instale as dependências**
    ```bash
    npm install
    ```
3.  **Configure o Ambiente**
    *   Crie uma cópia do arquivo `.env.example` e renomeie para `.env`.
    *   Preencha com suas chaves de API do Google Gemini e OpenAI.
    ```env
    GEMINI_API_KEY="SUA_CHAVE_AQUI"
    OPENAI_API_KEY="SUA_CHAVE_AQUI"
    ```
4.  **Inicie os Serviços**
    *   Em um terminal, inicie o banco de dados vetorial:
        ```bash
        docker-compose up -d
        ```
    *   Em outro terminal, inicie o assistente:
        ```bash
        npm start
        ```

---

## 🏗️ Arquitetura e Tecnologias

#### **Core**
*   **Plataforma:** **Electron**, criando uma aplicação de desktop nativa com tecnologias web.
*   **Processo Principal (Backend):** **Node.js**, com uma arquitetura modular de "Managers" (lógica de negócio) e "Plugins" (comandos).
*   **Interface (Frontend):** **HTML, CSS e JavaScript puros**, com gerenciamento de estado reativo via **Zustand**.

#### **Inteligência Artificial**
*   **Sistema Híbrido:**
    *   ☁️ **Nuvem:** Gerenciador multi-provedor que suporta **Google Gemini** e **OpenAI (GPT)** para tarefas gerais e análise de contexto.
    *   🏠 **Local:** Integração com **Ollama** para rodar modelos locais (ex: Llama 3), garantindo privacidade e personalidade para a IA de lazer, **G.A.I.A.**
*   **Memória Persistente:**
    *   **SQLite:** Para dados estruturados (notas, tarefas, logs de jogos, etc.).
    *   **ChromaDB (Vetorização):** Para a memória semântica de longo prazo, permitindo buscas por significado em conversas e experiências passadas.
*   **Transcrição Offline:** Usa o **whisper.cpp** para transcrição de áudio local em tempo real, garantindo 100% de privacidade nas reuniões.

#### **Qualidade e Testes**
*   **Testes Unitários:** Suíte de testes com **Vitest** e **JSDOM** para garantir a estabilidade do código.

---

## ✨ Funcionalidades em Destaque

#### **Produtividade e Organização**
*   ✅ **Central de Tarefas:** Sistema completo para gerenciar empresas, projetos e tarefas, com registro de horas e documentação.
*   📝 **Notas e To-Dos:** Comandos rápidos (`/nota`, `/todo`) para capturar ideias e tarefas sem sair do seu fluxo de trabalho.
*   🎙️ **Transcrição de Reuniões:** Grave o áudio do seu microfone e do sistema, receba uma transcrição em tempo real e analise os pontos principais com a IA.
*   🍅 **Timer Pomodoro:** Gerenciador de foco com os modos clássicos de produtividade.

#### **IA e Contexto**
*   🎨 **Hub de Ferramentas de IA:** Comandos rápidos (`/ia var`, `/ia css`, `/ia regex`, `/ia git`) para acelerar tarefas de desenvolvimento.
*   🖼️ **Contexto Visual:** O assistente pode "ver" sua tela (inteira, janela ou seleção) para responder perguntas sobre o que você está vendo.
*   📚 **Memória Gerenciável:** Uma interface dedicada para visualizar, editar, pesquisar e "fixar" conversas passadas para dar contexto a novos prompts.
*   ⚙️ **Hub de Comandos:** Personalize quais comandos e subcomandos aparecem como atalhos de Ação Rápida para cada persona de IA.

#### **Bem-Estar e Lazer (Persona G.A.I.A.)**
*   🎮 **G.A.I.A. - A Companheira Gamer:** Uma persona de IA especializada, rodando localmente, focada em conversas sobre lazer, jogos e bem-estar, sem a pressão da produtividade.
*   📖 **Diário de Jogos Inteligente:** Registre suas experiências com `/gaia log`. A G.A.I.A. se lembra do que você está jogando (`/gaia jogando`) e usa esse contexto para conversas mais ricas.
*   💡 **Sugestão Empática:** A G.A.I.A. analisa seu humor e busca na sua estante de jogos a opção perfeita para o momento.
*   📊 **Dashboard de Lazer:** Uma interface visual para ver sua estante de jogos, seu histórico de jogatinas e o humor associado a cada uma.
*   🎓 **Aprendizado Avançado:** Capacidade de "aprender" wikis e guias de jogos específicos para se tornar uma especialista sob demanda (`/gaia aprender`).

#### **Ecossistema**
*   📱 **Acesso via iPhone:** Um servidor local (Express.js) permite que você acione comandos do assistente diretamente do seu iPhone usando Atalhos (Shortcuts).

---

## 🎯 Comandos Principais

| Comando              | Descrição                                          |
|----------------------|----------------------------------------------------|
| `/apresentar`        | O assistente descreve suas funcionalidades.        |
| `/ia [subcomando]`   | Acessa ferramentas de IA para desenvolvedores.     |
| `/nota [add/list]`   | Gerencia suas anotações rápidas.                    |
| `/todo [add/done]`   | Gerencia sua lista de tarefas simples.             |
| `/task`              | Abre a Central de Tarefas.                         |
| `/reuniao [iniciar]` | Grava e transcreve o áudio do sistema e microfone. |
| `/refeicao [tipo]`   | Sugere uma receita baseada na sua dieta.           |
| `/player [play ...]` | Controla o player de música.                       |
| `/pomodoro [ação]`   | Gerencia o timer de produtividade.                 |
| `/gaia [subcomando]` | Interage com sua IA de lazer.                      |

*Use `/help` para uma lista completa e detalhada de todos os comandos e subcomandos.*