
const PERSONAL_STORAGE_PREFIX = '__pessoal_json_v1__';
const personalStorage = {
    getItem(key) { return window.localStorage.getItem(`${PERSONAL_STORAGE_PREFIX}${key}`); },
    setItem(key, value) { return window.localStorage.setItem(`${PERSONAL_STORAGE_PREFIX}${key}`, value); },
    removeItem(key) { return window.localStorage.removeItem(`${PERSONAL_STORAGE_PREFIX}${key}`); }
};

const init = () => {
    // =========================================================================
    // 1. MAPEAMENTO DE ELEMENTOS DO HTML (Criamos variáveis para acessar a tela)
    // =========================================================================

    // Menu mobile (celular)
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    const isPersonalMode = true;

    const applyPersonalModeLayout = () => {
        if (!isPersonalMode) return;

        document.body.classList.add('personal-dashboard-mode');
        document.title = 'PSYZON - Dashboard Financeiro Pessoal';

        const heroTitle = document.querySelector('.dashboard-hero h1');
        if (heroTitle) heroTitle.textContent = 'DASHBOARD PESSOAL';

        const addLaunchBtnLabel = document.querySelector('#add-transaction-btn span');
        if (addLaunchBtnLabel) addLaunchBtnLabel.textContent = 'Lançamento Pessoal';

        const modeButtons = document.querySelectorAll('.toggle-mode-switcher .toggle-btn');
        modeButtons.forEach((btn) => {
            const isPersonalButton = (btn.getAttribute('href') || '').includes('pessoal/pessoal.html');
            btn.classList.toggle('active', isPersonalButton);
            if (isPersonalButton) btn.setAttribute('href', 'pessoal.html');
            if (!isPersonalButton) btn.setAttribute('href', '../index.html');
        });

        const desktopNav = document.querySelector('.desktop-topbar-nav');
        if (desktopNav) {
            desktopNav.querySelectorAll('a').forEach((link) => link.remove());
            const personalLinks = [
                { href: 'pessoal.html', label: 'PESSOAL', active: true },
                { href: 'Contaspessoal.html', label: 'CONTAS' },
                { href: 'metaspessoal.html', label: 'METAS' }
            ];
            personalLinks.forEach(({ href, label, active }) => {
                const link = document.createElement('a');
                link.href = href;
                link.textContent = label;
                link.className = `desktop-nav-link${active ? ' is-active' : ''}`;
                desktopNav.insertBefore(link, desktopNav.querySelector('.desktop-nav-logout'));
            });
        }


        if (mobileMenu) {
            mobileMenu.querySelectorAll('a').forEach((link) => link.remove());
            const menuContainer = mobileMenu.querySelector('div');
            const mobileLinks = [
                { href: 'pessoal.html', label: 'Pessoal', active: true },
                { href: 'Contaspessoal.html', label: 'Contas' },
                { href: 'metaspessoal.html', label: 'Metas' }
            ];
            mobileLinks.forEach(({ href, label, active }) => {
                const link = document.createElement('a');
                link.href = href;
                link.textContent = label;
                link.className = active
                    ? 'bg-cyan-500/20 text-cyan-300 block px-3 py-2 rounded-md text-base font-bold'
                    : 'text-gray-300 hover:bg-white/10 block px-3 py-2 rounded-md text-base font-medium';
                menuContainer?.insertBefore(link, menuContainer.querySelector('button'));
            });
        }

        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            bottomNav.querySelectorAll('a.bottom-nav-item').forEach((item) => item.remove());
            const menuButton = bottomNav.querySelector('#mobile-menu-button');
            const bottomLinks = [
                { href: 'pessoal.html', label: 'Pessoal', active: true },
                { href: 'Contaspessoal.html', label: 'Contas' },
                { href: 'metaspessoal.html', label: 'Metas' }
            ];
            bottomLinks.forEach(({ href, label, active }) => {
                const link = document.createElement('a');
                link.href = href;
                link.className = `bottom-nav-item${active ? ' active' : ''}`;
                link.innerHTML = `<span>${label}</span>`;
                bottomNav.insertBefore(link, menuButton);
            });
        }
    };

    applyPersonalModeLayout();

    // Variáveis para guardar os Gráficos do Dashboard, 
    // definidas aqui fora para não sumirem quando a tela atualiza
    let incomeExpenseChart, categoryChart, incomeSourceChart;

    // Se o botão do menu do celular existir, fazemos ele abrir/fechar o menu ao clicar
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => mobileMenu.classList.toggle('open'));
    }

    // Elementos do Resumo/Dashboard (Valores totais no topo da tela)
    const balanceEl = document.getElementById('balance');
    const incomeEl = document.getElementById('total-income');
    const expenseEl = document.getElementById('total-expense');
    const profitEl = document.getElementById('profit');
    const totalReceivablesEl = document.getElementById('total-receivables'); // A receber
    const totalPayablesEl = document.getElementById('total-payables');       // A pagar

    const loggedAccountDisplayEl = document.getElementById('logged-account-display');

    const resolveAccountLabel = (user) => {
        if (!user) return 'Conta logada: não identificada';
        const name = typeof user.displayName === 'string' ? user.displayName.trim() : '';
        const email = typeof user.email === 'string' ? user.email.trim() : '';
        const uid = typeof user.uid === 'string' ? user.uid.trim() : '';

        if (name && email) return `Conta logada: ${name} (${email})`;
        if (name) return `Conta logada: ${name}`;
        if (email) return `Conta logada: ${email}`;
        if (uid === 'local_user') return 'Conta logada: modo local';
        if (uid) return `Conta logada: ${uid}`;
        return 'Conta logada: não identificada';
    };

    const updateLoggedAccountDisplay = () => {
        if (!loggedAccountDisplayEl) return;
        const user = typeof window.firebaseAuth?.currentUser === 'function'
            ? window.firebaseAuth.currentUser()
            : null;
        loggedAccountDisplayEl.textContent = resolveAccountLabel(user);
    };

    updateLoggedAccountDisplay();
    setTimeout(updateLoggedAccountDisplay, 600);
    setTimeout(updateLoggedAccountDisplay, 1800);
    window.addEventListener('focus', updateLoggedAccountDisplay);


    // Quando clica no valor de "A Receber", leva o usuário para a tela de Processos
    if (totalReceivablesEl) {
        totalReceivablesEl.addEventListener('click', () => {
            window.location.href = '../processos.html?filter=receivables';
        });
    }

    // Barras de progresso e Limites de Gastos (Pessoal e Empresa)
    const transactionListEl = document.getElementById('transaction-list');

    // Ponto de Equilíbrio e Contas
    const breakEvenRevenueEl = document.getElementById('break-even-revenue');
    const dashboardBillsSummaryEl = document.getElementById('dashboard-bills-summary');
    const dashboardBillsPaidSummaryEl = document.getElementById('dashboard-bills-paid-summary');
    const breakEvenTargetEl = document.getElementById('break-even-target');
    const breakEvenRevenueBar = document.getElementById('break-even-revenue-bar');
    const breakEvenCostsBar = document.getElementById('break-even-costs-bar');

    // =========================================================================
    // 2. ELEMENTOS DO MODAL DE ADICIONAR LANÇAMENTOS (O "Pop-up" da tela inicial)
    // =========================================================================
    const modal = document.getElementById('modal');
    if (!modal) return; // Se a tela atual não tiver modal (ex: não é o index), para de executar o script aqui.

    const form = document.getElementById('form');
    // Campos do formulário de lançamento
    const nameInput = document.getElementById('name');
    const nameFieldContainer = document.getElementById('name-field-container');
    const nameInputWrapper = document.getElementById('name-input-wrapper');
    const nameIsClientCheckbox = document.getElementById('name-is-client-checkbox');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount'); // Valor em R$
    const dateInput = document.getElementById('date');     // Data do lançamento
    const typeInput = document.getElementById('type');     // Receita ou Despesa
    const categoryInput = document.getElementById('category'); // Categoria
    const quantityContainer = document.getElementById('quantity-field-container');
    const quantityInput = document.getElementById('transaction-quantity'); // Quantidade de peças

    const scopeContainer = document.getElementById('scope-container');
    const scopeButtonsContainer = document.getElementById('scope-container'); // Pessoal vs Empresarial
    const modalTitle = modal.querySelector('h2');

    // Botões de ação do Modal
    const addTransactionBtn = document.getElementById('add-transaction-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Seleção de Clientes no Modal
    const linkClientCheckbox = document.getElementById('link-client-checkbox');
    const clientSelectionContainer = document.getElementById('client-selection-container');
    const clientSearchInput = document.getElementById('client-search');
    const clientSelect = document.getElementById('client-select');

    // Notificações em tela (Aquelas janelinhas que avisam "Sucesso" ou "Erro")
    const notificationContainer = document.getElementById('notification-container');
    // Campos específicos para Lançamento de Tecidos (Estoque de Retalhos)
    const isFabricContainer = document.getElementById('is-fabric-container');
    const isFabricCheckbox = document.getElementById('is-fabric-checkbox');
    const fabricDetailsContainer = document.getElementById('fabric-details-container');
    const fabricColorInput = document.getElementById('fabric-color');
    const fabricWeightInput = document.getElementById('fabric-weight');

    // Adicionar Despesa direto para a Área de Contas a Pagar
    const createBillReminderContainer = document.getElementById('create-bill-reminder-container');
    const createBillReminderCheckbox = document.getElementById('create-bill-reminder-checkbox');

    // Botões de navegação no Modal (Quando está no celular e aparece passo 1, 2, 3...)
    const prevStepBtn = document.getElementById('prev-step-btn');
    const nextStepBtn = document.getElementById('next-step-btn');

    // =========================================================================
    // 3. DADOS PRINCIPAIS (Lendo do armazenamento do navegador - localStorage)
    // =========================================================================

    // Categorias Padrão de Receitas e Despesas (Se não tiver salvo, usa essas)
    let incomeCategories = JSON.parse(personalStorage.getItem('incomeCategories')) || ['Venda de Produto', 'Adiantamento', 'Serviços', 'Outros'];
    let expenseCategories = JSON.parse(personalStorage.getItem('expenseCategories')) || ['Matéria-Prima (Custo Direto)', 'Aluguel', 'Contas (Água, Luz, Internet)', 'Marketing e Vendas', 'Salários e Pró-labore', 'Impostos', 'Software e Ferramentas', 'Manutenção', 'Despesas Pessoais', 'Outros'];

    // Bancos de Dados Locais (Traz as informações salvas ou cria uma lista vazia [])
    let transactions = JSON.parse(personalStorage.getItem('transactions')) || []; // Fluxo de Caixa principal
    let clients = JSON.parse(personalStorage.getItem('clients')) || [];
    let productionOrders = JSON.parse(personalStorage.getItem('production_orders')) || []; // Pedidos em andamento

    const reloadRuntimeDataFromStorage = () => {
        transactions = JSON.parse(personalStorage.getItem('transactions')) || [];
        clients = JSON.parse(personalStorage.getItem('clients')) || [];
        productionOrders = JSON.parse(personalStorage.getItem('production_orders')) || [];
    };

    // Variáveis de controle de tela (Ajudam a saber o que usuário tá fazendo agora)
    let editingId = null; // Guarda o ID se a pessoa estiver editando um lançamento antigo
    let selectedScope = 'business'; // Por padrão, lança como despesa da empresa
    let currentStep = 1; // Passo do formulário no celular
    let currentLaunchId = null;
    let launchActionsBackdropEl = null;
    let launchActionsMenuEl = null;

    // Detecta se é o computador (Desktop) ou celular
    const DESKTOP_MEDIA_QUERY = window.matchMedia('(min-width: 900px)');

    // Filtros de tempo do extrato (ex: mostrar apenas "Este Mês")
    let transactionFilters = {
        period: 'this_month', // 'today', 'yesterday', '7days', '30days', 'this_month', 'last_month'
        type: 'all' // 'all', 'income', 'expense'
    };
    const INITIAL_TRANSACTIONS_BATCH = 120;
    const TRANSACTIONS_BATCH_STEP = 80;
    let lastFilteredTransactions = [];
    let visibleTransactionsLimit = INITIAL_TRANSACTIONS_BATCH;

    // =========================================================================
    // 4. FUNÇÕES UTILITÁRIAS (Ajudantes para o restante do código)
    // =========================================================================

    // Salva o caixa atualizado no navegador
    const saveTransactions = () => personalStorage.setItem('transactions', JSON.stringify(transactions));

    // Formata um número para Moeda (ex: 15.5 vira R$ 15,50)
    const formatCurrency = (amount) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Formata a Data para padrão brasileiro (ex: 2024-05-10 vira 10/05/2024)
    const formatDate = (dateString) => new Date(dateString + 'T03:00:00').toLocaleDateString('pt-BR');

    // Exibe aquelas caixas de alerta pop-up no canto do painel (ex: "Sucesso! Lançamento criado")
    const showNotification = (message, type = 'info') => {
        if (!notificationContainer) return;
        const colors = { info: 'bg-cyan-500', warning: 'bg-yellow-500', danger: 'bg-red-500 animate-pulse' };

        // Cria um elemento HTML na tela para mostrar o aviso
        const notificationId = `notif-${Date.now()}`;
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `relative w-full p-4 rounded-lg shadow-lg text-white ${colors[type]} transform translate-x-full opacity-0 transition-all duration-500 ease-out`;
        notification.innerHTML = `<p class="font-bold text-sm">${message}</p><button onclick="document.getElementById('${notificationId}').remove()" class="absolute top-1 right-1 text-white/70 hover:text-white">&times;</button>`;

        notificationContainer.appendChild(notification);

        // Faz o balãozinho deslizar para a tela
        setTimeout(() => { notification.classList.remove('translate-x-full', 'opacity-0'); }, 100);

        // Faz o balãozinho desaparecer sozinho após 7 segundos
        setTimeout(() => { notification.remove(); }, 7000);
    };

    // Verifica os prazos de produção da equipe e avisa se algo está vencendo hoje

    // =========================================================================
    // 5. CARROSSEL DA TELA INICIAL (Caixinhas que deslizam para o lado)
    // =========================================================================
    // Essa função permite arrastar as caixas pro lado no celular ou clicar nas "bolinhas"
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


    // =========================================================================
    // 6. REGRAS DO FORMULÁRIO (Modal de Adição de Caixa)
    // Opcionais que somem ou aparecem dependendo do que o usuário clica
    // =========================================================================

    // Esconde o campo "Nome Solto" se a caixinha "É um cliente" estiver marcada
    const toggleNameFieldByClient = () => {
        if (!nameInputWrapper || !nameInput || !nameIsClientCheckbox) return;
        const shouldHideNameField = nameIsClientCheckbox.checked;
        nameInputWrapper.classList.toggle('hidden', shouldHideNameField);
        nameInput.disabled = shouldHideNameField;
        nameInput.required = false;
        if (shouldHideNameField) {
            nameInput.value = '';
        }
    };

    // Mostra o campo de "Quantidade" apenas se escolheu "Venda de Produto"
    const toggleQuantityField = () => {
        const isProductSale = typeInput.value === 'income' && categoryInput.value === 'Venda de Produto';
        quantityContainer.classList.toggle('hidden', !isProductSale);
        quantityInput.required = isProductSale;
        if (!isProductSale) quantityInput.value = '';
    };

    // Mostra os campos de "Cor e Peso do Fio" apenas se for Despesa (Compra de material)
    const toggleFabricDetailsField = () => {
        const isExpense = typeInput.value === 'expense';
        isFabricContainer.classList.toggle('hidden', !isExpense);

        if (!isExpense) {
            isFabricCheckbox.checked = false;
        }
        fabricDetailsContainer.classList.toggle('hidden', !isFabricCheckbox.checked);
    };

    // Mostra os botõezinhos "Empresa x Pessoal" apenas quando for Despesa
    const toggleScopeField = () => {
        const isExpense = typeInput.value === 'expense';
        scopeContainer.classList.toggle('hidden', !isExpense);
        updateScopeButtonsState();
        if (createBillReminderContainer) {
            createBillReminderContainer.classList.toggle('hidden', !isExpense);
            if (!isExpense && createBillReminderCheckbox) {
                createBillReminderCheckbox.checked = false;
            }
        }
    };

    // Troca a lista de categorias. Se marcou "Receita", mostra as opções de venda. Se marcou "Despesa", mostra as de compra.
    const updateCategoryOptions = () => {
        const options = typeInput.value === 'income' ? incomeCategories : expenseCategories;
        categoryInput.innerHTML = options.map(cat => `<option value="${cat}" class="bg-gray-800">${cat}</option>`).join('');
    };

    // Busca a ID numérica do cliente pelo campo de seleção
    const getTypedClientIdBySelectValue = (selectedValue) => {
        if (!selectedValue) return null;
        const matchedClient = clients.find(client => String(client.id) === selectedValue);
        return matchedClient ? matchedClient.id : selectedValue;
    };

    // Preenche a caixinha "Selecione o Cliente" com todos os clientes salvos
    const populateClientSelect = () => {
        clients = JSON.parse(personalStorage.getItem('clients')) || [];
        // O placeholder é ocultado pois o campo de busca cumpre essa função.
        clientSelect.innerHTML = '<option value="" class="bg-gray-800 p-2 hidden">Selecione...</option>';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = String(client.id);
            option.textContent = client.name;
            option.className = 'bg-gray-800 p-2';
            clientSelect.appendChild(option);
        });
    };

    // Se escolher o cliente "João", já preenche o campo "Descrição" automaticamente com "João" (Se "Is Client" estiver checado)
    const handleClientSelection = () => {
        if (!clientSelect) return;
        const selectedId = clientSelect.value;
        const selectedName = clientSelect.options[clientSelect.selectedIndex]?.textContent?.trim() || '';

        if (!selectedId) return;

        console.log('Cliente selecionado:', { id: selectedId, name: selectedName });

        if (nameIsClientCheckbox?.checked && selectedName) {
            nameInput.value = selectedName;
        }
    };

    // Pinta o botão Empresa/Pessoal de azul dependendo de qual estiver selecionado
    const updateScopeButtonsState = () => {
        document.querySelectorAll('.scope-btn').forEach((btn) => {
            const isSelected = btn.dataset.scope === selectedScope;
            btn.classList.toggle('is-selected', isSelected);
            btn.classList.toggle('border-cyan-400', isSelected);
            btn.classList.toggle('border-transparent', !isSelected);
            btn.setAttribute('aria-pressed', String(isSelected));
        });
    };

    if (scopeButtonsContainer) {
        scopeButtonsContainer.addEventListener('click', (event) => {
            const button = event.target.closest('.scope-btn');
            if (!button) return;
            selectedScope = button.dataset.scope || 'business';
            updateScopeButtonsState();
        });
    }


    // Executando regras iniciais pela primeira vez pra carregar tela
    toggleNameFieldByClient();
    updateScopeButtonsState();

    // =========================================================================
    // 7. FUNÇÃO DE SALVAR O NOVO LANÇAMENTO
    // Quando o usuário preenche o formulário todo e clica no botão "Adicionar"
    // =========================================================================
    const handleFormSubmit = (e) => {
        // e.preventDefault() impede a página de recarregar "piscando" na tela
        e.preventDefault();
        const isProductSale = typeInput.value === 'income' && categoryInput.value === 'Venda de Produto';
        if (!descriptionInput.value.trim() || !amountInput.value.trim() || !dateInput.value) { alert('Por favor, preencha todos os campos obrigatórios.'); return; }
        if (isProductSale && (!quantityInput.value || parseInt(quantityInput.value, 10) <= 0)) { alert('Por favor, informe uma quantidade de peças válida.'); return; }
        if (linkClientCheckbox.checked && !clientSelect.value) { alert('Por favor, selecione um cliente.'); return; }

        const amount = typeInput.value === 'expense' ? -Math.abs(parseFloat(amountInput.value)) : parseFloat(amountInput.value);

        const selectedClientId = getTypedClientIdBySelectValue(clientSelect.value);

        const transactionData = {
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
            amount,
            date: dateInput.value,
            type: typeInput.value,
            category: categoryInput.value,
            scope: typeInput.value === 'expense' ? selectedScope : null,
            clientId: linkClientCheckbox.checked && selectedClientId ? selectedClientId : null,
            quantity: 0,
            weightKg: 0,
            fabricColor: null,
            createdAt: new Date() // Adiciona timestamp para futuras queries no Firestore
        };

        // --- NEW LOGIC: Create Bill Reminder ---
        if (createBillReminderCheckbox && createBillReminderCheckbox.checked && transactionData.type === 'expense') {
            try {
                const DB_KEY = 'psyzon_accounts_db_v1';
                const billsDataRaw = personalStorage.getItem(DB_KEY);
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
                personalStorage.setItem(DB_KEY, JSON.stringify(billsDb));
                showNotification('Lembrete de conta criado com sucesso!', 'info');
            } catch (error) { console.error("Erro ao criar lembrete de conta:", error); showNotification('Falha ao criar lembrete de conta.', 'danger'); }
        }
        if (isProductSale) {
            transactionData.quantity = parseInt(quantityInput.value, 10) || 0;
        }
        if (isFabricCheckbox.checked) {
            transactionData.weightKg = parseFloat(fabricWeightInput.value) || 0;
            transactionData.fabricColor = fabricColorInput.value.trim() || null;
        }

        let newTransactionId = null;
        if (editingId) {
            const transactionIndex = transactions.findIndex(t => t.id === editingId);
            if (transactionIndex > -1) {
                transactions[transactionIndex] = { ...transactions[transactionIndex], ...transactionData };
            }
        } else {
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
                    personalStorage.setItem('prefill_order_form', JSON.stringify(prefillData));
                    window.location.href = 'processos.html?action=new_order';
                }
            }, 500);
        }
    };

    // =========================================================================
    // 8. LÓGICA DO "ASSISTENTE EM PASSOS" (Somente para a tela de Celular)
    // Controla quando o usuário clica em "Próximo Passo", ex: "Escolher Categoria -> Escolher Valor"
    // =========================================================================
    const updateWizardUI = () => {
        const isMobile = window.innerWidth < 768;
        const stepGroups = document.querySelectorAll('.step-group');
        const stepIndicators = document.querySelectorAll('.step-indicator');
        const wizardContainer = document.querySelector('#form > .grid');

        // Show/Hide Steps
        stepGroups.forEach(el => {
            const step = parseInt(el.dataset.step);
            if (isMobile) {
                const isCurrentStep = step === currentStep;
                el.classList.toggle('hidden', !isCurrentStep);
                el.style.transform = 'none';
                el.style.opacity = isCurrentStep ? '1' : '0';
                el.style.pointerEvents = isCurrentStep ? 'auto' : 'none';
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

    if (nameFieldContainer) {
        nameFieldContainer.addEventListener('change', (event) => {
            if (event.target && event.target.id === 'name-is-client-checkbox') {
                toggleNameFieldByClient();
            }
        });
    }

    if (nextStepBtn) nextStepBtn.addEventListener('click', () => {
        if (validateStep(currentStep)) { currentStep++; updateWizardUI(); }
    });

    if (prevStepBtn) prevStepBtn.addEventListener('click', () => { currentStep--; updateWizardUI(); });

    // =========================================================================
    // 9. ABRIR E FECHAR O MODAL (Janela do formulário)
    // =========================================================================

    // Zera tudo e abre a tela limpa para adicionar um novo registro
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
        updateScopeButtonsState();
        if (nameIsClientCheckbox) nameIsClientCheckbox.checked = false;
        toggleNameFieldByClient();
        modalTitle.textContent = 'Novo Lançamento';
        submitBtn.textContent = 'Adicionar';
        currentStep = 1;
        updateWizardUI();
        modal.classList.remove('hidden');
    };

    // Preenche os campos caso a pessoa tenha clicado em editar um lançamento que já existe
    window.openEditModal = (id) => {
        editingId = id;
        const transaction = transactions.find(t => t.id === id);
        if (!transaction) return;

        form.reset();
        if (createBillReminderCheckbox) createBillReminderCheckbox.checked = false;
        nameInput.value = transaction.name || '';
        if (nameIsClientCheckbox) nameIsClientCheckbox.checked = !transaction.name;
        toggleNameFieldByClient();
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
            updateScopeButtonsState();
        }

        populateClientSelect();
        if (clientSearchInput) clientSearchInput.value = ''; // Reset search
        Array.from(clientSelect.options).forEach(opt => opt.style.display = ''); // Reset visibility
        if (transaction.clientId) {
            linkClientCheckbox.checked = true;
            clientSelectionContainer.classList.remove('hidden');
            clientSelect.value = String(transaction.clientId);
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

    // Somente fecha e oculta o Modal, zerando o ID que estava editando
    const closeModal = () => {
        editingId = null;
        form.reset();
        if (nameIsClientCheckbox) nameIsClientCheckbox.checked = false;
        toggleNameFieldByClient();
        modal.classList.add('hidden');
    };

    // =========================================================================
    // 10. INTEGRAÇÃO FINANCEIRA COM OUTRAS ABAS
    // =========================================================================

    // Soma (ou diminui) uma roupa vendida na lista de "Produção" (Dashboard de custo por peça)
    const updateMonthlyProduction = (month, quantity) => {
        let monthlyProduction = JSON.parse(personalStorage.getItem('monthlyProduction')) || [];
        const existingEntryIndex = monthlyProduction.findIndex(item => item.month === month);
        if (existingEntryIndex > -1) {
            monthlyProduction[existingEntryIndex].quantity += quantity;
        } else {
            monthlyProduction.push({ month: month, quantity: quantity });
        }
        personalStorage.setItem('monthlyProduction', JSON.stringify(monthlyProduction));
    };

    // Função chamada  quando clica na lixeira para Excluir um lançamento do extrato
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

    // Cria uma cópia de um lançamento existente para acelerar lançamentos repetidos
    const duplicateTransaction = (id) => {
        const sourceTransaction = transactions.find(t => t.id === id);
        if (!sourceTransaction) return;

        const duplicatedTransaction = {
            ...sourceTransaction,
            id: Date.now()
        };

        transactions.push(duplicatedTransaction);
        saveTransactions();

        if (duplicatedTransaction.type === 'income' && duplicatedTransaction.category === 'Venda de Produto' && duplicatedTransaction.quantity > 0) {
            updateMonthlyProduction(duplicatedTransaction.date.substring(0, 7), duplicatedTransaction.quantity);
        }

        updateUI();
        showNotification('Lançamento duplicado com sucesso.', 'info');
    };

    // Corta os nomes caso passem de 26 caracteres para a tela não ficar esticada
    const compactLabel = (text = '', maxLength = 26) => {
        if (text.length <= maxLength) return text;
        return `${text.slice(0, maxLength).trimEnd()}…`;
    };

    const renderTransactionLoadMore = () => {
        const existing = transactionListEl.querySelector('.launch-load-more-wrap');
        if (existing) existing.remove();

        if (lastFilteredTransactions.length <= visibleTransactionsLimit) return;

        const wrap = document.createElement('div');
        wrap.className = 'launch-load-more-wrap text-center py-3';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-shine py-2 px-4 rounded-lg text-sm font-semibold';
        btn.textContent = `Carregar mais lançamentos (${Math.min(TRANSACTIONS_BATCH_STEP, lastFilteredTransactions.length - visibleTransactionsLimit)} de ${lastFilteredTransactions.length - visibleTransactionsLimit})`;
        btn.addEventListener('click', () => {
            visibleTransactionsLimit += TRANSACTIONS_BATCH_STEP;
            renderRecentTransactions();
        });

        wrap.appendChild(btn);
        transactionListEl.appendChild(wrap);
    };

    // Pega a lista invisível no computador, cria o HTML e empurra na Área de "Extrato" da tela
    const addTransactionToDOM = (transaction) => {
        const { id, name, description, amount, date, category, type, scope } = transaction;
        const item = document.createElement('article');
        item.className = 'transaction-card launch-row';
        item.dataset.id = id;
        item.dataset.launchId = id;

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

        const formattedDate = formatDate(date);
        const metaItems = [
            `<span class="data-chip data-date" title="${formattedDate}">${formattedDate}</span>`,
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

            <div class="cell data-date" title="${formattedDate}">${formattedDate}</div>

            <div class="cell data-meta">${metaItems}</div>

            <div class="cell data-action actions">
                <div class="flex items-center justify-end gap-2">
                    <button class="action-toggle-btn duplicate" data-action="duplicate" data-id="${id}" title="Duplicar" aria-label="Duplicar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9h10v10H9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5h10v10"></path></svg>
                    </button>
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

    // =========================================================================
    // 11. MENU DE AÇÕES NO COMPUTADOR (Editar/Excluir nos 3 pontinhos)
    // =========================================================================

    // Fecha a janelinha de opções
    const closeLaunchActionsMenu = () => {
        if (!launchActionsMenuEl || !launchActionsBackdropEl) return;
        launchActionsMenuEl.hidden = true;
        launchActionsBackdropEl.hidden = true;
        currentLaunchId = null;
    };

    // Abre a janelinha de opções (Editar ou Deletar) grudadinha ao botão que foi clicado
    const openLaunchActionsMenu = (card, launchId) => {
        if (!launchActionsMenuEl || !launchActionsBackdropEl) return;
        if (!launchId || !DESKTOP_MEDIA_QUERY.matches) return;

        currentLaunchId = parseInt(launchId, 10);
        if (Number.isNaN(currentLaunchId)) {
            currentLaunchId = null;
            return;
        }

        const rect = card.getBoundingClientRect();
        const safePadding = 16;

        launchActionsMenuEl.hidden = false;
        launchActionsBackdropEl.hidden = false;

        const menuRect = launchActionsMenuEl.getBoundingClientRect();
        const maxLeft = window.innerWidth - menuRect.width - safePadding;
        const maxTop = window.innerHeight - menuRect.height - safePadding;

        let left = rect.left + rect.width - menuRect.width;
        let top = rect.top + 12;

        if (left < safePadding) left = safePadding;
        if (left > maxLeft) left = maxLeft;
        if (top < safePadding) top = safePadding;
        if (top > maxTop) top = maxTop;

        launchActionsMenuEl.style.left = `${left}px`;
        launchActionsMenuEl.style.top = `${top}px`;
    };

    const initDesktopLaunchCardActions = () => {
        if (!transactionListEl || transactionListEl.dataset.desktopActionsInit === 'true') return;

        const existingBackdrop = document.getElementById('launchActionsBackdrop');
        const existingMenu = document.getElementById('launchActionsMenu');

        launchActionsBackdropEl = existingBackdrop || document.createElement('div');
        launchActionsMenuEl = existingMenu || document.createElement('div');

        if (!existingBackdrop) {
            launchActionsBackdropEl.id = 'launchActionsBackdrop';
            launchActionsBackdropEl.className = 'actions-backdrop';
            launchActionsBackdropEl.hidden = true;
            document.body.appendChild(launchActionsBackdropEl);
        }

        if (!existingMenu) {
            launchActionsMenuEl.id = 'launchActionsMenu';
            launchActionsMenuEl.className = 'actions-menu';
            launchActionsMenuEl.hidden = true;
            launchActionsMenuEl.setAttribute('role', 'dialog');
            launchActionsMenuEl.setAttribute('aria-modal', 'true');
            launchActionsMenuEl.innerHTML = `
                <button type="button" class="actions-btn actions-duplicate" data-action="duplicate">Duplicar</button>
                <button type="button" class="actions-btn actions-edit" data-action="edit">Editar</button>
                <button type="button" class="actions-btn actions-delete" data-action="delete">Deletar</button>
            `;
            document.body.appendChild(launchActionsMenuEl);
        }

        launchActionsBackdropEl.addEventListener('click', closeLaunchActionsMenu);

        launchActionsMenuEl.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            if (!actionBtn || !currentLaunchId) return;

            const action = actionBtn.dataset.action;
            if (action === 'duplicate') {
                duplicateTransaction(currentLaunchId);
                closeLaunchActionsMenu();
                return;
            }

            if (action === 'edit') {
                openEditModal(currentLaunchId);
                closeLaunchActionsMenu();
                return;
            }

            if (action === 'delete') {
                removeTransaction(currentLaunchId);
                closeLaunchActionsMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeLaunchActionsMenu();
        });

        DESKTOP_MEDIA_QUERY.addEventListener('change', (event) => {
            if (!event.matches) closeLaunchActionsMenu();
        });

        window.addEventListener('resize', () => {
            if (!DESKTOP_MEDIA_QUERY.matches) closeLaunchActionsMenu();
        });

        transactionListEl.dataset.desktopActionsInit = 'true';
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
            } else if (action === 'duplicate') {
                duplicateTransaction(id);
            } else if (action === 'delete') {
                removeTransaction(id);
            }
            return;
        }

        const clickedInteractiveElement = e.target.closest('button, a, input, select, textarea');
        if (clickedInteractiveElement) return;

        if (card && DESKTOP_MEDIA_QUERY.matches) {
            const id = card.dataset.launchId || card.dataset.id;
            openLaunchActionsMenu(card, id);
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

    // =========================================================================
    // 12. ATUALIZAÇÃO DA TELA INICIAL (DASHBOARD)
    // Tudo que aparece de resumo de números, contas e prazos na primeira tela
    // =========================================================================

    initDesktopLaunchCardActions();

    // Lê da Aba de Contas e monta a listinha de "Contas a Pagar" deste mês
    const updateDashboardBillsCard = () => {
        if (!dashboardBillsSummaryEl) return;

        const billsDataRaw = personalStorage.getItem('psyzon_accounts_db_v1');
        if (!billsDataRaw) {
            dashboardBillsSummaryEl.innerHTML = '<a href="Contaspessoal.html" class="text-sm text-gray-400 hover:text-cyan-400">Nenhuma conta configurada. Clique para começar.</a>';
            if (dashboardBillsPaidSummaryEl) {
                dashboardBillsPaidSummaryEl.innerHTML = '<p class="text-sm text-gray-400">Nenhuma conta paga no mês.</p>';
            }
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

        if (!dashboardBillsPaidSummaryEl) return;
        const paidBills = billsDb.accounts
            .map(acc => {
                const record = monthlyRecords[acc.id] || { status: 'pending' };
                const isActive = acc.type === 'fixed' || (acc.type === 'unique' && acc.unique_date === monthKey) || (acc.type === 'installment' && acc.current_installment <= acc.total_installments);
                if (isActive && record.status === 'paid') {
                    return { ...acc, ...record };
                }
                return null;
            })
            .filter(Boolean)
            .sort((a, b) => a.due_day - b.due_day);

        const totalPaid = paidBills.reduce((sum, bill) => sum + bill.amount, 0);
        const recentPaid = paidBills.slice(-3).reverse();
        let paidHtml = `<div class="flex justify-between items-baseline mb-2"><span class="font-bold text-green-400">${formatCurrency(totalPaid)}</span><span class="text-sm text-gray-400">Pago</span></div>`;
        if (recentPaid.length > 0) {
            paidHtml += recentPaid.map(bill => `<div class="text-sm flex justify-between border-t border-white/5 pt-1 mt-1"><span>${bill.name}</span><span class="font-semibold">Dia ${bill.due_day}</span></div>`).join('');
        } else {
            paidHtml += '<p class="text-sm text-gray-400 mt-2">Nenhuma conta paga ainda.</p>';
        }
        dashboardBillsPaidSummaryEl.innerHTML = paidHtml;
    };

    // Escreve os itens do Fluxo de Caixa no HTML (Parte do Extrato lá embaixo), aplicando os filtros de Dia/Mês/Ano
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
        lastFilteredTransactions = filteredTransactions;
        if (visibleTransactionsLimit < INITIAL_TRANSACTIONS_BATCH) {
            visibleTransactionsLimit = INITIAL_TRANSACTIONS_BATCH;
        }

        transactionListEl.innerHTML = '';
        if (filteredTransactions.length === 0) {
            transactionListEl.innerHTML = '<div class="text-center text-gray-400 p-4">Sem lançamentos neste período</div>';
            return;
        }

        filteredTransactions.slice(0, visibleTransactionsLimit).forEach(addTransactionToDOM);
        renderTransactionLoadMore();
    };

    // Essa é a função principal que CALCULA TUDO: Soma os totais, vê quantos % já gastou do limite, etc.
    // É chamada sempre que algo novo é adicionado ou excluído.

    const handleCloudDataUpdated = () => {
        reloadRuntimeDataFromStorage();
        updateCategoryOptions();
        populateClientSelect();
        updateUI();
    };

    window.addEventListener('cloud-data-updated', handleCloudDataUpdated);

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
        const totalExpensesMonth = Math.abs(businessExpenseMonth) + Math.abs(personalExpenseMonth);
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
        const productionOrdersList = JSON.parse(personalStorage.getItem('production_orders')) || [];
        let receivablesTotal = 0;
        let receivablesCount = 0;
        let hasOverdueReceivables = false;
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

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

        if (totalPayablesEl) {
            const billsDataRaw = personalStorage.getItem('psyzon_accounts_db_v1');
            let payables = 0;
            let payablesCount = 0;
            if (billsDataRaw) {
                const billsDb = JSON.parse(billsDataRaw);
                const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
                const monthlyRecords = billsDb.monthly_records?.[monthKey] || {};
                billsDb.accounts.forEach(acc => {
                    const record = monthlyRecords[acc.id] || { status: 'pending' };
                    const isActive = acc.type === 'fixed' || (acc.type === 'unique' && acc.unique_date === monthKey) || (acc.type === 'installment' && acc.current_installment <= acc.total_installments);
                    if (isActive && (record.status === 'pending' || record.status === 'overdue')) {
                        payables += acc.amount || 0;
                        payablesCount += 1;
                    }
                });
            }
            totalPayablesEl.innerHTML = `
                <div>${formatCurrency(payables)}</div>
                <div class="text-xs text-gray-400 mt-1">${payablesCount} contas pendentes</div>
            `;
        }

        renderRecentTransactions();
        updateCharts(monthlyTransactions);
        saveTransactions();
        updateDashboardBillsCard();
    };

    // =========================================================================
    // 13. CONSTRUÇÃO DOS GRÁFICOS
    // =========================================================================

    // Desenha as linhas e fatias coloridas da parte de Análises
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

    };

    // --- EVENT LISTENERS ---
    if (addTransactionBtn) addTransactionBtn.addEventListener('click', openAddModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (form) form.addEventListener('submit', handleFormSubmit);
    if (typeInput) typeInput.addEventListener('change', () => { updateCategoryOptions(); toggleQuantityField(); toggleScopeField(); toggleFabricDetailsField(); });
    if (categoryInput) categoryInput.addEventListener('change', () => { toggleQuantityField(); toggleFabricDetailsField(); });
    if (linkClientCheckbox) linkClientCheckbox.addEventListener('change', () => {
        clientSelectionContainer.classList.toggle('hidden', !linkClientCheckbox.checked);
    });
    if (isFabricCheckbox) isFabricCheckbox.addEventListener('change', () => {
        fabricDetailsContainer.classList.toggle('hidden', !isFabricCheckbox.checked);
    });
    if (clientSelect) {
        clientSelect.removeEventListener('change', handleClientSelection);
        clientSelect.removeEventListener('dblclick', handleClientSelection);
        clientSelect.addEventListener('change', handleClientSelection);
        clientSelect.addEventListener('dblclick', handleClientSelection);
    }

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
                visibleTransactionsLimit = INITIAL_TRANSACTIONS_BATCH;
            }

            if (typeBtn) {
                filtersContainer.querySelectorAll('.syt-type-filter-btn').forEach(btn => btn.classList.remove('active'));
                typeBtn.classList.add('active');
                transactionFilters.type = typeBtn.dataset.filterType;
                visibleTransactionsLimit = INITIAL_TRANSACTIONS_BATCH;
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

    // =========================================================================
    // 15. INICIALIZAÇÃO "BOOSTRAP" (A primeira coisa que roda)
    // =========================================================================
    updateUI();

    // Liga os 3 carrosséis de arrastar da tela do celular
    setupCarousel('bills-carousel', 'bills-carousel-dots');
    setupCarousel('charts-carousel', 'charts-carousel-dots');
};

// Aqui o JS verifica se a tela "já abriu os olhos" (DOMContentLoaded). 
// Se sim, roda tudo. Se não, espera a tela abrir.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
