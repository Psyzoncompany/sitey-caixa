(() => {
  const canUseHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  const API_ENDPOINT = canUseHttp ? `${window.location.origin}/api/gemini` : null;
  const blockedPaths = new Set(['/login.html', '/Arte-Online.html', '/arteonline.html']);
  const modelFallbacks = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-pro'];

  let busy = false;
  const history = [];

  const injectStyles = () => {
    if (document.getElementById('nova-ia-style')) return;
    const style = document.createElement('style');
    style.id = 'nova-ia-style';
    style.textContent = `
      .nova-ai-fab { position: fixed; right: 18px; bottom: calc(env(safe-area-inset-bottom, 0px) + 22px); z-index: 9999; border: 1px solid rgba(148,163,184,.28); width: 58px; height: 58px; border-radius: 9999px; cursor: pointer; display: grid; place-items: center; color: #e6f7ff; background: linear-gradient(145deg, rgba(14,165,233,.82) 0%, rgba(59,130,246,.78) 50%, rgba(124,58,237,.72) 100%); box-shadow: 0 8px 24px rgba(30,64,175,.32), inset 0 1px 8px rgba(255,255,255,.20); backdrop-filter: blur(8px); transition: transform .2s ease, box-shadow .2s ease, filter .2s ease; }
      .nova-ai-fab:hover { transform: translateY(-1px) scale(1.02); box-shadow: 0 12px 30px rgba(30,64,175,.38), inset 0 1px 10px rgba(255,255,255,.24); filter: saturate(1.05); }
      .nova-ai-fab svg { width: 28px; height: 28px; }
      .nova-ai-panel { position: fixed; right: 18px; bottom: calc(env(safe-area-inset-bottom, 0px) + 94px); width: min(360px, calc(100vw - 24px)); height: 480px; background: rgba(7,12,24,.92); border: 1px solid rgba(148,163,184,.3); border-radius: 18px; backdrop-filter: blur(10px); color: #e2e8f0; z-index: 9999; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 52px rgba(2,6,23,.55); }
      @media (max-width: 768px) {
        .nova-ai-fab { bottom: calc(env(safe-area-inset-bottom, 0px) + 88px); }
        .nova-ai-panel { right: 12px; left: 12px; width: auto; bottom: calc(env(safe-area-inset-bottom, 0px) + 156px); height: min(68vh, 500px); }
      }
      .nova-ai-hidden { display:none; }
      .nova-ai-head { display:flex; justify-content:space-between; align-items:center; padding: 12px 14px; background: linear-gradient(90deg,rgba(14,165,233,.22),rgba(124,58,237,.2)); border-bottom: 1px solid rgba(148,163,184,.22); font-weight: 700; }
      .nova-ai-head button { border:none; background:transparent; color:#cbd5e1; cursor:pointer; font-size: 22px; }
      .nova-ai-messages { flex:1; overflow:auto; padding: 12px; display:flex; flex-direction:column; gap:8px; }
      .nova-ai-msg { max-width: 92%; padding: 8px 11px; border-radius: 12px; font-size: 13px; line-height: 1.38; }
      .nova-ai-msg.user { background: rgba(14,165,233,.2); margin-left:auto; border: 1px solid rgba(14,165,233,.35); }
      .nova-ai-msg.ai { background: rgba(100,116,139,.22); border: 1px solid rgba(148,163,184,.3); }
      .nova-ai-input { display:flex; gap:8px; padding: 10px; border-top: 1px solid rgba(148,163,184,.22); }
      .nova-ai-input input { flex:1; border-radius: 10px; border:1px solid rgba(148,163,184,.35); background: rgba(15,23,42,.7); color:#f8fafc; padding: 9px 10px; }
      .nova-ai-input button { border:none; border-radius: 10px; background: linear-gradient(135deg,#06b6d4,#3b82f6); color:white; font-weight:700; padding: 0 12px; }
    `;
    document.head.appendChild(style);
  };

  const addMessage = (container, text, role) => {
    const div = document.createElement('div');
    div.className = `nova-ai-msg ${role}`;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  };

  const getAnswerFromGemini = (data) => {
    return data?.candidates?.[0]?.content?.parts
      ?.map((p) => (typeof p?.text === 'string' ? p.text : ''))
      .join(' ')
      .trim();
  };

  const parseResponseSafe = async (res) => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }

    const raw = await res.text();
    return {
      error: `Resposta inválida do endpoint /api/gemini (${res.status}).`,
      details: raw?.slice?.(0, 300) || 'Sem conteúdo retornado.'
    };
  };

  const askModel = async (text) => {
    if (!API_ENDPOINT) throw new Error('A IA exige acesso por URL HTTP/HTTPS.');

    history.push({ role: 'user', parts: [{ text }] });

    const prompt = `Você é um assistente curto e objetivo para gestão de confecção. Responda em português BR.\n\nContexto da página: ${window.location.pathname}\nPergunta: ${text}`;
    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 350 }
    };

    let lastErr = 'Não foi possível responder agora.';

    for (const model of modelFallbacks) {
      try {
        const res = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, payload })
        });

        const data = await parseResponseSafe(res);
        const answer = getAnswerFromGemini(data);

        if (res.ok && answer) {
          history.push({ role: 'model', parts: [{ text: answer }] });
          return answer;
        }

        const serverError = data?.error?.message || data?.error || data?.details;
        lastErr = typeof serverError === 'string' ? serverError : `Falha no modelo ${model}.`;
      } catch (error) {
        lastErr = error?.message || `Erro ao consultar o modelo ${model}.`;
      }
    }

    throw new Error(lastErr.includes('GEMINI_API_KEY')
      ? 'A chave GEMINI_API_KEY não está ativa no servidor. Configure no ambiente da Vercel.'
      : lastErr);
  };

  const init = () => {
    if (blockedPaths.has(window.location.pathname)) return;
    if (document.getElementById('nova-ai-fab')) return;
    injectStyles();

    const fab = document.createElement('button');
    fab.id = 'nova-ai-fab';
    fab.className = 'nova-ai-fab';
    fab.title = 'Abrir assistente';
    fab.setAttribute('aria-label', 'Abrir assistente de IA');
    fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l2.2 4.55 5.02.73-3.63 3.53.86 4.99L12 14.9l-4.45 2.9.85-4.99L4.8 8.28l5.01-.73L12 3z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/></svg>`;

    const panel = document.createElement('section');
    panel.id = 'nova-ai-panel';
    panel.className = 'nova-ai-panel nova-ai-hidden';
    panel.innerHTML = `
      <div class="nova-ai-head">Assistente IA <button type="button" id="nova-ai-close">×</button></div>
      <div class="nova-ai-messages" id="nova-ai-messages"></div>
      <div class="nova-ai-input">
        <input id="nova-ai-input" type="text" placeholder="Digite sua pergunta..." />
        <button type="button" id="nova-ai-send">Enviar</button>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    const messages = panel.querySelector('#nova-ai-messages');
    const input = panel.querySelector('#nova-ai-input');

    addMessage(messages, 'Assistente pronto. Se houver erro, vou mostrar exatamente o motivo da conexão com /api/gemini.', 'ai');

    fab.addEventListener('click', () => {
      panel.classList.toggle('nova-ai-hidden');
      if (!panel.classList.contains('nova-ai-hidden')) input.focus();
    });
    panel.querySelector('#nova-ai-close').addEventListener('click', () => panel.classList.add('nova-ai-hidden'));

    const send = async () => {
      const text = input.value.trim();
      if (!text || busy) return;
      input.value = '';
      addMessage(messages, text, 'user');
      busy = true;
      const loading = addMessage(messages, 'Pensando...', 'ai');
      try {
        const answer = await askModel(text);
        loading.textContent = answer;
      } catch (err) {
        loading.textContent = `Erro: ${err.message}`;
      } finally {
        busy = false;
      }
    };

    panel.querySelector('#nova-ai-send').addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
