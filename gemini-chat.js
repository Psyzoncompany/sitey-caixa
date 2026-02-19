/**
 * gemini-chat.js
 * Chat flutuante com IA Gemini — assistente financeiro da Psyzon Company
 * Auto-injeta um FAB + modal de chat no DOM.
 */
(function () {
    'use strict';

    if (document.body.dataset.geminiChatReady === 'true') return;
    if (window.location.pathname.endsWith('login.html')) return;
    document.body.dataset.geminiChatReady = 'true';

    // ── State ──
    const messages = [];
    let isLoading = false;

    // ── Helpers ──
    const esc = (str) =>
        String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

    const formatMarkdown = (text) => {
        let html = esc(text);
        // bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // italic
        html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
        // inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        // newlines
        html = html.replace(/\n/g, '<br>');
        return html;
    };

    const collectSiteData = () => {
        const safeGet = (key) => {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : null;
            } catch (_) {
                return null;
            }
        };

        return {
            transactions: safeGet('transactions') || [],
            clients: safeGet('clients') || [],
            production_orders: safeGet('production_orders') || [],
            psyzon_accounts_db_v1: safeGet('psyzon_accounts_db_v1') || null,
            incomeCategories: safeGet('incomeCategories') || [],
            expenseCategories: safeGet('expenseCategories') || [],
            monthlyProduction: safeGet('monthlyProduction') || [],
            business_budget_limit: safeGet('business_budget_limit') || null,
            personal_budget_limit: safeGet('personal_budget_limit') || null,
        };
    };

    // ── DOM ──

    // FAB
    const fab = document.createElement('button');
    fab.id = 'gemini-chat-fab';
    fab.className = 'gemini-chat-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Abrir assistente IA');
    fab.title = 'Assistente IA Psyzon';
    fab.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10H5a2 2 0 0 0-2 2v1a7 7 0 0 0 7 7h4a7 7 0 0 0 7-7v-1a2 2 0 0 0-2-2Z"/>
      <path d="M12 20v2"/>
      <path d="M8 22h8"/>
    </svg>
    <span class="gemini-fab-pulse"></span>
  `;

    // Modal
    const modal = document.createElement('div');
    modal.id = 'gemini-chat-modal';
    modal.className = 'gemini-chat-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
    <div class="gemini-chat-sheet">
      <div class="gemini-chat-header">
        <div class="gemini-chat-header-info">
          <div class="gemini-chat-avatar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10H5a2 2 0 0 0-2 2v1a7 7 0 0 0 7 7h4a7 7 0 0 0 7-7v-1a2 2 0 0 0-2-2Z"/>
            </svg>
          </div>
          <div>
            <h2 class="gemini-chat-title">Assistente Psyzon</h2>
            <p class="gemini-chat-subtitle">IA Financeira • Gemini</p>
          </div>
        </div>
        <button id="gemini-chat-close" type="button" aria-label="Fechar chat" class="gemini-chat-close">✕</button>
      </div>

      <div id="gemini-chat-messages" class="gemini-chat-messages">
        <div class="gemini-chat-welcome">
          <div class="gemini-welcome-icon">🤖</div>
          <p class="gemini-welcome-text">Olá, Sr. Rodrigo! Sou seu assistente financeiro IA.</p>
          <p class="gemini-welcome-sub">Pergunte sobre fluxo de caixa, despesas, lucros, clientes ou produção.</p>
          <div class="gemini-suggestions">
            <button type="button" class="gemini-suggestion-btn" data-suggestion="Qual é meu saldo atual e lucro do mês?">💰 Saldo e lucro</button>
            <button type="button" class="gemini-suggestion-btn" data-suggestion="Quais são minhas maiores despesas este mês?">📉 Maiores despesas</button>
            <button type="button" class="gemini-suggestion-btn" data-suggestion="Como posso reduzir meus custos de produção?">💡 Reduzir custos</button>
            <button type="button" class="gemini-suggestion-btn" data-suggestion="Quantos pedidos de produção estão ativos?">📦 Pedidos ativos</button>
          </div>
        </div>
      </div>

      <form id="gemini-chat-form" class="gemini-chat-input-area">
        <input
          type="text"
          id="gemini-chat-input"
          class="gemini-chat-input"
          placeholder="Pergunte algo sobre suas finanças..."
          autocomplete="off"
          required
        />
        <button type="submit" id="gemini-chat-send" class="gemini-chat-send" aria-label="Enviar">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 2L11 13"/>
            <path d="M22 2l-7 20-4-9-9-4z"/>
          </svg>
        </button>
      </form>
    </div>
  `;

    document.body.appendChild(fab);
    document.body.appendChild(modal);

    // ── References ──
    const chatMessages = modal.querySelector('#gemini-chat-messages');
    const chatForm = modal.querySelector('#gemini-chat-form');
    const chatInput = modal.querySelector('#gemini-chat-input');
    const chatClose = modal.querySelector('#gemini-chat-close');
    const chatSend = modal.querySelector('#gemini-chat-send');

    // ── Rendering ──
    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    };

    const addMessage = (role, content) => {
        // Remove welcome on first message
        const welcome = chatMessages.querySelector('.gemini-chat-welcome');
        if (welcome) welcome.remove();

        const div = document.createElement('div');
        div.className = `gemini-msg gemini-msg--${role}`;

        if (role === 'assistant') {
            div.innerHTML = `
        <div class="gemini-msg-avatar">🤖</div>
        <div class="gemini-msg-bubble">${formatMarkdown(content)}</div>
      `;
        } else {
            div.innerHTML = `<div class="gemini-msg-bubble">${esc(content)}</div>`;
        }

        chatMessages.appendChild(div);
        scrollToBottom();
    };

    const showTyping = () => {
        const div = document.createElement('div');
        div.id = 'gemini-typing';
        div.className = 'gemini-msg gemini-msg--assistant gemini-typing';
        div.innerHTML = `
      <div class="gemini-msg-avatar">🤖</div>
      <div class="gemini-msg-bubble">
        <span class="gemini-dot"></span>
        <span class="gemini-dot"></span>
        <span class="gemini-dot"></span>
      </div>
    `;
        chatMessages.appendChild(div);
        scrollToBottom();
    };

    const hideTyping = () => {
        const el = document.getElementById('gemini-typing');
        if (el) el.remove();
    };

    // ── API ──
    const sendMessage = async (text) => {
        if (isLoading || !text.trim()) return;

        const userMsg = text.trim();
        messages.push({ role: 'user', content: userMsg });
        addMessage('user', userMsg);

        isLoading = true;
        chatSend.disabled = true;
        chatInput.disabled = true;
        showTyping();

        try {
            const siteData = collectSiteData();

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    siteData: siteData,
                }),
            });

            const data = await res.json();

            hideTyping();

            if (!res.ok) {
                const errMsg = data?.error || 'Falha na resposta da IA.';
                messages.push({ role: 'assistant', content: `Erro: ${errMsg}` });
                addMessage('assistant', `❌ Erro: ${errMsg}`);
            } else {
                const reply = data.reply || 'Sem resposta.';
                messages.push({ role: 'assistant', content: reply });
                addMessage('assistant', reply);
            }
        } catch (error) {
            hideTyping();
            const errText = error instanceof Error ? error.message : 'Erro de rede.';
            messages.push({ role: 'assistant', content: `Erro: ${errText}` });
            addMessage('assistant', `❌ Erro de conexão: ${errText}`);
        } finally {
            isLoading = false;
            chatSend.disabled = false;
            chatInput.disabled = false;
            chatInput.focus();
        }
    };

    // ── Events ──
    fab.addEventListener('click', () => {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.add('open');
            chatInput.focus();
        });
    });

    const closeChat = () => {
        modal.classList.remove('open');
        setTimeout(() => modal.classList.add('hidden'), 300);
    };

    chatClose.addEventListener('click', closeChat);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeChat();
    });

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value;
        chatInput.value = '';
        sendMessage(text);
    });

    // Suggestions
    chatMessages.addEventListener('click', (e) => {
        const btn = e.target.closest('.gemini-suggestion-btn');
        if (!btn) return;
        const suggestion = btn.dataset.suggestion;
        if (suggestion) {
            chatInput.value = suggestion;
            sendMessage(suggestion);
            chatInput.value = '';
        }
    });

    // ESC to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeChat();
        }
    });
})();
