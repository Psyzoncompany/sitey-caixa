/**
 * chatbot.js — PSYZON AI
 * Interface Full Screen e Ícone Animado
 */

(() => {
    let currentMode = 'normal';
    const HISTORY_KEY = 'psyzon_chat_history';
    const MAX_HISTORY = 20;
    const conversationHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').slice(-MAX_HISTORY);
    let pendingImage = null;
    // ── Estilos ──────────────────────────────────────────────────────────────
    const injectStyles = () => {
        if (document.getElementById('psyzon-ai-styles')) return;
        const style = document.createElement('style');
        style.id = 'psyzon-ai-styles';
        style.textContent = `
            /* FAB */
            .chatbot-fab {
                position: fixed;
                bottom: calc(24px + env(safe-area-inset-bottom, 0px));
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
            .chatbot-fab-menu {
                position: fixed;
                right: 24px;
                bottom: calc(92px + env(safe-area-inset-bottom, 0px));
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 8px;
                opacity: 0;
                pointer-events: none;
                transform: translateY(8px);
                transition: all .2s ease;
            }
            .chatbot-fab-menu.open {
                opacity: 1;
                pointer-events: auto;
                transform: translateY(0);
            }
            .chatbot-fab-menu button {
                border: 1px solid rgba(148,163,184,.3);
                background: rgba(15,23,42,.92);
                color: #e2e8f0;
                border-radius: 10px;
                padding: 10px 12px;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                text-align: left;
                box-shadow: 0 8px 20px rgba(2,6,23,.45);
                white-space: nowrap;
            }
            .chatbot-fab-menu button:hover {
                border-color: rgba(6,182,212,.45);
                color: #67e8f9;
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

            .action-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 8px;
                margin-left: 32px;
            }
            .action-btn {
                font-size: 11px;
                padding: 5px 10px;
                border-radius: 8px;
                border: 1px solid rgba(6,182,212,0.4);
                background: rgba(6,182,212,0.08);
                color: #22d3ee;
                cursor: pointer;
                transition: all 0.15s ease;
                text-decoration: none;
            }
            .action-btn:hover { background: rgba(6,182,212,0.18); }

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
            .image-btn {
                background: rgba(30,41,59,0.8);
                border: 1px solid rgba(148,163,184,0.2);
                border-radius: 12px;
                color: #64748b;
                cursor: pointer;
                padding: 9px 10px;
                display: flex;
                align-items: center;
                transition: all 0.15s ease;
            }
            .image-btn:hover { color: #22d3ee; border-color: rgba(6,182,212,0.4); }
            .chatbot-image-preview {
                width: 80px;
                height: 80px;
                object-fit: cover;
                border-radius: 12px;
                border: 1px solid rgba(148,163,184,0.25);
                margin: 8px 0;
            }
            .session-separator {
                text-align: center;
                color: #94a3b8;
                font-size: 12px;
                margin: 6px 0;
            }
            .chatbot-fab-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #ef4444;
                border: 2px solid #0d1b2a;
                font-size: 9px;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                pointer-events: none;
            }

            /* Mobile */
            @media (max-width: 992px) {
                .chatbot-messages, .chatbot-input-area { padding-left: 10%; padding-right: 10%; }
            }
            @media (max-width: 768px) {
                .chatbot-fab { bottom: calc(92px + env(safe-area-inset-bottom, 0px)); }
                .chatbot-fab-menu { right: 16px; bottom: calc(156px + env(safe-area-inset-bottom, 0px)); }
                .chatbot-header { padding: 15px 20px; }
                .chatbot-messages { padding: 20px 15px; }
                .chatbot-input-area { padding: 15px; }
                .chatbot-header-info h3 { font-size: 16px; }
                .action-buttons { margin-left: 0; }
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

        const fabMenu = document.createElement('div');
        fabMenu.id = 'chatbot-fab-menu';
        fabMenu.className = 'chatbot-fab-menu';
        fabMenu.innerHTML = `
            <button id="chatbot-open-inline">Abrir IA rápida</button>
            <button id="chatbot-open-full">Abrir IA em tela completa</button>
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
                    <button id="chatbot-export" class="header-btn" title="Exportar conversa">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/></svg>
                    </button>
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
                    <button id="chatbot-image" class="image-btn" title="Enviar imagem">📎</button>
                    <input type="file" id="chatbot-image-input" accept="image/*" style="display:none;">
                    <input type="text" id="chatbot-input" class="chatbot-input" placeholder="Pergunte qualquer coisa...">
                    <button id="chatbot-send" class="chatbot-send">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(fabMenu);
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
        const imageBtn = document.getElementById('chatbot-image');
        const imageInput = document.getElementById('chatbot-image-input');
        const typing = document.getElementById('chatbot-typing');

        const saveHistory = () => localStorage.setItem(HISTORY_KEY, JSON.stringify(conversationHistory.slice(-MAX_HISTORY)));
        const addSessionSeparator = () => {
            const sep = document.createElement('div');
            sep.className = 'session-separator';
            sep.textContent = '— sessão anterior —';
            msgArea.appendChild(sep);
        };

        if (conversationHistory.length) {
            addSessionSeparator();
            conversationHistory.forEach((msg) => {
                if (msg.role === 'assistant') addMessage(msg.content, 'ai');
                if (msg.role === 'user') addMessage(msg.content, 'user');
            });
        } else {
            addMessage('🤖 Olá! Sou o **PSYZON AI**. Estou pronto para ajudar com sua estratégia e finanças em tela cheia! Como posso ser útil hoje?', 'ai');
        }

        const openInline = () => {
            windowChat.classList.remove('hidden');
            fabMenu.classList.remove('open');
            input.focus();
        };

        fab.addEventListener('click', (e) => {
            e.stopPropagation();
            fabMenu.classList.toggle('open');
        });

        document.getElementById('chatbot-open-inline').addEventListener('click', (e) => {
            e.stopPropagation();
            openInline();
        });

        document.getElementById('chatbot-open-full').addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = 'ai.html';
        });

        document.addEventListener('click', (e) => {
            if (!fabMenu.contains(e.target) && e.target !== fab) {
                fabMenu.classList.remove('open');
            }
        });

        document.getElementById('chatbot-close').addEventListener('click', () => windowChat.classList.add('hidden'));
        document.getElementById('chatbot-clear').addEventListener('click', () => {
            msgArea.innerHTML = '';
            conversationHistory.length = 0;
            saveHistory();
            addMessage('🗑️ Conversa limpa.', 'ai');
        });

        imageBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', () => {
            const file = imageInput.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const result = String(reader.result || '');
                const base64 = result.includes(',') ? result.split(',')[1] : '';
                pendingImage = { base64, mimeType: file.type || 'image/png' };
                const preview = document.createElement('img');
                preview.src = result;
                preview.className = 'chatbot-image-preview';
                const wrapper = addMessage('🖼️ Imagem pronta para análise.', 'user');
                wrapper.querySelector('.chat-bubble')?.appendChild(preview);
            };
            reader.readAsDataURL(file);
        });

        document.getElementById('chatbot-export').addEventListener('click', () => {
            const lines = [`PSYZON AI — Conversa exportada em ${new Date().toLocaleString('pt-BR')}`, ''];
            const bubbles = document.querySelectorAll('.message-wrapper');
            bubbles.forEach(w => {
                const isAI = w.classList.contains('ai');
                const text = w.querySelector('.chat-bubble')?.innerText || '';
                const time = w.querySelector('.message-time')?.innerText || '';
                lines.push(`[${time}] ${isAI ? 'PSYZON AI' : 'Você'}: ${text}`);
            });
            lines.push('', 'Exportado pelo PSYZON AI');
            const content = lines.join('\n');
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `psyzon-ai-${new Date().toISOString().slice(0,10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
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

        function addActionButtons(wrapper, aiText) {
            const lower = aiText.toLowerCase();
            const links = [];
            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
            const hasClientName = clients.some(c => c?.name && lower.includes(String(c.name).toLowerCase()));

            if (lower.includes('pedido') && hasClientName) links.push({ label: '📦 Ver Pedidos', href: 'processos.html' });
            if (lower.includes('contas') || lower.includes('pagar')) links.push({ label: '💳 Ver Contas', href: 'contas.html' });
            if (lower.includes('clientes')) links.push({ label: '👥 Ver Clientes', href: 'clientes.html' });
            if (lower.includes('histórico') || lower.includes('extrato')) links.push({ label: '📊 Ver Histórico', href: 'historico.html' });

            if (!links.length) return;

            const actions = document.createElement('div');
            actions.className = 'action-buttons';
            links.forEach(link => {
                const a = document.createElement('a');
                a.className = 'action-btn';
                a.href = link.href;
                a.textContent = link.label;
                actions.appendChild(a);
            });
            wrapper.appendChild(actions);
        }

        function buildRichContext() {
            const sections = [];

            if (window.Advisor) {
                const stats = window.Advisor.analyze();
                const taskSum = stats.stats.tasks
                    ? `Tarefas: ${stats.stats.tasks.totalPending} pendentes, ${stats.stats.tasks.overdue} atrasadas.`
                    : '';
                sections.push(`[FINANCEIRO: Saldo R$${stats.stats.totalBalance?.toFixed(2)}, Lucro R$${stats.stats.businessProfitMonth?.toFixed(2)}, Risco: ${stats.riskLevel}. ${taskSum}]`);
            }

            const orders = JSON.parse(localStorage.getItem('production_orders') || '[]');
            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const ordersInfo = orders.map(o => {
                const client = clients.find(c => String(c.id) === String(o.clientId));
                const deadline = o.deadline ? new Date(`${o.deadline}T03:00:00`) : null;
                const diffDays = deadline ? Math.ceil((deadline - today) / 86400000) : null;
                const status = o.status === 'done' ? 'concluído' : diffDays === null ? 'sem prazo' : diffDays < 0 ? `ATRASADO ${Math.abs(diffDays)}d` : diffDays === 0 ? 'vence HOJE' : `vence em ${diffDays}d`;
                return `- ${o.description || 'Pedido'} | cliente: ${client?.name || 'N/A'} | status: ${status} | valor: R$${Number(o.totalValue || 0).toFixed(2)}`;
            }).slice(0, 20).join('\n');
            sections.push(`[PEDIDOS DE PRODUÇÃO:\n${ordersInfo || 'Nenhum pedido'}]`);

            const billsRaw = JSON.parse(localStorage.getItem('psyzon_accounts_db_v1') || '{}');
            const accounts = Array.isArray(billsRaw) ? billsRaw : (billsRaw.accounts || []);
            const accountsText = accounts.map(a => {
                const paid = a.status === 'paid' || a.status === 'pago' || a.paid === true;
                return `- ${a.name || a.description || 'Conta'} | valor: R$${Number(a.amount || a.value || 0).toFixed(2)} | vencimento: ${a.dueDate || a.due || 'N/A'} | status: ${paid ? 'pago' : 'pendente'}`;
            }).slice(0, 30).join('\n');
            sections.push(`[CONTAS A PAGAR DO MÊS:\n${accountsText || 'Nenhuma conta registrada'}]`);

            const debtByClient = new Map();
            orders.forEach(o => {
                const client = clients.find(c => String(c.id) === String(o.clientId));
                const name = client?.name || 'Cliente não identificado';
                const total = Number(o.totalValue || o.value || 0);
                const paid = Number(o.paidValue || o.amountPaid || 0);
                const pending = Math.max(total - paid, 0);
                if (pending <= 0) return;
                const current = debtByClient.get(name) || { total: 0, paid: 0, pending: 0 };
                current.total += total;
                current.paid += paid;
                current.pending += pending;
                debtByClient.set(name, current);
            });
            const debtText = [...debtByClient.entries()].map(([name, vals]) => `- ${name} | pedido total: R$${vals.total.toFixed(2)} | pago: R$${vals.paid.toFixed(2)} | saldo: R$${vals.pending.toFixed(2)}`).join('\n');
            sections.push(`[CLIENTES COM SALDO DEVEDOR:\n${debtText || 'Nenhum cliente com saldo devedor'}]`);

            const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
            const fabricText = transactions
                .filter(t => Number(t.weightKg) > 0)
                .map(t => `- cor: ${t.color || t.cor || 'N/A'} | peso: ${Number(t.weightKg).toFixed(2)}kg | valor gasto: R$${Number(t.valueSpent || t.amount || t.total || 0).toFixed(2)}`)
                .slice(0, 30)
                .join('\n');
            sections.push(`[ESTOQUE DE MALHA:\n${fabricText || 'Sem entradas de malha com peso'}]`);

            const costBreakdown = window._costBreakdown ? JSON.stringify(window._costBreakdown) : 'Não disponível';
            sections.push(`[CUSTO POR PEÇA (MÊS ATUAL): ${costBreakdown}]`);

            const businessLimit = localStorage.getItem('businessSpendingLimit') || 'não definido';
            const personalLimit = localStorage.getItem('personalSpendingLimit') || 'não definido';
            sections.push(`[METAS DO MÊS: Limite empresarial: ${businessLimit} | Limite pessoal: ${personalLimit}]`);

            const pageTitle = document.title;
            const pageContent = document.body.innerText.slice(0, 1500).replace(/\n\s*\n/g, '\n');
            sections.push(`[PÁGINA ATUAL: ${pageTitle}]`);
            sections.push(`[CONTEÚDO DA PÁGINA: ${pageContent}]`);

            return sections.join('\n');
        }

        function getBalanceForAlerts() {
            if (window.Advisor) {
                const stats = window.Advisor.analyze();
                return Number(stats?.stats?.totalBalance || 0);
            }
            const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
            return transactions.reduce((acc, t) => acc + Number(t.amount || t.value || 0), 0);
        }

        function checkProactiveAlerts() {
            if (sessionStorage.getItem('psyzon_alert_shown') === '1') return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const orders = JSON.parse(localStorage.getItem('production_orders') || '[]');
            const billsRaw = JSON.parse(localStorage.getItem('psyzon_accounts_db_v1') || '{}');
            const accounts = Array.isArray(billsRaw) ? billsRaw : (billsRaw.accounts || []);
            let alert = '';

            const delayedOrdersCount = orders.filter(o => {
                if (!o.deadline || o.status === 'done') return false;
                const deadline = new Date(`${o.deadline}T03:00:00`);
                return deadline < today;
            }).length;
            const dueAccountsCount = accounts.filter(a => {
                const paid = a.status === 'paid' || a.status === 'pago' || a.paid === true;
                if (paid || !a.dueDate) return false;
                const dueDate = new Date(`${a.dueDate}T03:00:00`);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate.getTime() === today.getTime() || dueDate.getTime() === tomorrow.getTime();
            }).length;

            const totalAlertas = delayedOrdersCount + dueAccountsCount;
            const existingBadge = fab.querySelector('.chatbot-fab-badge');
            if (existingBadge) existingBadge.remove();
            if (totalAlertas > 0) {
                const badge = document.createElement('span');
                badge.className = 'chatbot-fab-badge';
                badge.textContent = String(totalAlertas);
                fab.style.position = 'relative';
                fab.appendChild(badge);
            }

            const urgentOrder = orders.find(o => {
                if (!o.deadline || o.status === 'done') return false;
                const deadline = new Date(`${o.deadline}T03:00:00`);
                const diff = Math.ceil((deadline - today) / 86400000);
                return diff === 0 || diff === 1;
            });
            if (urgentOrder) {
                alert = `🟠 Pedido "${urgentOrder.description || 'sem descrição'}" vence em até 1 dia`;
            }

            if (!alert) {
                const delayedOrder = orders.find(o => {
                    if (!o.deadline || o.status === 'done') return false;
                    const deadline = new Date(`${o.deadline}T03:00:00`);
                    return deadline < today;
                });
                if (delayedOrder) {
                    alert = `🔴 Pedido atrasado detectado: "${delayedOrder.description || 'sem descrição'}"`;
                }
            }

            if (!alert && getBalanceForAlerts() < 500) {
                alert = '🟡 Seu saldo está abaixo de R$500,00';
            }

            if (!alert) {
                const dueAccount = accounts.find(a => {
                    const paid = a.status === 'paid' || a.status === 'pago' || a.paid === true;
                    if (paid || !a.dueDate) return false;
                    const dueDate = new Date(`${a.dueDate}T03:00:00`);
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate.getTime() === today.getTime() || dueDate.getTime() === tomorrow.getTime();
                });
                if (dueAccount) {
                    alert = `🟠 Conta "${dueAccount.name || dueAccount.description || 'sem descrição'}" vence hoje ou amanhã`;
                }
            }

            if (!alert) return;
            sessionStorage.setItem('psyzon_alert_shown', '1');
            const wrapper = addMessage(`🚨 Atenção: ${alert}. Deseja que eu analise?`, 'ai');
            addActionButtons(wrapper, alert);
            conversationHistory.push({ role: 'assistant', content: `🚨 Atenção: ${alert}. Deseja que eu analise?` });
            while (conversationHistory.length > MAX_HISTORY) conversationHistory.shift();
            saveHistory();
        }

        const handleSend = async () => {
            const text = input.value.trim();
            if (!text && !pendingImage) return;
            addMessage(text || '🖼️ Enviando imagem para análise.', 'user');
            conversationHistory.push({ role: 'user', content: text || '[Imagem enviada]' });
            while (conversationHistory.length > MAX_HISTORY) conversationHistory.shift();
            saveHistory();
            input.value = '';
            typing.style.display = 'block';
            msgArea.scrollTo({ top: msgArea.scrollHeight, behavior: 'smooth' });

            try {
                const context = buildRichContext();

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text, mode: currentMode, history: conversationHistory, context, image: pendingImage })
                });
                const data = await response.json();
                typing.style.display = 'none';
                const aiContent = data.error ? `⚠️ Erro: ${data.error}` : (data.content || '...');
                const wrapper = addMessage(aiContent, 'ai');
                addActionButtons(wrapper, aiContent);
                conversationHistory.push({ role: 'assistant', content: aiContent });
                while (conversationHistory.length > MAX_HISTORY) conversationHistory.shift();
                saveHistory();
                pendingImage = null;
                imageInput.value = '';
            } catch (e) {
                typing.style.display = 'none';
                const aiContent = '⚠️ Erro de conexão.';
                addMessage(aiContent, 'ai');
                conversationHistory.push({ role: 'assistant', content: aiContent });
                while (conversationHistory.length > MAX_HISTORY) conversationHistory.shift();
                saveHistory();
            }
        };

        document.getElementById('chatbot-send').addEventListener('click', handleSend);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

        checkProactiveAlerts();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectChatUI);
    else injectChatUI();
})();
