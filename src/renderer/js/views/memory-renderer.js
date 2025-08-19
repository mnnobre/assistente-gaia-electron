// /js/views/memory-renderer.js

// --- Variáveis de estado e seletores de elementos do modal ---
let memorySessionsList, memorySearchInput, showPinnedButton, backToSessionsButton;
let initialSelectedIds = new Set(); // Armazena os IDs que vieram da janela principal

// --- Funções de Renderização (Adaptadas do ui.js original) ---

function createEditUI(text, onSave, onCancel) {
    const container = document.createElement('div');
    container.className = 'edit-container';
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-textarea';
    textarea.value = text;
    const actions = document.createElement('div');
    actions.className = 'edit-actions';
    const saveButton = document.createElement('button');
    saveButton.className = 'save-button';
    saveButton.innerText = 'Salvar';
    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-button';
    cancelButton.innerText = 'Cancelar';
    saveButton.onclick = () => onSave(textarea.value);
    cancelButton.onclick = onCancel;
    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);
    container.appendChild(textarea);
    container.appendChild(actions);
    return container;
}

function renderTurns(container, turns) {
    container.innerHTML = "";
    const chatContainerElement = document.createElement('div');
    chatContainerElement.className = 'memory-chat-container';
    turns.forEach(turn => {
        const turnContainer = document.createElement('div');
        turnContainer.className = 'memory-turn-container';
        turnContainer.dataset.turnId = turn.id;

        const userMessageId = `${turn.id}-user`;
        const assistantMessageId = `${turn.id}-assistant`;

        // Verifica se os IDs estão na lista inicial para marcar os checkboxes
        const isUserMsgChecked = initialSelectedIds.has(userMessageId) ? 'checked' : '';
        const isAssistantMsgChecked = initialSelectedIds.has(assistantMessageId) ? 'checked' : '';

        const userMessage = document.createElement('div');
        userMessage.className = 'memory-message user';
        userMessage.dataset.sender = 'user';
        userMessage.innerHTML = `
            <input type="checkbox" class="turn-checkbox" ${isUserMsgChecked}>
            <div class="message user-message"><p>${turn.user_prompt}</p></div>
            <div class="message-actions">
              <button class="pin-button ${turn.is_pinned ? 'pinned' : ''}" title="Fixar Memória">📌</button>
              <button class="edit-button" title="Editar Memória">✏️</button>
            </div>
          `;

        const assistantMessage = document.createElement('div');
        assistantMessage.className = 'memory-message assistant';
        assistantMessage.dataset.sender = 'assistant';
        assistantMessage.innerHTML = `
            <input type="checkbox" class="turn-checkbox" ${isAssistantMsgChecked}>
            <div class="message assistant-message"><p>${turn.model_response}</p></div>
            <div class="message-actions">
              <button class="pin-button ${turn.is_pinned ? 'pinned' : ''}" title="Fixar Memória">📌</button>
              <button class="edit-button" title="Editar Memória">✏️</button>
            </div>
          `;

        turnContainer.appendChild(userMessage);
        turnContainer.appendChild(assistantMessage);
        chatContainerElement.appendChild(turnContainer);
    });
    container.appendChild(chatContainerElement);
}

async function renderMemorySessions() {
    const sessions = await window.api.memory.getSessions();
    memorySessionsList.innerHTML = "";
    if (sessions.length === 0) {
        memorySessionsList.innerHTML = "<p>Nenhuma memória encontrada.</p>";
        return;
    }
    sessions.forEach(session => {
        const sessionItem = document.createElement("div");
        sessionItem.className = "memory-session-item";
        const header = document.createElement("div");
        header.className = "memory-session-header";
        header.innerHTML = `
        <div class="memory-session-header-title">
          <input type="checkbox" class="session-checkbox" data-session-id="${session.id}">
          <span>${session.title || new Date(session.session_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
        </div>
        <div class="session-actions"></div>
      `;
        const content = document.createElement("div");
        content.className = "memory-session-content";
        sessionItem.appendChild(header);
        sessionItem.appendChild(content);
        memorySessionsList.appendChild(sessionItem);

        header.addEventListener("click", async (e) => {
            if (e.target.type === 'checkbox' || e.target.closest('.session-actions')) return;
            sessionItem.classList.toggle('expanded');
            const isVisible = content.style.display === "block";
            content.style.display = isVisible ? "none" : "block";
            if (!isVisible && content.innerHTML === "") {
                content.innerHTML = "<p>Carregando...</p>";
                const turns = await window.api.memory.getTurns(session.id);
                renderTurns(content, turns);
            }
        });
    });
}

async function renderSearchResults(results) {
    memorySessionsList.innerHTML = "";
    backToSessionsButton.style.display = 'block';
    if (results.length === 0) {
        memorySessionsList.innerHTML = "<p>Nenhum resultado encontrado para a sua busca.</p>";
        return;
    }
    const resultContainer = document.createElement('div');
    resultContainer.className = 'memory-chat-container';
    results.forEach(resultText => {
        const turnContainer = document.createElement('div');
        turnContainer.className = 'memory-turn-container';
        const [userLine, assistantLine] = resultText.split('\n');
        if (!userLine || !assistantLine) return;

        const userMessage = document.createElement('div');
        userMessage.className = 'memory-message user';
        userMessage.innerHTML = `<div class="message user-message"><p>${userLine.replace(/Usuário: "/, '').slice(0, -1)}</p></div>`;

        const assistantMessage = document.createElement('div');
        assistantMessage.className = 'memory-message assistant';
        assistantMessage.innerHTML = `<div class="message assistant-message"><p>${assistantLine.replace(/Assistente: "/, '').slice(0, -1)}</p></div>`;

        turnContainer.appendChild(userMessage);
        turnContainer.appendChild(assistantMessage);
        resultContainer.appendChild(turnContainer);
    });
    memorySessionsList.appendChild(resultContainer);
}

