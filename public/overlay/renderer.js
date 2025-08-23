document.addEventListener('DOMContentLoaded', () => {
    const socket = io(`http://${window.location.host}`);

    // Seletores de elementos da UI
    const chatContainer = document.getElementById('chat-container');
    const inputForm = document.getElementById('input-form');
    const messageInput = document.getElementById('message-input');

    /**
     * Adiciona uma mensagem ao contêiner do chat.
     * @param {string} text - O conteúdo da mensagem (pode ser HTML).
     * @param {'user' | 'assistant'} sender - Quem enviou a mensagem.
     */
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.innerHTML = text; // Permite que a resposta formatada em HTML seja renderizada
        chatContainer.appendChild(messageDiv);
        // Rola para a mensagem mais recente
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Lida com a conexão ao servidor
    socket.on('connect', () => {
        console.log('Conectado ao servidor Socket.io do assistente!');
    });

    // Ouve pelo evento que o main.js emite com a resposta da IA
    socket.on('assistant-response', (htmlResponse) => {
        console.log('Resposta recebida:', htmlResponse);
        addMessage(htmlResponse, 'assistant');
    });

    // Lida com a desconexão
    socket.on('disconnect', () => {
        console.log('Desconectado do servidor Socket.io.');
        addMessage('<p style="color: #ff8b8b;">Desconectado do servidor.</p>', 'assistant');
    });

    // Lida com o envio do formulário
    inputForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Impede o recarregamento da página
        const userInput = messageInput.value.trim();

        if (userInput) {
            // 1. Mostra a mensagem do usuário na tela imediatamente
            addMessage(userInput, 'user');
            
            // 2. Envia o comando para o servidor via WebSocket
            socket.emit('send-command', userInput);
            
            // 3. Limpa o campo de input
            messageInput.value = '';
        }
    });
});