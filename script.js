const init = () => {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    // Chart instances must be in a scope that persists across calls to updateUI/updateCharts
    let incomeExpenseChart, categoryChart, incomeSourceChart, fabricChart;

    // Menu Mobile Listener (Movido para o topo para garantir que funcione mesmo se houver erros abaixo)
    if (mobileMenuButton) { mobileMenuButton.addEventListener('click', () => mobileMenu.classList.toggle('open')); }

    const balanceEl = document.getElementById('balance');
    const incomeEl = document.getElementById('total-income');
    const expenseEl = document.getElementById('total-expense');
    const profitEl = document.getElementById('profit');
    const totalReceivablesEl = document.getElementById('total-receivables');
    if (totalReceivablesEl) {
        totalReceivablesEl.addEventListener('click', () => {
            window.location.href = 'processos.html?filter=receivables';
        });
    }
    if (totalReceivablesEl) {
        totalReceivablesEl.addEventListener('click', () => {
            window.location.href = 'processos.html?filter=receivables';
        });
    }

    const costPerPieceDashboardEl = document.getElementById('cost-per-piece-dashboard');
    const transactionListEl = document.getElementById('transaction-list');
    const deadlinesListEl = document.getElementById('deadlines-list');
    const businessSpentEl = document.getElementById('business-spent');
    const businessLimitTextEl = document.getElementById('business-limit-text');
    const businessProgressEl = document.getElementById('business-progress');
    const personalSpentEl = document.getElementById('personal-spent');
    const personalLimitTextEl = document.getElementById('personal-limit-text');
    const personalProgressEl = document.getElementById('personal-progress');
    const breakEvenRevenueEl = document.getElementById('break-even-revenue');
    const dashboardBillsSummaryEl = document.getElementById('dashboard-bills-summary');
    const breakEvenTargetEl = document.getElementById('break-even-target');
    const breakEvenRevenueBar = document.getElementById('break-even-revenue-bar');
    const breakEvenCostsBar = document.getElementById('break-even-costs-bar');
    const modal = document.getElementById('modal');
    if (!modal) return;
    const form = document.getElementById('form');
    const nameInput = document.getElementById('name');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const dateInput = document.getElementById('date');
    const typeInput = document.getElementById('type');
    const categoryInput = document.getElementById('category');
    const quantityContainer = document.getElementById('quantity-field-container');
    const quantityInput = document.getElementById('transaction-quantity');
    const scopeContainer = document.getElementById('scope-container');
    const scopeButtons = document.querySelectorAll('.scope-btn');
    const modalTitle = modal.querySelector('h2');
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const submitBtn = form.querySelector('button[type="submit"]');
    const linkClientCheckbox = document.getElementById('link-client-checkbox');
    const clientSelectionContainer = document.getElementById('client-selection-container');
    const clientSearchInput = document.getElementById('client-search');
    const clientSelect = document.getElementById('client-select');
    const notificationContainer = document.getElementById('notification-container');
    const isFabricContainer = document.getElementById('is-fabric-container');
    const isFabricCheckbox = document.getElementById('is-fabric-checkbox');
    const fabricDetailsContainer = document.getElementById('fabric-details-container');
    const fabricColorInput = document.getElementById('fabric-color');
    const fabricWeightInput = document.getElementById('fabric-weight');
    
    const createBillReminderContainer = document.getElementById('create-bill-reminder-container');
    const createBillReminderCheckbox = document.getElementById('create-bill-reminder-checkbox');
    // Wizard Elements
    const prevStepBtn = document.getElementById('prev-step-btn');
    const nextStepBtn = document.getElementById('next-step-btn');

    let incomeCategories = JSON.parse(localStorage.getItem('incomeCategories')) || ['Venda de Produto', 'Adiantamento', 'Serviços', 'Outros'];
    let expenseCategories = JSON.parse(localStorage.getItem('expenseCategories')) || ['Matéria-Prima (Custo Direto)', 'Aluguel', 'Contas (Água, Luz, Internet)', 'Marketing e Vendas', 'Salários e Pró-labore', 'Impostos', 'Software e Ferramentas', 'Manutenção', 'Despesas Pessoais', 'Outros'];
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let clients = JSON.parse(localStorage.getItem('clients')) || [];
    let productionOrders = JSON.parse(localStorage.getItem('production_orders')) || [];
    let editingId = null; 
    let selectedScope = 'business';
    let currentStep = 1;

    let transactionFilters = {
        period: 'this_month', // 'today', 'yesterday', '7days', '30days', 'this_month', 'last_month'
        type: 'all' // 'all', 'income', 'expense'
    };

    const saveTransactions = () => localStorage.setItem('transactions', JSON.stringify(transactions));
    const formatCurrency = (amount) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (dateString) => new Date(dateString + 'T03:00:00').toLocaleDateString('pt-BR');

    const normalizeText = (value) => (value || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    const normalizeKey = (value) => normalizeText(value).toLowerCase();
    const blockedNameTerms = ['padaria', 'posto', 'mercado', 'assinatura', 'meta', 'adobe', 'provedor', 'estoque', 'marmita', 'malha', 'papelaria', 'estamparia', 'aluguel', 'internet', 'agua', 'banco', 'icloud', 'xbox', 'youtube', 'dtf', 'frete'];
    const isPersonName = (value) => {
        const raw = (value || '').toString().trim();
        if (!raw) return false;
        if (raw === 'Rodrigo (Dono)') return true;
        const cleaned = raw.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
        if (!cleaned) return false;
        const normalized = normalizeKey(cleaned);
        if (blockedNameTerms.some(term => normalized.includes(term))) return false;
        const words = cleaned.split(' ');
        if (words.length < 1 || words.length > 3) return false;
        return words.every((word) => /^[A-Za-zÀ-ÿ]+$/.test(word) && word[0] === word[0].toUpperCase());
    };
    const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;
    const buildLaunchId = (tx) => {
        const clientName = tx.clientName || tx.client || tx.clientLabel || '';
        const qty = tx.qty ?? tx.quantity ?? '';
        return [
            tx.date || '',
            tx.type || '',
            Number(tx.amount || tx.totalPrice || 0).toFixed(2),
            normalizeKey(tx.category || ''),
            normalizeKey(tx.description || tx.name || ''),
            normalizeKey(clientName),
            qty
        ].join('|');
    };
    const findClientNameById = (clientId) => {
        if (!clientId) return '';
        const client = clients.find(c => c.id === clientId);
        return client ? client.name : '';
    };
    const ensureClientByPersonName = (personName) => {
        const safeName = (personName || '').trim();
        if (!isPersonName(safeName)) return null;
        const existingClient = clients.find(c => normalizeKey(c.name) === normalizeKey(safeName));
        if (existingClient) return existingClient.id;
        const newClient = { id: Date.now() + Math.floor(Math.random() * 100000), name: safeName, gender: 'not_informed', phone: '', email: '' };
        clients.push(newClient);
        return newClient.id;
    };
    const rebuildMonthlyProduction = () => {
        const monthlyMap = {};
        transactions.forEach((tx) => {
            const isProductSale = tx.type === 'income' && (tx.kind === 'product_sale' || tx.category === 'Venda de Produto');
            if (!isProductSale) return;
            const qty = Number(tx.qty ?? tx.quantity ?? 1);
            if (!tx.date || qty <= 0) return;
            const month = tx.date.substring(0, 7);
            monthlyMap[month] = (monthlyMap[month] || 0) + qty;
        });
        const monthlyProduction = Object.entries(monthlyMap).map(([month, quantity]) => ({ month, quantity }));
        localStorage.setItem('monthlyProduction', JSON.stringify(monthlyProduction));
    };
    const dedupeTransactionsByLaunchId = () => {
        const enriched = transactions.map((tx, index) => {
            const clientName = findClientNameById(tx.clientId);
            const launchId = tx.launchId || buildLaunchId({ ...tx, clientName });
            return { ...tx, launchId, _index: index };
        });
        const byId = new Map();
        enriched.forEach((tx) => {
            const existing = byId.get(tx.launchId);
            if (!existing) {
                byId.set(tx.launchId, tx);
                return;
            }
            const existingCreated = new Date(existing.createdAt || 0).getTime() || Number(existing.id) || existing._index;
            const candidateCreated = new Date(tx.createdAt || 0).getTime() || Number(tx.id) || tx._index;
            if (candidateCreated < existingCreated) byId.set(tx.launchId, tx);
        });
        const deduped = Array.from(byId.values()).map(({ _index, ...tx }) => tx);
        const changed = deduped.length !== transactions.length || deduped.some((tx, idx) => tx.launchId !== transactions[idx]?.launchId);
        transactions = deduped;
        return changed;
    };
    const parseProductSaleMeta = (description, amount) => {
        const desc = (description || '').trim();
        const qtyMatch = desc.match(/(\d+)\s*camisas?/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
        const productName = /manga\s+longa/i.test(desc) ? 'Camisa Manga Longa' : 'Camisa';
        const totalPrice = round2(Math.abs(amount));
        const unitPrice = qty > 0 ? round2(totalPrice / qty) : totalPrice;
        return { qty, productName, totalPrice, unitPrice };
    };

    const runFinancialLaunchImport = () => {
        const IMPORT_KEY = 'syt_financial_import_2026_02_rodrigo_v2';
        const LEGACY_KEY = 'syt_financial_import_2026_02_rodrigo_v1';

        const year = new Date().getFullYear();
        const toDate = (day, month = 2) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const launches = [
            { date: toDate(1), type: 'income', amount: 140.64, category: 'Saldo Inicial', description: 'Saldo Inicial', clientName: 'Rodrigo (Dono)' },
            { date: toDate(1), type: 'expense', amount: -56.28, category: 'Pessoal', description: 'Gasolina' },
            { date: toDate(1), type: 'expense', amount: -22.00, category: 'Pessoal', description: 'Lanche' },
            { date: toDate(2), type: 'income', amount: 1482.50, category: 'Venda', description: 'Arthur (Terceiro B)', clientName: 'Arthur' },
            { date: toDate(2), type: 'income', amount: 65.00, category: 'Venda', description: 'Matheus (Presencial)', clientName: 'Matheus' },
            { date: toDate(2), type: 'expense', amount: -26.90, category: 'Pessoal', description: 'Assinatura YouTube' },
            { date: toDate(2), type: 'expense', amount: -60.83, category: 'Pessoal', description: 'Compra Jogo Hytale' },
            { date: toDate(2), type: 'expense', amount: -20.00, category: 'Empresarial', description: 'Marmita', clientName: 'Lauro' },
            { date: toDate(2), type: 'expense', amount: -650.00, category: 'Empresarial', description: 'Aluguel', clientName: 'Erisvaldo' },
            { date: toDate(2), type: 'expense', amount: -269.39, category: 'Empresarial', description: 'Malhas PV Preto 5,7kg', clientName: 'Malhas Atual Rica' },
            { date: toDate(2), type: 'expense', amount: -100.00, category: 'Empresarial', description: 'Gola e Punho', clientName: 'Malhas Atual' },
            { date: toDate(2), type: 'expense', amount: -30.00, category: 'Pessoal', description: 'Lanche' },
            { date: toDate(3), type: 'expense', amount: -334.52, category: 'Empresarial', description: 'Malhas 10,5kg', clientName: 'Malhas Costa Rica' },
            { date: toDate(3), type: 'expense', amount: -22.00, category: 'Pessoal', description: 'Açaí/Lanche' },
            { date: toDate(3), type: 'expense', amount: -70.00, category: 'Empresarial', description: 'Frete Malhas', clientName: 'Marcelo Taxista' },
            { date: toDate(3), type: 'expense', amount: -30.00, category: 'Pessoal', description: 'Chá Helen Prima' },
            { date: toDate(3), type: 'expense', amount: -10.00, category: 'Pessoal', description: 'Acarajé' },
            { date: toDate(3), type: 'expense', amount: -10.00, category: 'Pessoal', description: 'Padaria Mauricelio' },
            { date: toDate(3), type: 'expense', amount: -51.00, category: 'Pessoal', description: 'Cartão Inter' },
            { date: toDate(3), type: 'expense', amount: -7.00, category: 'Pessoal', description: 'Padaria Glecia Ramos' },
            { date: toDate(3), type: 'income', amount: 240.00, category: 'Lucro', description: 'Pagamento Dívida', clientName: 'Leandra' },
            { date: toDate(5), type: 'income', amount: 80.00, category: 'Venda', description: 'Adriana Vizinha', clientName: 'Adriana' },
            { date: toDate(5), type: 'expense', amount: -174.00, category: 'Dívida', description: 'Palmeira 1/4', clientName: 'Palmeira' },
            { date: toDate(5), type: 'expense', amount: -30.00, category: 'Investimento', description: 'Zanones Malhas', clientName: 'Zanones' },
            { date: toDate(6), type: 'expense', amount: -15.20, category: 'Pessoal', description: 'Adelaide' },
            { date: toDate(7), type: 'expense', amount: -30.00, category: 'Pessoal', description: 'Películas' },
            { date: toDate(7), type: 'income', amount: 225.20, category: 'Lucro', description: 'Pagamento Dívida', clientName: 'Ricardo' },
            { date: toDate(7), type: 'expense', amount: -13.75, category: 'Pessoal', description: 'Mercado' },
            { date: toDate(7), type: 'expense', amount: -12.80, category: 'Pessoal', description: 'Padaria/Lanchonete' },
            { date: toDate(8), type: 'expense', amount: -30.05, category: 'Pessoal', description: 'Gasolina Posto Potiragua' },
            { date: toDate(9), type: 'expense', amount: -12.00, category: 'Empresarial', description: 'Água Rás', clientName: 'Água Rás' },
            { date: toDate(10), type: 'expense', amount: -10.00, category: 'Pessoal', description: 'Padaria' },
            { date: toDate(11), type: 'expense', amount: -35.00, category: 'Pessoal', description: 'Lava Jato' },
            { date: toDate(11), type: 'expense', amount: -20.00, category: 'Pessoal', description: 'Xbox Ultimate' },
            { date: toDate(11), type: 'expense', amount: -65.00, category: 'Pessoal', description: 'Gasolina' },
            { date: toDate(12), type: 'income', amount: 80.00, category: 'Venda', description: 'Adriana Vizinha', clientName: 'Adriana' },
            { date: toDate(12), type: 'income', amount: 855.00, category: 'Venda', description: '40 Camisas Geovanna 9B', clientName: 'Geovanna' },
            { date: toDate(12), type: 'expense', amount: -51.74, category: 'Pessoal', description: 'Banco Inter' },
            { date: toDate(12), type: 'expense', amount: -10.00, category: 'Empresarial', description: 'Assinatura Meli+', clientName: 'Mercado Livre' },
            { date: toDate(12), type: 'expense', amount: -10.00, category: 'Empresarial', description: 'Assinatura Lightroom', clientName: 'Adobe' },
            { date: toDate(12), type: 'expense', amount: -6.90, category: 'Pessoal', description: 'iCloud' },
            { date: toDate(12), type: 'expense', amount: -9.90, category: 'Pessoal', description: 'iCloud' },
            { date: toDate(12), type: 'expense', amount: -155.90, category: 'Empresarial', description: 'Reposição de Tinta', clientName: 'Estoque' },
            { date: toDate(12), type: 'expense', amount: -29.59, category: 'Empresarial', description: 'Marketing Instagram Ads', clientName: 'Meta' },
            { date: toDate(12), type: 'expense', amount: -130.00, category: 'Empresarial', description: 'DTF 2m', clientName: 'Arthur' },
            { date: toDate(12), type: 'expense', amount: -60.00, category: 'Empresarial', description: 'DTF 1m', clientName: 'Geovanna' },
            { date: toDate(12), type: 'expense', amount: -25.00, category: 'Pessoal', description: 'Corte de Cabelo' },
            { date: toDate(14), type: 'expense', amount: -60.00, category: 'Empresarial', description: 'Frete', clientName: 'Marcelo Taxista' },
            { date: toDate(15), type: 'expense', amount: -18.00, category: 'Dívida', description: 'Costureira', clientName: 'Marcia' },
            { date: toDate(15), type: 'expense', amount: -4.30, category: 'Pessoal', description: 'Padaria' },
            { date: toDate(16), type: 'expense', amount: -10.00, category: 'Pessoal', description: 'Acarajé' },
            { date: toDate(17), type: 'expense', amount: -9.00, category: 'Pessoal', description: 'Padaria Mauricelio' },
            { date: toDate(17), type: 'expense', amount: -80.00, category: 'Empresarial', description: 'Internet', clientName: 'Provedor' },
            { date: toDate(17), type: 'expense', amount: -5.90, category: 'Pessoal', description: 'iCloud' },
            { date: toDate(17), type: 'expense', amount: -9.00, category: 'Pessoal', description: 'Padaria Djane' },
            { date: toDate(17), type: 'expense', amount: -9.00, category: 'Pessoal', description: 'Mercado' },
            { date: toDate(17), type: 'expense', amount: -70.00, category: 'Investimento', description: 'Camisas Lisas', clientName: 'Estoque' },
            { date: toDate(17), type: 'income', amount: 390.00, category: 'Lucro', description: 'Pagamento Dívida', clientName: 'Ricardo' },
            { date: toDate(17), type: 'income', amount: 40.00, category: 'Venda', description: 'Camisa Manga Longa', clientName: 'Vini' },
            { date: toDate(18), type: 'expense', amount: -5.00, category: 'Custo Indireto', description: 'Folhas A4', clientName: 'Papelaria' },
            { date: toDate(18), type: 'expense', amount: -10.00, category: 'Custo Indireto', description: 'Estampa A3', clientName: 'Estamparia' },
            { date: toDate(18), type: 'expense', amount: -30.00, category: 'Pessoal', description: 'Recarga Claro' }
        ];

        let txIdSeed = Date.now();
        let inserted = 0;

        launches.forEach((entry) => {
            const isPersonalExpense = entry.type === 'expense' && normalizeKey(entry.category) === 'pessoal';
            const personClientName = isPersonalExpense ? 'Rodrigo (Dono)' : (isPersonName(entry.clientName) ? entry.clientName.trim() : null);
            const clientId = personClientName ? ensureClientByPersonName(personClientName) : null;
            const isProductSale = entry.type === 'income' && normalizeKey(entry.category) === 'venda';
            const productMeta = isProductSale ? parseProductSaleMeta(entry.description, entry.amount) : null;

            const transactionData = {
                id: txIdSeed++,
                name: entry.description,
                description: entry.description,
                amount: entry.type === 'expense' ? -Math.abs(entry.amount) : Math.abs(entry.amount),
                date: entry.date,
                type: entry.type,
                category: isProductSale ? 'Venda de Produto' : entry.category,
                scope: entry.type === 'expense' ? (isPersonalExpense ? 'personal' : 'business') : null,
                clientId,
                kind: isProductSale ? 'product_sale' : 'launch',
                productName: productMeta ? productMeta.productName : null,
                qty: productMeta ? productMeta.qty : null,
                unitPrice: productMeta ? productMeta.unitPrice : null,
                totalPrice: productMeta ? productMeta.totalPrice : null,
                quantity: productMeta ? productMeta.qty : 0,
                weightKg: 0,
                fabricColor: null,
                importBatch: IMPORT_KEY,
                createdAt: new Date().toISOString()
            };
            transactionData.launchId = buildLaunchId({ ...transactionData, clientName: personClientName || '' });
            if (!transactions.some(tx => (tx.launchId || buildLaunchId({ ...tx, clientName: findClientNameById(tx.clientId) })) === transactionData.launchId)) {
                transactions.push(transactionData);
                inserted++;
            }
        });

        const deduped = dedupeTransactionsByLaunchId();
        const shouldPersist = inserted > 0 || deduped || localStorage.getItem(IMPORT_KEY) !== 'done' || localStorage.getItem(LEGACY_KEY) === 'done';
        if (shouldPersist) {
            localStorage.setItem('clients', JSON.stringify(clients));
            rebuildMonthlyProduction();
            saveTransactions();
        }

        localStorage.setItem(IMPORT_KEY, 'done');

        const importMonth = `${year}-02`;
        const importedMonthTransactions = transactions.filter(tx => (tx.date || '').startsWith(importMonth));
        const totalQtySold = importedMonthTransactions
            .filter(tx => tx.type === 'income' && (tx.kind === 'product_sale' || tx.category === 'Venda de Produto'))
            .reduce((sum, tx) => sum + Number(tx.qty ?? tx.quantity ?? 1), 0);
        const directKeywords = ['malha', 'gola', 'punho', 'costur', 'dtf', 'silk', 'camisas lisas', 'tinta'];
        const totalDirectCosts = importedMonthTransactions
            .filter(tx => tx.type === 'expense' && tx.scope !== 'personal')
            .filter(tx => directKeywords.some(keyword => normalizeKey(`${tx.category} ${tx.description}`).includes(keyword)))
            .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
        const costPerPiece = totalQtySold > 0 ? round2(totalDirectCosts / totalQtySold) : null;
        console.info('[import-check] total_qty_vendida:', totalQtySold);
        console.info('[import-check] total_custos_diretos:', round2(totalDirectCosts));
        console.info('[import-check] custo_por_peca_resultante:', costPerPiece === null ? '—' : costPerPiece);
    };


    const getProgressColorClass = (percentage) => {
        if (percentage <= 50) return 'bg-gradient-green';
        if (percentage <= 80) return 'bg-gradient-yellow';
        return 'bg-gradient-red';
    };

    const showNotification = (message, type = 'info') => {
        if (!notificationContainer) return;
        const colors = { info: 'bg-cyan-500', warning: 'bg-yellow-500', danger: 'bg-red-500 animate-pulse' };
        const notificationId = `notif-${Date.now()}`;
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `relative w-full p-4 rounded-lg shadow-lg text-white ${colors[type]} transform translate-x-full opacity-0 transition-all duration-500 ease-out`;
        notification.innerHTML = `<p class="font-bold text-sm">${message}</p><button onclick="document.getElementById('${notificationId}').remove()" class="absolute top-1 right-1 text-white/70 hover:text-white">&times;</button>`;
        notificationContainer.appendChild(notification);
        setTimeout(() => { notification.classList.remove('translate-x-full', 'opacity-0'); }, 100);
        setTimeout(() => { notification.remove(); }, 7000);
    };

    const checkDeadlinesAndNotify = () => {
        productionOrders = JSON.parse(localStorage.getItem('production_orders')) || [];
        clients = JSON.parse(localStorage.getItem('clients')) || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];
        
        productionOrders.forEach(order => {
            if (order.status !== 'done' && order.checklist) {
                for (const key in order.checklist) {
                    const task = order.checklist[key];
                    if (task.deadline === todayString && !task.completed) {
                        const client = clients.find(c => c.id === order.clientId);
                        const clientName = client ? client.name : 'Cliente';
                        const taskName = checklistItems[key] || 'Tarefa';
                        const message = `Lembrete: A etapa "${taskName}" do pedido de ${clientName} vence HOJE!`;
                        showNotification(message, 'warning');
                    }
                }
            }
        });
    };

    // --- Generic Carousel Logic (Manual Only) ---
    const setupCarousel = (trackId, dotsId) => {
        const carousel = document.getElementById(trackId);
        const carouselDots = document.getElementById(dotsId);

        if (!carousel || !carouselDots) return;

        const slides = Array.from(carousel.children);
        if (slides.length <= 1) return;

        let currentIndex = 0;
        let dragStartX = 0;
        let dragDeltaX = 0;
        let isDragging = false;

        const goToSlide = (index) => {
            currentIndex = (index + slides.length) % slides.length;
            carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
            const dots = carouselDots.querySelectorAll('button');
            dots.forEach((dot, i) => {
                dot.classList.toggle('bg-white', i === currentIndex);
                dot.classList.toggle('bg-white/30', i !== currentIndex);
            });
        };

        const onStart = (clientX) => {
            isDragging = true;
            dragStartX = clientX;
            dragDeltaX = 0;
        };

        const onMove = (clientX) => {
            if (!isDragging) return;
            dragDeltaX = clientX - dragStartX;
        };

        const onEnd = () => {
            if (!isDragging) return;
            const threshold = Math.max(36, carousel.clientWidth * 0.12);
            if (dragDeltaX > threshold) goToSlide(currentIndex - 1);
            else if (dragDeltaX < -threshold) goToSlide(currentIndex + 1);
            isDragging = false;
            dragDeltaX = 0;
        };

        carouselDots.innerHTML = '';
        slides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.className = 'w-2 h-2 rounded-full bg-white/30 transition-colors duration-300';
            if (index === 0) dot.classList.replace('bg-white/30', 'bg-white');
            dot.addEventListener('click', () => goToSlide(index));
            carouselDots.appendChild(dot);
        });

        carousel.addEventListener('mousedown', (e) => onStart(e.clientX));
        window.addEventListener('mousemove', (e) => onMove(e.clientX));
        window.addEventListener('mouseup', onEnd);
        carousel.addEventListener('mouseleave', onEnd);

        carousel.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true });
        carousel.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
        carousel.addEventListener('touchend', onEnd);

        goToSlide(0);
    };

    const toggleQuantityField = () => {
        const isProductSale = typeInput.value === 'income' && categoryInput.value === 'Venda de Produto';
        quantityContainer.classList.toggle('hidden', !isProductSale);
        quantityInput.required = isProductSale;
        if (!isProductSale) quantityInput.value = '';
    };

    const toggleFabricDetailsField = () => {
        const isExpense = typeInput.value === 'expense';
        isFabricContainer.classList.toggle('hidden', !isExpense);
        
        if (!isExpense) {
            isFabricCheckbox.checked = false;
        }
        fabricDetailsContainer.classList.toggle('hidden', !isFabricCheckbox.checked);
    };

    const toggleScopeField = () => {
        const isExpense = typeInput.value === 'expense';
        scopeContainer.classList.toggle('hidden', !isExpense);
        if (createBillReminderContainer) {
            createBillReminderContainer.classList.toggle('hidden', !isExpense);
            if (!isExpense && createBillReminderCheckbox) {
                createBillReminderCheckbox.checked = false;
            }
        }
    };
    
    const updateCategoryOptions = () => {
        const options = typeInput.value === 'income' ? incomeCategories : expenseCategories;
        categoryInput.innerHTML = options.map(cat => `<option value="${cat}" class="bg-gray-800">${cat}</option>`).join('');
    };
    
    const populateClientSelect = () => {
        clients = JSON.parse(localStorage.getItem('clients')) || [];
        // O placeholder é ocultado pois o campo de busca cumpre essa função.
        clientSelect.innerHTML = '<option value="" class="bg-gray-800 p-2 hidden">Selecione...</option>';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            option.className = 'bg-gray-800 p-2';
            clientSelect.appendChild(option);
        });
    };

    scopeButtons.forEach(button => {
        button.addEventListener('click', () => {
            scopeButtons.forEach(btn => btn.classList.replace('border-cyan-400', 'border-transparent'));
            button.classList.replace('border-transparent', 'border-cyan-400');
            selectedScope = button.dataset.scope;
        });
    });

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const isProductSale = typeInput.value === 'income' && categoryInput.value === 'Venda de Produto';
        if (!descriptionInput.value.trim() || !amountInput.value.trim() || !dateInput.value) { alert('Por favor, preencha todos os campos obrigatórios.'); return; }
        if (isProductSale && (!quantityInput.value || parseInt(quantityInput.value, 10) <= 0)) { alert('Por favor, informe uma quantidade de peças válida.'); return; }
        if (linkClientCheckbox.checked && !clientSelect.value) { alert('Por favor, selecione um cliente.'); return; }

        const amount = typeInput.value === 'expense' ? -Math.abs(parseFloat(amountInput.value)) : parseFloat(amountInput.value);
        
        const linkedClientId = linkClientCheckbox.checked && clientSelect.value ? parseInt(clientSelect.value, 10) : null;
        const linkedClientName = linkedClientId ? findClientNameById(linkedClientId) : '';
        const transactionData = {
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
            amount,
            date: dateInput.value,
            type: typeInput.value,
            category: categoryInput.value,
            scope: typeInput.value === 'expense' ? selectedScope : null,
            clientId: linkedClientId,
            kind: 'launch',
            productName: null,
            qty: null,
            unitPrice: null,
            totalPrice: null,
            quantity: 0,
            weightKg: 0,
            fabricColor: null,
            createdAt: new Date().toISOString()
        };

        // --- NEW LOGIC: Create Bill Reminder ---
        if (createBillReminderCheckbox && createBillReminderCheckbox.checked && transactionData.type === 'expense') {
            try {
                const DB_KEY = 'psyzon_accounts_db_v1';
                const billsDataRaw = localStorage.getItem(DB_KEY);
                let billsDb = billsDataRaw ? JSON.parse(billsDataRaw) : { accounts: [], monthly_records: {}, settings: {} };
                
                if (!Array.isArray(billsDb.accounts)) billsDb.accounts = [];

                const transactionDate = new Date(transactionData.date + 'T03:00:00');

                const newBill = {
                    id: Date.now(),
                    name: transactionData.description,
                    category: transactionData.scope === 'personal' ? 'Pessoal' : 'Empresa',
                    type: 'unique',
                    amount: Math.abs(transactionData.amount),
                    due_day: transactionDate.getDate(),
                    unique_date: transactionData.date.substring(0, 7), // YYYY-MM
                    priority: 3, // Baixa
                    notes: 'Criado a partir de lançamento no dashboard.'
                };
                billsDb.accounts.push(newBill);
                localStorage.setItem(DB_KEY, JSON.stringify(billsDb));
                showNotification('Lembrete de conta criado com sucesso!', 'info');
            } catch (error) { console.error("Erro ao criar lembrete de conta:", error); showNotification('Falha ao criar lembrete de conta.', 'danger'); }
        }
        if (isProductSale) {
            const qty = parseInt(quantityInput.value, 10) || 0;
            transactionData.kind = 'product_sale';
            transactionData.productName = 'Camisa';
            transactionData.qty = qty;
            transactionData.quantity = qty;
            transactionData.totalPrice = round2(Math.abs(transactionData.amount));
            transactionData.unitPrice = qty > 0 ? round2(transactionData.totalPrice / qty) : transactionData.totalPrice;
        }
        if (isFabricCheckbox.checked) {
            transactionData.weightKg = parseFloat(fabricWeightInput.value) || 0;
            transactionData.fabricColor = fabricColorInput.value.trim() || null;
        }

        transactionData.launchId = buildLaunchId({ ...transactionData, clientName: linkedClientName });

        let newTransactionId = null;
        if (editingId) {
            const transactionIndex = transactions.findIndex(t => t.id === editingId);
            if (transactionIndex > -1) {
                transactions[transactionIndex] = { ...transactions[transactionIndex], ...transactionData };
            }
        } else {
            const hasDuplicate = transactions.some(tx => (tx.launchId || buildLaunchId({ ...tx, clientName: findClientNameById(tx.clientId) })) === transactionData.launchId);
            if (hasDuplicate) {
                alert('Este lançamento já existe e não será duplicado.');
                return;
            }
            const newTransaction = { ...transactionData, id: Date.now() };
            transactions.push(newTransaction);
            newTransactionId = newTransaction.id;
            if (isProductSale) {
                updateMonthlyProduction(newTransaction.date.substring(0, 7), newTransaction.quantity);
            }
        }
        
        saveTransactions();
        updateUI();
        closeModal();

        const isLinkedProductSale = isProductSale && transactionData.clientId;
        if (isLinkedProductSale && newTransactionId) {
            setTimeout(() => {
                if (confirm("Venda registrada com sucesso! Deseja criar um pedido de produção para este item na aba 'Processos'?")) {
                    const client = clients.find(c => c.id === transactionData.clientId);
                    const prefillData = { description: transactionData.description, clientId: transactionData.clientId };
                    localStorage.setItem('prefill_order_form', JSON.stringify(prefillData));
                    window.location.href = 'processos.html?action=new_order';
                }
            }, 500);
        }
    };

    // --- WIZARD LOGIC (Mobile) ---
    const updateWizardUI = () => {
        const isMobile = window.innerWidth < 768;
        const stepGroups = document.querySelectorAll('.step-group');
        const stepIndicators = document.querySelectorAll('.step-indicator');
        const wizardContainer = document.querySelector('#form > .grid');

        // Show/Hide Steps
        stepGroups.forEach(el => {
            const step = parseInt(el.dataset.step);
            if (isMobile) {
                el.classList.remove('hidden'); // Garante que a transição funcione
                if (step === currentStep) {
                    el.style.transform = 'translateX(0)';
                    el.style.opacity = '1';
                    el.style.pointerEvents = 'auto';
                } else if (step < currentStep) {
                    el.style.transform = 'translateX(-100%)';
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                } else { // step > currentStep
                    el.style.transform = 'translateX(100%)';
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                }
            } else { // Desktop logic
                el.style.transform = 'none';
                el.style.opacity = '1';
                el.style.pointerEvents = 'auto';
                if (el.dataset.step != 1) el.classList.remove('hidden'); // Garante que todos os steps sejam visíveis no desktop
            }
        });
        
        // Update Indicators
        stepIndicators.forEach(el => {
            if (parseInt(el.dataset.step) <= currentStep) el.classList.add('active');
            else el.classList.remove('active');
        });

        // Update Buttons
        prevStepBtn.classList.toggle('hidden', currentStep === 1);
        nextStepBtn.classList.toggle('hidden', currentStep === 3);
        submitBtn.classList.toggle('hidden', isMobile ? currentStep !== 3 : false);
        cancelBtn.classList.toggle('hidden', isMobile ? currentStep !== 1 : false);
        
        // On Desktop, ensure Submit is always visible and Next/Prev hidden (handled by CSS media queries mostly, but logic helps)
        if (window.innerWidth >= 768) {
            submitBtn.classList.remove('hidden');
        }
    };

    const validateStep = (step) => {
        if (step === 1) {
            if (!descriptionInput.value.trim()) { alert('Informe a descrição.'); return false; }
            if (!amountInput.value) { alert('Informe o valor.'); return false; }
            if (!dateInput.value) { alert('Informe a data.'); return false; }
        }
        return true;
    };

    if (nextStepBtn) nextStepBtn.addEventListener('click', () => {
        if (validateStep(currentStep)) { currentStep++; updateWizardUI(); }
    });
    
    if (prevStepBtn) prevStepBtn.addEventListener('click', () => { currentStep--; updateWizardUI(); });

    const openAddModal = () => {
        editingId = null;
        form.reset();
        dateInput.valueAsDate = new Date();
        updateCategoryOptions();
        toggleQuantityField();
        toggleFabricDetailsField();
        toggleScopeField();
        populateClientSelect();
        if (clientSearchInput) clientSearchInput.value = ''; // Reset search
        Array.from(clientSelect.options).forEach(opt => opt.style.display = ''); // Reset visibility
        clientSelectionContainer.classList.add('hidden');
        if (createBillReminderCheckbox) createBillReminderCheckbox.checked = false;
        selectedScope = 'business';
        scopeButtons.forEach(btn => btn.classList.replace('border-cyan-400', 'border-transparent'));
        if (document.querySelector('.scope-btn[data-scope="business"]')) {
            document.querySelector('.scope-btn[data-scope="business"]').classList.replace('border-transparent', 'border-cyan-400');
        }
        modalTitle.textContent = 'Novo Lançamento';
        submitBtn.textContent = 'Adicionar';
        currentStep = 1;
        updateWizardUI();
        modal.classList.remove('hidden');
    };

    window.openEditModal = (id) => {
        editingId = id;
        const transaction = transactions.find(t => t.id === id);
        if (!transaction) return;
        
        form.reset();
        if (createBillReminderCheckbox) createBillReminderCheckbox.checked = false;
        nameInput.value = transaction.name || '';
        descriptionInput.value = transaction.description;
        amountInput.value = Math.abs(transaction.amount);
        dateInput.value = transaction.date;
        typeInput.value = transaction.type;
        updateCategoryOptions();
        categoryInput.value = transaction.category;
        
        toggleQuantityField();
        if (transaction.quantity) { quantityInput.value = transaction.quantity; }
        
        const isFabric = !!(transaction.weightKg || transaction.fabricColor);
        isFabricCheckbox.checked = isFabric;
        toggleFabricDetailsField();

        if (isFabric) {
            fabricWeightInput.value = transaction.weightKg || '';
            fabricColorInput.value = transaction.fabricColor || '';
        }

        toggleScopeField();
        if (transaction.type === 'expense') {
            selectedScope = transaction.scope || 'business';
            scopeButtons.forEach(btn => btn.classList.replace('border-cyan-400', 'border-transparent'));
            if(document.querySelector(`.scope-btn[data-scope="${selectedScope}"]`)){
                document.querySelector(`.scope-btn[data-scope="${selectedScope}"]`).classList.replace('border-transparent', 'border-cyan-400');
            }
        }

        populateClientSelect();
        if (clientSearchInput) clientSearchInput.value = ''; // Reset search
        Array.from(clientSelect.options).forEach(opt => opt.style.display = ''); // Reset visibility
        if (transaction.clientId) {
            linkClientCheckbox.checked = true;
            clientSelectionContainer.classList.remove('hidden');
            clientSelect.value = transaction.clientId;
        } else {
            linkClientCheckbox.checked = false;
            clientSelectionContainer.classList.add('hidden');
        }

        modalTitle.textContent = 'Editar Lançamento';
        submitBtn.textContent = 'Salvar Alterações';
        currentStep = 1;
        updateWizardUI();
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        editingId = null;
        form.reset();
        modal.classList.add('hidden');
    };

    const updateMonthlyProduction = (month, quantity) => {
        let monthlyProduction = JSON.parse(localStorage.getItem('monthlyProduction')) || [];
        const existingEntryIndex = monthlyProduction.findIndex(item => item.month === month);
        if (existingEntryIndex > -1) {
            monthlyProduction[existingEntryIndex].quantity += quantity;
        } else {
            monthlyProduction.push({ month: month, quantity: quantity });
        }
        localStorage.setItem('monthlyProduction', JSON.stringify(monthlyProduction));
    };
    
    window.removeTransaction = (id) => {
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            saveTransactions(); // Salva o estado atual antes de modificar
            const transactionToDelete = transactions.find(t => t.id === id);
            if (transactionToDelete && transactionToDelete.type === 'income' && transactionToDelete.category === 'Venda de Produto' && transactionToDelete.quantity > 0) {
                updateMonthlyProduction(transactionToDelete.date.substring(0, 7), -transactionToDelete.quantity);
            }
            transactions = transactions.filter(t => t.id !== id);
            updateUI();
            showNotification('Transação excluída.', 'warning');
        }
    };
    
    const compactLabel = (text = '', maxLength = 26) => {
        if (text.length <= maxLength) return text;
        return `${text.slice(0, maxLength).trimEnd()}…`;
    };

    const addTransactionToDOM = (transaction) => {
        const { id, name, description, amount, date, category, type, scope } = transaction;
        const item = document.createElement('article');
        item.className = 'transaction-card launch-row';
        item.dataset.id = id;

        const safeName = (name || '--').trim() || '--';
        const safeDescription = (description || '--').trim() || '--';
        const safeCategory = (category || '--').trim() || '--';
        const moneyClass = type === 'income' ? 'value-positive' : 'value-negative';
        const amountPrefix = type === 'income' ? '+' : '-';

        let scopeText = '--';
        let scopeClass = 'business';
        if (type === 'expense') {
            scopeText = scope === 'personal' ? 'Pessoal' : 'Empresarial';
            scopeClass = scope === 'personal' ? 'personal' : 'business';
        }

        const metaItems = [
            `<span class="data-chip data-date" title="${formatDate(date)}">${formatDate(date)}</span>`,
            `<span class="data-chip data-category" title="${safeCategory}">${compactLabel(safeCategory)}</span>`,
            type === 'expense' ? `<span class="data-chip data-scope" title="${scopeText}">${scopeText}</span>` : ''
        ].filter(Boolean).join('');

        item.innerHTML = `
            <div class="cell data-name" title="${safeName}">
                <div class="title" title="${safeName}">${safeName}</div>
                <div class="data-description subtitle" title="${safeDescription}">${safeDescription}</div>
            </div>

            <div class="cell data-amount">
                <span class="money ${moneyClass}">${amountPrefix} ${formatCurrency(Math.abs(amount))}</span>
            </div>

            <div class="cell data-scope">${type === 'expense' ? `<span class="scope-badge ${scopeClass}" title="${scopeText}">${scopeText}</span>` : '<span class="scope-empty">--</span>'}</div>

            <div class="cell data-category"><span class="cat-pill" title="${safeCategory}">${safeCategory}</span></div>

            <div class="cell data-date" title="${formatDate(date)}">${formatDate(date)}</div>

            <div class="cell data-meta">${metaItems}</div>

            <div class="cell data-action actions">
                <div class="flex items-center justify-end gap-2">
                    <button class="action-toggle-btn edit" data-action="edit" data-id="${id}" title="Editar" aria-label="Editar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"></path></svg>
                    </button>
                    <button class="action-toggle-btn delete" data-action="delete" data-id="${id}" title="Excluir" aria-label="Excluir">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 7h12M9 7V5h6v2m-7 4v6m4-6v6m4-10v12a1 1 0 01-1 1H8a1 1 0 01-1-1V7h10z"></path></svg>
                    </button>
                </div>
            </div>
        `;
        transactionListEl.appendChild(item);
    };

    // Event Delegation for Transaction List (Menu Toggle, Edit, Delete)
    transactionListEl.addEventListener('click', (e) => {
        const card = e.target.closest('.transaction-card');
        const actionBtn = e.target.closest('[data-action]');

        // Handle Edit/Delete actions from any button
        if (actionBtn) {
            e.stopPropagation(); // Prevent card from toggling if button is clicked
            const action = actionBtn.dataset.action;
            const id = parseInt(actionBtn.dataset.id, 10);

            if (action === 'edit') {
                openEditModal(id);
            } else if (action === 'delete') {
                if (confirm('Tem certeza que deseja excluir esta transação? A ação não pode ser desfeita.')) {
                    removeTransaction(id);
                }
            }
            return;
        }

        // Handle card expansion on mobile
        if (card && window.innerWidth <= 768) {
            const isExpanded = card.classList.contains('expanded');
            
            // Close all other cards
            transactionListEl.querySelectorAll('.transaction-card.expanded').forEach(c => {
                c.classList.remove('expanded');
            });

            // Toggle the clicked card
            if (!isExpanded) {
                card.classList.add('expanded');
                // Scroll to top of card after a short delay to allow rendering
                setTimeout(() => {
                    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
    });

    const updateDeadlinesCard = () => {
        productionOrders = JSON.parse(localStorage.getItem('production_orders')) || [];
        clients = JSON.parse(localStorage.getItem('clients')) || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingOrders = productionOrders.filter(order => order.status !== 'done').map(order => {
            const deadline = new Date(order.deadline + 'T03:00:00');
            const diffTime = deadline - today;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // <-- troque Math.ceil por Math.round
            return { ...order, diffDays };
        }).sort((a, b) => a.diffDays - b.diffDays).slice(0, 3);
        deadlinesListEl.innerHTML = '';
        if (upcomingOrders.length === 0) {
            deadlinesListEl.innerHTML = '<p class="text-sm text-gray-500">Nenhum prazo pendente.</p>';
            return;
        }
        upcomingOrders.forEach(order => {
            const client = clients.find(c => c.id === order.clientId);
            let deadlineColor = 'text-gray-400';
            let deadlineText = `Vence em ${order.diffDays} dias`;
            if (order.diffDays < 0) {
                deadlineColor = 'text-red-500 font-bold animate-pulse';
                deadlineText = `ATRASADO HÁ ${Math.abs(order.diffDays)} DIAS`;
            } else if (order.diffDays <= 3) {
                deadlineColor = 'text-yellow-400 font-semibold';
            }
            if (order.diffDays === 0) deadlineText = "Vence Hoje!";
            if (order.diffDays === 1) deadlineText = "Vence Amanhã!";
            const item = document.createElement('div');
            item.className = 'border-b border-white/10 pb-2';
            item.innerHTML = `<p class="font-semibold">${order.description}</p><div class="flex justify-between items-center text-sm"><span class="text-gray-400">${client ? client.name : 'Cliente'}</span><span class="${deadlineColor}">${deadlineText}</span></div>`;
            deadlinesListEl.appendChild(item);
        });
    };
    
    const updateDashboardBillsCard = () => {
        if (!dashboardBillsSummaryEl) return;

        const billsDataRaw = localStorage.getItem('psyzon_accounts_db_v1');
        if (!billsDataRaw) {
            dashboardBillsSummaryEl.innerHTML = '<a href="contas.html" class="text-sm text-gray-400 hover:text-cyan-400">Nenhuma conta configurada. Clique para começar.</a>';
            return;
        }

        const billsDb = JSON.parse(billsDataRaw);
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;

        const monthlyRecords = billsDb.monthly_records?.[monthKey] || {};

        const pendingBills = billsDb.accounts
            .map(acc => {
                const record = monthlyRecords[acc.id] || { status: 'pending' };
                // Considera apenas as ativas para o mês atual
                if (acc.type === 'fixed' || (acc.type === 'unique' && acc.unique_date === monthKey) || (acc.type === 'installment' && acc.current_installment <= acc.total_installments)) {
                     if (record.status === 'pending' || record.status === 'overdue') {
                        return { ...acc, ...record };
                    }
                }
                return null;
            })
            .filter(Boolean)
            .sort((a, b) => a.due_day - b.due_day);

        const totalPending = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);
        const next3Bills = pendingBills.slice(0, 3);

        let html = `<div class="flex justify-between items-baseline mb-2"><span class="font-bold text-yellow-400">${formatCurrency(totalPending)}</span><span class="text-sm text-gray-400">Pendente</span></div>`;
        if (next3Bills.length > 0) {
            html += next3Bills.map(bill => `<div class="text-sm flex justify-between border-t border-white/5 pt-1 mt-1"><span>${bill.name}</span><span class="font-semibold">Vence dia ${bill.due_day}</span></div>`).join('');
        } else {
            html += '<p class="text-sm text-green-400 mt-2">Tudo pago este mês.</p>';
        }
        dashboardBillsSummaryEl.innerHTML = html;
    };

    const renderRecentTransactions = () => {
        transactionListEl.innerHTML = '<div class="text-center text-gray-400 p-4">Carregando...</div>';

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let startDate = new Date(now);
        let endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);

        switch (transactionFilters.period) {
            case 'yesterday':
                startDate.setDate(now.getDate() - 1);
                endDate.setDate(now.getDate() - 1);
                break;
            case '7days':
                startDate.setDate(now.getDate() - 6);
                break;
            case '30days':
                startDate.setDate(now.getDate() - 29);
                break;
            case 'this_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
        }

        let filteredTransactions = transactions.filter(t => {
            const tDate = new Date(t.date + 'T03:00:00');
            const typeMatch = transactionFilters.type === 'all' || t.type === transactionFilters.type;
            const dateMatch = tDate >= startDate && tDate <= endDate;
            return typeMatch && dateMatch;
        });

        filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        transactionListEl.innerHTML = '';
        if (filteredTransactions.length === 0) {
            transactionListEl.innerHTML = '<div class="text-center text-gray-400 p-4">Sem lançamentos neste período</div>';
            return;
        }
        filteredTransactions.forEach(addTransactionToDOM);
    };

    const updateUI = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const totalBalance = transactions.reduce((acc, t) => acc + t.amount, 0);
        const monthlyTransactions = transactions.filter(t => {
            const date = new Date(t.date + 'T03:00:00');
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        const incomeMonth = monthlyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const businessExpenseMonth = monthlyTransactions.filter(t => t.type === 'expense' && t.scope !== 'personal').reduce((acc, t) => acc + t.amount, 0);
        const personalExpenseMonth = monthlyTransactions.filter(t => t.type === 'expense' && t.scope === 'personal').reduce((acc, t) => acc + t.amount, 0);
        const profitMonth = incomeMonth + businessExpenseMonth;
        balanceEl.textContent = formatCurrency(totalBalance);
        
        // Dashboard Mobile Optimization: Ensure elements are visible and sized correctly via CSS
        // The logic here remains the same, but style.css handles the layout (stacked vs grid)
        
        incomeEl.textContent = formatCurrency(incomeMonth);
        expenseEl.textContent = formatCurrency(Math.abs(businessExpenseMonth));
        profitEl.textContent = formatCurrency(profitMonth);
        profitEl.classList.toggle('text-red-400', profitMonth < 0);
        profitEl.classList.toggle('text-green-400', profitMonth >= 0);

        // --- Card A Receber (Lógica Atualizada) ---
        const productionOrdersList = JSON.parse(localStorage.getItem('production_orders')) || [];
        let receivablesTotal = 0;
        let receivablesCount = 0;
        let hasOverdueReceivables = false;
        const todayDate = new Date();
        todayDate.setHours(0,0,0,0);

        productionOrdersList.forEach(order => {
            if (order.isPaid) return; // Pedido quitado não entra

            const total = order.totalValue || 0;
            const paid = order.amountPaid || 0;
            const pending = total - paid;

            if (pending > 0.01) {
                receivablesTotal += pending;
                receivablesCount++;
                
                if (order.deadline) {
                    const d = new Date(order.deadline + 'T03:00:00');
                    if (d < todayDate) hasOverdueReceivables = true;
                }
            }
        });

        if (totalReceivablesEl) {
            const alertClass = hasOverdueReceivables ? 'text-red-400 font-bold' : 'text-gray-400';
            const icon = hasOverdueReceivables
                ? '<svg class="syt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01M4.9 19h14.2a1 1 0 00.87-1.49L12.87 4.5a1 1 0 00-1.74 0L4.03 17.5A1 1 0 004.9 19z"/></svg>'
                : '<svg class="syt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0v10l-8 4m8-14-8 4m0 10-8-4V7m8 4v10"/></svg>'; 
            
            totalReceivablesEl.innerHTML = `
                <div>${formatCurrency(receivablesTotal)}</div>
                <div class="text-xs ${alertClass} mt-1 flex items-center gap-1 font-normal">
                    ${icon} ${receivablesCount} pedidos em aberto
                </div>
            `;
            totalReceivablesEl.classList.add('cursor-pointer', 'hover:opacity-80', 'transition-opacity');
            totalReceivablesEl.title = "Clique para ver pedidos pendentes";
        }

        const businessLimit = parseFloat(localStorage.getItem('businessSpendingLimit')) || 0;
        const personalLimit = parseFloat(localStorage.getItem('personalSpendingLimit')) || 0;
        const businessPercent = businessLimit > 0 ? (Math.abs(businessExpenseMonth) / businessLimit) * 100 : 0;
        businessSpentEl.textContent = formatCurrency(Math.abs(businessExpenseMonth));
        businessLimitTextEl.textContent = `de ${formatCurrency(businessLimit)}`;
        businessProgressEl.style.width = `${Math.min(businessPercent, 100)}%`;
        businessProgressEl.className = `h-4 rounded-full transition-all duration-500 ${getProgressColorClass(businessPercent)}`;
        const personalPercent = personalLimit > 0 ? (Math.abs(personalExpenseMonth) / personalLimit) * 100 : 0;
        personalSpentEl.textContent = formatCurrency(Math.abs(personalExpenseMonth));
        personalLimitTextEl.textContent = `de ${formatCurrency(personalLimit)}`;
        personalProgressEl.style.width = `${Math.min(personalPercent, 100)}%`;
        personalProgressEl.className = `h-4 rounded-full transition-all duration-500 ${getProgressColorClass(personalPercent)}`;
        const totalMonthlyCosts = Math.abs(businessExpenseMonth) + Math.abs(personalExpenseMonth);
        breakEvenRevenueEl.textContent = `Receita: ${formatCurrency(incomeMonth)}`;
        breakEvenTargetEl.textContent = `Custos: ${formatCurrency(totalMonthlyCosts)}`;
        const totalValue = incomeMonth + totalMonthlyCosts;
        let revenueShare = 0, costsShare = 100;
        if (totalValue > 0) {
            revenueShare = (incomeMonth / totalValue) * 100;
            costsShare = (totalMonthlyCosts / totalValue) * 100;
        } else if (incomeMonth > 0) { revenueShare = 100; costsShare = 0; }
        breakEvenRevenueBar.style.width = `${revenueShare}%`;
        breakEvenRevenueBar.textContent = `${revenueShare.toFixed(0)}%`;
        breakEvenCostsBar.style.width = `${costsShare}%`;
        breakEvenCostsBar.textContent = `${costsShare.toFixed(0)}%`;
        if(costPerPieceDashboardEl) {
            const directCostKeywords = ['malha', 'costura', 'dtf', 'silk', 'gola', 'punho', 'camisas lisas', 'reposicao de tinta', 'reposição de tinta'];
            const directCosts = monthlyTransactions
                .filter(t => t.type === 'expense' && t.scope !== 'personal')
                .filter(t => directCostKeywords.some(keyword => normalizeKey(`${t.category} ${t.description}`).includes(normalizeKey(keyword))))
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const indirectCosts = monthlyTransactions
                .filter(t => t.type === 'expense' && t.scope !== 'personal')
                .filter(t => !directCostKeywords.some(keyword => normalizeKey(`${t.category} ${t.description}`).includes(normalizeKey(keyword))))
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const totalQtySold = monthlyTransactions
                .filter(t => t.type === 'income' && (t.kind === 'product_sale' || t.category === 'Venda de Produto'))
                .reduce((sum, t) => sum + Number(t.qty ?? t.quantity ?? 1), 0);

            const totalCost = directCosts + indirectCosts;
            const costPerPiece = totalQtySold > 0 ? totalCost / totalQtySold : null;
            costPerPieceDashboardEl.textContent = costPerPiece === null ? '—' : formatCurrency(costPerPiece);

            console.info('[cost-per-piece] total_qty_vendida:', totalQtySold);
            console.info('[cost-per-piece] total_custos_diretos:', round2(directCosts));
            console.info('[cost-per-piece] custo_por_peca_resultante:', costPerPiece === null ? '—' : round2(costPerPiece));
        }
        
        renderRecentTransactions();
        updateCharts(monthlyTransactions);
        saveTransactions();
        updateDeadlinesCard();
        updateDashboardBillsCard();
    };

    const updateCharts = (monthlyTransactions) => {
        const now = new Date();
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const monthlyData = Array(12).fill(null).map(() => ({ income: 0, expense: 0 }));
        transactions.forEach(t => {
            const month = new Date(t.date + 'T03:00:00').getMonth();
            if (t.type === 'income') monthlyData[month].income += t.amount;
            else if (t.scope !== 'personal') monthlyData[month].expense += Math.abs(t.amount);
        });
        const chartOptions = { color: '#e0e0e0', family: 'Inter' };
        
        const lineChartCtx = document.getElementById('incomeExpenseChart');
        if (lineChartCtx) { if (incomeExpenseChart) incomeExpenseChart.destroy(); incomeExpenseChart = new Chart(lineChartCtx, { type: 'line', data: { labels: months, datasets: [{ label: 'Receita', data: monthlyData.map(d => d.income), borderColor: '#34d399', backgroundColor: '#34d39920', tension: 0.3, fill: true }, { label: 'Despesa Empresarial', data: monthlyData.map(d => d.expense), borderColor: '#f87171', backgroundColor: '#f8717120', tension: 0.3, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: chartOptions.color } } }, scales: { y: { beginAtZero: true, ticks: { color: chartOptions.color }, grid: { color: '#ffffff1a' } }, x: { ticks: { color: chartOptions.color }, grid: { color: '#ffffff1a' } } } } }); }
        
        const doughnutChartCtx = document.getElementById('categoryChart');
        if (doughnutChartCtx) {
            const expenseByCategory = monthlyTransactions.filter(t => t.type === 'expense' && t.scope !== 'personal').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount); return acc; }, {});
            if (categoryChart) categoryChart.destroy();
            categoryChart = new Chart(doughnutChartCtx, { type: 'doughnut', data: { labels: Object.keys(expenseByCategory), datasets: [{ data: Object.values(expenseByCategory), backgroundColor: ['#9333ea', '#db2777', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#6b7280'], borderColor: '#111827', borderWidth: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
        }

        const incomeSourceChartCtx = document.getElementById('incomeSourceChart');
        if (incomeSourceChartCtx) {
            const incomeByCategory = monthlyTransactions.filter(t => t.type === 'income').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
            if (incomeSourceChart) incomeSourceChart.destroy();
            incomeSourceChart = new Chart(incomeSourceChartCtx, { type: 'pie', data: { labels: Object.keys(incomeByCategory), datasets: [{ data: Object.values(incomeByCategory), backgroundColor: ['#22c55e', '#3b82f6', '#eab308', '#8b5cf6', '#ec4899'], borderColor: '#111827', borderWidth: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
        }
        
        updateFabricChart(monthlyTransactions);
    };
    
    const updateFabricChart = (monthlyTransactions) => {
        const fabricPurchases = monthlyTransactions.filter(t => t.weightKg > 0);
        const totalSpent = fabricPurchases.reduce((acc, t) => acc + Math.abs(t.amount), 0);
        const totalKg = fabricPurchases.reduce((acc, t) => acc + (t.weightKg || 0), 0);
        const ctx = document.getElementById('fabricChart');
        if (!ctx) return;
        const chartOptions = {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#e0e0e0' } } },
            scales: {
                y: { type: 'linear', display: true, position: 'left', ticks: { color: '#e0e0e0' }, grid: { color: '#ffffff1a' }, title: { display: true, text: 'Gasto (R$)', color: '#e0e0e0' } },
                y1: { type: 'linear', display: true, position: 'right', ticks: { color: '#e0e0e0' }, grid: { drawOnChartArea: false }, title: { display: true, text: 'Peso (Kg)', color: '#e0e0e0' } }
            }
        };
        if (fabricChart) {
            fabricChart.data.datasets[0].data = [totalSpent];
            fabricChart.data.datasets[1].data = [totalKg];
            fabricChart.update();
        } else {
            fabricChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Mês Atual'],
                    datasets: [
                        { label: 'Gasto (R$)', data: [totalSpent], backgroundColor: 'rgba(239, 68, 68, 0.7)', yAxisID: 'y' },
                        { label: 'Peso (Kg)', data: [totalKg], backgroundColor: 'rgba(59, 130, 246, 0.7)', yAxisID: 'y1' }
                    ]
                },
                options: chartOptions
            });
        }
    };

    // --- EVENT LISTENERS ---
    if(addTransactionBtn) addTransactionBtn.addEventListener('click', openAddModal);
    if(cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if(form) form.addEventListener('submit', handleFormSubmit);
    if(typeInput) typeInput.addEventListener('change', () => { updateCategoryOptions(); toggleQuantityField(); toggleScopeField(); toggleFabricDetailsField(); });
    if(categoryInput) categoryInput.addEventListener('change', () => { toggleQuantityField(); toggleFabricDetailsField(); });
    if(linkClientCheckbox) linkClientCheckbox.addEventListener('change', () => {
        clientSelectionContainer.classList.toggle('hidden', !linkClientCheckbox.checked);
    });
    if(isFabricCheckbox) isFabricCheckbox.addEventListener('change', () => {
        fabricDetailsContainer.classList.toggle('hidden', !isFabricCheckbox.checked);
    });

    // Filter Listeners
    const filtersContainer = document.getElementById('syt-filters-container');
    if (filtersContainer) {
        filtersContainer.addEventListener('click', (e) => {
            const periodBtn = e.target.closest('.syt-filter-btn');
            const typeBtn = e.target.closest('.syt-type-filter-btn');

            if (periodBtn) {
                filtersContainer.querySelectorAll('.syt-filter-btn').forEach(btn => btn.classList.remove('active'));
                periodBtn.classList.add('active');
                transactionFilters.period = periodBtn.dataset.filterPeriod;
            }

            if (typeBtn) {
                filtersContainer.querySelectorAll('.syt-type-filter-btn').forEach(btn => btn.classList.remove('active'));
                typeBtn.classList.add('active');
                transactionFilters.type = typeBtn.dataset.filterType;
            }

            if (periodBtn || typeBtn) renderRecentTransactions();
        });
    }

    // Client Search in Modal
    if (clientSearchInput) {
        clientSearchInput.addEventListener('input', () => {
            const searchTerm = clientSearchInput.value.toLowerCase();
            const options = clientSelect.options;
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                if (option.value === "") continue; // Skip placeholder
                
                const optionText = option.textContent.toLowerCase();
                if (optionText.includes(searchTerm)) {
                    option.style.display = '';
                } else {
                    option.style.display = 'none';
                }
            }
        });
    }

    // --- INICIALIZAÇÃO ---
    runFinancialLaunchImport();
    updateUI();
    setTimeout(checkDeadlinesAndNotify, 2000);
    setupCarousel('budget-carousel', 'budget-carousel-dots');
    setupCarousel('charts-carousel', 'charts-carousel-dots');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
