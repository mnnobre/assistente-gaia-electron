// /src/main/modules/reminder-manager.js

const { Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// A função agora aceita 'win' (a janela principal) como parâmetro
function initializeReminders(win) {
    if (!win) {
        console.error("Módulo de Lembretes: A janela principal não foi fornecida. As falas do assistente não funcionarão.");
    }
    
    // CORREÇÃO AQUI: Volta três níveis (de 'modules' -> 'main' -> 'src' -> raiz)
    // para encontrar a pasta 'plugins'.
    const cardapioPath = path.join(__dirname, '..', '..', '..', 'plugins', 'diet', 'cardapio.json');
    let cardapio;

    try {
        const cardapioData = fs.readFileSync(cardapioPath, 'utf-8');
        cardapio = JSON.parse(cardapioData);
        console.log('[Reminder Manager] cardapio.json carregado com sucesso para os lembretes.');
    } catch (error) {
        console.error(`Módulo de Lembretes: Falha ao carregar cardapio.json no caminho: ${cardapioPath}`, error);
        return;
    }

    // Checa a cada 60 segundos
    setInterval(() => {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        for (const mealKey in cardapio) {
            const meal = cardapio[mealKey];
            
            if (meal.horario === currentTime) {
                const notificationBody = `Está na hora de preparar seu ${meal.nome.toLowerCase()}.`;

                if (Notification.isSupported()) {
                    new Notification({
                        title: `Hora da Refeição: ${meal.nome}`,
                        body: notificationBody
                    }).show();
                }

                if (win && !win.isDestroyed()) {
                    win.webContents.send('meal-reminder', notificationBody);
                }
            }
        }
    }, 60000);
}

module.exports = {
    initializeReminders
};