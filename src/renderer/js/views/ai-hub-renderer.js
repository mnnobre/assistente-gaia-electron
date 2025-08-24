// /js/views/ai-hub-renderer.js (FINALIZADO COM RECARGA DINÂMICA)

// Comandos que, por natureza, não precisam de argumentos e sempre serão de ação direta.
const INTRINSICALLY_DIRECT_COMMANDS = new Set(['/task', '/dashboard']);

/**
 * Renderiza a tabela de gerenciamento de comandos com toggles.
 * @param {HTMLElement} container - O elemento onde a tabela será renderizada.
 * @param {Array<object>} allCommands - A lista completa de comandos do sistema.
 * @param {Map<string, object>} commandSettings - Um Map com as configurações salvas.
 */
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


export async function initialize() {
    // --- Seletores de Elementos ---
    const aiModelSelect = document.getElementById("ai-model-select");
    const commandsContainer = document.getElementById("commands-table-container");
    const geminiApiKeyInput = document.getElementById("gemini-api-key-input");
    const openaiApiKeyInput = document.getElementById("openai-api-key-input");
    const saveApiKeysButton = document.getElementById("save-api-keys-button");
    const clickupApiKeyInput = document.getElementById("clickup-api-key-input");
    const clockifyApiKeyInput = document.getElementById("clockify-api-key-input");
    
    if (!aiModelSelect || !commandsContainer || !geminiApiKeyInput || !openaiApiKeyInput || !saveApiKeysButton || !clickupApiKeyInput || !clockifyApiKeyInput) return;

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
    
    async function loadApiKeys() {
        const [geminiKey, openaiKey, clickupKey, clockifyKey] = await Promise.all([
            window.api.settings.get('api_key_gemini'),
            window.api.settings.get('api_key_openai'),
            window.api.settings.get('api_key_clickup'),
            window.api.settings.get('api_key_clockify')
        ]);

        if (geminiKey) geminiApiKeyInput.value = geminiKey;
        if (openaiKey) openaiApiKeyInput.value = openaiKey;
        if (clickupKey) clickupApiKeyInput.value = clickupKey;
        if (clockifyKey) clockifyApiKeyInput.value = clockifyKey;
    }
    
    // --- INÍCIO DA ALTERAÇÃO ---
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
    // --- FIM DA ALTERAÇÃO ---

    saveApiKeysButton.addEventListener('click', async () => {
        const geminiKey = geminiApiKeyInput.value.trim();
        const openaiKey = openaiApiKeyInput.value.trim();
        const clickupKey = clickupApiKeyInput.value.trim();
        const clockifyKey = clockifyApiKeyInput.value.trim();

        // Salva todas as chaves em paralelo. A lógica no main.js vai re-inicializar os modelos.
        await Promise.all([
            window.api.settings.set('api_key_gemini', geminiKey),
            window.api.settings.set('api_key_openai', openaiKey),
            window.api.settings.set('api_key_clickup', clickupKey),
            window.api.settings.set('api_key_clockify', clockifyKey)
        ]);

        // Feedback visual para o usuário
        const originalText = saveApiKeysButton.textContent;
        saveApiKeysButton.textContent = 'Salvo!';
        saveApiKeysButton.classList.add('btn-success');
        setTimeout(() => {
            saveApiKeysButton.textContent = originalText;
            saveApiKeysButton.classList.remove('btn-success');
        }, 2000);
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
    
    // --- INÍCIO DA ALTERAÇÃO ---
    // Adiciona o listener para o evento de re-inicialização
    window.api.on('settings:models-reinitialized', () => {
        console.log("Modelos re-inicializados. Atualizando o dropdown...");
        loadModels();
    });

    // Roda todas as funções de carregamento iniciais
    await Promise.all([
        loadCommandSettings(),
        loadApiKeys(),
        loadModels()
    ]);
    // --- FIM DA ALTERAÇÃO ---
}