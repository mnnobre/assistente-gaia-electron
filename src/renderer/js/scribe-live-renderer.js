// /src/renderer/js/scribe-live-renderer.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores de Elementos ---
    const mainWrapper = document.getElementById('main-wrapper');
    const chatContainer = document.getElementById('chat-container');
    const resizer = document.getElementById('resizer');
    const analyzeButton = document.getElementById('analyze-button');
    const analysisPanel = document.getElementById('analysis-panel');
    const quickPromptsContainer = document.getElementById('quick-prompts');
    const analysisInput = document.getElementById('analysis-input');
    const analysisSendButton = document.getElementById('analysis-send-button');

    // --- Variáveis de Estado ---
    let textQueue = [];
    let isTyping = false;
    let isResizing = false;
    let initialHeight;
    let initialY;
    let lastSelectedBubble = null; // Para saber onde inserir a resposta da IA

    // --- LÓGICA DE REDIMENSIONAMENTO ---
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        initialHeight = window.innerHeight;
        initialY = e.screenY;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    function handleMouseMove(e) {
        if (!isResizing) return;
        const deltaY = e.screenY - initialY;
        let newHeight = initialHeight - deltaY;
        const minHeight = 150;
        const maxHeight = 900;
        newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
        window.api.send('scribe:resize', { height: newHeight });
    }

    function handleMouseUp() {
        isResizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }

    // --- LÓGICA DO MODO DE ANÁLISE ---
    function toggleAnalysisMode() {
        const isActive = mainWrapper.classList.toggle('analysis-mode');
        analyzeButton.classList.toggle('active', isActive);
        analysisPanel.classList.toggle('hidden', !isActive);
        if (isActive) {
            addCheckboxesToBubbles();
        } else {
            removeCheckboxesFromBubbles();
        }
    }

    function addCheckboxesToBubbles() {
        chatContainer.querySelectorAll('.chat-bubble').forEach(bubble => {
            if (bubble.querySelector('.analysis-checkbox')) return;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'analysis-checkbox';
            bubble.prepend(checkbox);
        });
    }

    function removeCheckboxesFromBubbles() {
        chatContainer.querySelectorAll('.analysis-checkbox').forEach(checkbox => checkbox.remove());
    }

    async function handleAnalysisRequest(question) {
        const selectedCheckboxes = chatContainer.querySelectorAll('.analysis-checkbox:checked');
        if (selectedCheckboxes.length === 0) {
            analysisInput.placeholder = "Por favor, selecione ao menos um trecho.";
            return;
        }

        let context = "";
        selectedCheckboxes.forEach((checkbox, index) => {
            const bubble = checkbox.parentElement;
            context += bubble.textContent.trim() + '\n';
            if (index === selectedCheckboxes.length - 1) {
                lastSelectedBubble = bubble; // Guarda a referência da última bolha selecionada
            }
        });

        toggleAnalysisMode();
        analysisInput.value = '';
        analysisInput.placeholder = 'Analisando...';
        analysisSendButton.disabled = true;

        await window.api.analyzeScribeText({ context, question });
        
        analysisInput.placeholder = "Pergunte algo sobre os trechos selecionados...";
        analysisSendButton.disabled = false;
    }

    analysisSendButton.addEventListener('click', () => {
        const question = analysisInput.value.trim();
        if (question) handleAnalysisRequest(question);
    });

    quickPromptsContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const predefinedPrompt = e.target.dataset.prompt;
            if (predefinedPrompt) handleAnalysisRequest(predefinedPrompt);
        }
    });

    analyzeButton.addEventListener('click', toggleAnalysisMode);
    
    // --- RENDERIZAÇÃO DA RESPOSTA DA IA ---
    function renderAnalysisBlock(data) {
        if (!lastSelectedBubble) return;

        const analysisBlock = document.createElement('div');
        analysisBlock.className = 'analysis-block';

        const requestHTML = `
            <details class="analysis-details">
                <summary>Pergunta Feita à IA</summary>
                <div class="analysis-content">
                    <strong>Pergunta:</strong>
                    <p>${data.question}</p>
                    <strong>Contexto Enviado:</strong>
                    <pre>${data.context}</pre>
                </div>
            </details>
        `;

        const responseHTML = `
            <details class="analysis-details" open>
                <summary>Resposta da IA</summary>
                <div class="analysis-content">
                    ${data.answer}
                </div>
            </details>
        `;

        analysisBlock.innerHTML = requestHTML + responseHTML;

        // Insere o bloco de análise logo após a última bolha selecionada
        lastSelectedBubble.parentNode.insertBefore(analysisBlock, lastSelectedBubble.nextSibling);
        analysisBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // --- LÓGICA DE TRANSCRIÇÃO ---
    function processQueue() {
        if (isTyping || textQueue.length === 0) return;

        isTyping = true;
        const { speaker, text } = textQueue.shift();
        const words = text.trim().split(' ');

        const newBubble = document.createElement('div');
        newBubble.classList.add('chat-bubble', speaker === 'me' ? 'bubble-me' : 'bubble-other');
        
        const speakerPrefix = document.createElement('strong');
        speakerPrefix.className = 'speaker-prefix';
        speakerPrefix.textContent = speaker === 'me' ? 'Você: ' : 'Outro: ';
        newBubble.appendChild(speakerPrefix);

        chatContainer.appendChild(newBubble);

        if (mainWrapper.classList.contains('analysis-mode')) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'analysis-checkbox';
            newBubble.prepend(checkbox);
        }

        let wordIndex = 0;
        const intervalId = setInterval(() => {
            if (wordIndex < words.length) {
                newBubble.appendChild(document.createTextNode(words[wordIndex] + ' '));
                chatContainer.scrollTop = chatContainer.scrollHeight;
                wordIndex++;
            } else {
                clearInterval(intervalId);
                isTyping = false;
                processQueue();
            }
        }, 80);
    }

    // --- LISTENERS DA API ---
    window.api.on('scribe:live-update', ({ speaker, text }) => {
        if (text) {
            textQueue.push({ speaker, text });
            processQueue();
        }
    });

    window.api.on('scribe:analysis-result', (data) => {
        renderAnalysisBlock(data);
    });
});