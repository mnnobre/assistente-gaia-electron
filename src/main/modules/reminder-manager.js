// /src/main/modules/reminder-manager.js

const { Notification } = require('electron');
const path = require('path');
const fs = require('fs');
// --- INÍCIO DA ALTERAÇÃO (FASE 9) ---
const dbManager = require('./database-manager.js');
const aiManager = require('./ai-manager.js');
// --- FIM DA ALTERAÇÃO ---

// --- INÍCIO DA ALTERAÇÃO (FASE 9) ---
/**
 * Busca um log de jogo positivo e pede para a G.A.I.A. criar uma mensagem nostálgica.
 * @param {BrowserWindow} win - A janela principal para enviar a mensagem.
 */
async function triggerProactiveMemory(win) {
    if (!win || win.isDestroyed()) return;

    try {
        // 1. Busca um log de jogo aleatório com humor bom ou ótimo (4 ou 5)
        const randomLog = await dbManager.hobbie.getRandomPositiveGameLog();

        if (randomLog) {
            const { title, log_text } = randomLog;

            // 2. Cria o prompt para a G.A.I.A.
            const prompt = `Lembre-se deste momento sobre o jogo ${title}: "${log_text}". Com base nisso, crie uma mensagem curta e nostálgica para mim, como se estivesse relembrando um momento legal que passamos juntos. Comece com algo como "Ei, tava lembrando aqui..." ou "Nossa, lembra daquela vez que...".`;
            
            // 3. Pede para a G.A.I.A. gerar a mensagem
            const nostalgicMessage = await aiManager.generateGaiaResponse({ userInput: prompt });

            // 4. Envia a mensagem para a UI para ser exibida no balão de fala
            if (nostalgicMessage) {
                win.webContents.send('proactive-memory', nostalgicMessage);
            }
        }
    } catch (error) {
        console.error('[Reminder Manager] Erro ao tentar gerar memória proativa:', error);
    }
}
// --- FIM DA ALTERAÇÃO ---


function initializeReminders(win) {
    if (!win) {
        console.error("Módulo de Lembretes: A janela principal não foi fornecida.");
        return;
    }
    
    // Lógica existente dos lembretes de refeição
    const cardapioPath = path.join(__dirname, '..', '..', '..', 'plugins', 'diet', 'cardapio.json');
    let cardapio;
    try {
        const cardapioData = fs.readFileSync(cardapioPath, 'utf-8');
        cardapio = JSON.parse(cardapioData);
        console.log('[Reminder Manager] cardapio.json carregado com sucesso para os lembretes.');
    } catch (error) {
        console.error(`Módulo de Lembretes: Falha ao carregar cardapio.json:`, error);
        // Continua mesmo se o cardápio falhar, para que as memórias proativas funcionem
    }

    // Checa lembretes de refeição a cada minuto
    setInterval(() => {
        if (cardapio) {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            for (const mealKey in cardapio) {
                const meal = cardapio[mealKey];
                if (meal.horario === currentTime) {
                    const notificationBody = `Está na hora de preparar seu ${meal.nome.toLowerCase()}.`;
                    if (Notification.isSupported()) {
                        new Notification({ title: `Hora da Refeição: ${meal.nome}`, body: notificationBody }).show();
                    }
                    if (win && !win.isDestroyed()) {
                        win.webContents.send('meal-reminder', notificationBody);
                    }
                }
            }
        }
    }, 60000); // 1 minuto

    // --- INÍCIO DA ALTERAÇÃO (FASE 9) ---
    // Checa por memórias proativas a cada X minutos/horas
    setInterval(() => {
        // Roda a cada 2 horas, mas com 25% de chance de realmente disparar.
        // Isso evita que se torne muito frequente e repetitivo.
        const shouldTrigger = Math.random() < 1; 
        if (shouldTrigger) {
            triggerProactiveMemory(win);
        }
    }, 5000); // A cada 2 horas (7200000 ms)
    // --- FIM DA ALTERAÇÃO ---
}

module.exports = {
    initializeReminders
};