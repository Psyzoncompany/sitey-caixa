/**
 * chatbot.js — PSYZON AI
 * Interface Full Screen e Ícone Animado
 */

(() => {
    let currentMode = 'normal';
    // ── Estilos ──────────────────────────────────────────────────────────────
    const injectStyles = () => {
        if (document.getElementById('psyzon-ai-styles')) return;
        const style = document.createElement('style');
        style.id = 'psyzon-ai-styles';
        style.textContent = `
            /* FAB */
            .chatbot-fab {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #06b6d4, #8b5cf6);
                border: none;
                cursor: pointer;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 24px rgba(6,182,212,0.4);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                color: white;
                padding: 0;
            }
            .chatbot-fab:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 32px rgba(6,182,212,0.6);
            }

            /* Janela Full Screen Desktop */
            .chatbot-window {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: linear-gradient(160deg, #0d1b2a 0%, #111827 100%);
                z-index: 9998;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            .chatbot-window.hidden {
                opacity: 0;
                pointer-events: none;
                transform: scale(1.02);
            }

            /* Header */
            .chatbot-header {
                background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(12px);
                border-bottom: 1px solid rgba(148,163,184,0.15);
                padding: 24px 10%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-shrink: 0;
            }
            .chatbot-header-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .chatbot-header-info h3 {
                font-size: 18px;
                font-weight: 800;
                color: #f0f9ff;
                letter-spacing: 0.1em;
                margin: 0;
            }
            .chatbot-status-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #22d3ee;
                box-shadow: 0 0 10px #22d3ee;
                animation: blink-dot 2s ease-in-out infinite;
            }
            @keyframes blink-dot {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.4; transform: scale(1.2); }
            }

            .header-actions { display: flex; gap: 12px; }
            .header-btn {
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                color: #cbd5e1;
                cursor: pointer;
                padding: 8px;
                display: flex;
                align-items: center;
                transition: all 0.2s ease;
            }
            .header-btn:hover {
                background: rgba(255,255,255,0.15);
                color: #fff;
                transform: translateY(-2px);
            }

            /* Mensagens */
            .chatbot-messages {
                flex: 1;
                overflow-y: auto;
                padding: 40px 20%;
                display: flex;
                flex-direction: column;
                gap: 20px;
                scrollbar-width: thin;
                scrollbar-color: rgba(148,163,184,0.2) transparent;
            }
            .chatbot-messages::-webkit-scrollbar { width: 6px; }
            .chatbot-messages::-webkit-scrollbar-thumb {
                background: rgba(148,163,184,0.2);
                border-radius: 10px;
            }

            .message-wrapper {
                display: flex;
                flex-direction: column;
                gap: 6px;
                animation: msg-in 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
            }
            @keyframes msg-in {
                from { opacity: 0; transform: translateY(15px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .message-wrapper.user { align-items: flex-end; }
            .message-wrapper.ai { align-items: flex-start; }

            .message-content {
                display: flex;
                align-items: flex-end;
                gap: 12px;
                max-width: 85%;
            }
            .message-wrapper.user .message-content { flex-direction: row-reverse; }

            .message-avatar {
                font-size: 24px;
                line-height: 1;
                flex-shrink: 0;
                margin-bottom: 4px;
            }

            .chat-bubble {
                padding: 14px 18px;
                border-radius: 20px;
                font-size: 14.5px;
                line-height: 1.6;
                color: #f1f5f9;
                word-break: break-word;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .message-wrapper.user .chat-bubble {
                background: linear-gradient(135deg, #0891b2, #7c3aed);
                border-bottom-right-radius: 4px;
                color: #fff;
            }
            .message-wrapper.ai .chat-bubble {
                background: rgba(30,41,59,0.7);
                border: 1px solid rgba(148,163,184,0.15);
                backdrop-filter: blur(5px);
                border-bottom-left-radius: 4px;
            }

            /* Formatação IA */
            .chat-bubble p { margin: 0 0 10px; }
            .chat-bubble p:last-child { margin-bottom: 0; }
            .chat-bubble strong { color: #fff; font-weight: 700; }
            .chat-bubble .ai-section {
                margin: 15px 0 10px;
                font-size: 14px;
                font-weight: 800;
                color: #22d3ee;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .chat-bubble .ai-item {
                display: flex;
                gap: 10px;
                align-items: flex-start;
                margin: 6px 0;
            }
            .chat-bubble .ai-item-dot { color: #8b5cf6; font-size: 12px; margin-top: 4px; }
            
            .message-time { font-size: 11px; color: #64748b; padding: 0 5px; }

            /* Typing */
            .typing-indicator {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 14px 18px;
                background: rgba(30,41,59,0.7);
                border: 1px solid rgba(148,163,184,0.15);
                border-radius: 20px;
                border-bottom-left-radius: 4px;
                width: fit-content;
                margin-left: 45px;
            }
            .typing-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #475569;
                animation: typing-bounce 1.2s ease-in-out infinite;
            }
            .typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .typing-dot:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typing-bounce {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
                30% { transform: translateY(-8px); opacity: 1; background: #22d3ee; }
            }

            /* Input Area */
            .chatbot-input-area {
                padding: 30px 20%;
                background: rgba(15, 23, 42, 0.9);
                backdrop-filter: blur(12px);
                display: flex;
                gap: 15px;
                border-top: 1px solid rgba(148,163,184,0.15);
                flex-shrink: 0;
            }
            .chatbot-input {
                flex: 1;
                background: rgba(30,41,59,0.9);
                border: 1px solid rgba(148,163,184,0.25);
                border-radius: 16px;
                color: #fff;
                font-size: 15px;
                padding: 14px 20px;
                outline: none;
                transition: all 0.3s ease;
            }
            .chatbot-input:focus {
                border-color: #22d3ee;
                box-shadow: 0 0 15px rgba(34,211,238,0.1);
            }
            .chatbot-send {
                background: linear-gradient(135deg, #06b6d4, #8b5cf6);
                border: none;
                border-radius: 16px;
                color: #fff;
                cursor: pointer;
                padding: 0 24px;
                display: flex;
                align-items: center;
                transition: all 0.3s ease;
            }
            .chatbot-send:hover { transform: scale(1.05); filter: brightness(1.1); }

            /* Mobile */
            @media (max-width: 992px) {
                .chatbot-messages, .chatbot-input-area { padding-left: 10%; padding-right: 10%; }
            }
            @media (max-width: 768px) {
                .chatbot-header { padding: 15px 20px; }
                .chatbot-messages { padding: 20px 15px; }
                .chatbot-input-area { padding: 15px; }
            .chatbot-header-info h3 { font-size: 16px; }
            }

            /* Mode Buttons */
            .mode-btn {
                flex: 1;
                padding: 5px 0;
                font-size: 11px;
                font-weight: 600;
                border-radius: 8px;
                border: 1px solid rgba(148,163,184,0.2);
                background: rgba(30,41,59,0.6);
                color: #64748b;
                cursor: pointer;
                transition: all 0.15s ease;
            }
            .mode-btn.active[data-mode="normal"]  { background: rgba(6,182,212,0.15);  border-color: #06b6d4; color: #22d3ee; }
            .mode-btn.active[data-mode="rapido"]  { background: rgba(234,179,8,0.15);  border-color: #eab308; color: #fde047; }
            .mode-btn.active[data-mode="profundo"]{ background: rgba(139,92,246,0.15); border-color: #8b5cf6; color: #a78bfa; }
            .mode-btn:hover:not(.active) { border-color: rgba(148,163,184,0.4); color: #94a3b8; }
        `;
        document.head.appendChild(style);
    };

    const formatAIText = (text) => {
        const lines = text.split('\n');
        let html = '';
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            if (/^\*\*([^*]+)\*\*$/.test(line) || /^#+\s/.test(line)) {
                const title = line.replace(/^\*\*|\*\*$/g, '').replace(/^#+\s/, '');
                html += `<div class="ai-section">${title}</div>`;
                continue;
            }
            if (/^[\*\-]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
                let content = line.replace(/^[\*\-\d\.]+\s+/, '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                html += `<div class="ai-item"><span class="ai-item-dot">▸</span><span>${content}</span></div>`;
                continue;
            }
            let processed = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
            html += `<p>${processed}</p>`;
        }
        return html;
    };

    const injectChatUI = () => {
        if (document.getElementById('chatbot-fab')) return;
        injectStyles();

        const fab = document.createElement('button');
        fab.id = 'chatbot-fab';
        fab.className = 'chatbot-fab';
        fab.innerHTML = `
            <svg viewBox="0 0 200 200" width="100%" height="100%" aria-labelledby="aiTitle aiDesc" role="img">
                <title id="aiTitle">Inteligência Artificial</title>
                <desc id="aiDesc">Ícone animado de um cérebro digital a pulsar com nós de rede neuronal e uma estrela mágica.</desc>
                <style>
                    /* 🌀 Animação do anel externo */
                    .anim-ring {
                        animation: spin 6s linear infinite;
                        transform-origin: 100px 100px;
                    }

                    /* 🧠 Cérebro "respirando" (escala suave) */
                    .anim-brain {
                        animation: breathe 3s ease-in-out infinite;
                        transform-origin: 100px 90px;
                    }

                    /* 💡 Pulsar dos Neurónios (Opacidade) */
                    .anim-node-1 { animation: pulse-node 2s infinite 0.0s; }
                    .anim-node-2 { animation: pulse-node 2s infinite 0.5s; }
                    .anim-node-3 { animation: pulse-node 2s infinite 1.0s; }

                    /* ✨ Estrela Mágica da IA */
                    .anim-sparkle {
                        animation: sparkle-magic 3s ease-in-out infinite;
                        transform-origin: 145px 55px;
                    }

                    /* 🎬 Keyframes */
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    @keyframes breathe {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.03); }
                    }

                    @keyframes pulse-node {
                        0%, 100% { opacity: 0.3; r: 3; }
                        50% { opacity: 1; r: 5; }
                    }

                    @keyframes sparkle-magic {
                        0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.5; }
                        50% { transform: scale(1.2) rotate(45deg); opacity: 1; }
                    }

                    /* 🛑 Respeito à preferência do utilizador de não ter animações */
                    @media (prefers-reduced-motion: reduce) {
                        .anim-ring, .anim-brain, .anim-node-1, .anim-node-2, .anim-node-3, .anim-sparkle { 
                            animation: none !important; 
                        }
                        .anim-node-1, .anim-node-2, .anim-node-3 { opacity: 0.8; }
                        .anim-sparkle { opacity: 1; }
                    }
                </style>

                <!-- 1) ⭕ CÍRCULO EXTERNO -->
                <g id="ring-container">
                    <circle cx="100" cy="100" r="86" fill="currentColor" opacity="0.03" />
                    <circle cx="100" cy="100" r="86" stroke="currentColor" stroke-width="2" fill="none" opacity="0.1" />
                    <circle class="anim-ring" cx="100" cy="100" r="86" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="140 400" fill="none" opacity="0.9" />
                </g>

                <!-- 2) 🧠 CÉREBRO & REDE NEURONAL -->
                <g class="anim-brain">
                    <!-- Contorno do Cérebro (Lóbulos curvos) -->
                    <path d="M 100 46 C 75 46 60 65 64 85 C 50 95 55 115 65 125 C 75 135 90 135 100 128 C 110 135 125 135 135 125 C 145 115 150 95 136 85 C 140 65 125 46 100 46 Z" stroke="currentColor" stroke-width="4" stroke-linejoin="round" fill="none" opacity="0.8" />
                    
                    <!-- Divisão Central (Hemisférios) -->
                    <line x1="100" y1="46" x2="100" y2="128" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" opacity="0.3" stroke-linecap="round" />

                    <!-- Conexões de Dados (Linhas internas) -->
                    <path d="M 72 76 L 100 96 L 128 76 M 78 114 L 100 96 L 122 114" stroke="currentColor" stroke-width="2" fill="none" opacity="0.4" stroke-linecap="round" stroke-linejoin="round" />

                    <!-- Nós da Rede Neuronal (Pulsantes) -->
                    <circle class="anim-node-1" cx="72" cy="76" r="4" fill="currentColor" />
                    <circle class="anim-node-2" cx="128" cy="76" r="4" fill="currentColor" />
                    <circle class="anim-node-3" cx="100" cy="96" r="5" fill="currentColor" opacity="0.9" />
                    <circle class="anim-node-1" cx="78" cy="114" r="4" fill="currentColor" />
                    <circle class="anim-node-2" cx="122" cy="114" r="4" fill="currentColor" />
                </g>

                <!-- 3) ✨ ESTRELA DA IA (Brilho superior direito) -->
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
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                    <button id="chatbot-close" class="header-btn" title="Fechar">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </div>
            <div id="chatbot-messages" class="chatbot-messages"></div>
            <div id="chatbot-typing" style="display:none; padding-bottom: 20px;">
                <div class="typing-indicator">
                    <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
                </div>
            </div>
            <div class="chatbot-input-area" style="flex-direction: column; gap:0; padding: 0 0 30px 0;">
                <div id="mode-selector" style="display:flex; gap:6px; padding: 12px 20% 12px; flex-shrink:0;">
                    <button class="mode-btn active" data-mode="normal">💬 Normal</button>
                    <button class="mode-btn" data-mode="rapido">⚡ Rápido</button>
                    <button class="mode-btn" data-mode="profundo">🔍 Profundo</button>
                </div>
                <div style="display:flex; gap:15px; padding: 0 20%;">
                    <input type="text" id="chatbot-input" class="chatbot-input" placeholder="Pergunte qualquer coisa...">
                    <button id="chatbot-send" class="chatbot-send">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(fab);
        document.body.appendChild(windowChat);

        // Listener dos botões de modo
        document.getElementById('mode-selector').addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-btn');
            if (!btn) return;
            currentMode = btn.dataset.mode;
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });

        const msgArea = document.getElementById('chatbot-messages');
        const input = document.getElementById('chatbot-input');
        const typing = document.getElementById('chatbot-typing');

        addMessage('🤖 Olá! Sou o **PSYZON AI**. Estou pronto para ajudar com sua estratégia e finanças em tela cheia! Como posso ser útil hoje?', 'ai');

        fab.addEventListener('click', () => {
            windowChat.classList.toggle('hidden');
            if (!windowChat.classList.contains('hidden')) input.focus();
        });

        document.getElementById('chatbot-close').addEventListener('click', () => windowChat.classList.add('hidden'));
        document.getElementById('chatbot-clear').addEventListener('click', () => {
            msgArea.innerHTML = '';
            addMessage('🗑️ Conversa limpa.', 'ai');
        });

        function addMessage(text, type) {
            const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const wrapper = document.createElement('div');
            wrapper.className = `message-wrapper ${type}`;
            const isAI = type === 'ai';
            wrapper.innerHTML = `
                <div class="message-content">
                    ${isAI ? '<div class="message-avatar">🤖</div>' : ''}
                    <div class="chat-bubble">${isAI ? formatAIText(text) : `<p>${text}</p>`}</div>
                </div>
                <div class="message-time">${time}</div>
            `;
            msgArea.appendChild(wrapper);
            msgArea.scrollTo({ top: msgArea.scrollHeight, behavior: 'smooth' });
            return wrapper;
        }

        const handleSend = async () => {
            const text = input.value.trim();
            if (!text) return;
            addMessage(text, 'user');
            input.value = '';
            typing.style.display = 'block';
            msgArea.scrollTo({ top: msgArea.scrollHeight, behavior: 'smooth' });

            try {
                let context = '';

                // Dados financeiros e resumo de tarefas do Advisor
                if (window.Advisor) {
                    const stats = window.Advisor.analyze();
                    const taskSum = stats.stats.tasks
                        ? `Tarefas: ${stats.stats.tasks.totalPending} pendentes, ${stats.stats.tasks.overdue} atrasadas.`
                        : '';
                    context += `[FINANCEIRO: Saldo R$${stats.stats.totalBalance?.toFixed(2)}, Lucro R$${stats.stats.businessProfitMonth?.toFixed(2)}, Risco: ${stats.riskLevel}. ${taskSum}]\n`;
                }

                // Detalhamento de Pedidos de Produção
                try {
                    const orders = JSON.parse(localStorage.getItem('production_orders') || '[]');
                    const clients = JSON.parse(localStorage.getItem('clients') || '[]');
                    const today = new Date(); today.setHours(0, 0, 0, 0);

                    const ordersInfo = orders.map(o => {
                        const client = clients.find(c => String(c.id) === String(o.clientId));
                        const deadline = o.deadline ? new Date(o.deadline + 'T03:00:00') : null;
                        const diffDays = deadline ? Math.ceil((deadline - today) / 86400000) : null;
                        const status = o.status === 'done' ? 'concluído' : diffDays === null ? 'sem prazo' : diffDays < 0 ? `ATRASADO ${Math.abs(diffDays)}d` : diffDays === 0 ? 'vence HOJE' : `vence em ${diffDays}d`;
                        return `- ${o.description || 'Pedido'} | cliente: ${client?.name || 'N/A'} | status: ${status} | valor: R$${o.totalValue || 0}`;
                    }).slice(0, 20).join('\n');

                    context += `[PEDIDOS DE PRODUÇÃO:\n${ordersInfo || 'Nenhum pedido'}]\n`;
                } catch (e) { }

                // Ler conteúdo da página atual
                const pageTitle = document.title;
                const pageContent = document.body.innerText.slice(0, 1500).replace(/\n\s*\n/g, '\n');
                const pageContext = `[PÁGINA ATUAL: ${pageTitle}]\n[CONTEÚDO DA PÁGINA: ${pageContent}]\n`;

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: pageContext + context + text, mode: currentMode })
                });
                const data = await response.json();
                typing.style.display = 'none';
                addMessage(data.error ? `⚠️ Erro: ${data.error}` : (data.content || '...'), 'ai');
            } catch (e) {
                typing.style.display = 'none';
                addMessage('⚠️ Erro de conexão.', 'ai');
            }
        };

        document.getElementById('chatbot-send').addEventListener('click', handleSend);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectChatUI);
    else injectChatUI();
})();
