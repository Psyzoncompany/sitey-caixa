/**
 * chatbot.js — Cliente Frontend para o Chatbot Estratégico (Groq AI via Vercel)
 * Gerencia a UI do chat e a comunicação com a API /api/chat
 */

(() => {
    // 1. Injeção de Elemementos de UI
    const injectChatUI = () => {
        if (document.getElementById('chatbot-fab')) return;

        // Criar o FAB (Botão Flutuante)
        const fab = document.createElement('button');
        fab.id = 'chatbot-fab';
        fab.className = 'chatbot-fab';
        fab.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                <circle cx="8" cy="10" r="0.5" fill="currentColor"></circle>
                <circle cx="12" cy="10" r="0.5" fill="currentColor"></circle>
                <circle cx="16" cy="10" r="0.5" fill="currentColor"></circle>
            </svg>
        `;

        // Criar a Janela do Chat
        const windowChat = document.createElement('div');
        windowChat.id = 'chatbot-window';
        windowChat.className = 'chatbot-window hidden';
        windowChat.innerHTML = `
            <div class="chatbot-header">
                <div class="chatbot-header-info">
                    <div class="chatbot-status-dot"></div>
                    <h3>PSYZON AI</h3>
                </div>
                <button id="chatbot-close" style="background:none; border:none; color:white; font-size:24px; cursor:pointer; line-height:1;">&times;</button>
            </div>
            <div id="chatbot-messages" class="chatbot-messages">
                <div class="chat-bubble ai">Olá! Sou o assistente estratégico da Psyzon. Como posso ajudar com suas finanças ou produção hoje?</div>
            </div>
            <div class="chatbot-input-area">
                <input type="text" id="chatbot-input" class="chatbot-input" placeholder="Pergunte sobre seu negócio...">
                <button id="chatbot-send" class="chatbot-send">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(fab);
        document.body.appendChild(windowChat);

        // Listeners
        fab.addEventListener('click', () => {
            windowChat.classList.toggle('hidden');
            if (!windowChat.classList.contains('hidden')) {
                document.getElementById('chatbot-input').focus();
            }
        });

        document.getElementById('chatbot-close').addEventListener('click', () => {
            windowChat.classList.add('hidden');
        });

        const sendBtn = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');

        const handleSend = async () => {
            const text = input.value.trim();
            if (!text) return;

            addMessage(text, 'user');
            input.value = '';

            // Mensagem de "pensando"
            const loadingBubble = addMessage('...', 'ai');

            try {
                // Coletar contexto do Advisor se disponível
                let context = "";
                if (window.Advisor) {
                    const stats = window.Advisor.analyze();
                    context = `\nContexto atual do negócio: Saldo R$ ${stats.stats.totalBalance}, Lucro Mes R$ ${stats.stats.businessProfitMonth}, Risco: ${stats.riskLevel}. `;
                }

                // O Vercel chama a API serverless na mesma base url onde foi hospedado
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text + context })
                });

                const data = await response.json();

                if (data.error) {
                    loadingBubble.textContent = "Desculpe, tive um problema ao me conectar com a IA (" + data.error + ").";
                } else {
                    loadingBubble.textContent = data.content || "Não soube o que responder.";
                }

            } catch (e) {
                loadingBubble.textContent = "Erro de conexão. A API está offline ou não foi encontrada.";
            }
        };

        sendBtn.addEventListener('click', handleSend);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    };

    const addMessage = (text, type) => {
        const msgArea = document.getElementById('chatbot-messages');
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${type}`;
        bubble.textContent = text;
        msgArea.appendChild(bubble);
        msgArea.scrollTop = msgArea.scrollHeight;
        return bubble;
    };

    // Inicializar ao carregar o DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectChatUI);
    } else {
        injectChatUI();
    }
})();
