// /js/views/ai-hub-renderer.js

// --- FUNÇÕES DE RENDERIZAÇÃO ---

/**
 * Renderiza a lista de comandos e subcomandos na aba "Ações Rápidas".
 * @param {HTMLElement} container - O elemento onde a lista será renderizada.
 * @param {Array<object>} allCommands - A lista completa de comandos do sistema.
 * @param {Array<string>} pinnedCommands - A lista de comandos já fixados para a IA atual.
 */
function renderCommandsList(container, allCommands, pinnedCommands) {
    container.innerHTML = ''; // Limpa o conteúdo anterior

    // Cria um Set para busca rápida dos comandos fixados
    const pinnedSet = new Set(pinnedCommands);

    allCommands.forEach(command => {
        // Ignora comandos que não devem ser fixáveis
        if (command.command === '/help' || command.command === '/clear') {
            return;
        }

        const commandId = command.command; // Ex: /nota
        const isPinned = pinnedSet.has(commandId);

        // Cria o container para o comando principal
        const commandGroup = document.createElement('div');
        commandGroup.className = 'py-2';
        
        // Renderiza o checkbox para o comando principal
        commandGroup.innerHTML = `
            <div class="form-control">
                <label class="label cursor-pointer justify-start gap-4">
                    <input type="checkbox" class="checkbox checkbox-primary command-checkbox" value="${commandId}" ${isPinned ? 'checked' : ''} />
                    <span class="label-text font-semibold">${command.command}</span>
                    <span class="label-text-alt text-base-content/60">${command.description}</span>
                </label>
            </div>
        `;

        // Se houver subcomandos, renderiza-os aninhados
        if (command.subcommands) {
            const subcommandsContainer = document.createElement('div');
            subcommandsContainer.className = 'pl-8 pt-1 space-y-1';
            
            Object.entries(command.subcommands).forEach(([subcommandName, subcommandDesc]) => {
                const subcommandId = `${command.command} ${subcommandName}`; // Ex: /ia var
                const isSubPinned = pinnedSet.has(subcommandId);
                
                subcommandsContainer.innerHTML += `
                    <div class="form-control">
                        <label class="label cursor-pointer justify-start gap-4">
                            <input type="checkbox" class="checkbox checkbox-primary command-checkbox" value="${subcommandId}" ${isSubPinned ? 'checked' : ''} />
                            <span class="label-text">${subcommandName}</span>
                            <span class="label-text-alt text-base-content/60">${subcommandDesc}</span>
                        </label>
                    </div>
                `;
            });
            commandGroup.appendChild(subcommandsContainer);
        }
        
        container.appendChild(commandGroup);
    });
}


// --- FUNÇÃO DE INICIALIZAÇÃO ---

export async function initialize() {
    // Seletores dos elementos
    const aiModelSelect = document.getElementById("ai-model-select");
    const commandsListContainer = document.getElementById("commands-list-container");
    if (!aiModelSelect || !commandsListContainer) return;

    // --- LÓGICA DA ABA "MODELOS" ---
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

    aiModelSelect.addEventListener('change', async (e) => {
        const selectedModelKey = e.target.value;
        await window.api.ai.setModel(selectedModelKey);
        // Não fecha mais o modal, apenas atualiza a aba de ações rápidas
        loadPinnedCommands(); 
    });


    // --- LÓGICA DA ABA "AÇÕES RÁPIDAS" ---
    
    // Função para carregar e renderizar os comandos fixados da IA ativa
    async function loadPinnedCommands() {
        const currentModel = await window.api.ai.getActiveModel();
        if (!currentModel) return;

        commandsListContainer.innerHTML = '<span class="loading loading-spinner"></span> Carregando...';

        // Busca todos os comandos e os que estão fixados em paralelo
        const [allCommands, pinnedCommands] = await Promise.all([
            window.api.getCommands(),
            window.api.commands.getPinned(currentModel.key)
        ]);
        
        renderCommandsList(commandsListContainer, allCommands, pinnedCommands);
    }
    
    // Event listener para salvar as mudanças
    commandsListContainer.addEventListener('change', async (event) => {
        if (event.target.classList.contains('command-checkbox')) {
            const currentModel = await window.api.ai.getActiveModel();
            if (!currentModel) return;

            // Coleta todos os checkboxes marcados
            const allCheckboxes = commandsListContainer.querySelectorAll('.command-checkbox:checked');
            const newPinnedCommands = Array.from(allCheckboxes).map(cb => cb.value);

            // Envia a lista completa para o backend para ser salva
            await window.api.commands.setPinned(currentModel.key, newPinnedCommands);
        }
    });

    // Carrega os dados pela primeira vez
    await loadPinnedCommands();
}