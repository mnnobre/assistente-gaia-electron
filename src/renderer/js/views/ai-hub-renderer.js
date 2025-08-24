// /js/views/ai-hub-renderer.js (REFATORADO)

/**
 * Renderiza a lista de comandos usando o componente "collapse" do DaisyUI
 * para uma melhor organização visual.
 */
function renderCommandsList(container, allCommands, pinnedCommands) {
    container.innerHTML = ''; 
    const pinnedSet = new Set(pinnedCommands);

    allCommands.forEach(command => {
        if (command.command === '/help' || command.command === '/clear') return;

        const commandId = command.command; // Ex: /nota
        const hasSubcommands = command.subcommands && Object.keys(command.subcommands).length > 0;

        // Cria o componente collapse do DaisyUI
        const collapseDiv = document.createElement('div');
        collapseDiv.className = 'collapse collapse-arrow bg-base-200';

        // O checkbox principal (ou um input de rádio se não tiver subcomandos) fica no título do collapse
        const isMainPinned = pinnedSet.has(commandId);
        const mainCheckboxHTML = `
            <div class="form-control">
                <label class="label cursor-pointer py-0">
                    <span class="label-text font-semibold">${command.command}</span>
                    <input type="checkbox" class="checkbox checkbox-primary command-checkbox" value="${commandId}" ${isMainPinned ? 'checked' : ''} />
                </label>
            </div>
        `;
        
        // Se houver subcomandos, o título do collapse é um input do tipo 'checkbox' para controlar a abertura/fechamento
        if (hasSubcommands) {
            collapseDiv.innerHTML = `
                <input type="checkbox" /> 
                <div class="collapse-title text-xl font-medium">${mainCheckboxHTML}</div>
                <div class="collapse-content"></div>
            `;
        } else {
            // Se não, é apenas uma div sem a funcionalidade de expandir
            collapseDiv.innerHTML = `<div class="p-4">${mainCheckboxHTML}</div>`;
        }

        // Adiciona os subcomandos dentro do 'collapse-content' se eles existirem
        if (hasSubcommands) {
            const subcommandsContainer = collapseDiv.querySelector('.collapse-content');
            
            Object.entries(command.subcommands).forEach(([subName, subDesc]) => {
                const subcommandId = `${command.command} ${subName}`;
                const isSubPinned = pinnedSet.has(subcommandId);
                
                const subLabel = document.createElement('label');
                subLabel.className = 'label cursor-pointer';
                subLabel.innerHTML = `
                    <span class="label-text">${subName} <span class="text-xs text-base-content/60">${subDesc}</span></span> 
                    <input type="checkbox" class="checkbox checkbox-primary command-checkbox" value="${subcommandId}" ${isSubPinned ? 'checked' : ''} />
                `;
                subcommandsContainer.appendChild(subLabel);
            });
        }
        
        container.appendChild(collapseDiv);
    });
}


export async function initialize() {
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
        loadPinnedCommands(); 
    });


    // --- LÓGICA DA ABA "AÇÕES RÁPIDAS" ---
    async function loadPinnedCommands() {
        const currentModel = await window.api.ai.getActiveModel();
        if (!currentModel) return;

        commandsListContainer.innerHTML = '<div class="text-center p-4"><span class="loading loading-spinner"></span><p>Carregando...</p></div>';

        const [allCommands, pinnedCommands] = await Promise.all([
            window.api.getCommands(),
            window.api.commands.getPinned(currentModel.key)
        ]);
        
        renderCommandsList(commandsListContainer, allCommands, pinnedCommands);
    }
    
    commandsListContainer.addEventListener('change', async (event) => {
        if (event.target.classList.contains('command-checkbox')) {
            const currentModel = await window.api.ai.getActiveModel();
            if (!currentModel) return;

            const allCheckboxes = commandsListContainer.querySelectorAll('.command-checkbox:checked');
            const newPinnedCommands = Array.from(allCheckboxes).map(cb => cb.value);

            await window.api.commands.setPinned(currentModel.key, newPinnedCommands);
        }
    });

    await loadPinnedCommands();
}