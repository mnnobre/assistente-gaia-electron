# Assistente Pessoal G.A.I.A. 🧠✨

![Lugia GIF](./lugia.gif)

Assistente de desktop multifuncional construído com Electron, focado em produtividade e bem-estar, com uma arquitetura de IA híbrida para trabalho e lazer.

✅ **Status:** Funcionalidades Principais Implementadas

---

## 🚀 Como Rodar Localmente

#### **Pré-requisitos**
*   **Node.js** (v18+)
*   **npm** ou **yarn**
*   **Ollama (Opcional):** Para rodar a persona de IA local G.A.I.A., você precisa ter o [Ollama](https://ollama.com/) instalado e o modelo `llama3:8b` baixado (`ollama pull llama3:8b`).

#### **Instalação Rápida**
1.  **Clone o repositório**
    ```bash
    git clone https://github.com/mnnobre/assistente-gaia-electron
    cd Assistente-electron
    ```
2.  **Instale as dependências**
    ```bash
    npm install
    ```
3.  **Inicie o Assistente**
    ```bash
    npm start
    ```
4.  **Configure as Chaves de API (Primeira Vez)**
    *   Após iniciar o assistente, clique no **ícone de engrenagem (⚙️)** no canto inferior direito para abrir o Hub de IA.
    *   Vá para a aba **"Configurações"**.
    *   Cole suas chaves de API nos campos correspondentes (Gemini, OpenAI, ClickUp, Clockify) e clique em "Salvar". O assistente está pronto para usar!

---

## 🏗️ Arquitetura e Tecnologias

#### **Core**
*   **Plataforma:** **Electron**, criando uma aplicação de desktop nativa com tecnologias web.
*   **Processo Principal (Backend):** **Node.js**, com uma arquitetura modular de "Managers" (lógica de negócio) e "Plugins" (comandos).
*   **Interface (Frontend):** **HTML, CSS (TailwindCSS + DaisyUI) e JavaScript puros**, com gerenciamento de estado reativo via **Zustand**.

#### **Inteligência Artificial e Voz**
*   **Sistema Híbrido de IA:**
    *   ☁️ **Nuvem:** Gerenciador multi-provedor que suporta **Google Gemini** e **OpenAI (GPT)** para tarefas gerais e análise de contexto.
    *   🏠 **Local:** Integração com **Ollama** para rodar modelos locais (ex: Llama 3), garantindo privacidade e personalidade para a IA de lazer, **G.A.I.A.**
*   **Voz (TTS) Local:**
    *   🗣️ **Piper TTS:** Geração de voz de alta qualidade, natural e offline, rodando como um processo gerenciado pelo próprio Electron.
*   **Memória Persistente:**
    *   **SQLite:** Para dados estruturados (notas, tarefas, logs de jogos, chaves de API, etc.).
    *   **LanceDB (Vetorização):** Um banco de dados vetorial **100% local e sem servidor**. Ele armazena as memórias em arquivos na pasta do aplicativo, permitindo buscas semânticas rápidas e eficientes sem nenhuma dependência externa.
*   **Transcrição Offline:** Usa o **whisper.cpp** para transcrição de áudio local em tempo real, garantindo 100% de privacidade nas reuniões.

---

## ✨ Funcionalidades em Destaque

#### **Produtividade e Organização**
*   ✅ **Central de Tarefas:** Sistema completo para gerenciar empresas, projetos e tarefas, com registro de horas e documentação, integrado ao **ClickUp** e **Clockify**.
*   📝 **Notas e To-Dos:** Comandos rápidos (`/nota`, `/todo`) para capturar ideias e tarefas sem sair do seu fluxo de trabalho.
*   🎙️ **Transcrição de Reuniões:** Grave o áudio do seu microfone e do sistema, receba uma transcrição em tempo real e analise os pontos principais com a IA.
*   🍅 **Timer Pomodoro:** Gerenciador de foco com os modos clássicos de produtividade.

#### **IA e Contexto**
*   🎨 **Hub de Ferramentas de IA:** Comandos rápidos (`/ia var`, `/ia css`, `/ia regex`, `/ia git`) para acelerar tarefas de desenvolvimento.
*   🖼️ **Contexto Visual:** O assistente pode "ver" sua tela (inteira, janela ou seleção) para responder perguntas sobre o que você está vendo.
*   📚 **Memória Gerenciável:** Uma interface dedicada para visualizar, editar, pesquisar e "fixar" conversas passadas para dar contexto a novos prompts.

#### **Bem-Estar e Lazer (Persona G.A.I.A.)**
*   🎮 **G.A.I.A. - A Companheira Gamer:** Uma persona de IA especializada, rodando localmente, focada em conversas sobre lazer, jogos e bem-estar.
*   📖 **Diário de Jogos Inteligente:** Registre suas experiências com `/gaia log`. A G.A.I.A. se lembra do que você está jogando (`/gaia jogando`) e usa esse contexto para conversas mais ricas.
*   💡 **Sugestão Empática:** A G.A.I.A. analisa seu humor e busca na sua estante de jogos a opção perfeita para o momento.
*   📊 **Dashboard de Lazer:** Uma interface visual para ver sua estante de jogos e seu histórico de jogatinas.

---

## 🎯 Comandos Principais

| Comando              | Descrição                                          |
|----------------------|----------------------------------------------------|
| `/apresentar`        | O assistente descreve suas funcionalidades.        |
| `/ia [subcomando]`   | Acessa ferramentas de IA para desenvolvedores.     |
| `/nota [add/list]`   | Gerencia suas anotações rápidas.                    |
| `/todo`              | Abre o widget de tarefas.                          |
| `/task`              | Abre a Central de Tarefas.                         |
| `/reuniao [iniciar]` | Grava e transcreve o áudio do sistema e microfone. |
| `/refeicao [tipo]`   | Sugere uma receita baseada na sua dieta.           |
| `/player [play ...]` | Controla o player de música.                       |
| `/pomodoro [ação]`   | Gerencia o timer de produtividade.                 |
| `/gaia [subcomando]` | Interage com sua IA de lazer.                      |

*Use `/help` para uma lista completa e detalhada de todos os comandos e subcomandos.*