/**
 * chatbot.js — PSYZON AI Frontend
 * Interface Inteligente e Estratégica
 */

(() => {
    const injectChatUI = () => {
        if (document.getElementById('chatbot-fab')) return;

        // FAB com SVG de Cérebro Animado
        const fab = document.createElement('button');
        fab.id = 'chatbot-fab';
        fab.className = 'chatbot-fab';
        fab.innerHTML = `
            <svg viewBox="0 0 200 200" width="100%" height="100%" aria-labelledby="aiTitle aiDesc" role="img">
                <title id="aiTitle">Inteligência Artificial</title>
                <desc id="aiDesc">Ícone animado de um cérebro digital a pulsar com nós de rede neuronal e uma estrela mágica.</desc>
                <style>
                    .anim-ring { animation: spin 6s linear infinite; transform-origin: 100px 100px; }
                    .anim-brain { animation: breathe 3s ease-in-out infinite; transform-origin: 100px 90px; }
                    .anim-node-1 { animation: pulse-node 2s infinite 0.0s; }
                    .anim-node-2 { animation: pulse-node 2s infinite 0.5s; }
                    .anim-node-3 { animation: pulse-node 2s infinite 1.0s; }
                    .anim-sparkle { animation: sparkle-magic 3s ease-in-out infinite; transform-origin: 145px 55px; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    @keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
                    @keyframes pulse-node { 0%, 100% { opacity: 0.3; r: 3; } 50% { opacity: 1; r: 5; } }
                    @keyframes sparkle-magic { 0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.5; } 50% { transform: scale(1.2) rotate(45deg); opacity: 1; } }
                </style>
                <g id="ring-container">
                    <circle cx="100" cy="100" r="86" fill="currentColor" opacity="0.03" />
                    <circle cx="100" cy="100" r="86" stroke="currentColor" stroke-width="2" fill="none" opacity="0.1" />
                    <circle class="anim-ring" cx="100" cy="100" r="86" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="140 400" fill="none" opacity="0.9" />
                </g>
                <g class="anim-brain">
                    <path d="M 100 46 C 75 46 60 65 64 85 C 50 95 55 115 65 125 C 75 135 90 135 100 128 C 110 135 125 135 135 125 C 145 115 150 95 136 85 C 140 65 125 46 100 46 Z" stroke="currentColor" stroke-width="4" stroke-linejoin="round" fill="none" opacity="0.8" />
                    <line x1="100" y1="46" x2="100" y2="128" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" opacity="0.3" stroke-linecap="round" />
                    <circle class="anim-node-1" cx="72" cy="76" r="4" fill="currentColor" />
                    <circle class="anim-node-2" cx="128" cy="76" r="4" fill="currentColor" />
                    <circle class="anim-node-3" cx="100" cy="96" r="5" fill="currentColor" opacity="0.9" />
                </g>
                <path class="anim-sparkle" d="M 145 40 Q 148 50 155 55 Q 148 58 145 68 Q 142 58 135 55 Q 142 50 145 40 Z" fill="currentColor" opacity="0.9" />
            </svg>
        `;

        const windowChat = document.createElement('div');
        windowChat.id = 'chatbot-window';
        windowChat.className = 'chatbot-window hidden';
        windowChat.innerHTML = `
            <div class="chatbot-header">
                <div class="chatbot-header-info">
                    <div class="chatbot-status-dot"></div>
                    <h3>PSYZON AI</h3>
                </div>
                <div class="header-actions">
                    <button id="chatbot-clear" class="header-btn" title="Limpar conversa">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                    <button id="chatbot-close" class="header-btn" title="Fechar">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>
            <div id="chatbot-messages" class="chatbot-messages">
                <div class="message-wrapper ai">
                    <div class="message-content">
                        <div class="message-avatar">🤖</div>
                        <div class="chat-bubble">Olá! Sou o PSYZON AI. Estou pronto para ajudar com sua estratégia e finanças. 🚀</div>
                    </div>
                </div>
            </div>
            <div id="chatbot-typing" class="message-wrapper ai" style="display:none; padding-left: 20px;">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
            <div class="chatbot-input-area">
                <input type="text" id="chatbot-input" class="chatbot-input" placeholder="Digite sua dúvida...">
                <button id="chatbot-send" class="chatbot-send">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(fab);
        document.body.appendChild(windowChat);

        const msgArea = document.getElementById('chatbot-messages');
        const input = document.getElementById('chatbot-input');
        const sendBtn = document.getElementById('chatbot-send');
        const typing = document.getElementById('chatbot-typing');

        fab.addEventListener('click', () => {
            windowChat.classList.toggle('hidden');
            if (!windowChat.classList.contains('hidden')) input.focus();
        });

        document.getElementById('chatbot-close').addEventListener('click', () => windowChat.classList.add('hidden'));

        document.getElementById('chatbot-clear').addEventListener('click', () => {
            msgArea.innerHTML = '';
            addMessage('Conversa limpa. Como posso ajudar agora? 🤖', 'ai');
        });

        const addMessage = (text, type) => {
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const wrapper = document.createElement('div');
            wrapper.className = `message-wrapper ${type}`;

            let avatar = type === 'ai' ? '<div class="message-avatar">🤖</div>' : '';

            wrapper.innerHTML = `
                <div class="message-content">
                    ${avatar}
                    <div class="chat-bubble">${text}</div>
                </div>
                <div class="message-time">${time}</div>
            `;

            msgArea.appendChild(wrapper);
            msgArea.scrollTo({ top: msgArea.scrollHeight, behavior: 'smooth' });
            return wrapper;
        };

        const handleSend = async () => {
            const text = input.value.trim();
            if (!text) return;

            addMessage(text, 'user');
            input.value = '';

            typing.style.display = 'block';
            msgArea.scrollTo({ top: msgArea.scrollHeight, behavior: 'smooth' });

            try {
                let context = "";
                if (window.Advisor) {
                    const stats = window.Advisor.analyze();
                    context = `\n[CONTEXTO FINANCEIRO: Saldo R$ ${stats.stats.totalBalance}, Lucro Mes R$ ${stats.stats.businessProfitMonth}, Risco: ${stats.riskLevel}] `;
                }

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: context + text })
                });

                const data = await response.json();
                typing.style.display = 'none';

                if (data.error) {
                    addMessage("Ops, tive um problema: " + data.error, 'ai');
                } else {
                    addMessage(data.content || "Não soube o que responder.", 'ai');
                }
            } catch (e) {
                typing.style.display = 'none';
                addMessage("Erro de conexão com o servidor.", 'ai');
            }
        };

        sendBtn.addEventListener('click', handleSend);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectChatUI);
    } else {
        injectChatUI();
    }
})();
