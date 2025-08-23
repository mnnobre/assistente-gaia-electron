// /plugins/dashboard-gaia/dashboard-renderer.js

document.addEventListener('DOMContentLoaded', () => {

    // Seletores dos elementos da nossa UI
    const gameShelfContainer = document.getElementById('game-shelf-container');
    const shelfLoadingPlaceholder = document.getElementById('shelf-loading-placeholder');
    // --- INÍCIO DA ALTERAÇÃO (FASE 9) ---
    const timelineContainer = document.getElementById('timeline-container');
    const historyLoadingPlaceholder = document.getElementById('history-loading-placeholder');
    // --- FIM DA ALTERAÇÃO ---

    /**
     * Busca a lista de jogos do banco de dados e os renderiza na tela.
     */
    async function loadAndRenderGames() {
        try {
            const games = await window.api.gaia.getGames();

            if (shelfLoadingPlaceholder) {
                shelfLoadingPlaceholder.remove();
            }

            if (!games || games.length === 0) {
                gameShelfContainer.innerHTML = `
                    <div class="col-span-full text-center p-10 bg-base-100 rounded-box">
                        <p class="text-lg">Sua estante de jogos está vazia!</p>
                        <p class="text-base-content/70 mt-2">Use <code>/hobbie add</code> para começar.</p>
                    </div>
                `;
                return;
            }

            games.forEach(game => {
                const gameCard = document.createElement('div');
                gameCard.className = 'card bg-base-100 shadow-xl hover:shadow-primary/50 transition-shadow duration-300';
                
                const tagsHtml = game.tags 
                    ? game.tags.split(',').map(tag => `<div class="badge badge-secondary">${tag.trim()}</div>`).join('') 
                    : '';
                
                // Adiciona um badge para o status do jogo
                const statusBadge = `<div class="badge badge-outline">${game.status}</div>`;

                gameCard.innerHTML = `
                    <div class="card-body p-4">
                        <h3 class="card-title text-base">${game.title}</h3>
                        <p class="text-sm text-base-content/60 mb-2">${game.platform}</p>
                        <div class="card-actions justify-end items-center">
                            ${statusBadge}
                            ${tagsHtml}
                        </div>
                    </div>
                `;
                gameShelfContainer.appendChild(gameCard);
            });

        } catch (error) {
            console.error('Erro ao carregar os jogos:', error);
            if (shelfLoadingPlaceholder) shelfLoadingPlaceholder.remove();
            gameShelfContainer.innerHTML = `<div class="col-span-full text-center p-10 bg-error/20 rounded-box"><p class="text-lg text-error">Ocorreu um erro ao buscar sua estante.</p></div>`;
        }
    }

    // --- INÍCIO DA ALTERAÇÃO (FASE 9) ---
    /**
     * Busca o histórico de logs e o renderiza no componente Timeline.
     */
    async function loadAndRenderHistory() {
        try {
            const logs = await window.api.gaia.getGameLogs();

            if (historyLoadingPlaceholder) {
                historyLoadingPlaceholder.remove();
            }

            if (!logs || logs.length === 0) {
                timelineContainer.innerHTML = `<div class="text-center p-10 bg-base-100 rounded-box"><p>Nenhuma memória registrada ainda.</p><p class="text-sm text-base-content/70 mt-2">Use <code>/gaia log</code> para começar.</p></div>`;
                return;
            }

            // Mapeamento de humor para estilos da daisyUI
            const moodMap = {
                5: { icon: '🤩', badge: 'badge-success' },
                4: { icon: '😊', badge: 'badge-info' },
                3: { icon: '😐', badge: 'badge-ghost' },
                2: { icon: '😕', badge: 'badge-warning' },
                1: { icon: '😠', badge: 'badge-error' },
            };

            const timelineUl = document.createElement('ul');
            timelineUl.className = 'timeline timeline-snap-icon max-md:timeline-compact timeline-vertical';

            logs.forEach(log => {
                const mood = moodMap[log.mood_rating] || { icon: '📝', badge: 'badge-ghost' };
                const formattedDate = new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="timeline-middle">
                        <div class="text-2xl">${mood.icon}</div>
                    </div>
                    <div class="timeline-end timeline-box card bg-base-100 shadow-md">
                        <div class="card-body p-4">
                           <time class="text-xs opacity-50">${formattedDate}</time>
                           <p class="text-sm">${log.log_text}</p>
                           <div class="card-actions justify-end">
                                <div class="badge ${mood.badge} badge-outline">${log.game_title}</div>
                           </div>
                        </div>
                    </div>
                    <hr/>
                `;
                timelineUl.appendChild(li);
            });
            timelineContainer.appendChild(timelineUl);

        } catch (error) {
            console.error('Erro ao carregar o histórico:', error);
            if (historyLoadingPlaceholder) historyLoadingPlaceholder.remove();
            timelineContainer.innerHTML = `<div class="text-center p-10 bg-error/20 rounded-box"><p class="text-lg text-error">Ocorreu um erro ao buscar suas memórias.</p></div>`;
        }
    }
    // --- FIM DA ALTERAÇÃO ---

    // --- Ponto de Entrada ---
    // Inicia os dois processos de carregamento em paralelo
    loadAndRenderGames(); 
    loadAndRenderHistory();
});