const init = () => {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton) { mobileMenuButton.addEventListener('click', () => mobileMenu.classList.toggle('open')); }

    const addOrderBtn = document.getElementById('add-order-btn');
    const processTabButtons = Array.from(document.querySelectorAll('.process-tab-btn[data-tab]'));
    const processPanels = Array.from(document.querySelectorAll('.process-panel[data-panel]'));
    let currentTab = 'quadro';

    const columns = { 
        todo: document.getElementById('column-todo'), 
        doing: document.getElementById('column-doing'), 
        done: document.getElementById('column-done') 
    };

    const orderModal = document.getElementById('order-modal');
    const orderForm = document.getElementById('order-form');
    const orderModalTitle = document.getElementById('order-modal-title');
    const cancelOrderBtn = document.getElementById('cancel-order-btn');
    const orderDescriptionInput = document.getElementById('order-description');
    const orderClientSelect = document.getElementById('order-client');
    const orderClientSearchInput = document.getElementById('order-client-search');
    const orderDeadlineInput = document.getElementById('order-deadline');
    const orderClientContactInput = document.getElementById('order-client-contact');
    const orderChecklistContainer = document.getElementById('order-checklist');
    const orderNotesInput = document.getElementById('order-notes');
    const orderTotalValueInput = document.getElementById('order-total-value');
    const orderAmountPaidInput = document.getElementById('order-amount-paid');
    const orderIsPaidCheckbox = document.getElementById('order-is-paid');
    const cuttingDetailsSection = document.getElementById('cutting-details-section');
    const cuttingSubtasksContainer = document.getElementById('cutting-subtasks-container');
    // Controle de cortes 2.0 (UI renderizada pelo módulo cutting-system.js)

    const tasksContainer = document.getElementById('tasks-container');
    const cuttingTasksContainer = document.getElementById('cutting-tasks-container');
    const ordersHistoryContainer = document.getElementById('orders-history-container');
    const orderPrintTypeSelect = document.getElementById('order-print-type');
    const orderColorsContainer = document.getElementById('order-colors-container');
    const addColorBtn = document.getElementById('add-color-btn');

    // Art Only Mode Refs
    const isArtOnlyCheckbox = document.getElementById('is-art-only');
    const artOnlyBlock = document.getElementById('art-only-block');
    const artOnlyImagesPreview = document.getElementById('art-only-images-preview');
    const artOnlyImageInput = document.getElementById('art-only-image-input');
    const addArtOnlyImageBtn = document.getElementById('add-art-only-image-btn');
    const paymentSection = document.getElementById('payment-section');
    const productionSection = document.getElementById('production-section');
    const printTypeSection = document.getElementById('print-type-section');
    const colorsSection = document.getElementById('colors-section');
    let activeArtOnlyImages = [];

    // printing UI / notes / conditional block
    const orderPrintingBlock = document.getElementById('order-printing-block');
    const orderDtfImageInput = document.getElementById('order-dtf-image-input');
    const orderAddDtfImageBtn = document.getElementById('order-add-dtf-image-btn');
    const orderPrintingImagesContainer = document.getElementById('order-printing-images');
    const orderPrintQuantityInput = document.getElementById('order-print-quantity');
    const orderPrintingNotesInput = document.getElementById('order-printing-notes');
    const checkAllDtfImagesBtn = document.getElementById('check-all-dtf-images-btn');
    const clearDtfImagesBtn = document.getElementById('clear-dtf-images-btn');
    let activeDtfImages = []; // temp storage while modal is open
    // toggle visibility of DTF block based on select
    const togglePrintingBlock = () => {
        if (!orderPrintingBlock || !orderPrintTypeSelect) return;
        if (orderPrintTypeSelect.value === 'dtf') orderPrintingBlock.classList.remove('hidden');
        else orderPrintingBlock.classList.add('hidden');
    };
    // attach change handler so block appears when user selects DTF
    if (orderPrintTypeSelect) orderPrintTypeSelect.addEventListener('change', togglePrintingBlock);
    // make sure block reflects initial state
    togglePrintingBlock();


    const copyTextSafe = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            return true;
        } catch (_) {
            try {
                const temp = document.createElement('textarea');
                temp.value = textToCopy;
                temp.setAttribute('readonly', '');
                temp.style.position = 'fixed';
                temp.style.opacity = '0';
                document.body.appendChild(temp);
                temp.select();
                const ok = document.execCommand('copy');
                temp.remove();
                return ok;
            } catch (__){
                return false;
            }
        }
    };

    // Toggle Art Only Mode
    const toggleArtOnlyMode = () => {
        if (!isArtOnlyCheckbox) return;
        const isArt = isArtOnlyCheckbox.checked;
        const deadlineLabel = document.querySelector('label[for="order-deadline"]');
        
        if (isArt) {
            if(paymentSection) paymentSection.classList.add('hidden');
            if(productionSection) productionSection.classList.add('hidden');
            if(printTypeSection) printTypeSection.classList.add('hidden');
            if(colorsSection) colorsSection.classList.add('hidden');
            if(artOnlyBlock) artOnlyBlock.classList.remove('hidden');
            if(deadlineLabel) deadlineLabel.textContent = "Data de Entrega da Arte";
            // Disable required on hidden fields if any (total value is required)
            if(orderTotalValueInput) orderTotalValueInput.removeAttribute('required');
        } else {
            if(paymentSection) paymentSection.classList.remove('hidden');
            if(productionSection) productionSection.classList.remove('hidden');
            if(printTypeSection) printTypeSection.classList.remove('hidden');
            if(colorsSection) colorsSection.classList.remove('hidden');
            if(artOnlyBlock) artOnlyBlock.classList.add('hidden');
            if(deadlineLabel) deadlineLabel.textContent = "Prazo de Entrega";
            if(orderTotalValueInput) orderTotalValueInput.setAttribute('required', 'true');
        }
    };
    if (isArtOnlyCheckbox) isArtOnlyCheckbox.addEventListener('change', toggleArtOnlyMode);

    // Art Only Image Handlers
    const renderArtOnlyPreviews = () => {
        if (!artOnlyImagesPreview) return;
        artOnlyImagesPreview.innerHTML = '';
        activeArtOnlyImages.forEach((img, idx) => {
            const wrap = document.createElement('div');
            wrap.className = 'relative w-24 h-24 rounded overflow-hidden border border-white/10';
            const imageEl = document.createElement('img');
            imageEl.src = img;
            imageEl.className = 'w-full h-full object-cover';
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'absolute top-1 right-1 bg-black/60 text-white rounded px-1';
            del.innerHTML = '&times;';
            del.onclick = (e) => { e.stopPropagation(); activeArtOnlyImages.splice(idx, 1); renderArtOnlyPreviews(); };
            wrap.appendChild(imageEl);
            wrap.appendChild(del);
            artOnlyImagesPreview.appendChild(wrap);
        });
    };

    if (addArtOnlyImageBtn && artOnlyImageInput) {
        addArtOnlyImageBtn.addEventListener('click', () => artOnlyImageInput.click());
        artOnlyImageInput.addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    activeArtOnlyImages.push(ev.target.result);
                    renderArtOnlyPreviews();
                };
                reader.readAsDataURL(file);
            });
            e.target.value = '';
        });
    }

    const artTasksContainer = document.getElementById('art-tasks-container');
    const artModal = document.getElementById('art-modal');
    const artModalTitle = document.getElementById('art-modal-title');
    const closeArtModalBtn = document.getElementById('close-art-modal-btn');
    const artBriefingInput = document.getElementById('art-briefing');
    const artReferencesContainer = document.getElementById('art-references-container');
    const addArtImageBtn = document.getElementById('add-art-image-btn');
    const artImageInput = document.getElementById('art-image-input');
    // saveArtBtn removido da lógica antiga, agora usamos o controle de versões
    const saveArtBtn = document.getElementById('save-art-btn');

    let productionOrders = JSON.parse(localStorage.getItem('production_orders')) || [];
    const DONE_RETENTION_DAYS = 30;
    const DONE_RETENTION_MS = DONE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let clients = JSON.parse(localStorage.getItem('clients')) || [];
    let editingOrderId = null;
    let activeArtOrderId = null;

    // --- EXPOR API PARA CEREBRO_IA.JS ---
    window.PsyzonApp = {
        productionOrders,
        clients,
        saveOrders: () => saveOrders(),
        renderKanban: () => renderKanban(),
        renderTasks: () => renderTasks()
    };



    const getAuthenticatedUid = () => {
        try {
            return window.firebaseAuth?.currentUser?.()?.uid || '';
        } catch {
            return '';
        }
    };

    const checklistItems = { art: "Arte/Design Aprovado", mockup: "Mockup Aprovado", fabric: "Malha/Tecido Comprado", cutting: "Corte Realizado", sewing: "Costura Realizada", printing: "Estampa/Bordado Realizado", finishing: "Acabamento e Embalagem" };
    const sizeOptions = { adulto: ['PP', 'P', 'M', 'G', 'GG', 'EXG', 'G1', 'G2'], infantil: ['1 a 2 anos', '3 a 4 anos', '5 a 6 anos', '7 a 8 anos', '9 a 10 anos'] };
    const categoryIcons = {
        art: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg>`,
        mockup: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>`,
        fabric: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>`,
        cutting: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121M12 12l2.879 2.879M12 12L9.121 14.879M12 12L14.879 9.121M4 4h.01M4 10h.01M4 16h.01M10 4h.01M16 4h.01M10 10h.01M10 16h.01M16 10h.01M16 16h.01" /></svg>`,
        sewing: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2 1m0 0l-2-1m2 1V2M8 7l2 1M8 7l2-1M8 7V4.5M12 21.5v-2.5M12 12v2.5m0 0l2 1m-2-1l-2 1m2-1v4.5M6 14l2-1m2 1l2-1m-2 1v2.5m-8 0l2 1m-2-1l2-1m-2 1v-2.5m14-2.5l2 1m-2-1l2-1m-2 1V14" /></svg>`,
        printing: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>`,
        finishing: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l-3 3m6 0l-3 3M11 3l3 3m0 6l3 3m-6 0l3 3m-3-3l-3 3m6-6l-3 3" /></svg>`
    };

    const enableDragScroll = (el) => {
        let isDown = false;
        let startX;
        let scrollLeft;
        el.addEventListener('mousedown', (e) => {
            isDown = true;
            el.classList.add('active');
            startX = e.pageX - el.offsetLeft;
            scrollLeft = el.scrollLeft;
            el.style.cursor = 'grabbing';
        });
        el.addEventListener('mouseleave', () => {
            isDown = false;
            el.classList.remove('active');
            el.style.cursor = 'grab';
        });
        el.addEventListener('mouseup', () => {
            isDown = false;
            el.classList.remove('active');
            el.style.cursor = 'grab';
        });
        el.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - el.offsetLeft;
            const walk = (x - startX) * 2; 
            el.scrollLeft = scrollLeft - walk;
        });
        el.style.cursor = 'grab';
    };

    const applyDragScroll = () => {
        document.querySelectorAll('.overflow-x-auto').forEach(el => {
           if(!el.dataset.dragScroll) {
               enableDragScroll(el);
               el.dataset.dragScroll = 'true';
           }
        });
    };
    
    // Refresh views on save
    const normalizeHistoryFlags = () => {
        const now = Date.now();
        productionOrders.forEach((order) => {
            if (order.status === 'done') {
                if (!order.completedAt) order.completedAt = now;
                const age = now - Number(order.completedAt || now);
                if (age > DONE_RETENTION_MS) order.inHistory = true;
            }
        });
    };

    normalizeHistoryFlags();
    localStorage.setItem('production_orders', JSON.stringify(productionOrders));

    const saveOrders = () => {
        normalizeHistoryFlags();
        localStorage.setItem('production_orders', JSON.stringify(productionOrders));
        // Mantém o quadro sincronizado quando alterações acontecem em outras abas (Cortes/Artes/DTF)
        renderProcessBoard();
        applyDragScroll(); 
    };
    if (window.CuttingSystem) {
        window.CuttingSystem.init({
            getOrders: () => productionOrders,
            setOrders: (nextOrders) => {
                productionOrders = nextOrders;
                window.PsyzonApp.productionOrders = productionOrders;
            },
            saveOrders: () => saveOrders()
        });
        productionOrders = window.PsyzonApp.productionOrders;
    }

    const formatCurrency = (amount) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const validTabs = new Set(['quadro', 'afazeres', 'artes', 'cortes', 'dtf', 'historico-pedidos']);
    if (!validTabs.has(currentTab)) currentTab = 'quadro';

    const renderProcessBoard = () => {
        switch (currentTab) {
            case 'afazeres':
                renderTasks();
                break;
            case 'artes':
                renderArtTasks();
                break;
            case 'cortes':
                if (window.CuttingSystem) window.CuttingSystem.renderCuttingTab(cuttingTasksContainer);
                break;
            case 'dtf':
                renderDTFTasks();
                break;
            case 'historico-pedidos':
                renderOrdersHistory();
                break;
            case 'quadro':
            default:
                renderKanban();
                break;
        }
    };

    const setActiveTab = (tabName) => {
        if (!validTabs.has(tabName)) return;
        currentTab = tabName;
        localStorage.setItem('processos_tab', currentTab);

        processTabButtons.forEach((btn) => {
            const active = btn.dataset.tab === tabName;
            btn.classList.toggle('active-tab', active);
            btn.setAttribute('aria-selected', String(active));
        });

        processPanels.forEach((panel) => {
            const active = panel.dataset.panel === tabName;
            panel.classList.toggle('active', active);
            panel.classList.toggle('hidden', !active);
        });

        renderProcessBoard();
    };

    processTabButtons.forEach((btn) => {
        btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    });

    const populateClientSelect = () => {
        clients = JSON.parse(localStorage.getItem('clients')) || [];
        orderClientSelect.innerHTML = '<option value="">Selecione um cliente</option>';
        if (orderClientSearchInput) orderClientSearchInput.value = '';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            orderClientSelect.appendChild(option);
        });
    };

    if (orderClientSearchInput) {
        orderClientSearchInput.addEventListener('input', () => {
            const term = orderClientSearchInput.value.toLowerCase();
            Array.from(orderClientSelect.options).forEach(opt => {
                if (!opt.value) return; 
                opt.style.display = opt.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }

    const renderChecklist = (checklistData = {}) => {
        orderChecklistContainer.innerHTML = '';
        for (const key in checklistItems) {
            const task = checklistData[key] || { completed: false, deadline: '' };
            const isDisabled = key === 'cutting' ? 'disabled' : '';
            const itemHtml = `<div class="flex items-center gap-3 bg-white/5 p-2 rounded-md hover:bg-white/10"><input type="checkbox" data-key="${key}" class="checklist-item-status w-5 h-5 rounded text-cyan-500" ${task.completed ? 'checked' : ''} ${isDisabled}><label class="flex-1 text-white">${checklistItems[key]}</label><input type="date" data-key="${key}" value="${task.deadline || ''}" class="checklist-item-deadline bg-white/10 p-1 rounded-md text-xs"></div>`;
            orderChecklistContainer.innerHTML += itemHtml;
        }
    };

    const openModal = (orderId = null) => {
        editingOrderId = orderId;
        populateClientSelect();
        orderForm.reset();
        cuttingDetailsSection.classList.remove('hidden');
        if (cuttingSubtasksContainer) cuttingSubtasksContainer.innerHTML = '';

        // reset DTF temp
        activeDtfImages = [];
        if (orderPrintingImagesContainer) orderPrintingImagesContainer.innerHTML = '';
        if (orderPrintQuantityInput) orderPrintQuantityInput.value = '';

        // reset Art Only temp
        activeArtOnlyImages = [];
        if (artOnlyImagesPreview) artOnlyImagesPreview.innerHTML = '';
        if (isArtOnlyCheckbox) isArtOnlyCheckbox.checked = false;

        if (orderId) {
            const order = productionOrders.find(o => o.id === orderId);
            orderModalTitle.textContent = "Editar Pedido";
            orderDescriptionInput.value = order.description;
            orderClientSelect.value = order.clientId;
            orderDeadlineInput.value = order.deadline;
            orderNotesInput.value = order.notes || '';
            if (orderClientContactInput) orderClientContactInput.value = order.clientContact || '';
            orderTotalValueInput.value = order.totalValue || '';
            orderAmountPaidInput.value = order.amountPaid || '';
            orderIsPaidCheckbox.checked = order.isPaid || false;
            renderChecklist(order.checklist);

            orderPrintTypeSelect.value = order.printType || 'dtf';
            renderColors(order.colors || []);

            if (order.printing && Array.isArray(order.printing.images)) {
                activeDtfImages = order.printing.images.slice();
                renderOrderPrintingPreviews(activeDtfImages);
            }
            if (order.printing && typeof order.printing.total !== 'undefined') {
                orderPrintQuantityInput.value = order.printing.total;
            }
            if (order.printing && typeof order.printing.notes !== 'undefined' && orderPrintingNotesInput) {
                orderPrintingNotesInput.value = order.printing.notes;
            }

            if (order.isArtOnly) {
                if (isArtOnlyCheckbox) isArtOnlyCheckbox.checked = true;
                if (order.art && order.art.images) activeArtOnlyImages = order.art.images.slice();
                renderArtOnlyPreviews();
            }

            if (window.CuttingSystem && cuttingSubtasksContainer) {
                window.CuttingSystem.renderOrderEditor(cuttingSubtasksContainer, order);
            }
            togglePrintingBlock();
        } else {
            if (orderClientContactInput) orderClientContactInput.value = '';
            orderModalTitle.textContent = "Novo Pedido de Produção";
            const defaultChecklist = Object.keys(checklistItems).reduce((acc, key) => ({ ...acc, [key]: { completed: false, deadline: '' } }), {});
            renderChecklist(defaultChecklist);
            orderPrintTypeSelect.value = 'dtf';
            renderColors([]);
            activeDtfImages = [];
            if (orderPrintingImagesContainer) orderPrintingImagesContainer.innerHTML = '';
            if (orderPrintQuantityInput) orderPrintQuantityInput.value = '';
            if (orderPrintingNotesInput) orderPrintingNotesInput.value = '';
            if (window.CuttingSystem && cuttingSubtasksContainer) {
                window.CuttingSystem.renderOrderEditor(cuttingSubtasksContainer, { cutting: { grid: [], personalization: { enabled: false, names: [] } } });
            }
            togglePrintingBlock();
        }

        toggleArtOnlyMode();
        orderModal.classList.remove('hidden');
        const cancelBtn = document.getElementById('cancel-order-btn');
        if (cancelBtn) {
            cancelBtn.onclick = function (e) {
                e.preventDefault();
                closeModal();
            };
        }
    };

    const closeModal = () => {
        orderModal.classList.add('hidden');
        editingOrderId = null;
    };

    // --- Controle de cortes agora é gerenciado por cutting-system.js ---

    // --- FIX: Listeners que estavam faltando ---

    if (addOrderBtn) addOrderBtn.addEventListener('click', () => openModal());

    // DTF Image Handlers (Order Modal)
    if (orderAddDtfImageBtn && orderDtfImageInput) {
        orderAddDtfImageBtn.addEventListener('click', () => orderDtfImageInput.click());
        orderDtfImageInput.addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    activeDtfImages.push(ev.target.result);
                    renderOrderPrintingPreviews(activeDtfImages);
                };
                reader.readAsDataURL(file);
            });
            e.target.value = '';
        });
    }
    if (clearDtfImagesBtn) {
        clearDtfImagesBtn.addEventListener('click', () => {
            activeDtfImages = [];
            renderOrderPrintingPreviews(activeDtfImages);
        });
    }

    if (orderForm) {
        orderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const checklist = {};
            document.querySelectorAll('.checklist-item-status').forEach(item => {
                const key = item.dataset.key;
                const deadlineInput = document.querySelector(`.checklist-item-deadline[data-key="${key}"]`);
                checklist[key] = { completed: item.checked, deadline: deadlineInput.value || null };
            });

            const cuttingPayload = window.CuttingSystem
                ? window.CuttingSystem.getEditorData()
                : { grid: [], personalization: { enabled: false, names: [] } };

            checklist.cutting = checklist.cutting || {};
            checklist.cutting.completed = isArtOnlyCheckbox?.checked ? true : false;

            // coleta cores dos inputs reais (hex text inputs ou compatíveis)
            const colors = orderColorsContainer
                ? Array.from(orderColorsContainer.querySelectorAll('.color-hex, .color-input'))
                      .map(i => (i.value || '').trim())
                      .filter(v => v)
                : [];
            
            const isArtOnly = isArtOnlyCheckbox ? isArtOnlyCheckbox.checked : false;

            const orderData = {
                description: orderDescriptionInput.value,
                clientId: parseInt(orderClientSelect.value) || null,
                deadline: orderDeadlineInput.value,
                checklist: checklist,
                notes: orderNotesInput.value.trim(),
                clientContact: orderClientContactInput ? orderClientContactInput.value.trim() : '',
                totalValue: parseFloat(orderTotalValueInput.value) || 0,
                amountPaid: parseFloat(orderAmountPaidInput.value) || 0,
                isPaid: orderIsPaidCheckbox.checked,
                printType: isArtOnly ? 'art' : (orderPrintTypeSelect ? orderPrintTypeSelect.value : 'dtf'),
                isArtOnly: isArtOnly,
                // shirtType removido conforme solicitado
                colors: colors,
                printing: {
                    images: activeDtfImages.slice(),
                    total: parseInt(orderPrintQuantityInput?.value) || (checklist.printing && checklist.printing.total ? parseInt(checklist.printing.total) : 0),
                    notes: orderPrintingNotesInput ? (orderPrintingNotesInput.value || '').trim() : ''
                },
                cutting: {
                    grid: cuttingPayload.grid,
                    personalization: cuttingPayload.personalization,
                    updatedAt: Date.now()
                }
            };
            
            if (isArtOnly) {
                orderData.art = {
                    images: activeArtOnlyImages.slice()
                }
            };
            if (editingOrderId) {
                const orderIndex = productionOrders.findIndex(o => o.id === editingOrderId);
                productionOrders[orderIndex] = { ...productionOrders[orderIndex], ...orderData };
            } else {
                const newOrder = { id: Date.now(), status: 'todo', ...orderData };
                productionOrders.push(newOrder);
                
                // HOOK HIPOCAMPO: Pedido Criado
                if (window.HipocampoIA) {
                    window.HipocampoIA.recordEvent('order_created', {
                        totalValue: newOrder.totalValue,
                        totalItems: (newOrder.cutting?.grid || []).reduce((a,b)=>a+b.total,0) || newOrder.printing?.total || 1,
                        printType: newOrder.printType
                    }, { orderId: newOrder.id, customerId: newOrder.clientId });
                }
            }
            saveOrders();
            renderKanban();
            renderArtTasks();
            closeModal();
        });
    }

    // --- KANBAN MOBILE TABS LOGIC ---
    const mobileTabs = document.querySelectorAll('.mobile-kanban-tab');
    const columnWrappers = {
        'column-todo': document.getElementById('wrapper-todo'),
        'column-doing': document.getElementById('wrapper-doing'),
        'column-done': document.getElementById('wrapper-done')
    };

    mobileTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            mobileTabs.forEach(t => t.classList.remove('active'));
            // Add active to clicked
            tab.classList.add('active');
            
            // Hide all columns on mobile
            Object.values(columnWrappers).forEach(wrapper => {
                if(wrapper) wrapper.classList.remove('active-mobile-view');
            });
            
            // Show target column
            const targetId = tab.dataset.target;
            if(columnWrappers[targetId]) columnWrappers[targetId].classList.add('active-mobile-view');
        });
    });

    const createOrderCard = (order) => {
        const client = clients.find(c => c.id === order.clientId);
        const card = document.createElement('div');
        // Adicionada a classe syt-process-card para o novo estilo
        const borderClass = order.isArtOnly ? 'border-l-4 border-purple-500' : 'border-l-4 border-cyan-500';
        card.className = `kanban-card syt-process-card is-collapsed ${borderClass}`;
        card.setAttribute('draggable', false);
        card.dataset.id = order.id;

        // --- Cálculos ---
        // Data
        const deadline = new Date(order.deadline + "T03:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = deadline - today;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        // Progresso do Processo
        const totalTasks = order.checklist ? Object.keys(order.checklist).length : 0;
        const completedTasks = order.checklist ? Object.values(order.checklist).filter(task => task.completed).length : 0;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Financeiro
        const total = order.totalValue || 0;
        const paid = order.amountPaid || 0;
        const due = Math.max(0, total - paid);
        const paidPercent = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
        const isPaymentDone = total > 0 && due <= 0.01;
        const paymentStatusText = isPaymentDone ? 'Pagamento concluído' : 'Pagamento pendente';
        const paymentStatusClass = isPaymentDone ? 'is-paid' : 'is-pending';

        // --- Badges e Textos ---
        let deadlineText = `${diffDays} dias`;
        if (diffDays < 0) { deadlineText = `${Math.abs(diffDays)}d atrasado`; }
        else if (diffDays === 0) { deadlineText = `Hoje`; }
        else if (diffDays === 1) { deadlineText = `Amanhã`; }

        // --- Estrutura HTML do Novo Card ---
        card.innerHTML = `
            <div class="syt-card-header">
                <div class="syt-card-title-block">
                    <h3 class="syt-card-title">${order.description}</h3>
                    <p class="syt-card-client">${client ? client.name : 'Sem cliente'}</p>
                    <p class="syt-card-deadline">Entrega: ${deadlineText}</p>
                </div>
                <div class="syt-header-actions">
                    <button class="syt-collapse-btn" title="Abrir/fechar card" aria-label="Abrir ou fechar detalhes" aria-expanded="false">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
                        </svg>
                    </button>
                    <button onclick="event.stopPropagation(); window.openOrderModal(${order.id})" class="syt-edit-btn" title="Editar Pedido">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                    </button>
                    <button onclick="event.stopPropagation(); window.removeOrder(${order.id})" class="syt-edit-btn syt-delete-btn" title="Deletar Card">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m-9 0v14a1 1 0 001 1h8a1 1 0 001-1V6"/><path stroke-linecap="round" stroke-linejoin="round" d="M10 11v6M14 11v6"/></svg>
                    </button>
                </div>
            </div>

            <div class="syt-card-body">
            <div class="syt-badges-row">
                <span class="syt-pill syt-pill-tech">${order.printType ? order.printType.toUpperCase() : 'N/A'}</span>
                <span class="syt-pill syt-pill-pay ${paymentStatusClass}">${paymentStatusText.toUpperCase()}</span>
                <span class="syt-pill syt-pill-deadline">${deadlineText}</span>
            </div>

            <div class="syt-card-carousel" aria-label="Resumo do pedido">
                <div class="syt-card-carousel-track">
                    <section class="syt-carousel-slide">
                        <div class="syt-meta-item syt-meta-progress">
                            <div class="syt-block-header">
                                <span class="label">🛠️ Produção</span>
                                <span class="value">${Math.round(progress)}%</span>
                            </div>
                            <div class="syt-progress-bar-sm-bg">
                                <div class="syt-progress-bar-sm-fg" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    </section>

                    <section class="syt-carousel-slide">
                        <div class="syt-payment-block">
                            <div class="syt-block-header">
                                <span class="label">💰 Financeiro</span>
                                <span class="value">${paidPercent.toFixed(0)}%</span>
                            </div>
                            <div class="syt-payment-details syt-payment-details-scroll">
                                <div class="syt-payment-chip"><span>Total</span> <strong>${total > 0 ? formatCurrency(total) : '—'}</strong></div>
                                <div class="syt-payment-chip"><span>Pago</span> <strong>${formatCurrency(paid)}</strong></div>
                                <div class="syt-payment-chip"><span>Falta</span> <strong class="due">${formatCurrency(due)}</strong></div>
                            </div>
                            <div class="syt-payment-progress"><div class="syt-progress-bar-bg"><div class="syt-progress-bar-fg" style="width: ${paidPercent}%"></div></div></div>
                        </div>

                        <div class="syt-payment-status ${paymentStatusClass}">
                            <span class="syt-status-dot"></span>
                            <span>${paymentStatusText}</span>
                        </div>
                    </section>
                </div>
            </div>

            <div class="flex flex-wrap gap-2 mt-3">
                ${order.status === 'todo' ? `<button class="syt-action-btn secondary" onclick="event.stopPropagation(); window.moveOrderStatus(${order.id}, 'doing')">Transferir para Andamento</button>` : ''}
                ${order.status === 'doing' ? `<button class="syt-action-btn secondary" onclick="event.stopPropagation(); window.moveOrderStatus(${order.id}, 'done')">Transferir para Concluído</button>` : ''}
                ${order.status === 'done' ? `<button class="syt-action-btn secondary" onclick="event.stopPropagation(); window.transferDoneToHistory(${order.id})">Transferir concluído para Histórico</button>` : ''}
            </div>

            <div class="syt-card-footer">
                <button class="syt-action-btn primary" onclick="event.stopPropagation(); window.openOrderModal(${order.id})">Receber pagamento</button>
                <button class="syt-action-btn secondary" onclick="event.stopPropagation(); window.openOrderModal(${order.id})">Ver detalhes <span aria-hidden="true">→</span></button>
            </div>
            </div>
        `;

        const setCollapsedState = (collapsed) => {
            card.classList.toggle('is-collapsed', collapsed);
            const collapseBtn = card.querySelector('.syt-collapse-btn');
            if (collapseBtn) {
                collapseBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            }
        };

        setCollapsedState(true);

        const toggleCard = () => {
            const isCollapsed = card.classList.contains('is-collapsed');
            setCollapsedState(!isCollapsed);
        };

        card.addEventListener('click', (event) => {
            if (event.target.closest('button,a,input,select,textarea,label')) return;
            toggleCard();
        });

        const collapseBtn = card.querySelector('.syt-collapse-btn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleCard();
            });
        }

        return card;
    };

    window.removeOrder = (orderId) => {
        if (confirm('Tem certeza que deseja excluir permanentemente este card/pedido?')) {
            productionOrders = productionOrders.filter(o => o.id !== orderId);
            saveOrders();
            renderKanban();
        }
    };

    window.openOrderModal = (orderId) => openModal(orderId);

    const moveOrderStatus = (orderId, newStatus) => {
        const order = productionOrders.find((item) => item.id === Number(orderId));
        if (!order || order.status === newStatus) return;
        order.status = newStatus;
        if (newStatus === 'done') {
            order.completedAt = Date.now();
            order.inHistory = false;
        } else {
            order.completedAt = null;
            order.sentToHistoryAt = null;
            order.inHistory = false;
        }
        saveOrders();
        renderKanban();
        if (currentTab === 'historico-pedidos') renderOrdersHistory();
    };

    window.moveOrderStatus = (orderId, newStatus) => moveOrderStatus(orderId, newStatus);

    const transferDoneToHistory = (orderId) => {
        const order = productionOrders.find((item) => item.id === Number(orderId));
        if (!order || order.status !== 'done') return;
        order.inHistory = true;
        order.sentToHistoryAt = Date.now();
        saveOrders();
        renderKanban();
        if (currentTab === 'historico-pedidos') renderOrdersHistory();
    };

    window.transferDoneToHistory = (orderId) => transferDoneToHistory(orderId);

    const renderKanban = () => {
        Object.values(columns).forEach(col => { if (col) col.innerHTML = ''; });
        
        // --- Filtro de URL (ex: vindo do Dashboard "A Receber") ---
        const urlParams = new URLSearchParams(window.location.search);
        const filterMode = urlParams.get('filter');

        // --- Botão Limpar Filtro (Melhoria de UX) ---
        const headerTitle = document.querySelector('h1'); 
        let clearBtn = document.getElementById('clear-filter-btn');
        
        if (filterMode === 'receivables') {
            if (!clearBtn && headerTitle) {
                clearBtn = document.createElement('button');
                clearBtn.id = 'clear-filter-btn';
                clearBtn.className = 'ml-4 text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded hover:bg-red-500/30 transition-colors align-middle';
                clearBtn.textContent = '✕ Limpar Filtro (A Receber)';
                clearBtn.onclick = () => { window.history.replaceState({}, document.title, window.location.pathname); renderKanban(); };
                headerTitle.appendChild(clearBtn);
            }
        } else if (clearBtn) { clearBtn.remove(); }

        const filteredOrders = productionOrders.filter(order => {
            if (filterMode === 'receivables') {
                const total = order.totalValue || 0;
                const paid = order.amountPaid || 0;
                const pending = total - paid;
                return !order.isPaid && pending > 0.01;
            }
            return true;
        });

        filteredOrders.forEach(order => {
            if (order.status === 'done' && order.inHistory) return;
            if (columns[order.status]) {
                const card = createOrderCard(order);
                columns[order.status].appendChild(card);
            }
        });
        
        // Update Mobile Tab Badges
        const counts = { todo: 0, doing: 0, done: 0 };
        productionOrders.forEach(o => {
            if (o.status === 'done' && o.inHistory) return;
            if (counts[o.status] !== undefined) counts[o.status]++;
        });
        
        mobileTabs.forEach(tab => {
            const target = tab.dataset.target.replace('column-', '');
            const label = target === 'todo' ? 'A Fazer' : (target === 'doing' ? 'Em Andamento' : 'Concluído');
            tab.textContent = `${label} (${counts[target]})`;
        });
    };


    const renderOrdersHistory = () => {
        if (!ordersHistoryContainer) return;
        const doneOrders = [...productionOrders]
            .filter(order => order.status === 'done' && order.inHistory)
            .sort((a, b) => Number(b.sentToHistoryAt || b.completedAt || b.id) - Number(a.sentToHistoryAt || a.completedAt || a.id));

        if (doneOrders.length === 0) {
            ordersHistoryContainer.innerHTML = '<div class="glass-card p-6 text-center text-gray-400">Nenhum pedido concluído no histórico ainda.</div>';
            return;
        }

        ordersHistoryContainer.innerHTML = doneOrders.map((order) => {
            const client = clients.find((c) => c.id === order.clientId);
            const total = order.totalValue || 0;
            const paid = order.amountPaid || 0;
            const finishedAt = new Date(Number(order.sentToHistoryAt || order.completedAt || order.id)).toLocaleDateString('pt-BR');
            return `
                <div class="glass-card p-4 border border-green-500/20">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                            <h3 class="text-lg font-bold text-white">${order.description}</h3>
                            <p class="text-sm text-cyan-300">${client ? client.name : 'Sem cliente'}</p>
                        </div>
                        <span class="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">Concluído</span>
                    </div>
                    <div class="mt-3 text-sm text-gray-300 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <p><strong>Entrega:</strong> ${order.deadline ? new Date(order.deadline + 'T03:00:00').toLocaleDateString('pt-BR') : '—'}</p>
                        <p><strong>Total:</strong> ${formatCurrency(total)}</p>
                        <p><strong>Pago:</strong> ${formatCurrency(paid)}</p>
                    </div>
                    <p class="mt-2 text-xs text-gray-400">Registrado no histórico em ${finishedAt}.</p>
                </div>
            `;
        }).join('');
    };


    const dragState = {
        card: null,
        pointerId: null,
        pointerType: null,
        originColumn: null,
        ghost: null,
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        activeColumn: null,
        autoScrollRaf: null,
        autoScrollVelocity: 0,
        hasBodyLock: false
    };

    const dragListeners = [];

    const addDragListener = (target, eventName, handler, options) => {
        target.addEventListener(eventName, handler, options);
        dragListeners.push({ target, eventName, handler, options });
    };

    const removeDragListeners = () => {
        while (dragListeners.length) {
            const { target, eventName, handler, options } = dragListeners.pop();
            target.removeEventListener(eventName, handler, options);
        }
    };

    const clearColumnHighlights = () => {
        document.querySelectorAll('.kanban-column').forEach((column) => {
            column.classList.remove('drag-over', 'bg-white/5', 'bg-white/10');
        });
        dragState.activeColumn = null;
    };

    const stopAutoScroll = () => {
        if (dragState.autoScrollRaf) {
            cancelAnimationFrame(dragState.autoScrollRaf);
            dragState.autoScrollRaf = null;
        }
        dragState.autoScrollVelocity = 0;
    };

    const runAutoScroll = () => {
        if (!dragState.isDragging) {
            stopAutoScroll();
            return;
        }

        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const topZone = 80;
        const bottomZone = 120;
        const maxSpeed = 22;
        let velocity = 0;

        if (dragState.currentY <= topZone) {
            const intensity = Math.min(1, (topZone - dragState.currentY) / topZone);
            velocity = -Math.max(1, intensity * maxSpeed);
        } else if (dragState.currentY >= viewportHeight - bottomZone) {
            const intensity = Math.min(1, (dragState.currentY - (viewportHeight - bottomZone)) / bottomZone);
            velocity = Math.max(1, intensity * maxSpeed);
        }

        dragState.autoScrollVelocity = velocity;
        if (velocity !== 0) {
            window.scrollBy(0, velocity);
        }

        dragState.autoScrollRaf = requestAnimationFrame(runAutoScroll);
    };

    const updateColumnHighlight = (x, y) => {
        clearColumnHighlights();
        const target = document.elementFromPoint(x, y);
        const column = target ? target.closest('.kanban-column') : null;
        if (column) {
            column.classList.add('drag-over');
            dragState.activeColumn = column;
        }
    };

    const moveGhost = (x, y) => {
        if (!dragState.ghost) return;
        dragState.ghost.style.left = `${x - (dragState.ghost.offsetWidth / 2)}px`;
        dragState.ghost.style.top = `${y - (dragState.ghost.offsetHeight / 2)}px`;
    };

    const cleanupDrag = ({ shouldDrop = false } = {}) => {
        const card = dragState.card;

        if (shouldDrop && dragState.isDragging && card) {
            const dropTarget = document.elementFromPoint(dragState.currentX, dragState.currentY);
            const dropColumn = dropTarget ? dropTarget.closest('.kanban-column') : null;

            if (dropColumn) {
                const newStatus = dropColumn.id.replace('column-', '');
                const orderId = Number(card.dataset.id);
                const order = productionOrders.find((item) => item.id === orderId);
                if (order && order.status !== newStatus) {
                    order.status = newStatus;
                    saveOrders();
                    renderKanban();
                    if (navigator.vibrate) navigator.vibrate([40]);
                }
            }
        }

        stopAutoScroll();
        removeDragListeners();
        clearColumnHighlights();

        if (dragState.ghost) {
            dragState.ghost.remove();
            dragState.ghost = null;
        }

        if (card) {
            card.classList.remove('kanban-card-dragging', 'opacity-30');
            card.style.userSelect = '';
            card.style.touchAction = '';
            if (dragState.pointerId !== null && card.hasPointerCapture?.(dragState.pointerId)) {
                try { card.releasePointerCapture(dragState.pointerId); } catch (_) {}
            }
        }

        if (dragState.hasBodyLock) {
            document.body.classList.remove('is-dragging-kanban');
            dragState.hasBodyLock = false;
        }

        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.body.style.cursor = '';

        dragState.card = null;
        dragState.pointerId = null;
        dragState.pointerType = null;
        dragState.originColumn = null;
        dragState.isDragging = false;
        dragState.startX = 0;
        dragState.startY = 0;
        dragState.currentX = 0;
        dragState.currentY = 0;
    };

    const startDragging = () => {
        const card = dragState.card;
        if (!card || dragState.isDragging) return;

        dragState.isDragging = true;
        if (navigator.vibrate && dragState.pointerType !== 'mouse') navigator.vibrate(25);

        card.classList.add('kanban-card-dragging');
        card.style.userSelect = 'none';
        card.style.touchAction = 'none';

        const rect = card.getBoundingClientRect();
        const ghost = card.cloneNode(true);
        ghost.classList.add('kanban-card-ghost');
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        document.body.appendChild(ghost);
        dragState.ghost = ghost;

        moveGhost(dragState.currentX, dragState.currentY);
        document.body.classList.add('is-dragging-kanban');
        dragState.hasBodyLock = true;
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.cursor = 'grabbing';

        stopAutoScroll();
        dragState.autoScrollRaf = requestAnimationFrame(runAutoScroll);
        updateColumnHighlight(dragState.currentX, dragState.currentY);
    };

    const handlePointerMove = (event) => {
        if (!dragState.card || event.pointerId !== dragState.pointerId) return;

        dragState.currentX = event.clientX;
        dragState.currentY = event.clientY;

        if (!dragState.isDragging) {
            const deltaX = Math.abs(event.clientX - dragState.startX);
            const deltaY = Math.abs(event.clientY - dragState.startY);
            const activationDistance = dragState.pointerType === 'mouse' ? 5 : 10;
            if (deltaX >= activationDistance || deltaY >= activationDistance) {
                startDragging();
            }
        }

        if (!dragState.isDragging) return;
        if (event.cancelable) event.preventDefault();

        moveGhost(event.clientX, event.clientY);
        updateColumnHighlight(event.clientX, event.clientY);
    };

    const handlePointerEnd = (event) => {
        if (!dragState.card || event.pointerId !== dragState.pointerId) return;
        dragState.currentX = event.clientX;
        dragState.currentY = event.clientY;
        cleanupDrag({ shouldDrop: true });
    };

    const handlePointerCancel = (event) => {
        if (!dragState.card || event.pointerId !== dragState.pointerId) return;
        cleanupDrag({ shouldDrop: false });
    };

    const handlePointerDown = (event) => {
        const card = event.target.closest('.kanban-card');
        if (!card) return;
        if (event.button !== 0 && event.pointerType === 'mouse') return;
        if (event.target.closest('button, a, input, textarea, select, label, .btn-action')) return;

        cleanupDrag({ shouldDrop: false });

        dragState.card = card;
        dragState.pointerId = event.pointerId;
        dragState.pointerType = event.pointerType || 'mouse';
        dragState.originColumn = card.closest('.kanban-column');
        dragState.startX = event.clientX;
        dragState.startY = event.clientY;
        dragState.currentX = event.clientX;
        dragState.currentY = event.clientY;

        card.setPointerCapture?.(event.pointerId);

        addDragListener(window, 'pointermove', handlePointerMove, { passive: false });
        addDragListener(window, 'pointerup', handlePointerEnd, { passive: false });
        addDragListener(window, 'pointercancel', handlePointerCancel, { passive: false });
        addDragListener(window, 'blur', () => cleanupDrag({ shouldDrop: false }));
        addDragListener(window, 'pagehide', () => cleanupDrag({ shouldDrop: false }));
        addDragListener(card, 'lostpointercapture', () => cleanupDrag({ shouldDrop: false }));
    };

    if (window.matchMedia('(min-width: 768px)').matches) {
        document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    }
    // Duplicate checkPrefillData function removed to fix redeclaration error.

    const renderTasks = () => {
        tasksContainer.innerHTML = '';
        const allTasks = [];
        productionOrders.forEach(order => {
            if (order.status !== 'done' && order.checklist) {
                for (const key in order.checklist) {
                    if (checklistItems[key]) {
                        const task = order.checklist[key];
                        if (!task.completed && task.deadline) {
                            allTasks.push({ orderId: order.id, taskKey: key, description: order.description, clientId: order.clientId, taskName: checklistItems[key], deadline: task.deadline });
                        }
                    }
                }
            }
        });
        const groupedTasks = allTasks.reduce((acc, task) => {
            const groupName = task.taskName;
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(task);
            return acc;
        }, {});
        if (allTasks.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'glass-card p-6 text-center text-gray-400 md:col-span-2 xl:col-span-3';
            emptyState.innerHTML = 'Nenhuma tarefa com prazo definido encontrada. ✨';
            tasksContainer.appendChild(emptyState);
            return;
        }
        for (const groupKey in checklistItems) {
            const groupName = checklistItems[groupKey];
            if (groupedTasks[groupName]) {
                const tasks = groupedTasks[groupName];
                const card = document.createElement('div');
                card.className = 'glass-card p-4 flex flex-col';
                let tasksHTML = tasks.map(task => {
                    const client = clients.find(c => c.id === task.clientId);
                    return `<div class="flex items-center justify-between p-3 border-l-4 border-cyan-500/50 bg-white/5 rounded-r-md"><label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" data-order-id="${task.orderId}" data-task-key="${task.taskKey}" class="task-checkbox w-5 h-5 rounded text-cyan-500 bg-gray-700 border-gray-600 focus:ring-cyan-600"><div><p class="font-semibold text-sm">${task.description}</p><p class="text-xs text-cyan-300">${client ? client.name : 'Cliente não encontrado'}</p></div></label><span class="text-sm text-gray-400">Prazo: ${new Date(task.deadline + 'T03:00:00').toLocaleDateString('pt-BR')}</span></div>`;
                }).join('');
                card.innerHTML = `<div class="flex items-center justify-between mb-4"><div class="flex items-center gap-3 text-cyan-300">${categoryIcons[groupKey]}<h2 class="text-lg font-bold">${groupName}</h2></div><span class="task-badge">${tasks.length}</span></div><div class="space-y-3">${tasksHTML}</div>`;
                tasksContainer.appendChild(card);
            }
        }
    };

    if (tasksContainer) {
        tasksContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('task-checkbox')) {
                const checkbox = e.target;
                const orderId = parseInt(checkbox.dataset.orderId);
                const taskKey = checkbox.dataset.taskKey;
                const order = productionOrders.find(o => o.id === orderId);
                if (order && order.checklist[taskKey]) {
                    order.checklist[taskKey].completed = checkbox.checked;
                    saveOrders();
                    renderTasks();
                }
            }
        });
    }


    const renderArtTasks = () => {
        if (window.ArteControl && typeof window.ArteControl.render === 'function') {
            window.ArteControl.render();
            return;
        }
        artTasksContainer.innerHTML = '';
        
        // Mostra apenas pedidos que ainda possuem arte pendente
        const artOrders = productionOrders.filter(order => {
            if (order.status === 'done') return false;

            const artChecklist = order.checklist && order.checklist.art;
            const artCompleted = artChecklist && artChecklist.completed === true;
            const hasArtStep = Boolean(order.isArtOnly || artChecklist);

            return hasArtStep && !artCompleted;
        });

        if (artOrders.length === 0) {
            artTasksContainer.innerHTML = '<div class="glass-card p-6 text-center text-gray-400">Nenhum pedido pendente para arte. ✨</div>';
            return;
        }

        // Mobile Filter Header (Injected dynamically)
        if (!document.getElementById('art-mobile-filters')) {
            const filterHTML = `
                <div id="art-mobile-filters" class="flex gap-2 overflow-x-auto pb-2 mb-4 md:hidden no-scrollbar">
                    <button class="px-3 py-1 rounded-full bg-cyan-600 text-white text-xs font-bold whitespace-nowrap">Todos</button>
                    <button class="px-3 py-1 rounded-full bg-white/10 text-gray-400 text-xs font-bold whitespace-nowrap">Pendentes</button>
                    <button class="px-3 py-1 rounded-full bg-white/10 text-gray-400 text-xs font-bold whitespace-nowrap">Aprovados</button>
                </div>`;
            artTasksContainer.insertAdjacentHTML('beforebegin', filterHTML);
        }

        const createArtCard = (order) => {
            const client = clients.find(c => c.id === order.clientId);
            const artData = order.art || {};
            const artControl = order.artControl || { versions: [] };
            const lastVersion = artControl.versions.length > 0 ? artControl.versions[artControl.versions.length - 1] : null;
            
            let statusClass = 'bg-gray-700 text-gray-300';
            let statusText = 'Rascunho';
            
            if (lastVersion) {
                if (lastVersion.status === 'approved') { statusClass = 'bg-green-500/20 text-green-400 border border-green-500/30'; statusText = `Aprovada V${lastVersion.version}`; }
                else if (lastVersion.status === 'sent') { statusClass = 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'; statusText = `Enviada V${lastVersion.version}`; }
                else if (lastVersion.status === 'changes_requested') { statusClass = 'bg-red-500/20 text-red-400 border border-red-500/30'; statusText = `Ajustes V${lastVersion.version}`; }
            }

            // Thumb logic
            const thumbSrc = (lastVersion && lastVersion.images[0]) ? lastVersion.images[0] : (order.art?.images?.[0] || '');
            const deadlineDate = order.deadline ? new Date(order.deadline) : null;
            const deadlineLabel = deadlineDate && !Number.isNaN(deadlineDate.getTime())
                ? deadlineDate.toLocaleDateString('pt-BR').slice(0, 5)
                : 'Sem prazo';
            const isLate = deadlineDate && deadlineDate < new Date() && (!lastVersion || lastVersion.status !== 'approved');
            const hasApprovalLink = Boolean(lastVersion && lastVersion.token);

            // New Compact Card HTML
            const card = document.createElement('div');
            card.className = `art-card-compact`;
            card.innerHTML = `
                <div class="art-card-header">
                    <div>
                        <h3 class="art-card-title">${order.description}</h3>
                        <p class="art-card-subtitle">${client ? client.name : 'Cliente'}</p>
                    </div>
                    <span class="art-card-badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="art-card-body">
                    <div class="art-thumb-wrap">
                        ${thumbSrc ? `<img src="${thumbSrc}" class="art-thumb" onerror="this.remove(); this.nextElementSibling.style.display='flex';">` : ''}<span class="art-thumb-placeholder" ${thumbSrc ? 'style="display:none"' : ''}>Sem prévia</span>
                    </div>
                    <div class="art-info-grid">
                        <div class="art-info-item ${isLate ? 'is-late' : ''}">
                            <span class="text-gray-500">Prazo:</span>
                            <span class="text-white font-medium">${deadlineLabel}</span>
                        </div>
                        <div class="art-info-item">
                            <span class="text-gray-500">Versões:</span>
                            <span class="text-white font-medium">${artControl.versions.length}</span>
                        </div>
                    </div>
                </div>

                <div class="art-card-actions">
                    <button data-order-id="${order.id}" class="open-art-modal-btn art-btn-action primary">Gerenciar</button>
                    <button class="art-btn-action copy-art-link-btn" data-order-id="${order.id}" ${hasApprovalLink ? '' : 'disabled'}>
                        ${hasApprovalLink ? 'Copiar Link' : 'Sem Link'}
                    </button>
                </div>
            `;
            return card;
        };

        const container = document.createElement('div');
        // Use simple flex column for mobile, grid for desktop
        container.className = 'flex flex-col md:grid md:grid-cols-2 xl:grid-cols-3 gap-3';
        artOrders.forEach(order => container.appendChild(createArtCard(order)));
        artTasksContainer.appendChild(container);
    };

    // --- NOVO CONTROLE DE ARTES (VERSÕES) ---
    const openArtControlModal = (orderId) => {
        activeArtOrderId = orderId;
        const order = productionOrders.find(o => o.id === orderId);
        const client = clients.find(c => c.id === order.clientId);
        
        // Inicializa estrutura se não existir
        if (!order.artControl) order.artControl = { versions: [] };

        artModalTitle.textContent = `Gestão de Arte: ${order.description}`;
        
        // Renderiza o modal customizado para controle de versões
        const modalBody = artModal.querySelector('.grid'); // Container principal do modal
        modalBody.innerHTML = `
            <div class="col-span-1 lg:col-span-2 flex flex-col h-full">
                <!-- Header com Briefing -->
                <div class="bg-white/5 p-4 rounded-lg mb-4">
                    <h3 class="text-sm font-bold text-gray-400 mb-1">Briefing / Notas</h3>
                    <p class="text-sm text-white">${order.notes || 'Sem anotações no pedido.'}</p>
                </div>

                <!-- Lista de Versões -->
                <div id="art-versions-list" class="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                    <!-- Versões renderizadas aqui -->
                </div>

                <!-- Ações -->
                <div class="border-t border-white/10 pt-4 flex justify-between items-center">
                    <input type="file" id="new-version-input" class="hidden" accept="image/*">
                    <button id="btn-new-version" class="btn-shine py-2 px-4 text-sm">+ Nova Versão</button>
                    <button id="btn-close-art" class="text-gray-400 hover:text-white">Fechar</button>
                </div>
            </div>
        `;

        renderArtVersionsList(order);

        // Listeners
        document.getElementById('btn-new-version').onclick = () => document.getElementById('new-version-input').click();
        document.getElementById('new-version-input').onchange = (e) => handleNewVersionUpload(e, order);
        document.getElementById('btn-close-art').onclick = () => artModal.classList.add('hidden');

        artModal.classList.remove('hidden');
    };

    const renderArtVersionsList = (order) => {
        const container = document.getElementById('art-versions-list');
        container.innerHTML = '';

        if (order.artControl.versions.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 py-8">Nenhuma versão criada ainda.</div>';
            return;
        }

        // Renderiza em ordem decrescente (mais nova primeiro)
        [...order.artControl.versions].reverse().forEach((ver) => {
            const isApproved = ver.status === 'approved';
            const statusColors = {
                draft: 'text-gray-400 border-gray-600',
                sent: 'text-yellow-400 border-yellow-500 bg-yellow-500/10',
                approved: 'text-green-400 border-green-500 bg-green-500/10',
                changes_requested: 'text-red-400 border-red-500 bg-red-500/10'
            };
            const statusLabels = {
                draft: 'Rascunho', sent: 'Enviada', approved: 'Aprovada', changes_requested: 'Ajustes Solicitados'
            };

            const card = document.createElement('div');
            card.className = `p-4 rounded-lg border ${statusColors[ver.status] || 'border-white/10'} bg-white/5 relative`;
            
            let historyHtml = '';
            if (ver.history && ver.history.length > 0) {
                const lastEvent = ver.history[ver.history.length - 1];
                historyHtml = `<div class="text-xs text-gray-400 mt-2 pt-2 border-t border-white/10">Última atividade: ${lastEvent.action} - ${lastEvent.comment || ''}</div>`;
            }

            // Link de Aprovação
            // Assumindo que o usuário está logado e o UID está disponível via auth.currentUser
            const uid = getAuthenticatedUid();
            const approvalLink = `${window.location.origin}/aprovacao.html?uid=${uid}&oid=${order.id}&token=${ver.token}`;

            card.innerHTML = `
                <div class="flex gap-4">
                    <div class="w-24 h-24 bg-black/50 rounded flex-shrink-0 overflow-hidden">
                        <img src="${ver.images[0]}" class="w-full h-full object-cover cursor-pointer" onclick="window.open('${ver.images[0]}', '_blank')">
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <h4 class="font-bold text-lg">Versão ${ver.version}</h4>
                            <span class="px-2 py-0.5 rounded text-xs border ${statusColors[ver.status]}">${statusLabels[ver.status]}</span>
                        </div>
                        <p class="text-xs text-gray-400 mb-2">Criada em: ${new Date(ver.createdAt).toLocaleString()}</p>
                        
                        <div class="flex gap-2 mt-2">
                            <button class="btn-copy-link text-xs bg-cyan-600/20 text-cyan-400 px-2 py-1 rounded hover:bg-cyan-600/40" data-link="${approvalLink}">🔗 Copiar Link</button>
                            ${!isApproved ? `<button class="btn-approve-manual text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded hover:bg-green-600/40" data-ver="${ver.version}">✅ Aprovar Manual</button>` : ''}
                        </div>
                        ${historyHtml}
                    </div>
                </div>
            `;

            // Handlers
            card.querySelector('.btn-copy-link').onclick = (e) => {
                copyTextSafe(e.target.dataset.link).then((ok) => {
                    alert(ok ? 'Link copiado! Envie para o cliente.' : 'Não foi possível copiar automaticamente.');
                });
            };
            const approveBtn = card.querySelector('.btn-approve-manual');
            if (approveBtn) {
                approveBtn.onclick = () => {
                    if(confirm('Marcar esta versão como APROVADA manualmente?')) {
                        ver.status = 'approved';
                        ver.history.push({ action: 'approved', date: Date.now(), user: 'Admin', comment: 'Aprovação manual' });
                        order.checklist.art.completed = true; // Marca tarefa como feita
                        saveOrders();
                        renderArtVersionsList(order);
                        renderArtTasks();

                        // Dispara automação da IA (Parabéns + Sugestão de Mover)
                        if (window.PsyzonAI && window.PsyzonAI.triggerArtApprovalAutomation) {
                            window.PsyzonAI.triggerArtApprovalAutomation(order.id);
                        }
                    }
                };
            }

            container.appendChild(card);
        });
    };

    const handleNewVersionUpload = (e, order) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const newVerNum = order.artControl.versions.length + 1;
            const newVersion = {
                version: newVerNum,
                images: [ev.target.result],
                status: 'sent', // Já nasce como enviada/pronta
                token: Math.random().toString(36).substring(2) + Date.now().toString(36),
                createdAt: Date.now(),
                history: [{ action: 'created', date: Date.now(), user: 'Admin' }]
            };
            order.artControl.versions.push(newVersion);
            saveOrders();
            renderArtVersionsList(order);
            renderArtTasks();
        };
        reader.readAsDataURL(file);
    };

    // Remove listeners antigos de artImageInput e artReferencesContainer pois a UI mudou completamente
    // Mantemos apenas o listener de abrir o modal

    if (artTasksContainer && !(window.ArteControl && window.ArteControl.enabled)) {
        artTasksContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('open-art-modal-btn')) {
                openArtControlModal(parseInt(e.target.dataset.orderId));
            }

            if (e.target.classList.contains('copy-art-link-btn')) {
                const orderId = parseInt(e.target.dataset.orderId);
                const order = productionOrders.find(o => o.id === orderId);
                const lastVersion = order?.artControl?.versions?.length
                    ? order.artControl.versions[order.artControl.versions.length - 1]
                    : null;
                const uid = getAuthenticatedUid();

                if (!lastVersion || !lastVersion.token) return;

                const approvalLink = `${window.location.origin}/aprovacao.html?uid=${uid}&oid=${order.id}&token=${lastVersion.token}`;
                copyTextSafe(approvalLink).then((ok) => {
                    if (!ok) {
                        alert('Não foi possível copiar o link automaticamente.');
                        return;
                    }
                    e.target.textContent = 'Copiado!';
                    setTimeout(() => {
                        e.target.textContent = 'Copiar Link';
                    }, 1500);
                });
            }
        });
    }
    // closeArtModalBtn agora é tratado dentro de openArtControlModal dinamicamente ou via delegate global


    const checkPrefillData = () => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'new_order') {
            const prefillData = JSON.parse(sessionStorage.getItem('prefill_order_form'));
            if (prefillData) {
                openModal();
                orderDescriptionInput.value = prefillData.description;
                orderClientSelect.value = prefillData.clientId;
                sessionStorage.removeItem('prefill_order_form');
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    };

    checkPrefillData();

    const dtfTasksContainer = document.getElementById('dtf-tasks-container');

    function renderDTFTasks() {
        dtfTasksContainer.innerHTML = '';
        // filtra pedidos DTF não concluídos (por status e por printing.completed)
        const dtfOrders = productionOrders.filter(order =>
            order.printType === 'dtf' &&
            order.status !== 'done' &&
            !(order.printing && order.printing.completed)
        );
        if (dtfOrders.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'glass-card p-6 text-center text-gray-400';
            empty.textContent = 'Nenhum pedido DTF pendente. ✨';
            dtfTasksContainer.appendChild(empty);
            return;
        }

        dtfOrders.forEach(order => {
            const client = clients.find(c => c.id === order.clientId);
            const deadline = order.deadline ? new Date(order.deadline + "T03:00:00").toLocaleDateString('pt-BR') : '';
            const images = (order.printing && Array.isArray(order.printing.images) && order.printing.images.length) ? order.printing.images : ((order.art && order.art.images) || []);
            const colors = order.colors || [];
            const printQty = (order.printing && order.printing.total) ? order.printing.total : (order.checklist && order.checklist.printing && order.checklist.printing.total) || '';
            const printNotes = (order.printing && order.printing.notes) ? order.printing.notes : '';

            const card = document.createElement('div');
            card.className = 'dtf-card glass-card p-4 flex flex-col gap-3';
            card.style.width = '100%';
            card.style.boxSizing = 'border-box';

            // head
            const head = document.createElement('div');
            head.className = 'flex justify-between items-start gap-2';
            const left = document.createElement('div');
            const title = document.createElement('p'); title.className = 'font-bold text-sm'; title.textContent = order.description;
            const clientP = document.createElement('p'); clientP.className = 'text-xs text-cyan-300'; clientP.textContent = client ? client.name : 'Cliente';
            const deadlineP = document.createElement('p'); deadlineP.className = 'text-2xs text-gray-400'; deadlineP.textContent = `Prazo: ${deadline}`;
            left.appendChild(title);
            left.appendChild(clientP);
            left.appendChild(deadlineP);

            const right = document.createElement('div');
            const tag = document.createElement('span'); tag.className = 'px-2 py-1 rounded bg-cyan-600/20 text-cyan-400 text-xs font-bold'; tag.textContent = 'DTF';
            right.appendChild(tag);

            head.appendChild(left);
            head.appendChild(right);
            card.appendChild(head);

            // printing notes (aparece direto no card)
            if (printNotes && printNotes.trim()) {
                const notesEl = document.createElement('div');
                notesEl.className = 'dtf-notes text-xs text-gray-300';
                notesEl.textContent = `Observações: ${printNotes}`;
                card.appendChild(notesEl);
            }

            // images grid
            if (images && images.length) {
                const imgsWrap = document.createElement('div');
                imgsWrap.className = 'grid grid-cols-2 gap-2';
                images.forEach(src => {
                    const imgWrap = document.createElement('div');
                    imgWrap.className = 'w-full h-28 overflow-hidden rounded';
                    const img = document.createElement('img');
                    img.src = src;
                    img.alt = 'Arte DTF';
                    img.className = 'w-full h-full object-cover';
                    imgWrap.appendChild(img);
                    imgsWrap.appendChild(imgWrap);
                });
                card.appendChild(imgsWrap);
            }

            // colors
            if (colors && colors.length) {
                const colorsWrap = document.createElement('div');
                colorsWrap.className = 'flex gap-2 flex-wrap';
                colors.forEach(c => {
                    const span = document.createElement('span');
                    span.className = 'px-2 py-1 rounded bg-white/10 border border-white/20 text-xs';
                    span.textContent = c;
                    colorsWrap.appendChild(span);
                });
                card.appendChild(colorsWrap);
            }

            // footer: separado checkbox + qty + Pedido Feito button
            const footer = document.createElement('div');
            footer.className = 'flex items-center justify-between gap-2';

            // left side: checkbox "Separado" + qty
            const leftFooter = document.createElement('div');
            leftFooter.className = 'flex items-center gap-3';

            // Separado checkbox
            const separatedId = `dtf-separated-${order.id}`;
            const separatedWrapper = document.createElement('label');
            separatedWrapper.className = 'flex items-center gap-2 text-xs';
            const separatedCheckbox = document.createElement('input');
            separatedCheckbox.type = 'checkbox';
            separatedCheckbox.className = 'dtf-separated-checkbox';
            separatedCheckbox.checked = !!(order.printing && order.printing.separated);
            separatedCheckbox.dataset.orderId = order.id;
            const separatedLabel = document.createElement('span');
            separatedLabel.textContent = 'Separado';
            separatedWrapper.appendChild(separatedCheckbox);
            separatedWrapper.appendChild(separatedLabel);

            // quantity badge
            const qty = document.createElement('span');
            qty.className = 'px-2 py-1 rounded bg-gray-700 text-gray-300 text-xs';
            qty.textContent = `Qtd: ${printQty || ''}`;

            leftFooter.appendChild(separatedWrapper);
            leftFooter.appendChild(qty);

            footer.appendChild(leftFooter);

            // right side: actions (Pedido Feito)
            const actions = document.createElement('div');
            actions.className = 'flex items-center gap-2';

            const doneBtn = document.createElement('button');
            doneBtn.type = 'button';
            doneBtn.className = 'text-xs px-2 py-1 rounded bg-green-600 text-white';
            doneBtn.textContent = 'Pedido Feito';
            doneBtn.title = 'Marcar impressão como concluída e remover do Controle de DTF';
            doneBtn.addEventListener('click', () => {
                if (!confirm('Marcar este DTF como concluído e remover do Controle de DTF?')) return;
                order.printing = order.printing || {};
                order.printing.completed = true;
                // opcional: atualizar status também (comente se não quiser alterar status global)
                // order.status = 'done';
                saveOrders();
                renderDTFTasks();
            });

            actions.appendChild(doneBtn);
            footer.appendChild(actions);

            card.appendChild(footer);

            // handler: toggle separado checkbox
            separatedCheckbox.addEventListener('change', (e) => {
                const oid = parseInt(e.target.dataset.orderId, 10);
                const o = productionOrders.find(x => x.id === oid);
                if (!o) return;
                o.printing = o.printing || {};
                o.printing.separated = !!e.target.checked;
                saveOrders();
                // atualização visual mínima sem recriar tudo
                // (re-render para garantir consistência)
                renderDTFTasks();
            });

            dtfTasksContainer.appendChild(card);
        });
    }

    // render previews for DTF images inside modal (fix: function missing -> define it)
    function renderOrderPrintingPreviews(images = []) {
        if (!orderPrintingImagesContainer) return;
        orderPrintingImagesContainer.innerHTML = '';
        images.forEach((img, idx) => {
            const wrap = document.createElement('div');
            wrap.className = 'relative w-24 h-24 rounded overflow-hidden border border-white/10';
            wrap.style.minWidth = '96px';
            wrap.style.minHeight = '96px';
            const imageEl = document.createElement('img');
            imageEl.src = img;
            imageEl.className = 'w-full h-full object-cover';
            imageEl.alt = `Arte DTF ${idx + 1}`;
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'absolute top-1 right-1 bg-black/60 text-white rounded px-1';
            del.innerHTML = '&times;';
            del.title = 'Remover';
            del.addEventListener('click', (e) => {
                e.stopPropagation();
                activeDtfImages.splice(idx, 1);
                renderOrderPrintingPreviews(activeDtfImages);
            });
            wrap.appendChild(imageEl);
            wrap.appendChild(del);
            orderPrintingImagesContainer.appendChild(wrap);
        });
    }

    // DEBUG — lista elementos ausentes
    ['add-order-btn', 'tab-quadro', 'tab-afazeres', 'tab-cortes', 'view-quadro', 'view-afazeres', 'view-cortes', 'order-modal', 'close-art-modal-btn']
        .forEach(id => {
            if (!document.getElementById(id)) console.warn(`processos.js: elemento ausente no DOM -> #${id}`);
        });

    // Listener delegado para fechar modais mesmo que o botão seja adicionado dinamicamente
    document.addEventListener('click', (e) => {
        const btn = e.target;
        // Fechar modal de pedido
        if (btn.id === 'cancel-order-btn' || btn.closest && btn.closest('[data-action="close-order-modal"]')) {
            e.preventDefault();
            if (orderModal) {
                orderModal.classList.add('hidden');
                console.log('processos.js: orderModal fechado (delegado)');
            }
            editingOrderId = null;
        }
        // Fechar modal de corte (novo modal dinâmico)
        if (btn.closest && btn.closest('#new-cutting-modal [data-action="close"]')) {
            e.preventDefault();
            const modal = document.getElementById('new-cutting-modal');
            if (modal) { modal.classList.add('hidden'); console.log('processos.js: cutting modal fechado (delegado)'); }
        }
        // Fechar modal de arte
        if (btn.id === 'close-art-modal-btn' || btn.closest && btn.closest('[data-action="close-art-modal"]')) {
            e.preventDefault();
            const modal = document.getElementById('art-modal');
            if (modal) { modal.classList.add('hidden'); console.log('processos.js: artModal fechado (delegado)'); }
            activeArtOrderId = null;
        }
    });

    // Registrar erros JS visíveis no console para diagnóstico rápido
    window.addEventListener('error', (ev) => {
        console.error('processos.js - erro detectado:', ev.message, 'em', ev.filename, 'linha', ev.lineno);
    });

    // Diagnóstico e correção temporária de overlays que cobrem a tela
    (function detectAndFixOverlays() {
        const modalIds = ['order-modal', 'new-cutting-modal', 'art-modal', 'art-image-fullscreen-modal'];
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // lista elementos fullscreen visíveis que podem estar cobrindo a tela
        const candidates = Array.from(document.body.querySelectorAll('*')).filter(el => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
            const r = el.getBoundingClientRect();
            // cobrir quase toda a viewport ou posicionamento fixed/full
            return (r.width >= vw - 2 && r.height >= vh - 2) || (cs.position === 'fixed' && r.top <= 0 && r.left <= 0 && r.bottom >= vh && r.right >= vw);
        });

        if (candidates.length) {
            console.warn('processos.js: possíveis overlays fullscreen encontrados:', candidates);
            candidates.forEach(el => {
                const z = getComputedStyle(el).zIndex || 'auto';
                console.warn(' ->', el.tagName, el.id || el.className, 'zIndex=', z);
            });
        } else {
            console.log('processos.js: nenhum overlay fullscreen detectado automaticamente.');
        }

        // Auto-fix: desativa pointer-events em overlays que NÃO são os modais conhecidos
        candidates.forEach(el => {
            if (!modalIds.includes(el.id)) {
                // marcar para restaurar se necessário
                if (!el.dataset._overlayPatched) {
                    el.dataset._overlayPatched = '1';
                    el._oldPointerEvents = el.style.pointerEvents || '';
                    el.style.pointerEvents = 'none';
                    el.style.userSelect = 'auto';
                    console.warn('processos.js: pointer-events disabled em', el);
                }
            } else {
                // garante que modais estejam acima e recebam eventos
                el.style.zIndex = '99999';
                el.style.pointerEvents = 'auto';
            }
        });

        // helper para depurar cliques: mostra elemento que recebe o clique
        document.addEventListener('click', (ev) => {
            const top = document.elementFromPoint(ev.clientX, ev.clientY);
            if (top) {
                console.log('processos.js: elemento no ponto do clique ->', top.tagName, top.id || top.className);
            }
        }, { capture: true });

        // Expor função para restaurar overlays (usar no console se precisar)
        window.__restoreOverlays = () => {
            document.querySelectorAll('[data-_overlayPatched="1"]').forEach(el => {
                el.style.pointerEvents = el._oldPointerEvents || '';
                delete el.dataset._overlayPatched;
                delete el._oldPointerEvents;
                console.log('processos.js: restaurado pointer-events em', el);
            });
        };
    })();

    // Helpers de cor
    const isHex = (v) => /^#([0-9A-F]{3}){1,2}$/i.test((v || '').trim());
    const hexToRgb = (hex) => {
        if (!hex) return null;
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(h => h + h).join('');
        const int = parseInt(hex, 16);
        return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
    };
    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    const rgbToCmyk = (r, g, b) => {
        if (r === 0 && g === 0 && b === 0) return { c: 0, m: 0, y: 0, k: 100 };
        const rn = r / 255, gn = g / 255, bn = b / 255;
        const k = 1 - Math.max(rn, gn, bn);
        const c = Math.round(((1 - rn - k) / (1 - k)) * 100);
        const m = Math.round(((1 - gn - k) / (1 - k)) * 100);
        const y = Math.round(((1 - bn - k) / (1 - k)) * 100);
        return { c: Math.max(0, c), m: Math.max(0, m), y: Math.max(0, y), k: Math.round(k * 100) };
    };
    const formatCMYK = (cmyk) => `C:${cmyk.c}% M:${cmyk.m}% Y:${cmyk.y}% K:${cmyk.k}%`;

    // Renderizador avançado de cores (swatch + colorpicker + hex + CMYK + eyedropper)
    function renderColors(colors = []) {
        if (!orderColorsContainer) return;
        orderColorsContainer.innerHTML = '';
        colors.forEach((color, idx) => {
            const safeColor = color && typeof color === 'string' ? color.trim() : '';
            const hex = isHex(color) ? color.toUpperCase() : (isHex(safeColor) ? safeColor.toUpperCase() : '');
            const rgb = hex ? hexToRgb(hex) : { r: 0, g: 0, b: 0 };
            const cmyk = hex ? rgbToCmyk(rgb.r, rgb.g, rgb.b) : { c: 0, m: 0, y: 0, k: 100 };
            const colorHtml = `
            <div class="color-entry flex items-center gap-2 mb-2" data-idx="${idx}">
                <div class="color-swatch w-10 h-10 rounded border" style="background:${hex || 'transparent'};min-width:40px;min-height:40px"></div>
                <input type="color" class="color-picker w-10 h-10 p-0 border-0" value="${hex || '#000000'}" title="Abrir seletor de cor">
                <input type="text" class="color-hex p-1 rounded bg-white/10 border border-white/20 text-xs w-28" value="${hex || ''}" placeholder="#RRGGBB">
                <button type="button" class="eye-dropper-btn px-2 py-1 rounded bg-white/5 text-xs" title="Eyedropper">${window.EyeDropper ? '🎯' : '🔍'}</button>
                <div class="cmyk text-xs text-gray-300 ml-2">${hex ? formatCMYK(cmyk) : 'CMYK N/A'}</div>
                <button type="button" class="remove-color-btn text-red-500 hover:text-red-400 ml-4 px-2 py-1 rounded" data-idx="${idx}">×</button>
            </div>
        `;
            orderColorsContainer.insertAdjacentHTML('beforeend', colorHtml);
        });
    }

    // +Cor: cria nova cor padrão
    if (addColorBtn) {
        addColorBtn.addEventListener('click', () => {
            const current = Array.from(orderColorsContainer.querySelectorAll('.color-hex')).map(i => i.value);
            // adiciona um placeholder hex para facilitar escolha
            renderColors([...current, '#000000']);
        });
    }

    // Delegate para interações dentro do container de cores
    if (orderColorsContainer) {
        // click (remove, eyedropper)
        orderColorsContainer.addEventListener('click', async (e) => {
            const target = e.target;
            // remover cor
            if (target.classList.contains('remove-color-btn')) {
                const idx = parseInt(target.dataset.idx, 10);
                const colors = Array.from(orderColorsContainer.querySelectorAll('.color-hex')).map(i => i.value);
                colors.splice(idx, 1);
                renderColors(colors);
                return;
            }

            // eyedropper (usa API se disponível)
            if (target.classList.contains('eye-dropper-btn')) {
                const entry = target.closest('.color-entry');
                if (!entry) return;
                const hexInput = entry.querySelector('.color-hex');
                const colorPicker = entry.querySelector('.color-picker');

                if (window.EyeDropper) {
                    try {
                        const eye = new EyeDropper();
                        const result = await eye.open();
                        if (result && result.sRGBHex) {
                            const picked = result.sRGBHex.toUpperCase();
                            if (hexInput) hexInput.value = picked;
                            if (colorPicker) colorPicker.value = picked;
                            // update swatch + CMYK
                            const sw = entry.querySelector('.color-swatch');
                            if (sw) sw.style.background = picked;
                            const cmykEl = entry.querySelector('.cmyk');
                            if (cmykEl) {
                                const rgb = hexToRgb(picked);
                                const cmyk = rgb ? rgbToCmyk(rgb.r, rgb.g, rgb.b) : { c: 0, m: 0, y: 0, k: 100 };
                                cmykEl.textContent = formatCMYK(cmyk);
                            }
                        }
                    } catch (err) {
                        console.warn('Eyedropper canceled/failed', err);
                        alert('Eyedropper cancelado ou não suportado neste contexto.');
                    }
                } else {
                    alert('EyeDropper API não disponível no seu navegador.');
                }
                return;
            }
        });

        // input (color picker or hex text changes) - delegação
        orderColorsContainer.addEventListener('input', (e) => {
            const target = e.target;
            const entry = target.closest('.color-entry');
            if (!entry) return;

            const sw = entry.querySelector('.color-swatch');
            const colorPicker = entry.querySelector('.color-picker');
            const hexInput = entry.querySelector('.color-hex');
            const cmykEl = entry.querySelector('.cmyk');

            if (target.classList.contains('color-picker')) {
                // sync picker -> hex
                const v = (target.value || '').toUpperCase();
                if (hexInput) hexInput.value = v;
                if (sw) sw.style.background = v;
                if (cmykEl) {
                    const rgb = hexToRgb(v);
                    const cmyk = rgb ? rgbToCmyk(rgb.r, rgb.g, rgb.b) : { c: 0, m: 0, y: 0, k: 100 };
                    cmykEl.textContent = formatCMYK(cmyk);
                }
            }

            if (target.classList.contains('color-hex')) {
                let v = (target.value || '').trim();
                if (v && !v.startsWith('#')) v = '#' + v;
                v = v.toUpperCase();
                // update picker if valid hex
                if (isHex(v)) {
                    if (colorPicker) colorPicker.value = v;
                    if (sw) sw.style.background = v;
                    if (cmykEl) {
                        const rgb = hexToRgb(v);
                        const cmyk = rgb ? rgbToCmyk(rgb.r, rgb.g, rgb.b) : { c: 0, m: 0, y: 0, k: 100 };
                        cmykEl.textContent = formatCMYK(cmyk);
                    }
                }
            }
        });

        // blur on hex input: normalize value (adds # and uppercase)
        orderColorsContainer.addEventListener('blur', (e) => {
            const target = e.target;
            if (!target.classList || !target.classList.contains('color-hex')) return;
            let v = (target.value || '').trim();
            if (!v) return;
            if (!v.startsWith('#')) v = '#' + v;
            v = v.toUpperCase();
            target.value = v;
            // trigger input handler to sync UI
            const ev = new Event('input', { bubbles: true });
            target.dispatchEvent(ev);
        }, true);
    } // end if (orderColorsContainer)

    // --- INTEGRAÇÃO GOOGLE GEMINI AI (ASSISTENTE PSYZON) ---
    
    // Configuração da API via endpoint seguro no servidor (Vercel API)
    const GEMINI_PROXY_ENDPOINT = (window.location.protocol === "http:" || window.location.protocol === "https:")
        ? `${window.location.origin}/api/gemini`
        : null;

    console.log("🔒 Gemini configurado via endpoint seguro:", GEMINI_PROXY_ENDPOINT);

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

    // Estado do Chat
    let chatHistory = [];
    let isAiProcessing = false;

    // Definição das Ferramentas (Function Calling)
    const aiTools = [
        {
            name: "createOrder",
            description: "Cria pedido e cliente (se não existir). Suporta grade de tamanhos (sizes).",
            parameters: {
                type: "OBJECT",
                properties: {
                    description: { type: "STRING", description: "Descrição curta do pedido (ex: 30 Camisas 3A)" },
                    clientName: { type: "STRING", description: "Nome do cliente para buscar ou criar" },
                    deadline: { type: "STRING", description: "Data de entrega no formato YYYY-MM-DD" },
                    totalValue: { type: "NUMBER", description: "Valor total do pedido" },
                    notes: { type: "STRING", description: "Observações gerais" },
                    printType: { type: "STRING", description: "Técnica: 'silk', 'dtf', 'sublimacao' ou 'art'" },
                    sizes: {
                        type: "ARRAY",
                        description: "Lista de tamanhos e quantidades (Grade)",
                        items: {
                            type: "OBJECT",
                            properties: {
                                size: { type: "STRING" },
                                qty: { type: "NUMBER" },
                                gender: { type: "STRING", description: "Masculina, Feminina ou Infantil" }
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
                    orderId: { type: "NUMBER", description: "ID do pedido" },
                    updates: { type: "OBJECT", description: "Objeto com campos a atualizar (status, totalValue, notes, etc)" }
                },
                required: ["orderId", "updates"]
            }
        },
        {
            name: "listOrders",
            description: "Lista pedidos filtrando por status ou busca textual.",
            parameters: {
                type: "OBJECT",
                properties: {
                    status: { type: "STRING", description: "todo, doing, done" },
                    search: { type: "STRING", description: "Termo de busca (nome cliente ou descrição)" }
                }
            }
        },
        {
            name: "calculateOrder",
            description: "Calcula o total do pedido baseado em quantidade e preço unitário.",
            parameters: {
                type: "OBJECT",
                properties: {
                    quantity: { type: "NUMBER" },
                    unitPrice: { type: "NUMBER" },
                    extras: { type: "NUMBER", description: "Valor extra (frete, arte)" },
                    discount: { type: "NUMBER" }
                },
                required: ["quantity", "unitPrice"]
            }
        },
        {
            name: "calculateDeadline",
            description: "Calcula data de entrega considerando dias úteis e feriados.",
            parameters: {
                type: "OBJECT",
                properties: {
                    days: { type: "NUMBER", description: "Quantidade de dias" },
                    isBusinessDays: { type: "BOOLEAN", description: "Se true, conta apenas dias úteis (seg-sex e exclui feriados)" },
                    startDate: { type: "STRING", description: "Data inicial YYYY-MM-DD (opcional, default hoje)" }
                },
                required: ["days"]
            }
        },
        {
            name: "emplacarPedido",
            description: "Gera o resumo operacional (emplacamento), valida dados e move para produção.",
            parameters: {
                type: "OBJECT",
                properties: {
                    orderId: { type: "NUMBER" },
                    checklistData: { type: "OBJECT", description: "Dados técnicos: cores, tamanhos, estampa" }
                },
                required: ["orderId"]
            }
        }
    ];

    // Prompt do Sistema
    const systemInstruction = `
    VOCÊ É O SISTEMA OPERACIONAL DA CONFECÇÃO (PSYZON).
    SUA FUNÇÃO É AGIR, NÃO CONVERSAR.

    ✅ REGRAS DE TAMANHOS (GRADE):
    - Identifique grades no texto (ex: "6P, 10M, 10G").
    - Converta para o array 'sizes' na ferramenta createOrder: [{size: "P", qty: 6}, ...].
    - NUNCA crie pedido sem grade se ela foi informada no texto.
    - Distribua as quantidades corretamente.
    - Se o gênero não for informado, assuma "Masculina" ou infira pelo contexto.

    ✅ REGRAS DE PRAZO (DIAS ÚTEIS):
    - Se o usuário disser "dias úteis", OBRIGATORIAMENTE use a ferramenta calculateDeadline com isBusinessDays=true.
    - Se disser apenas "dias", assuma corridos (isBusinessDays=false).
    - Use a data retornada pela ferramenta como 'deadline' ao criar o pedido.
    - Mostre no chat: Data Inicial, Data Final Calculada e Dias Considerados.

    ⚠️ REGRAS GERAIS:
    1. Cliente não encontrado? CRIE AUTOMATICAMENTE.
    2. Preço não informado? CRIE COM VALOR 0.
    3. Dados incompletos? CRIE O PEDIDO COM O QUE TEM.

    PADRÃO DE RESPOSTA (HTML):
    <b>🧾 Pedido Criado</b>
    <ul class="chat-list">
      <li><b>Cliente:</b> [Nome]</li>
      <li><b>Item:</b> [Descrição]</li>
      <li><b>Grade:</b> [Resumo ex: 10P, 10M]</li>
      <li><b>Prazo:</b> [Data] ([X] dias úteis/corridos)</li>
      <li><b>Status:</b> A Fazer</li>
    </ul>
    `;

    // --- UI DO CHAT ---
    const createChatInterface = () => {
        if (document.getElementById('ai-chat-widget')) return; // Previne duplicação se chamado múltiplas vezes

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
                    <div class="chat-msg ai">Olá! Sou seu assistente de produção. Posso criar pedidos, calcular orçamentos ou fazer o emplacamento. Como posso ajudar hoje? 👕</div>
                </div>
                <div id="ai-chat-input-area">
                    <input type="text" id="ai-input" class="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500" placeholder="Ex: Novo pedido João, 30 camisas...">
                    <button id="ai-send-btn" class="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-3 py-2">➤</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', chatHTML);

        // Event Listeners
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

        const addActionCard = (toolName, args, confirmCallback) => {
            const div = document.createElement('div');
            div.className = 'chat-action-card';
            
            let summary = '';
            if (toolName === 'createOrder') summary = `Criando: <b>${args.description}</b><br>Cliente: ${args.clientName}`;
            else if (toolName === 'updateOrder') summary = `Atualizar Pedido #${args.orderId}`;
            else if (toolName === 'emplacarPedido') summary = `Emplacar Pedido #${args.orderId}`;
            else summary = `Executar: ${toolName}`;

            div.innerHTML = `
                <h4>⚡ Ação Pendente</h4>
                <p class="mb-2">${summary}</p>
                <div class="flex gap-2 justify-end">
                    <button class="cancel-action-btn text-xs px-2 py-1 rounded border border-red-500/50 text-red-400 hover:bg-red-500/10">Cancelar</button>
                    <button class="confirm-action-btn text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-500 font-bold">Confirmar</button>
                </div>
            `;
            
            div.querySelector('.confirm-action-btn').onclick = () => {
                div.remove();
                confirmCallback();
            };
            div.querySelector('.cancel-action-btn').onclick = () => {
                div.remove();
                addMessage("❌ Ação cancelada pelo usuário.", 'user');
            };
            
            msgsArea.appendChild(div);
            msgsArea.scrollTop = msgsArea.scrollHeight;
        };

        const handleSend = async () => {
            const text = input.value.trim();
            if (!text || isAiProcessing) return;
            
            input.value = '';
            addMessage(text, 'user');
            isAiProcessing = true;
            
            // Loading indicator
            const loadingDiv = addMessage("Thinking...", 'ai');
            loadingDiv.innerHTML = `<svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;

            try {
                // 1. Enviar para Gemini
                const response = await callGemini(text);
                loadingDiv.remove();

                // 2. Processar Resposta
                if (response.text) {
                    addMessage(response.text, 'ai');
                }

                // 3. Processar Tool Calls (Ações)
                if (response.toolCalls) {
                    for (const tool of response.toolCalls) {
                        addActionCard(tool.name, tool.args, async () => {
                            // Executa a ação real
                            const result = await executeLocalAction(tool.name, tool.args);
                            // Envia resultado de volta para a IA
                            const followUp = await callGemini(null, {
                                functionResponse: {
                                    name: tool.name,
                                    response: { result: result }
                                }
                            });
                            if (followUp.text) addMessage(followUp.text, 'ai');
                        });
                    }
                }

            } catch (err) {
                loadingDiv.remove();
                // Mostra o erro real na tela para ajudar a descobrir o problema
                addMessage(`⚠️ <b>Erro na conexão:</b><br>${err.message}`, 'ai', true);
                console.error("Erro detalhado do Assistente:", err);
            } finally {
                isAiProcessing = false;
            }
        };

        sendBtn.onclick = handleSend;
        input.onkeydown = (e) => { if (e.key === 'Enter') handleSend(); };
    };

    // --- LÓGICA DE COMUNICAÇÃO COM GEMINI ---
    const callGemini = async (userText, context = null) => {
        // Constrói o histórico para a API
        let contents = chatHistory.map(msg => ({
            role: msg.role,
            parts: msg.parts
        }));

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

        // Lista de modelos para tentar (Fallback automático)
        // Se o 1.5 Flash falhar, tenta o Pro (mais estável)
        const modelsToTry = [
            'gemini-2.0-flash-exp',     // Experimental mais recente (Rápido e Inteligente)
            'gemini-1.5-flash',         // Padrão atual (Estável)
            'gemini-1.5-pro',           // Alta inteligência
            'gemini-1.5-flash-8b',      // Versão leve e rápida
            'gemini-1.5-flash-001',     // Versão específica (compatibilidade)
            'gemini-pro',               // Fallback (v1.0 - funciona em quase todas as contas)
            'gemini-3-flash-preview'    // Futuro (conforme sua nota de 2026)
        ];

        let successData = null;
        let lastError = null;

        ensureGeminiEndpoint();

        for (const model of modelsToTry) {
            try {
                const res = await fetch(GEMINI_PROXY_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, payload })
                });
                const data = await res.json();

                if (res.ok && Array.isArray(data?.candidates) && data.candidates.length > 0) {
                    successData = data;
                    break; // Sucesso!
                }
                // Se falhar, registra erro e tenta o próximo
                let msg = data.error?.message || res.statusText;
                if (res.status === 404) msg = "Modelo não encontrado (404). A API 'Generative Language' pode não estar ativa nesta chave.";
                lastError = new Error(msg);
            } catch (e) {
                lastError = e;
            }
        }

        if (!successData) {
            // Se o erro for 404, dá a dica exata
            if (lastError && lastError.message.includes('404')) throw new Error("⚠️ <b>Erro de Permissão (404)</b><br>Sua chave de API pode estar sem acesso ao modelo.<br><br>👉 Verifique a chave <code>GEMINI_API_KEY</code> no ambiente da Vercel e as permissões no <b>aistudio.google.com</b>.");
            throw lastError || new Error("Não foi possível conectar com nenhum modelo da IA.");
        }

        const content = successData.candidates[0].content;
        const parts = content.parts || [];
        
        // Salva resposta no histórico
        chatHistory.push({ role: "model", parts: parts });

        // Extrai texto e chamadas de função
        let textResponse = "";
        let toolCalls = [];

        parts.forEach(part => {
            if (part.text) textResponse += part.text;
            if (part.functionCall) {
                toolCalls.push({
                    name: part.functionCall.name,
                    args: part.functionCall.args
                });
            }
        });

        return { text: textResponse, toolCalls: toolCalls };
    };

    // --- EXECUTOR DE AÇÕES LOCAIS (A "Mão" da IA) ---
    const executeLocalAction = async (name, args) => {
        console.log(`🤖 Executando ação: ${name}`, args);
        
        try {
            if (name === 'calculateDeadline') {
                const start = args.startDate ? new Date(args.startDate + "T00:00:00") : new Date();
                const days = args.days;
                const isBusiness = args.isBusinessDays;
                
                // Lista de Feriados Nacionais (Fixos e Móveis aproximados para 2025/2026)
                const holidays = [
                    "01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25",
                    // 2025
                    "2025-03-04", "2025-04-18", "2025-06-19",
                    // 2026
                    "2026-02-17", "2026-04-03", "2026-06-04"
                ];

                let current = new Date(start);
                let added = 0;
                
                while (added < days) {
                    current.setDate(current.getDate() + 1);
                    if (isBusiness) {
                        const day = current.getDay(); // 0=Dom, 6=Sab
                        const dateStr = current.toISOString().split('T')[0];
                        const mmdd = dateStr.substring(5);
                        
                        // Pula Fim de Semana e Feriados
                        if (day === 0 || day === 6) continue;
                        if (holidays.includes(mmdd) || holidays.includes(dateStr)) continue;
                    }
                    added++;
                }
                return { finalDate: current.toISOString().split('T')[0], startDate: start.toISOString().split('T')[0], daysCounted: days, type: isBusiness ? "dias úteis" : "dias corridos" };
            }

            if (name === 'createOrder') {
                // Busca ou cria cliente
                let client = clients.find(c => c.name.toLowerCase().includes(args.clientName.toLowerCase()));
                let clientId;
                if (client) {
                    clientId = client.id;
                } else {
                    clientId = Date.now();
                    const newClient = { id: clientId, name: args.clientName, gender: 'not_informed' };
                    clients.push(newClient);
                    localStorage.setItem('clients', JSON.stringify(clients));
                }

                const cuttingGrid = Array.isArray(args.sizes)
                    ? args.sizes.map(s => ({
                        id: (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
                        label: `${(s.gender || 'unissex').toLowerCase()} • Padrão • ${s.size || 'Único'}`,
                        gender: ['adulto','infantil','unissex'].includes(String(s.gender || '').toLowerCase()) ? String(s.gender).toLowerCase() : 'unissex',
                        variation: 'Padrão',
                        size: s.size || 'Único',
                        total: Math.max(0, parseInt(s.qty, 10) || 0),
                        cut: 0,
                        notes: ''
                    }))
                    : [];

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
                        art: { completed: false, deadline: '' },
                        mockup: { completed: false, deadline: '' },
                        fabric: { completed: false, deadline: '' },
                        cutting: { completed: false, deadline: '' },
                        sewing: { completed: false, deadline: '' },
                        printing: { completed: false, deadline: '' },
                        finishing: { completed: false, deadline: '' }
                    },
                    colors: [],
                    cutting: {
                        grid: cuttingGrid,
                        personalization: { enabled: false, names: [] },
                        updatedAt: Date.now()
                    }
                };

                productionOrders.push(newOrder);
                saveOrders();
                renderKanban();
                return { success: true, orderId: newOrder.id, clientName: args.clientName, description: args.description, status: 'todo' };
            }

            if (name === 'updateOrder') {
                const idx = productionOrders.findIndex(o => o.id === args.orderId);
                if (idx === -1) return { success: false, message: "Pedido não encontrado." };
                
                productionOrders[idx] = { ...productionOrders[idx], ...args.updates };
                saveOrders();
                renderKanban();
                return { success: true, message: "Pedido atualizado." };
            }

            if (name === 'listOrders') {
                let found = productionOrders;
                if (args.status) found = found.filter(o => o.status === args.status);
                if (args.search) {
                    const term = args.search.toLowerCase();
                    found = found.filter(o => {
                        const c = clients.find(cl => cl.id === o.clientId);
                        return o.description.toLowerCase().includes(term) || (c && c.name.toLowerCase().includes(term));
                    });
                }
                // Retorna resumo para economizar tokens
                return found.map(o => ({
                    id: o.id,
                    desc: o.description,
                    status: o.status,
                    total: o.totalValue
                }));
            }

            if (name === 'calculateOrder') {
                const total = (args.quantity * args.unitPrice) + (args.extras || 0) - (args.discount || 0);
                return {
                    total: total,
                    breakdown: `${args.quantity}x ${formatCurrency(args.unitPrice)} + Extras ${formatCurrency(args.extras||0)}`
                };
            }

            if (name === 'emplacarPedido') {
                const idx = productionOrders.findIndex(o => o.id === args.orderId);
                if (idx === -1) return { success: false, message: "Pedido não encontrado." };
                
                const order = productionOrders[idx];
                
                // Validação básica de emplacamento
                const missing = [];
                if (!order.totalValue) missing.push("Valor Total");
                if (!order.deadline) missing.push("Prazo");
                
                // Se a IA passou dados de checklist, atualiza
                if (args.checklistData) {
                    if (args.checklistData.colors) order.colors = args.checklistData.colors;
                    if (args.checklistData.sizes) {
                        order.cutting = order.cutting || { grid: [], personalization: { enabled: false, names: [] }, updatedAt: Date.now() };
                        order.cutting.grid = args.checklistData.sizes.map(s => ({
                            id: (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
                            label: `unissex • Padrão • ${s.size || 'Único'}`,
                            gender: 'unissex',
                            variation: 'Padrão',
                            size: s.size || 'Único',
                            total: Math.max(0, parseInt(s.qty, 10) || 0),
                            cut: 0,
                            notes: ''
                        }));
                        order.cutting.updatedAt = Date.now();
                    }
                }

                if (missing.length > 0) {
                    return { success: false, message: `Faltam dados para emplacar: ${missing.join(', ')}` };
                }

                // Move para Doing (Em Produção)
                order.status = 'doing';
                saveOrders();
                renderKanban();
                
                return { 
                    success: true, 
                    message: "Pedido emplacado e movido para produção!",
                    summary: {
                        client: clients.find(c => c.id === order.clientId)?.name,
                        desc: order.description,
                        total: order.totalValue
                    }
                };
            }

            return { success: false, message: "Ferramenta desconhecida." };

        } catch (e) {
            console.error(e);
            return { success: false, error: e.message };
        }
    };

    // Inicializa a aba selecionada (persistida) após registrar todos os renderizadores
    // Evita erro de TDZ: "Cannot access 'renderArtTasks' before initialization"
    setActiveTab(currentTab);

    // Inicializa o Chat (Sempre visível para facilitar configuração)
    createChatInterface();

    if (!GEMINI_PROXY_ENDPOINT) {
        const msgsArea = document.getElementById('ai-chat-messages');
        if (msgsArea) {
            const warning = document.createElement('div');
            warning.className = 'chat-msg ai';
            warning.style.cssText = 'border: 1px solid rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.1); color: #fca5a5;';
            warning.innerHTML = "⚠️ <b>Configuração Necessária</b><br>Configure o endpoint <code>/api/gemini</code> com a variável <code>GEMINI_API_KEY</code> no ambiente da Vercel.";
            msgsArea.appendChild(warning);
        }
    }
}; // end init

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
//
