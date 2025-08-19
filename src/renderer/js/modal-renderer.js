// /src/renderer/js/modal-renderer.js

document.addEventListener('DOMContentLoaded', async () => {
    const titleEl = document.getElementById('modal-title');
    const contentHostEl = document.getElementById('modal-content-host');
    const closeButton = document.getElementById('modal-close-button');

    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    const rootPath = urlParams.get('root');

    closeButton.addEventListener('click', () => {
        window.api.send('modal:close');
    });

    // --- LÓGICA CORRIGIDA E RESTAURADA ---

    if (view === 'code-viewer') {
        // --- Lógica Específica para o Visualizador de Código ---
        titleEl.textContent = 'Visualizador de Código';
        const codeText = urlParams.get('code');
        
        // Cria os elementos <pre> e <code> para exibir o código formatado
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        // Decodifica o texto que veio pela URL e o insere no elemento <code>
        code.textContent = decodeURIComponent(codeText || '// Nenhum código para exibir.');
        pre.appendChild(code);
        
        contentHostEl.innerHTML = ''; // Limpa qualquer conteúdo anterior
        contentHostEl.appendChild(pre);
        
        // Adiciona estilos diretamente no host para garantir a rolagem correta
        contentHostEl.style.padding = '0';
        pre.style.margin = '0';
        pre.style.padding = '20px';
        pre.style.height = '100%';
        pre.style.overflow = 'auto';

    } else if (view) {
        // --- Lógica Padrão para Outros Modais (Memory, AI Hub, etc.) ---
        try {
            const contentPath = `./js/views/${view}-content.html`;
            const response = await fetch(contentPath);
            if (!response.ok) throw new Error(`Arquivo de conteúdo não encontrado: ${contentPath}`);
            
            contentHostEl.innerHTML = await response.text();

            const titleMap = { 'memory': 'Gerenciador de Memória', 'ai-hub': 'Hub de IA' };
            titleEl.textContent = titleMap[view] || 'Modal';
            
            const viewScriptPath = `./views/${view}-renderer.js`;
            const scriptModule = await import(viewScriptPath).catch(e => {
                console.log(`Nenhum script de inicialização para a view '${view}'.`, e);
                return null;
            });

            if (scriptModule && typeof scriptModule.initialize === 'function') {
                scriptModule.initialize();
            }

        } catch (error) {
            console.error(`[Modal Renderer] Erro CRÍTICO ao carregar a view '${view}':`, error);
            titleEl.textContent = "Erro";
            contentHostEl.innerHTML = `<p style="color: #ff8b8b;">Ocorreu um erro. Verifique o console e a estrutura de pastas.</p>`;
        }
    } else {
        titleEl.textContent = "Erro";
        contentHostEl.innerHTML = `<p>Nenhum conteúdo especificado para o modal.</p>`;
    }
});