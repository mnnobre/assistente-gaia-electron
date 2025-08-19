// /js/views/ai-hub-renderer.js

// --- Função de Inicialização ---

export async function initialize() {
    const aiModelSelect = document.getElementById("ai-model-select");
    if (!aiModelSelect) return;

    // 1. Carrega os modelos disponíveis (agora incluirá a G.A.I.A.)
    const models = await window.api.ai.getModels();
    const activeModel = await window.api.ai.getActiveModel();

    aiModelSelect.innerHTML = '';
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.key;
        option.textContent = model.name;
        
        // --- PEQUENA MUDANÇA FUTURA-PROOF ---
        // Adicionamos um atributo `data-provider` para podermos, se quisermos no futuro,
        // estilizar a opção da G.A.I.A. de forma diferente. Por agora, não tem efeito visual.
        // O `key` 'gaia' vem diretamente do nosso `ai-manager.js`.
        if (model.key === 'gaia') {
            option.dataset.provider = 'local';
        }
        
        aiModelSelect.appendChild(option);
    });

    if (activeModel) {
        aiModelSelect.value = activeModel.key;
    }

    // 2. Adiciona o event listener para a mudança de modelo
    // Esta lógica já funciona perfeitamente para a G.A.I.A. também.
    aiModelSelect.addEventListener('change', async (e) => {
        const selectedModelKey = e.target.value;
        await window.api.ai.setModel(selectedModelKey);
        // Após a mudança, podemos fechar a janela automaticamente
        window.api.send('modal:close');
    });
}