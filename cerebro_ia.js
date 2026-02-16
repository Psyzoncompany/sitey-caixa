// c:\Users\AAAA\Desktop\sitey-caixa\cerebro_ia.js

const initAI = () => {
    // Configuração da API via endpoint seguro no servidor
    const GEMINI_PROXY_ENDPOINT = (window.location.protocol === "http:" || window.location.protocol === "https:")
        ? `${window.location.origin}/api/gemini`
        : null;

    console.log("🤖 Cerebro IA Iniciado");

    const getPageContext = () => {
        const title = document.title || 'Sem título';
        const heading = document.querySelector('h1')?.textContent?.trim() || '';
        const visibleText = (document.body?.innerText || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 4000);
        return `Página atual: ${window.location.pathname}\nTítulo: ${title}\nCabeçalho: ${heading}\nConteúdo visível (resumo): ${visibleText}`;
    };

    const ensureGeminiEndpoint = () => {
        if (GEMINI_PROXY_ENDPOINT) return;
        throw new Error('Ambiente inválido para IA. Abra o site por URL HTTP/HTTPS (ex: Vercel), não por arquivo local.');
    };

    let chatHistory = [];
    let isAiProcessing = false;

    // Definição das Ferramentas (Function Calling)
    const aiTools = [
        {
            name: "createOrder",
            description: "Cria pedido e cliente. Suporta grade de tamanhos detalhada.",
            parameters: {
                type: "OBJECT",
                properties: {
                    description: { type: "STRING", description: "Descrição curta do pedido" },
                    clientName: { type: "STRING", description: "Nome do cliente" },
                    deadline: { type: "STRING", description: "Data YYYY-MM-DD" },
                    totalValue: { type: "NUMBER" },
                    notes: { type: "STRING" },
                    printType: { type: "STRING" },
                    sizes: {
                        type: "ARRAY",
                        description: "Lista de cortes/tamanhos",
                        items: {
                            type: "OBJECT",
                            properties: {
                                size: { type: "STRING" },
                                qty: { type: "NUMBER" },
                                gender: { type: "STRING", description: "Masculina, Feminina, Infantil" },
                                variation: { type: "STRING", description: "Normal, Babylook, Oversized" },
                                notes: { type: "STRING", description: "Obs do item (ex: gola polo)" }
                            }
                        }
                    }
                },
                required: ["description", "clientName"]
            }
        },
        {
            name: "updateOrder",
            description: "Atualiza um pedido existente.",
            parameters: {
                type: "OBJECT",
                properties: {
                    orderId: { type: "NUMBER" },
                    updates: { type: "OBJECT" }
                },
                required: ["orderId", "updates"]
            }
        },
        {
            name: "calculateDeadline",
            description: "Calcula data de entrega. Se 'days' não for informado, usa a média histórica do HipocampoIA.",
            parameters: {
                type: "OBJECT",
                properties: {
                    days: { type: "NUMBER", description: "Opcional. Se omitido, usa histórico." },
                    isBusinessDays: { type: "BOOLEAN", description: "Se true, considera feriados (padrão)." },
                    startDate: { type: "STRING", description: "Data inicial YYYY-MM-DD" }
                },
                required: []
            }
        }
    ];

    const systemInstruction = `
    VOCÊ É O SISTEMA OPERACIONAL DA CONFECÇÃO (PSYZON).
    
    ✅ REGRAS DE GRADE (CORTES):
    - Ao receber "P 6, M 10", crie itens na lista 'sizes'.
    - Se o usuário especificar "Babylook", defina 'variation' como "Babylook". Caso contrário, "Normal".
    - Se especificar "Gola Polo", coloque em 'notes'.
    - Gênero padrão: "Masculina" (se não especificado).

    ✅ REGRAS DE PRAZO:
    - Se o usuário pedir uma previsão ("quando fica pronto?"), chame calculateDeadline SEM 'days' para usar a IA histórica.
    - Se o usuário der dias ("daqui 10 dias úteis"), chame calculateDeadline COM 'days'.

    ✅ REGRAS GERAIS:
    - Aja, não converse muito.
    - Use as ferramentas disponíveis para manipular o sistema.
    `;

    // --- UI DO CHAT ---
    const createChatInterface = () => {
        if (document.getElementById('ai-chat-widget')) return;

        const chatHTML = `
            <button id="ai-toggle-btn" title="Assistente PSYZON">✨</button>
            <div id="ai-chat-widget" class="hidden">
                <div id="ai-chat-header">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">🤖</span>
                        <h3 class="font-bold text-white">Assistente PSYZON</h3>
                    </div>
                    <button id="ai-close-btn" class="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div id="ai-chat-messages">
                    <div class="chat-msg ai">Olá! Posso ajudar a lançar pedidos com grade completa. Ex: "Novo pedido João, 30 camisas: 10P, 10M, 10G".</div>
                </div>
                <div id="ai-chat-input-area">
                    <input type="text" id="ai-input" class="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500" placeholder="Digite seu comando...">
                    <button id="ai-send-btn" class="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-3 py-2">➤</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chatHTML);

        const widget = document.getElementById('ai-chat-widget');
        const toggleBtn = document.getElementById('ai-toggle-btn');
        const closeBtn = document.getElementById('ai-close-btn');
        const sendBtn = document.getElementById('ai-send-btn');
        const input = document.getElementById('ai-input');
        const msgsArea = document.getElementById('ai-chat-messages');

        const toggleChat = () => {
            widget.classList.toggle('hidden');
            if (!widget.classList.contains('hidden')) input.focus();
        };

        toggleBtn.onclick = toggleChat;
        closeBtn.onclick = toggleChat;

        const addMessage = (text, sender, isHtml = false) => {
            const div = document.createElement('div');
            div.className = `chat-msg ${sender}`;
            if (isHtml) div.innerHTML = text;
            else div.textContent = text;
            msgsArea.appendChild(div);
            msgsArea.scrollTop = msgsArea.scrollHeight;
            return div;
        };

        const addActionCard = (title, data, onConfirm) => {
            const div = document.createElement('div');
            div.className = 'chat-action-card';
            div.innerHTML = `
                <h4>⚡ ${title}</h4>
                <div class="flex gap-2 justify-end mt-2">
                    <button class="cancel-action-btn text-xs px-2 py-1 rounded border border-red-500/50 text-red-400 hover:bg-red-500/10">Cancelar</button>
                    <button class="confirm-action-btn text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-500 font-bold">Confirmar</button>
                </div>
            `;
            div.querySelector('.confirm-action-btn').onclick = () => { div.remove(); onConfirm(); };
            div.querySelector('.cancel-action-btn').onclick = () => { div.remove(); };
            msgsArea.appendChild(div);
            msgsArea.scrollTop = msgsArea.scrollHeight;
        };

        // --- EXPOSIÇÃO PARA AUTOMAÇÕES ---
        window.PsyzonAI = window.PsyzonAI || {};
        window.PsyzonAI.addMessage = addMessage;
        window.PsyzonAI.addActionCard = addActionCard;
        window.PsyzonAI.toggleChat = toggleChat;

        const handleSend = async () => {
            const text = input.value.trim();
            if (!text || isAiProcessing) return;
            
            input.value = '';
            addMessage(text, 'user');
            isAiProcessing = true;
            
            const loadingDiv = addMessage("Processando...", 'ai');

            try {
                const response = await callGemini(text);
                loadingDiv.remove();

                if (response.text) addMessage(response.text, 'ai');

                if (response.toolCalls) {
                    for (const tool of response.toolCalls) {
                        const result = await executeLocalAction(tool.name, tool.args);
                        const followUp = await callGemini(null, {
                            functionResponse: {
                                name: tool.name,
                                response: { result: result }
                            }
                        });
                        if (followUp.text) addMessage(followUp.text, 'ai');
                    }
                }

            } catch (err) {
                loadingDiv.remove();
                addMessage(`Erro: ${err.message}`, 'ai');
            } finally {
                isAiProcessing = false;
            }
        };

        sendBtn.onclick = handleSend;
        input.onkeydown = (e) => { if (e.key === 'Enter') handleSend(); };
    };

    const callGemini = async (userText, context = null) => {
        let contents = chatHistory.map(msg => ({ role: msg.role, parts: msg.parts }));

        if (userText) {
            const userMsg = { role: "user", parts: [{ text: userText }] };
            contents.push(userMsg);
            chatHistory.push(userMsg);
        }

        if (context && context.functionResponse) {
            const fnMsg = {
                role: "function",
                parts: [{
                    functionResponse: {
                        name: context.functionResponse.name,
                        response: { name: context.functionResponse.name, content: context.functionResponse.response }
                    }
                }]
            };
            contents.push(fnMsg);
            chatHistory.push(fnMsg);
        }

        const pageContext = getPageContext();

        const payload = {
            contents: contents,
            tools: [{ functionDeclarations: aiTools }],
            systemInstruction: { parts: [{ text: `${systemInstruction}\n\n${pageContext}` }] }
        };

        const models = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-pro'];
        let successData = null;
        let lastError = null;

        ensureGeminiEndpoint();

        for (const model of models) {
            try {
                const res = await fetch(GEMINI_PROXY_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, payload })
                });
                const data = await res.json();
                if (res.ok && Array.isArray(data?.candidates) && data.candidates.length > 0) {
                    successData = data;
                    break;
                }

                const errorMsg = data?.error?.message || data?.error || `Falha no modelo ${model} (${res.status})`;
                lastError = new Error(errorMsg);
            } catch (e) {
                lastError = e;
            }
        }

        if (!successData) {
            throw lastError || new Error('Falha na conexão com a IA. Verifique a configuração da GEMINI_API_KEY no servidor.');
        }

        const content = successData.candidates[0].content;
        chatHistory.push({ role: "model", parts: content.parts });

        let textResponse = "";
        let toolCalls = [];

        (content.parts || []).forEach(part => {
            if (part.text) textResponse += part.text;
            if (part.functionCall) toolCalls.push({ name: part.functionCall.name, args: part.functionCall.args });
        });

        return { text: textResponse, toolCalls: toolCalls };
    };

    // --- EXECUTOR DE AÇÕES (Conecta com window.PsyzonApp) ---
    const executeLocalAction = async (name, args) => {
        if (!window.PsyzonApp) return { error: "App não inicializado" };
        const App = window.PsyzonApp;

        console.log(`🤖 Ação IA: `, args);

        if (name === 'createOrder') {
            // 1. Cliente
            let client = App.clients.find(c => c.name.toLowerCase().includes(args.clientName.toLowerCase()));
            let clientId = client ? client.id : Date.now();
            if (!client) {
                App.clients.push({ id: clientId, name: args.clientName, gender: 'not_informed' });
                localStorage.setItem('clients', JSON.stringify(App.clients));
            }

            // 2. Subtarefas de Corte (Grade)
            let subtasks = [];
            if (args.sizes && Array.isArray(args.sizes)) {
                subtasks = args.sizes.map(s => ({
                    id: Date.now() + Math.random(),
                    gender: s.gender || 'Masculina',
                    variation: s.variation || 'Normal',
                    size: s.size,
                    total: s.qty,
                    notes: s.notes || '',
                    cut: 0
                }));
            }

            const newOrder = {
                id: Date.now(),
                status: 'todo',
                description: args.description,
                clientId: clientId,
                deadline: args.deadline || new Date().toISOString().split('T')[0],
                totalValue: args.totalValue || 0,
                amountPaid: 0,
                isPaid: false,
                notes: args.notes || '',
                printType: args.printType || 'dtf',
                checklist: {
                    art: { completed: false },
                    cutting: { completed: false, subtasks: subtasks },
                    printing: { completed: false },
                    sewing: { completed: false },
                    finishing: { completed: false }
                },
                colors: []
            };

            App.productionOrders.push(newOrder);
            App.saveOrders();
            App.renderKanban();
            return { success: true, orderId: newOrder.id, msg: "Pedido criado com grade de corte." };
        }

        if (name === 'calculateDeadline') {
            const start = args.startDate ? new Date(args.startDate + "T00:00:00") : new Date();
            
            // Integração com HipocampoIA (Histórico Real)
            if (window.HipocampoIA) {
                // 1. Previsão Inteligente (Sem dias definidos)
                if (args.days === undefined || args.days === null) {
                    const prediction = window.HipocampoIA.predictDeadline(start);
                    return {
                        estimatedDate: prediction.estimatedDate,
                        safeDate: prediction.safeDate,
                        avgDays: prediction.avgDays,
                        confidence: prediction.confidence,
                        source: "Hipocampo IA (Histórico Real)"
                    };
                }
                
                // 2. Cálculo Exato (Com dias definidos, usando calendário do Hipocampo)
                const finalDate = window.HipocampoIA.calculateDate(start, args.days, args.isBusinessDays !== false);
                return { finalDate, startDate: start.toISOString().split('T')[0], daysCounted: args.days, type: args.isBusinessDays !== false ? "dias úteis" : "dias corridos" };
            }
            
            return { error: "HipocampoIA não está disponível." };
        }

        return { success: false, message: "Ferramenta desconhecida." };
    };

    // --- AUTOMAÇÕES (GATILHOS DO SISTEMA) ---
    window.PsyzonAI = window.PsyzonAI || {};
    window.PsyzonAI.triggerArtApprovalAutomation = (orderId) => {
        const App = window.PsyzonApp;
        if (!App) return;
        const order = App.productionOrders.find(o => o.id === orderId);
        if (!order) return;

        // 1. Garante que o chat esteja visível
        if (window.PsyzonAI.toggleChat) {
            const widget = document.getElementById('ai-chat-widget');
            if (widget && widget.classList.contains('hidden')) window.PsyzonAI.toggleChat();
        }

        // 2. Mensagem de Parabéns
        if (window.PsyzonAI.addMessage) {
            window.PsyzonAI.addMessage(`🎨 <b>Arte Aprovada!</b><br>A arte do pedido <b>${order.description}</b> foi aprovada. Parabéns! 🚀`, 'ai', true);
        }

        // 3. Sugestão de Mover para Produção (se ainda estiver em 'todo')
        if (order.status === 'todo' && window.PsyzonAI.addActionCard) {
            window.PsyzonAI.addActionCard(
                'Mover para Produção',
                { orderId: order.id, action: 'move_to_doing' },
                async () => {
                    await executeLocalAction('updateOrder', { orderId: order.id, updates: { status: 'doing' } });
                    if (window.PsyzonAI.addMessage) {
                        window.PsyzonAI.addMessage(`✅ Pedido movido para <b>Em Produção</b>.`, 'ai', true);
                    }
                }
            );
        }
    };

    createChatInterface();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAI);
} else {
    initAI();
}
