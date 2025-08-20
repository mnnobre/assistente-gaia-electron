// /plugins/dashboard-gaia/dashboard-renderer.js

document.addEventListener('DOMContentLoaded', () => {

    // Seletores dos elementos da nossa UI
    const gameShelfContainer = document.getElementById('game-shelf-container');
    const loadingPlaceholder = document.getElementById('loading-placeholder');

    /**
     * Busca a lista de jogos do banco de dados através do processo principal
     * e os renderiza na tela.
     */
    async function loadAndRenderGames() {
        try {
            // --- INÍCIO DA ALTERAÇÃO ---
            // A chamada à API agora está correta e funcional.
            const games = await window.api.gaia.getGames();
            // --- FIM DA ALTERAÇÃO ---

            // Remove o placeholder de carregamento
            if (loadingPlaceholder) {
                loadingPlaceholder.remove();
            }

            if (!games || games.length === 0) {
                gameShelfContainer.innerHTML = `
                    <div class="col-span-full text-center p-10 bg-base-100 rounded-box">
                        <p class="text-lg">Sua estante de jogos ainda está vazia!</p>
                        <p class="text-base-content/70 mt-2">Use o comando <code>/hobbie add "Nome do Jogo" --platform ...</code> no assistente para começar sua coleção.</p>
                    </div>
                `;
                return;
            }

            // Para cada jogo, cria um card e o adiciona ao container
            games.forEach(game => {
                const gameCard = document.createElement('div');
                gameCard.className = 'card bg-base-100 shadow-xl hover:shadow-primary/50 transition-shadow duration-300';
                
                // Gera os badges de tags
                const tagsHtml = game.tags 
                    ? game.tags.split(',').map(tag => `<div class="badge badge-secondary">${tag.trim()}</div>`).join('') 
                    : '<div class="badge badge-ghost">Sem tags</div>';

                gameCard.innerHTML = `
                    <div class="card-body">
                        <h3 class="card-title">${game.title}</h3>
                        <p class="text-sm text-base-content/60">${game.platform}</p>
                        <div class="card-actions justify-end mt-4">
                            ${tagsHtml}
                        </div>
                    </div>
                `;
                gameShelfContainer.appendChild(gameCard);
            });

        } catch (error) {
            console.error('Erro ao carregar os jogos:', error);
            if (loadingPlaceholder) {
                loadingPlaceholder.remove();
            }
            gameShelfContainer.innerHTML = `
                <div class="col-span-full text-center p-10 bg-error/20 rounded-box">
                    <p class="text-lg text-error">Ocorreu um erro ao buscar sua estante de jogos.</p>
                    <p class="text-base-content/70 mt-2">Verifique o console para mais detalhes.</p>
                </div>
            `;
        }
    }

    // --- Ponto de Entrada ---
    // --- INÍCIO DA ALTERAÇÃO ---
    // Inicia o processo de carregamento assim que a página estiver pronta.
    loadAndRenderGames(); 
    // --- FIM DA ALTERAÇÃO ---
});