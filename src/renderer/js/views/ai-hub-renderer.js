// /js/views/ai-hub-renderer.js (VERSÃO FINAL COM GERENCIAMENTO DE EMPRESAS)

const INTRINSICALLY_DIRECT_COMMANDS = new Set(['/task', '/dashboard']);

function renderCommandsTable(container, allCommands, commandSettings) {
    container.innerHTML = ''; 

    const table = document.createElement('table');
    table.className = 'table table-zebra w-full';
    
    table.innerHTML = `
        <thead>
            <tr>
                <th>Comando</th>
                <th class="text-center">Ação Direta</th>
                <th class="text-center">Atalho na Barra</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    
    const tbody = table.querySelector('tbody');

    const createRow = (command, isSubcommand = false) => {
        const commandString = isSubcommand ? `${command.parent.command} ${command.name}` : command.command;
        const description = isSubcommand ? command.description : command.description;
        
        const settings = commandSettings.get(commandString) || { is_quick_action: false, is_direct_action: false };
        const tr = document.createElement('tr');
        const isAlwaysDirect = INTRINSICALLY_DIRECT_COMMANDS.has(commandString);

        tr.innerHTML = `
            <td class="${isSubcommand ? 'pl-8' : ''}">
                <div class="font-bold">${commandString}</div>
                <div class="text-xs opacity-60">${description}</div>
            </td>
            <td class="text-center">
                <input 
                    type="checkbox" 
                    class="toggle toggle-primary command-toggle" 
                    data-command-string="${commandString}"
                    data-setting-type="is_direct_action"
                    ${(settings.is_direct_action || isAlwaysDirect) ? 'checked' : ''}
                    ${isAlwaysDirect ? 'disabled' : ''}
                />
            </td>
            <td class="text-center">
                <input 
                    type="checkbox" 
                    class="toggle toggle-success command-toggle" 
                    data-command-string="${commandString}"
                    data-setting-type="is_quick_action"
                    ${settings.is_quick_action ? 'checked' : ''}
                />
            </td>
        `;
        tbody.appendChild(tr);
    };

    allCommands.forEach(command => {
        if (command.command === '/help' || command.command === '/clear') return;
        createRow(command, false);

        if (command.subcommands) {
            Object.entries(command.subcommands).forEach(([name, description]) => {
                createRow({ name, description, parent: command }, true);
            });
        }
    });

    container.appendChild(table);
}

// --- INÍCIO DA NOVA SEÇÃO ---
/**
 * Renderiza a lista de empresas salvas no container apropriado.
 * @param {HTMLElement} container - O elemento que hospedará a lista.
 */
async function renderCompaniesList(container) {
    const companies = await window.api.taskHub.getCompanies();
    container.innerHTML = ''; // Limpa a lista antes de renderizar

    if (companies.length === 0) {
        container.innerHTML = '<p class="text-xs text-center opacity-60">Nenhuma empresa adicionada ainda.</p>';
        return;
    }

    companies.forEach(company => {
        const companyDiv = document.createElement('div');
        companyDiv.className = 'p-3 bg-base-300 rounded-md text-sm';
        companyDiv.innerHTML = `
            <div class="flex justify-between items-center">
                <strong class="font-semibold">${company.name}</strong>
                <button class="btn btn-xs btn-ghost" data-company-id="${company.id}">🗑️</button>
            </div>
            <div class="text-xs opacity-70 mt-1">
                <p>Clockify WS ID: ${company.clockify_workspace_id || 'Não definido'}</p>
                <p>ClickUp Team ID: ${company.clickup_team_id || 'Não definido'}</p>
            </div>
        `;
        container.appendChild(companyDiv);
    });
}
// --- FIM DA NOVA SEÇÃO ---


export async function initialize() {
    // --- Seletores de Elementos ---
    const aiModelSelect = document.getElementById("ai-model-select");
    const commandsContainer = document.getElementById("commands-table-container");
    const geminiApiKeyInput = document.getElementById("gemini-api-key-input");
    const openaiApiKeyInput = document.getElementById("openai-api-key-input");
    const saveApiKeysButton = document.getElementById("save-api-keys-button");
    const clickupApiKeyInput = document.getElementById("clickup-api-key-input");
    const clockifyApiKeyInput = document.getElementById("clockify-api-key-input");
    
    // --- INÍCIO DA ALTERAÇÃO ---
    const companiesListContainer = document.getElementById("companies-list");
    const newCompanyNameInput = document.getElementById("new-company-name-input");
    const newClockifyIdInput = document.getElementById("new-clockify-workspace-id-input");
    const newClickupIdInput = document.getElementById("new-clickup-team-id-input");
    const addCompanyBtn = document.getElementById("add-company-btn");
    
    if (!aiModelSelect || !commandsContainer || !geminiApiKeyInput || !openaiApiKeyInput || !saveApiKeysButton || !clickupApiKeyInput || !clockifyApiKeyInput || !companiesListContainer || !addCompanyBtn) return;
    // --- FIM DA ALTERAÇÃO ---

    let activeModelKey = null;

    async function loadCommandSettings() {
        const currentModel = await window.api.ai.getActiveModel();
        if (!currentModel) return;
        activeModelKey = currentModel.key;

        commandsContainer.innerHTML = '<div class="text-center p-4"><span class="loading loading-spinner"></span><p>Carregando...</p></div>';

        const [allCommands, settingsObject] = await Promise.all([
            window.api.getCommands(),
            window.api.commands.getSettingsForModel(activeModelKey)
        ]);
        
        const commandSettingsMap = new Map(Object.entries(settingsObject));
        
        renderCommandsTable(commandsContainer, allCommands, commandSettingsMap);
    }
    
    // --- FUNÇÃO ATUALIZADA ---
    async function loadInitialData() {
        // Carrega as chaves de API globais e a lista de empresas em paralelo
        const [geminiKey, openaiKey, clickupKey, clockifyKey] = await Promise.all([
            window.api.settings.get('api_key_gemini'),
            window.api.settings.get('api_key_openai'),
            window.api.settings.get('api_key_clickup'),
            window.api.settings.get('api_key_clockify'),
            renderCompaniesList(companiesListContainer) // Carrega e renderiza a lista de empresas
        ]);

        if (geminiKey) geminiApiKeyInput.value = geminiKey;
        if (openaiKey) openaiApiKeyInput.value = openaiKey;
        if (clickupKey) clickupApiKeyInput.value = clickupKey;
        if (clockifyKey) clockifyApiKeyInput.value = clockifyKey;
    }
    
    async function loadModels() {
        const models = await window.api.ai.getModels();
        const activeModel = await window.api.ai.getActiveModel();
        
        aiModelSelect.innerHTML = '';
        models.forEach(model => {
            const option = new Option(model.name, model.key);
            aiModelSelect.appendChild(option);
        });

        if (activeModel) {
            aiModelSelect.value = activeModel.key;
        }
    }

    saveApiKeysButton.addEventListener('click', async () => {
        const geminiKey = geminiApiKeyInput.value.trim();
        const openaiKey = openaiApiKeyInput.value.trim();
        const clickupKey = clickupApiKeyInput.value.trim();
        const clockifyKey = clockifyApiKeyInput.value.trim();
        
        await Promise.all([
            window.api.settings.set('api_key_gemini', geminiKey),
            window.api.settings.set('api_key_openai', openaiKey),
            window.api.settings.set('api_key_clickup', clickupKey),
            window.api.settings.set('api_key_clockify', clockifyKey)
        ]);

        const originalText = saveApiKeysButton.textContent;
        saveApiKeysButton.textContent = 'Salvo!';
        saveApiKeysButton.classList.add('btn-success');
        setTimeout(() => {
            saveApiKeysButton.textContent = originalText;
            saveApiKeysButton.classList.remove('btn-success');
        }, 2000);
    });

    // --- NOVO EVENT LISTENER ---
    addCompanyBtn.addEventListener('click', async () => {
        const name = newCompanyNameInput.value.trim();
        const clockifyId = newClockifyIdInput.value.trim();
        const clickupId = newClickupIdInput.value.trim();

        if (!name || !clockifyId || !clickupId) {
            // Futuramente, usar um sistema de toast/notificação aqui
            alert("Por favor, preencha todos os campos da empresa.");
            return;
        }

        try {
            await window.api.taskHub.addCompany({ name, clockify_workspace_id: clockifyId, clickup_team_id: clickupId });
            // Limpa os campos após o sucesso
            newCompanyNameInput.value = '';
            newClockifyIdInput.value = '';
            newClickupIdInput.value = '';
            // Recarrega a lista para mostrar a nova empresa
            await renderCompaniesList(companiesListContainer);
        } catch (error) {
            console.error("Erro ao adicionar empresa:", error);
            alert(`Falha ao adicionar empresa: ${error.message}`);
        }
    });
    
    aiModelSelect.addEventListener('change', async (e) => {
        await window.api.ai.setModel(e.target.value);
        await loadCommandSettings(); 
    });

    commandsContainer.addEventListener('change', async (event) => {
        const toggle = event.target;
        if (toggle.classList.contains('command-toggle') && activeModelKey) {
            const commandString = toggle.dataset.commandString;
            const allToggles = commandsContainer.querySelectorAll(`.command-toggle[data-command-string="${commandString}"]`);
            const newSettings = {};

            allToggles.forEach(t => {
                newSettings[t.dataset.settingType] = t.checked;
            });
            
            await window.api.commands.updateCommandSetting(activeModelKey, commandString, newSettings);
            
            window.api.send('commands:settings-changed');
        }
    });
    
    window.api.on('settings:models-reinitialized', () => {
        console.log("Modelos re-inicializados. Atualizando o dropdown...");
        loadModels();
    });

    await Promise.all([
        loadCommandSettings(),
        loadInitialData(),
        loadModels()
    ]);
}