// --- Funções de Lógica e Eventos ---

async function handlePinClick(button) {
    const turnContainer = button.closest('.memory-turn-container');
    const turnId = turnContainer.dataset.turnId;
    const isPinned = button.classList.toggle('pinned');
    await window.api.memory.setPinned({ id: turnId, is_pinned: isPinned });
    const otherPinButton = Array.from(turnContainer.querySelectorAll('.pin-button')).find(btn => btn !== button);
    if (otherPinButton) otherPinButton.classList.toggle('pinned', isPinned);
}

function cancelTurnEdit(messageContainer) {
    const editContainer = messageContainer.querySelector('.edit-container');
    if (editContainer) editContainer.remove();
    messageContainer.querySelector('.message').style.display = 'block';
    messageContainer.classList.remove('is-editing');
}

async function saveTurnEdit(messageContainer, newText) {
    const turnContainer = messageContainer.closest('.memory-turn-container');
    const turnId = turnContainer.dataset.turnId;
    const sender = messageContainer.dataset.sender;
    const userMsgP = turnContainer.querySelector('.memory-message.user p');
    const assistantMsgP = turnContainer.querySelector('.memory-message.assistant p');
    const updatedData = {
        id: turnId,
        user_prompt: sender === 'user' ? newText : userMsgP.innerText,
        model_response: sender === 'assistant' ? newText : assistantMsgP.innerText
    };
    await window.api.memory.updateTurn(updatedData);
    const pToUpdate = messageContainer.querySelector('p');
    pToUpdate.innerText = newText;
    cancelTurnEdit(messageContainer);
}

function handleEditClick(button) {
    const messageContainer = button.closest('.memory-message');
    messageContainer.classList.add('is-editing');
    const messageP = messageContainer.querySelector('p');
    const originalText = messageP.innerText;
    const editUI = createEditUI(originalText,
        async (newText) => { await saveTurnEdit(messageContainer, newText); },
        () => { cancelTurnEdit(messageContainer); }
    );
    messageContainer.querySelector('.message').style.display = 'none';
    messageContainer.appendChild(editUI);
    editUI.querySelector('.edit-textarea').focus();
}

function handleCheckboxChange(checkbox) {
    const messageContainer = checkbox.closest('.memory-message');
    if (!messageContainer) return;
    
    const turnContainer = messageContainer.closest('.memory-turn-container');
    const turnId = turnContainer.dataset.turnId;
    const sender = messageContainer.dataset.sender;
    const uniqueId = `${turnId}-${sender}`;
    const textContent = messageContainer.querySelector('p').innerText;

    const selectionData = {
        uniqueId,
        isChecked: checkbox.checked,
        textContent,
        sender
    };

    window.api.send('memory:selection-changed', selectionData);
}

// --- Função de Inicialização ---

export function initialize() {
    // Lê os dados da seleção inicial passados pela URL
    const urlParams = new URLSearchParams(window.location.search);
    const initialSelectionJSON = urlParams.get('initialSelection');
    if (initialSelectionJSON) {
        try {
            // Converte a string JSON de volta para um array e depois para um Set para buscas rápidas
            initialSelectedIds = new Set(JSON.parse(initialSelectionJSON));
        } catch (e) {
            console.error("Falha ao analisar a seleção inicial de memória:", e);
        }
    }

    memorySessionsList = document.getElementById("memory-sessions-list");
    memorySearchInput = document.getElementById("memory-search-input");
    showPinnedButton = document.getElementById("show-pinned-button");
    backToSessionsButton = document.getElementById("back-to-sessions-button");

    showPinnedButton.addEventListener('click', async () => {
        memorySessionsList.innerHTML = "<p>Carregando memórias fixadas...</p>";
        backToSessionsButton.style.display = 'block';
        const pinnedTurns = await window.api.memory.getPinnedTurns();
        renderTurns(memorySessionsList, pinnedTurns);
    });

    backToSessionsButton.addEventListener('click', () => {
        memorySearchInput.value = '';
        backToSessionsButton.style.display = 'none';
        renderMemorySessions();
    });

    memorySearchInput.addEventListener('input', async (e) => {
        const query = e.target.value;
        if (query.length > 2) {
            backToSessionsButton.style.display = 'block';
            const results = await window.api.memory.search(query);
            renderSearchResults(results);
        } else if (query.length === 0) {
            backToSessionsButton.style.display = 'none';
            await renderMemorySessions();
        }
    });

    memorySessionsList.addEventListener('click', (e) => {
        const pinButton = e.target.closest('.pin-button');
        const editButton = e.target.closest('.edit-button');
        if (pinButton) {
            handlePinClick(pinButton);
        } else if (editButton) {
            handleEditClick(editButton);
        }
    });

    memorySessionsList.addEventListener('change', (e) => {
        const target = e.target;
        if (target.classList.contains('session-checkbox')) {
            const isChecked = target.checked;
            const contentDiv = target.closest('.memory-session-item').querySelector('.memory-session-content');
            contentDiv.querySelectorAll('.turn-checkbox').forEach(cb => {
                cb.checked = isChecked;
                handleCheckboxChange(cb);
            });
        } else if (target.classList.contains('turn-checkbox')) {
            handleCheckboxChange(target);
        }
    });

    renderMemorySessions();
}