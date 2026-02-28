document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- DOM ELEMENTS ---
    const el = id => document.getElementById(id);

    const currentDateEl = el('current-date');
    const openSettingsBtn = el('open-settings-btn');
    const closeSettingsBtn = el('close-settings-btn');
    const settingsModal = el('settings-modal');
    const settingsForm = el('settings-form');
    const initialLoader = el('initial-loader');

    // Card Content Areas
    const metaDiaContent = el('meta-dia-content');
    const vencimentosContent = el('vencimentos-content');
    const contasAtrasoContent = el('contas-atraso-content');
    const acoesPedidosContent = el('acoes-pedidos-content');
    const artesPendentesContent = el('artes-pendentes-content');

    // Settings Inputs
    const settingPriceInput = el('setting-price');
    const settingCostInput = el('setting-cost');
    const settingDeadlineDaysInput = el('setting-deadline-days');
    const settingListLimitInput = el('setting-list-limit');
    const settingAutoOpenInput = el('setting-auto-open');

    // --- STATE & SETTINGS ---
    const SETTINGS_KEY = 'boss_central_settings_v1';
    let settings = {
        price: 100,
        cost: 35,
        deadlineDays: 3,
        listLimit: 5,
        autoOpen: false
    };

    // --- DATA STORES (Mirrors of localStorage) ---
    let accountsDb = {};
    let productionOrders = [];
    let clients = [];
    let transactions = [];

    // --- HELPERS ---
    const formatCurrency = (amount) => (amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // --- DATA LOADING ---
    const loadData = () => {
        try {
            const settingsData = localStorage.getItem(SETTINGS_KEY);
            if (settingsData) settings = { ...settings, ...JSON.parse(settingsData) };

            const accountsData = localStorage.getItem('psyzon_accounts_db_v1');
            accountsDb = accountsData ? JSON.parse(accountsData) : { accounts: [], monthly_records: {} };

            const ordersData = localStorage.getItem('production_orders');
            productionOrders = ordersData ? JSON.parse(ordersData) : [];

            const clientsData = localStorage.getItem('clients');
            clients = clientsData ? JSON.parse(clientsData) : [];
            
            const transactionsData = localStorage.getItem('transactions');
            transactions = transactionsData ? JSON.parse(transactionsData) : [];

            return true;
        } catch (e) {
            console.error("Failed to load data from localStorage", e);
            return false;
        }
    };

    // --- CORE LOGIC FUNCTIONS ---

    function getTodayAndTomorrowItems() {
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const todayDay = today.getDate();
        const tomorrowDay = tomorrow.getDate();

        // 1. Get Bills
        const dueBills = (accountsDb.accounts || [])
            .filter(acc => acc.due_day === todayDay || acc.due_day === tomorrowDay)
            .map(acc => {
                const record = accountsDb.monthly_records?.[monthKey]?.[acc.id];
                if (record?.status === 'pending' || !record) {
                    return {
                        type: 'bill',
                        name: acc.name,
                        amount: acc.amount,
                        due: acc.due_day === todayDay ? 'today' : 'tomorrow',
                        id: acc.id,
                        monthKey: monthKey
                    };
                }
                return null;
            }).filter(Boolean);

        // 2. Get Order Deadlines
        const dueOrders = productionOrders
            .filter(order => order.status !== 'done' && order.deadline)
            .map(order => {
                const deadline = new Date(order.deadline + 'T03:00:00');
                if (deadline.getTime() === today.getTime() || deadline.getTime() === tomorrow.getTime()) {
                    return {
                        type: 'order',
                        name: order.description,
                        due: deadline.getTime() === today.getTime() ? 'today' : 'tomorrow',
                        id: order.id,
                        clientId: order.clientId
                    };
                }
                return null;
            }).filter(Boolean);

        const allItems = [...dueBills, ...dueOrders];
        return allItems.sort((a, b) => {
            if (a.due < b.due) return -1; // today before tomorrow
            if (a.due > b.due) return 1;
            return (b.amount || 0) - (a.amount || 0); // higher amount first
        });
    }

    function getOrdersNeedingAction() {
        const actionDateLimit = new Date(today);
        actionDateLimit.setDate(today.getDate() + parseInt(settings.deadlineDays, 10));

        return productionOrders.filter(order => {
            if (order.status === 'done') return false;
            const deadline = new Date(order.deadline + 'T03:00:00');
            if (deadline <= actionDateLimit) return true;
            if (order.checklist && Object.values(order.checklist).some(task => !task.completed)) {
                 return true;
            }
            return false;
        });
    }

    function getPendingArts() {
        return productionOrders.filter(order => {
            if (order.status === 'done' || !order.artControl || !order.artControl.versions || order.artControl.versions.length === 0) {
                return false;
            }
            const lastVersion = order.artControl.versions[order.artControl.versions.length - 1];
            return lastVersion.status === 'sent' || lastVersion.status === 'changes_requested';
        });
    }

    function getOverdueBills() {
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;

        return (accountsDb.accounts || [])
            .map(acc => {
                const dueDate = new Date(year, month - 1, acc.due_day);
                if (dueDate < today) {
                    const record = accountsDb.monthly_records?.[monthKey]?.[acc.id];
                    if (record?.status === 'pending' || (!record && acc.type !== 'unique')) {
                        return {
                            id: acc.id,
                            name: acc.name,
                            amount: acc.amount,
                            dueDay: acc.due_day,
                            monthKey: monthKey
                        };
                    }
                }
                return null;
            }).filter(Boolean);
    }

    function calculateDailyGoal() {
        if (!settings.price || !settings.cost || settings.price <= settings.cost) {
            return { error: 'Configurar preço médio e custo por peça para calcular meta.' };
        }

        const marginPerPiece = settings.price - settings.cost;
        
        const monthlyExpenses = (accountsDb.accounts || [])
            .filter(acc => acc.type === 'fixed' || acc.type === 'installment')
            .reduce((sum, acc) => sum + acc.amount, 0);

        if (monthlyExpenses === 0) {
            return { error: 'Cadastre suas contas mensais fixas para calcular a meta.' };
        }

        const getRemainingBusinessDays = () => {
            let count = 0;
            let current = new Date(today);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            while (current <= endOfMonth) {
                const day = current.getDay();
                if (day !== 0 && day !== 6) {
                    count++;
                }
                current.setDate(current.getDate() + 1);
            }
            return count > 0 ? count : 1;
        };

        const remainingDays = getRemainingBusinessDays();
        const monthlyGoalPieces = Math.ceil(monthlyExpenses / marginPerPiece);
        const dailyGoalPieces = Math.ceil(monthlyGoalPieces / remainingDays);
        const dailyGoalRevenue = dailyGoalPieces * settings.price;

        return {
            pieces: dailyGoalPieces,
            revenue: dailyGoalRevenue,
            expenses: monthlyExpenses,
            margin: marginPerPiece
        };
    }

    // --- RENDER FUNCTIONS ---
    const renderEmptyState = (container, message, cta) => {
        container.innerHTML = `<div class="text-center p-4 text-gray-500 text-sm">${message} ${cta ? `<br><button id="${cta.id || ''}" href="${cta.href}" class="text-cyan-400 font-semibold">${cta.text}</button>` : ''}</div>`;
    };

    const renderList = (container, items, renderItemFn) => {
        if (items.length === 0) {
            renderEmptyState(container, 'Nenhum item encontrado.');
            return;
        }
        container.innerHTML = items.slice(0, settings.listLimit).map(renderItemFn).join('');
        if (items.length > settings.listLimit) {
            const seeAll = document.createElement('a');
            seeAll.href = '#'; // Should link to the respective page
            seeAll.className = 'block text-center text-cyan-400 text-xs font-semibold mt-2 p-1';
            seeAll.textContent = 'Ver tudo';
            container.appendChild(seeAll);
        }
    };

    const renderVencimentosCard = () => {
        const items = getTodayAndTomorrowItems();
        renderList(vencimentosContent, items, item => {
            const client = item.type === 'order' ? clients.find(c => c.id === item.clientId) : null;
            const isTomorrow = item.due === 'tomorrow';
            return `
                <div class="boss-card-list-item">
                    <div>
                        <p class="font-semibold">${item.name}</p>
                        <p class="text-xs ${isTomorrow ? 'text-yellow-400 font-bold' : 'text-gray-400'}">
                            ${item.type === 'bill' ? formatCurrency(item.amount) : (client?.name || '')} - Vence ${isTomorrow ? 'Amanhã' : 'Hoje'}
                        </p>
                    </div>
                    ${item.type === 'bill'
                        ? `<button data-action="pay-bill" data-id="${item.id}" data-month="${item.monthKey}" class="action-button-sm">Pagar</button>`
                        : `<a href="processos.html" class="action-button-sm">Abrir</a>`
                    }
                </div>
            `;
        });
    };
    
    const renderContasAtrasoCard = () => {
        const items = getOverdueBills();
        renderList(contasAtrasoContent, items, item => `
            <div class="boss-card-list-item">
                <div>
                    <p class="font-semibold">${item.name}</p>
                    <p class="text-xs text-red-400">${formatCurrency(item.amount)} - Venceu dia ${item.dueDay}</p>
                </div>
                <button data-action="pay-bill" data-id="${item.id}" data-month="${item.monthKey}" class="action-button-sm bg-red-500/20 text-red-300">Pagar</button>
            </div>
        `);
    };

    const renderAcoesPedidosCard = () => {
        const items = getOrdersNeedingAction();
        renderList(acoesPedidosContent, items, item => {
            const client = clients.find(c => c.id === item.clientId);
            return `
                <div class="boss-card-list-item">
                    <div>
                        <p class="font-semibold">${item.description}</p>
                        <p class="text-xs text-gray-400">${client?.name || 'Sem cliente'}</p>
                    </div>
                    <div class="flex gap-2">
                        <a href="processos.html" class="action-button-sm">Abrir</a>
                    </div>
                </div>
            `;
        });
    };
    
    const renderArtesPendentesCard = () => {
        const items = getPendingArts();
        renderList(artesPendentesContent, items, item => {
            const client = clients.find(c => c.id === item.clientId);
            const lastVersion = item.artControl.versions[item.artControl.versions.length - 1];

            return `
                <div class="boss-card-list-item">
                    <div>
                        <p class="font-semibold">${item.description}</p>
                        <p class="text-xs text-gray-400">${client?.name || 'Sem cliente'}</p>
                    </div>
                    <a href="processos.html" class="action-button-sm">Abrir</a>
                </div>
            `;
        });
    };

    const renderMetaDiaCard = () => {
        const goal = calculateDailyGoal();
        if (goal.error) {
            renderEmptyState(metaDiaContent, goal.error, { href: '#', text: 'Configurar agora', id: 'cta-config-goal' });
            const cta = el('cta-config-goal');
            if(cta) cta.onclick = (e) => { e.preventDefault(); openSettings(); };
            return;
        }
        metaDiaContent.innerHTML = `
            <p class="text-gray-400">Você precisa vender hoje:</p>
            <p class="text-3xl font-bold text-cyan-400 my-1">${goal.pieces} ${goal.pieces > 1 ? 'peças' : 'peça'}</p>
            <p class="text-gray-400">ou faturar <span class="font-semibold text-gray-300">${formatCurrency(goal.revenue)}</span></p>
        `;
    };

    // --- MAIN UPDATE FUNCTION ---
    const updateDashboard = () => {
        if (!loadData()) {
            if(initialLoader) initialLoader.textContent = "Erro ao carregar dados.";
            return;
        }
        
        renderVencimentosCard();
        renderContasAtrasoCard();
        renderAcoesPedidosCard();
        renderArtesPendentesCard();
        renderMetaDiaCard();

        currentDateEl.textContent = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

        if (initialLoader) {
            initialLoader.style.opacity = '0';
            setTimeout(() => initialLoader.remove(), 300);
        }
    };

    // --- SETTINGS MODAL ---
    const openSettings = () => {
        settingPriceInput.value = settings.price;
        settingCostInput.value = settings.cost;
        settingDeadlineDaysInput.value = settings.deadlineDays;
        settingListLimitInput.value = settings.listLimit;
        settingAutoOpenInput.checked = settings.autoOpen;
        settingsModal.classList.remove('hidden');
    };

    const closeSettings = () => settingsModal.classList.add('hidden');

    const saveSettings = (e) => {
        e.preventDefault();
        settings.price = parseFloat(settingPriceInput.value) || 0;
        settings.cost = parseFloat(settingCostInput.value) || 0;
        settings.deadlineDays = parseInt(settingDeadlineDaysInput.value, 10) || 3;
        settings.listLimit = parseInt(settingListLimitInput.value, 10) || 5;
        settings.autoOpen = settingAutoOpenInput.checked;
        
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        closeSettings();
        updateDashboard();
    };

    // --- ACTION HANDLERS (EVENT DELEGATION) ---
    document.body.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (!action) return;

        if (action === 'pay-bill') {
            const id = parseInt(e.target.dataset.id, 10);
            const monthKey = e.target.dataset.month;
            
            accountsDb.monthly_records[monthKey] = accountsDb.monthly_records[monthKey] || {};
            accountsDb.monthly_records[monthKey][id] = { status: 'paid', paid_date: new Date().toISOString().split('T')[0] };
            
            const account = accountsDb.accounts.find(acc => acc.id === id);
            if (account && account.type === 'installment') {
                account.current_installment = Math.min(account.current_installment + 1, account.total_installments);
            }

            localStorage.setItem('psyzon_accounts_db_v1', JSON.stringify(accountsDb));
            updateDashboard();
        }

    });

    // --- INITIALIZATION ---
    openSettingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    settingsForm.addEventListener('submit', saveSettings);

    const handleCloudDataUpdated = () => {
        updateDashboard();
    };

    window.addEventListener('cloud-data-updated', handleCloudDataUpdated);
    window.addEventListener('cloud-data-refresh-requested', handleCloudDataUpdated);

    // Wait for Firebase to initialize and load data
    const checkBackend = setInterval(() => {
        if (window.BackendInitialized) {
            clearInterval(checkBackend);
            updateDashboard();
        }
    }, 100);
});