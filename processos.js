const init = () => {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton) { mobileMenuButton.addEventListener('click', () => mobileMenu.classList.toggle('open')); }

    const addOrderBtn = document.getElementById('add-order-btn');
    const tabQuadro = document.getElementById('tab-quadro');
    const tabAfazeres = document.getElementById('tab-afazeres');
    const tabCortes = document.getElementById('tab-cortes');
    const viewQuadro = document.getElementById('view-quadro');
    const viewAfazeres = document.getElementById('view-afazeres');
    const viewCortes = document.getElementById('view-cortes');

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
    const orderChecklistContainer = document.getElementById('order-checklist');
    const orderNotesInput = document.getElementById('order-notes');
    const orderTotalValueInput = document.getElementById('order-total-value');
    const orderAmountPaidInput = document.getElementById('order-amount-paid');
    const orderIsPaidCheckbox = document.getElementById('order-is-paid');
    const cuttingDetailsSection = document.getElementById('cutting-details-section');
    const cuttingSubtasksContainer = document.getElementById('cutting-subtasks-container');
    const addCuttingItemBtn = document.getElementById('add-cutting-item-btn');
    // Novos elementos de corte/personalização
    const cuttingTotalBadge = document.getElementById('cutting-total-badge');
    const cuttingValidationMsg = document.getElementById('cutting-validation-msg');
    const hasPersonalizationCheckbox = document.getElementById('has-personalization');
    const personalizationContainer = document.getElementById('personalization-container');
    const personalizationNamesInput = document.getElementById('personalization-names');
    const namesCounter = document.getElementById('names-counter');
    const copyNamesBtn = document.getElementById('copy-names-btn');

    const tasksContainer = document.getElementById('tasks-container');
    const cuttingTasksContainer = document.getElementById('cutting-tasks-container');
    const cuttingModal = document.getElementById('cutting-modal');
    const cuttingModalTitle = document.getElementById('cutting-modal-title');
    const closeCuttingModalBtn = document.getElementById('close-cutting-modal-btn');
    const cuttingChecklistContainer = document.getElementById('cutting-checklist-container');
    const saveCutsBtn = document.getElementById('save-cuts-btn');
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
    let clients = JSON.parse(localStorage.getItem('clients')) || [];
    let editingOrderId = null;
    let activeCuttingOrderId = null;
    let activeArtOrderId = null;

    // --- EXPOR API PARA CEREBRO_IA.JS ---
    window.PsyzonApp = {
        productionOrders,
        clients,
        saveOrders: () => saveOrders(),
        renderKanban: () => renderKanban(),
        renderTasks: () => renderTasks()
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
    const saveOrders = () => {
        localStorage.setItem('production_orders', JSON.stringify(productionOrders));
        // Mantém o quadro sincronizado quando alterações acontecem em outras abas (Cortes/Artes/DTF)
        renderKanban();
        if (viewAfazeres && !viewAfazeres.classList.contains('hidden')) renderTasks();
        if (viewCortes && !viewCortes.classList.contains('hidden')) renderCuttingTasks();
        if (viewArtes && !viewArtes.classList.contains('hidden')) renderArtTasks();
        if (viewDTF && !viewDTF.classList.contains('hidden')) renderDTFTasks();
        applyDragScroll(); 
    };
    const formatCurrency = (amount) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const handleTabClick = (activeTab, activeView) => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab'));
        document.querySelectorAll('.view-container').forEach(view => view.classList.add('hidden'));
        activeTab.classList.add('active-tab');
        activeView.classList.remove('hidden');
    };
    tabQuadro.addEventListener('click', () => { handleTabClick(tabQuadro, viewQuadro); renderKanban(); });
    tabAfazeres.addEventListener('click', () => { handleTabClick(tabAfazeres, viewAfazeres); renderTasks(); });
    tabCortes.addEventListener('click', () => { handleTabClick(tabCortes, viewCortes); renderCuttingTasks(); });

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
        cuttingSubtasksContainer.innerHTML = '';
        cuttingDetailsSection.classList.remove('hidden');
        // reset DTF temp
        activeDtfImages = [];
        if (orderPrintingImagesContainer) orderPrintingImagesContainer.innerHTML = '';
        if (orderPrintQuantityInput) orderPrintQuantityInput.value = '';
        // reset Art Only temp
        activeArtOnlyImages = [];
        // reset Personalization
        if (hasPersonalizationCheckbox) hasPersonalizationCheckbox.checked = false;
        if (personalizationContainer) personalizationContainer.classList.add('hidden');
        if (personalizationNamesInput) personalizationNamesInput.value = '';

        if (artOnlyImagesPreview) artOnlyImagesPreview.innerHTML = '';
        if (isArtOnlyCheckbox) isArtOnlyCheckbox.checked = false;

        if (orderId) {
            const order = productionOrders.find(o => o.id === orderId);
            orderModalTitle.textContent = "Editar Pedido";
            orderDescriptionInput.value = order.description;
            orderClientSelect.value = order.clientId;
            orderDeadlineInput.value = order.deadline;
            orderNotesInput.value = order.notes || '';
            orderTotalValueInput.value = order.totalValue || '';
            orderAmountPaidInput.value = order.amountPaid || '';
            orderIsPaidCheckbox.checked = order.isPaid || false;
            renderChecklist(order.checklist);

            const cuttingTask = order.checklist && order.checklist.cutting;
            if (cuttingTask) {
                if (cuttingTask.subtasks) cuttingTask.subtasks.forEach(sub => renderCuttingSubtask(sub));
                // Carregar Personalização
                if (cuttingTask.personalization) {
                    if (hasPersonalizationCheckbox) {
                        hasPersonalizationCheckbox.checked = cuttingTask.personalization.hasNames;
                        if (cuttingTask.personalization.hasNames) personalizationContainer.classList.remove('hidden');
                    }
                    if (personalizationNamesInput) personalizationNamesInput.value = cuttingTask.personalization.names || '';
                }
            }
            updateCuttingTotals(); // Atualiza validação inicial

            orderPrintTypeSelect.value = order.printType || 'dtf';
            renderColors(order.colors || []);
            // load printing data if present
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
            // Art Only check
            if (order.isArtOnly) {
                if (isArtOnlyCheckbox) isArtOnlyCheckbox.checked = true;
                if (order.art && order.art.images) activeArtOnlyImages = order.art.images.slice();
                renderArtOnlyPreviews();
            }

            // ensure DTF block visibility
            togglePrintingBlock();
        } else {
            orderModalTitle.textContent = "Novo Pedido de Produção";
            const defaultChecklist = Object.keys(checklistItems).reduce((acc, key) => ({ ...acc, [key]: { completed: false, deadline: '' } }), {});
            renderChecklist(defaultChecklist);
            orderPrintTypeSelect.value = 'dtf';
            renderColors([]);
            activeDtfImages = [];
            if (orderPrintingImagesContainer) orderPrintingImagesContainer.innerHTML = '';
            if (orderPrintQuantityInput) orderPrintQuantityInput.value = '';
            if (orderPrintingNotesInput) orderPrintingNotesInput.value = '';
            togglePrintingBlock();
        }
        toggleArtOnlyMode(); // Apply visibility based on checkbox state
        orderModal.classList.remove('hidden');
        // Adicione aqui:
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

    // --- NOVA LÓGICA DE CORTES (MINI-CARDS) ---
    const renderCuttingSubtask = (subtask = {}) => {
        const subtaskId = subtask.id || Date.now() + Math.random();
        const item = document.createElement('div');
        item.className = 'cut-item-card';
        item.dataset.subtaskId = subtaskId;

        const genders = ['Feminina', 'Masculina', 'Infantil'];
        const variations = ['Normal', 'Babylook', 'Oversized', 'Regata', 'Manga Longa'];
        
        // Compatibilidade com dados antigos
        const currentGender = subtask.gender || (genders.includes(subtask.type) ? subtask.type : 'Masculina');
        const currentVariation = subtask.variation || subtask.style || 'Normal';
        
        const isInfantil = currentGender === 'Infantil';
        const currentSizeList = isInfantil ? sizeOptions.infantil : sizeOptions.adulto;

        item.innerHTML = `
            <div class="cut-header grid grid-cols-3 gap-2">
                <select class="subtask-gender cut-select">${genders.map(g => `<option ${currentGender === g ? 'selected' : ''}>${g}</option>`).join('')}</select>
                <select class="subtask-size cut-select">${currentSizeList.map(s => `<option ${subtask.size === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
                <select class="subtask-variation cut-select">${variations.map(v => `<option ${currentVariation === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
            </div>
            <div class="flex items-center justify-between mt-2">
                <div class="qty-control">
                    <button type="button" class="qty-btn minus">-</button>
                    <input type="number" class="subtask-total qty-input" value="${subtask.total || 0}" min="0">
                    <button type="button" class="qty-btn plus">+</button>
                </div>
                <div class="cut-actions flex gap-3 text-xs">
                    <button type="button" class="dup-btn text-cyan-400">Duplicar</button>
                    <button type="button" class="del-btn text-red-400">Excluir</button>
                </div>
            </div>
            <input type="text" class="subtask-notes w-full mt-2 bg-transparent border-b border-white/10 text-xs text-gray-400 focus:border-cyan-500 outline-none" placeholder="Observação (ex: Gola Polo)" value="${subtask.notes || ''}">
        `;

        // Event Listeners do Card
        const qtyInput = item.querySelector('.subtask-total');
        item.querySelector('.plus').onclick = () => { qtyInput.value = parseInt(qtyInput.value||0) + 1; updateCuttingTotals(); };
        item.querySelector('.minus').onclick = () => { qtyInput.value = Math.max(0, parseInt(qtyInput.value||0) - 1); updateCuttingTotals(); };
        qtyInput.oninput = updateCuttingTotals;
        
        item.querySelector('.del-btn').onclick = () => {
            if(confirm('Excluir este item de corte?')) { item.remove(); updateCuttingTotals(); }
        };

        item.querySelector('.dup-btn').onclick = () => {
            const cloneData = {
                gender: item.querySelector('.subtask-gender').value,
                size: item.querySelector('.subtask-size').value,
                variation: item.querySelector('.subtask-variation').value,
                total: parseInt(qtyInput.value),
                notes: item.querySelector('.subtask-notes').value
            };
            renderCuttingSubtask(cloneData);
            updateCuttingTotals();
        };

        // Atualiza tamanhos ao mudar gênero
        item.querySelector('.subtask-gender').onchange = (e) => {
            const sel = e.target.value;
            const sizeSel = item.querySelector('.subtask-size');
            const list = sel === 'Infantil' ? sizeOptions.infantil : sizeOptions.adulto;
            const currentSize = sizeSel.value;
            sizeSel.innerHTML = list.map(s => `<option ${currentSize === s ? 'selected' : ''}>${s}</option>`).join('');
        };

        cuttingSubtasksContainer.appendChild(item);
        updateCuttingTotals();
    };

    // Validação e Totais
    const updateCuttingTotals = () => {
        let totalCuts = 0;
        document.querySelectorAll('.subtask-total').forEach(inp => totalCuts += parseInt(inp.value || 0));
        
        if (cuttingTotalBadge) cuttingTotalBadge.textContent = `Total: ${totalCuts}`;
        
        // Validação com Total do Pedido (se houver campo de qtd total de impressão ou se for calculado)
        // Como o sistema original não tinha um campo "Total do Pedido" explícito além do printing.total, vamos usar esse ou criar um alerta visual apenas.
        // O prompt pede validação. Vamos assumir que o usuário deve preencher o total em algum lugar ou que a soma É o total.
        // Se houver nomes, validamos nomes vs totalCuts.
        
        if (personalizationNamesInput) {
            const names = personalizationNamesInput.value.split('\n').filter(l => l.trim() !== '');
            const namesCount = names.length;
            if (namesCounter) {
                namesCounter.textContent = `${namesCount} nomes / ${totalCuts} peças`;
                namesCounter.className = namesCount === totalCuts ? 'text-green-400 font-bold' : 'text-red-400 font-bold';
            }
        }
    };

    // Listeners antigos removidos ou adaptados
    cuttingSubtasksContainer.addEventListener('change', (e) => {
        // atualiza lista de tamanhos quando trocar gênero (Feminina/Masculina/Infantil)
        if (e.target.classList.contains('subtask-gender')) {
            const selectedType = e.target.value;
            const sizeSelect = e.target.closest('.grid').querySelector('.subtask-size');
            const newSizeList = selectedType === 'Infantil' ? sizeOptions.infantil : sizeOptions.adulto;
            sizeSelect.innerHTML = newSizeList.map(s => `<option>${s}</option>`).join('');
        }
    });

    addCuttingItemBtn.addEventListener('click', () => renderCuttingSubtask());

    // Personalização Listeners
    if (hasPersonalizationCheckbox) {
        hasPersonalizationCheckbox.addEventListener('change', () => {
            personalizationContainer.classList.toggle('hidden', !hasPersonalizationCheckbox.checked);
        });
    }
    if (personalizationNamesInput) {
        personalizationNamesInput.addEventListener('input', updateCuttingTotals);
    }
    if (copyNamesBtn) {
        copyNamesBtn.addEventListener('click', () => {
            if (personalizationNamesInput) {
                navigator.clipboard.writeText(personalizationNamesInput.value).then(() => alert('Lista copiada!'));
            }
        });
    }

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

            const subtasks = [];
            cuttingSubtasksContainer.querySelectorAll('.cut-item-card').forEach(row => {
                const totalInput = row.querySelector('.subtask-total');
                if (totalInput && totalInput.value) {
                    const existingSubtask = (editingOrderId && productionOrders.find(o => o.id === editingOrderId).checklist.cutting.subtasks.find(s => s.id == row.dataset.subtaskId));
                    subtasks.push({
                        id: parseFloat(row.dataset.subtaskId) || Date.now() + Math.random(),
                        gender: row.querySelector('.subtask-gender').value,
                        variation: row.querySelector('.subtask-variation').value,
                        size: row.querySelector('.subtask-size').value,
                        total: parseInt(totalInput.value) || 0,
                        cut: existingSubtask ? existingSubtask.cut : 0,
                        notes: row.querySelector('.subtask-notes').value
                    });
                }
            });

            checklist.cutting = checklist.cutting || {};
            checklist.cutting.completed = subtasks.length === 0;
            checklist.cutting.subtasks = subtasks;
            // Salvar Personalização
            checklist.cutting.personalization = {
                hasNames: hasPersonalizationCheckbox ? hasPersonalizationCheckbox.checked : false,
                names: personalizationNamesInput ? personalizationNamesInput.value : ''
            };

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
                        totalItems: (newOrder.checklist.cutting?.subtasks || []).reduce((a,b)=>a+b.total,0) || newOrder.printing?.total || 1,
                        printType: newOrder.printType
                    }, { orderId: newOrder.id, customerId: newOrder.clientId });
                }
            }
            saveOrders();
            renderKanban();
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
        card.className = `kanban-card syt-process-card ${borderClass}`;
        card.setAttribute('draggable', true);
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
                </div>
                <button onclick="event.stopPropagation(); window.openOrderModal(${order.id})" class="syt-edit-btn" title="Editar Pedido">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>
                </button>
            </div>

            <div class="syt-badges-row">
                <span class="syt-pill syt-pill-tech">${order.printType ? order.printType.toUpperCase() : 'N/A'}</span>
                <span class="syt-pill syt-pill-pay ${paymentStatusClass}">${paymentStatusText.toUpperCase()}</span>
                <span class="syt-pill syt-pill-deadline">${deadlineText}</span>
            </div>

            <div class="syt-card-meta-grid">
                <div class="syt-meta-item syt-meta-progress">
                    <div class="syt-block-header">
                        <span class="label">🛠️ Produção</span>
                        <span class="value">${Math.round(progress)}%</span>
                    </div>
                    <div class="syt-progress-bar-sm-bg">
                        <div class="syt-progress-bar-sm-fg" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>

            <div class="syt-payment-block">
                <div class="syt-block-header">
                    <span class="label">💰 Financeiro</span>
                    <span class="value">${paidPercent.toFixed(0)}%</span>
                </div>
                <div class="syt-payment-details">
                    <div><span>Total</span> <strong>${total > 0 ? formatCurrency(total) : '—'}</strong></div>
                    <div><span>Pago</span> <strong>${formatCurrency(paid)}</strong></div>
                    <div><span>Falta</span> <strong class="due">${formatCurrency(due)}</strong></div>
                </div>
                <div class="syt-payment-progress"><div class="syt-progress-bar-bg"><div class="syt-progress-bar-fg" style="width: ${paidPercent}%"></div></div></div>
            </div>

            <div class="syt-payment-status ${paymentStatusClass}">
                <span class="syt-status-dot"></span>
                <span>${paymentStatusText}</span>
            </div>

            <div class="syt-card-footer">
                <button class="syt-action-btn primary" onclick="event.stopPropagation(); window.openOrderModal(${order.id})">Receber pagamento</button>
                <button class="syt-action-btn secondary" onclick="event.stopPropagation(); window.openOrderModal(${order.id})">Ver detalhes <span aria-hidden="true">→</span></button>
            </div>
        `;
        return card;
    };

    window.removeOrder = (orderId) => {
        if (confirm('Tem certeza que deseja excluir permanentemente este pedido concluído?')) {
            productionOrders = productionOrders.filter(o => o.id !== orderId);
            saveOrders();
            renderKanban();
        }
    };

    window.openOrderModal = (orderId) => openModal(orderId);

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
            if (columns[order.status]) {
                const card = createOrderCard(order);
                columns[order.status].appendChild(card);
            }
        });
        
        // Update Mobile Tab Badges
        const counts = { todo: 0, doing: 0, done: 0 };
        productionOrders.forEach(o => { if(counts[o.status] !== undefined) counts[o.status]++; });
        
        mobileTabs.forEach(tab => {
            const target = tab.dataset.target.replace('column-', '');
            const label = target === 'todo' ? 'A Fazer' : (target === 'doing' ? 'Em Andamento' : 'Concluído');
            tab.textContent = `${label} (${counts[target]})`;
        });
    };

    const kanbanColumns = document.querySelectorAll('.kanban-column');
    kanbanColumns.forEach(column => {
        column.addEventListener('dragover', e => { e.preventDefault(); column.classList.add('bg-white/5'); });
        column.addEventListener('dragleave', () => { column.classList.remove('bg-white/5'); });
        column.addEventListener('drop', e => {
            e.preventDefault();
            column.classList.remove('bg-white/5');
            const cardId = parseInt(e.dataTransfer.getData('text/plain'));
            const newStatus = column.id.replace('column-', '');
            const order = productionOrders.find(o => o.id === cardId);
            if (order) {
                order.status = newStatus;
                saveOrders();
                renderKanban();
            }
        });
    });

    document.addEventListener('dragstart', e => {
        if (e.target.classList.contains('kanban-card')) {
            e.dataTransfer.setData('text/plain', e.target.dataset.id);
        }
    });

    // --- TOUCH DRAG & DROP (MOBILE) ---
    let touchDragItem = null;
    let touchGhost = null;
    let longPressTimer = null;
    let isDragging = false;
    let touchStartCoords = null;

    const handleTouchStart = (e) => {
        const card = e.target.closest('.kanban-card');
        if (!card) return;
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.btn-action')) return;

        touchDragItem = card;
        touchStartCoords = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isDragging = false;

        longPressTimer = setTimeout(() => {
            isDragging = true;
            if (navigator.vibrate) navigator.vibrate(50);
            
            const rect = card.getBoundingClientRect();
            touchGhost = card.cloneNode(true);
            touchGhost.style.position = 'fixed';
            touchGhost.style.width = `${rect.width}px`;
            touchGhost.style.height = `${rect.height}px`;
            touchGhost.style.left = `${rect.left}px`;
            touchGhost.style.top = `${rect.top}px`;
            touchGhost.style.opacity = '0.9';
            touchGhost.style.zIndex = '10000';
            touchGhost.style.pointerEvents = 'none';
            touchGhost.style.transform = 'scale(1.05) rotate(2deg)';
            touchGhost.style.boxShadow = '0 15px 30px rgba(0,0,0,0.5)';
            touchGhost.classList.add('glass-card'); 
            document.body.appendChild(touchGhost);
            
            card.classList.add('opacity-30');
        }, 400); 
    };

    const handleTouchMove = (e) => {
        if (!touchDragItem) return;
        const touch = e.touches[0];
        
        if (!isDragging) {
            const dx = Math.abs(touch.clientX - touchStartCoords.x);
            const dy = Math.abs(touch.clientY - touchStartCoords.y);
            if (dx > 10 || dy > 10) {
                clearTimeout(longPressTimer);
                touchDragItem = null;
            }
            return;
        }

        if (e.cancelable) e.preventDefault();

        if (touchGhost) {
            const w = touchGhost.offsetWidth;
            const h = touchGhost.offsetHeight;
            touchGhost.style.left = `${touch.clientX - w / 2}px`;
            touchGhost.style.top = `${touch.clientY - h / 2}px`;
        }

        // Auto-scroll da tela no mobile durante drag (permite arrastar para baixo/subir)
        const edgeThreshold = 90;
        const maxScrollStep = 18;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        if (touch.clientY > viewportHeight - edgeThreshold) {
            const intensity = (touch.clientY - (viewportHeight - edgeThreshold)) / edgeThreshold;
            window.scrollBy(0, Math.ceil(maxScrollStep * Math.min(1, intensity)));
        } else if (touch.clientY < edgeThreshold) {
            const intensity = (edgeThreshold - touch.clientY) / edgeThreshold;
            window.scrollBy(0, -Math.ceil(maxScrollStep * Math.min(1, intensity)));
        }

        // Highlight columns
        document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('bg-white/10'));
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const col = target ? target.closest('.kanban-column') : null;
        if (col) col.classList.add('bg-white/10');
    };

    const handleTouchEnd = (e) => {
        clearTimeout(longPressTimer);
        document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('bg-white/10'));
        
        if (isDragging && touchDragItem) {
            touchDragItem.classList.remove('opacity-30');
            if (touchGhost) touchGhost.remove();

            const touch = e.changedTouches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const col = target ? target.closest('.kanban-column') : null;
            
            if (col) {
                const newStatus = col.id.replace('column-', '');
                const orderId = parseInt(touchDragItem.dataset.id);
                const order = productionOrders.find(o => o.id === orderId);
                
                if (order && order.status !== newStatus) {
                    order.status = newStatus;
                    saveOrders();
                    renderKanban();
                    if (navigator.vibrate) navigator.vibrate([50]);
                }
            }
        }
        touchDragItem = null;
        touchGhost = null;
        isDragging = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

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

    const renderCuttingTasks = () => {
        cuttingTasksContainer.innerHTML = '';
        // Show orders even if subtasks are not defined yet, so user can open checklist and add them
        const pendingCutOrders = productionOrders.filter(order => 
            !order.isArtOnly && 
            order.checklist && 
            order.checklist.cutting && 
            !order.checklist.cutting.completed
        );
        if (pendingCutOrders.length === 0) {
            cuttingTasksContainer.innerHTML = '<div class="glass-card p-6 text-center text-gray-400">Nenhuma tarefa de corte pendente. ✨</div>';
            return;
        }
        pendingCutOrders.forEach(order => {
            const client = clients.find(c => c.id === order.clientId);
            const subtasks = order.checklist.cutting.subtasks || [];
            const totalToCut = subtasks.reduce((acc, sub) => acc + sub.total, 0);
            const totalCut = subtasks.reduce((acc, sub) => acc + sub.cut, 0);

            // render colors
            const colors = order.colors || [];
            const colorsHtml = colors.map(c => {
                // try to use as background if looks like hex, otherwise show label
                const safeBg = /^#([0-9A-F]{3}){1,2}$/i.test(c.trim()) ? `background:${c}` : '';
                return `<div class="flex items-center gap-2"><div class="w-6 h-6 rounded-sm border" style="${safeBg}"></div><span class="text-xs text-gray-300">${c}</span></div>`;
            }).join('');

            const card = document.createElement('div');
            card.className = 'glass-card p-4 flex flex-col gap-3';
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold">${order.description}</p>
                        <p class="text-sm text-cyan-300">${client ? client.name : 'Cliente'}</p>
                        <p class="text-xs text-gray-400">Prazo: ${order.deadline ? new Date(order.deadline + "T03:00:00").toLocaleDateString('pt-BR') : ''}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold">${totalCut} / ${totalToCut}</p>
                        <p class="text-xs text-gray-400">Peças Cortadas</p>
                    </div>
                </div>
                <div class="flex flex-wrap gap-3 items-center">
                    ${colorsHtml || '<span class="text-xs text-gray-500">Sem cores definidas</span>'}
                </div>
                <div class="flex justify-end">
                    <button data-order-id="${order.id}" class="open-checklist-btn btn-shine py-2 px-4 rounded-lg text-sm">Abrir Checklist</button>
                </div>
            `;
            cuttingTasksContainer.appendChild(card);
        });
    };

    if (cuttingTasksContainer) {
        cuttingTasksContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('open-checklist-btn')) {
                openCuttingModal(parseInt(e.target.dataset.orderId));
            }
        });
    }

    const openCuttingModal = (orderId) => {
        activeCuttingOrderId = orderId;
        const order = productionOrders.find(o => o.id === orderId);
        const client = clients.find(c => c.id === order.clientId);
        cuttingModalTitle.textContent = `Pedido: ${order.description} (${client.name})`;

        // remove existing details display (avoid duplicates)
        const existingDetails = document.getElementById('cutting-details-display');
        if (existingDetails) existingDetails.remove();

        // build details card with colors and insert above checklist (tipo de camisa removido)
        const colors = order.colors || [];
        const colorsHtml = colors.map(c => {
            const safeBg = /^#([0-9A-F]{3}){1,2}$/i.test((c || '').trim()) ? `background:${c}` : '';
            return `<div class="flex items-center gap-2"><div class="w-6 h-6 rounded-sm border" style="${safeBg}"></div><span class="text-xs text-gray-300">${c}</span></div>`;
        }).join('');
        const detailsHtml = `
            <div id="cutting-details-display" class="glass-card p-4 mb-4">
                <div>
                    <p class="text-sm text-gray-300">Cores</p>
                    <div class="flex gap-3 mt-2 flex-wrap">
                        ${colorsHtml || '<span class="text-xs text-gray-500">Sem cores</span>'}
                    </div>
                </div>
            </div>
        `;
        if (cuttingChecklistContainer && cuttingChecklistContainer.parentElement) {
            cuttingChecklistContainer.insertAdjacentHTML('beforebegin', detailsHtml);
        }

        renderCuttingChecklist(order.checklist.cutting.subtasks);
        cuttingModal.classList.remove('hidden');
        const closeBtn = document.getElementById('close-cutting-modal-btn');
        if (closeBtn) {
            closeBtn.onclick = function (e) {
                e.preventDefault();
                closeCuttingModal();
            };
        }
    };

    const renderCuttingChecklist = (subtasks) => {
        cuttingChecklistContainer.innerHTML = '';
        subtasks.forEach(subtask => {
            const isCompleted = subtask.cut >= subtask.total;
            const label = `${subtask.gender || subtask.type || ''} ${subtask.variation || subtask.style || ''} - ${subtask.size} ${subtask.notes ? '('+subtask.notes+')' : ''}`;
            const item = document.createElement('div');
            item.className = `p-3 rounded-md flex justify-between items-center bg-white/5 ${isCompleted ? 'border-l-4 border-green-500' : ''}`;
            item.innerHTML = `<div class="font-semibold">${label}</div><div class="flex items-center gap-4"><input type="number" value="${subtask.cut}" min="0" max="${subtask.total}" class="cut-quantity-input w-20 p-2 text-center rounded-md bg-white/10" data-subtask-id="${subtask.id}"><span class="text-gray-400">/ ${subtask.total}</span></div>`;
            cuttingChecklistContainer.appendChild(item);
        });
    };

    const saveCuts = () => {
        const order = productionOrders.find(o => o.id === activeCuttingOrderId);
        if (!order) return;
        let allSubtasksCompleted = true;
        document.querySelectorAll('.cut-quantity-input').forEach(input => {
            const subtaskId = parseFloat(input.dataset.subtaskId);
            const newCutAmount = parseInt(input.value);
            const subtask = order.checklist.cutting.subtasks.find(s => s.id === subtaskId);
            if (subtask) {
                subtask.cut = newCutAmount;
                if (subtask.cut < subtask.total) allSubtasksCompleted = false;
            }
        });
        if (allSubtasksCompleted) {
            if (confirm("Todos os itens foram cortados. Deseja marcar a tarefa de corte como concluída?")) {
                order.checklist.cutting.completed = true;
            }
        }
        saveOrders();
        closeCuttingModal();
        renderCuttingTasks();
        renderKanban();
    };

    // Listener para salvar cortes
    if (saveCutsBtn) saveCutsBtn.addEventListener('click', saveCuts);

    const closeCuttingModal = () => {
        cuttingModal.classList.add('hidden');
        activeCuttingOrderId = null;
    };

    const renderArtTasks = () => {
        artTasksContainer.innerHTML = '';
        
        // Filtra pedidos que precisam de arte (seja ArtOnly ou Produção com arte pendente)
        // Mostra todos que não estão 'done' para permitir gerenciar versões mesmo após aprovação inicial
        const artOrders = productionOrders.filter(order => 
            order.status !== 'done' && (order.isArtOnly || (order.checklist && order.checklist.art))
        );

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
            const thumbSrc = (lastVersion && lastVersion.images[0]) ? lastVersion.images[0] : (order.art?.images?.[0] || 'img/placeholder-art.png');

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
                    <img src="${thumbSrc}" class="art-thumb" onerror="this.style.display='none'">
                    <div class="art-info-grid">
                        <div class="art-info-item">
                            <span class="text-gray-500">Prazo:</span>
                            <span class="text-white font-medium">${new Date(order.deadline).toLocaleDateString('pt-BR').slice(0,5)}</span>
                        </div>
                        <div class="art-info-item">
                            <span class="text-gray-500">Versões:</span>
                            <span class="text-white font-medium">${artControl.versions.length}</span>
                        </div>
                    </div>
                </div>

                <div class="art-card-actions">
                    <button data-order-id="${order.id}" class="open-art-modal-btn art-btn-action primary">Gerenciar</button>
                    <button class="art-btn-action" onclick="alert('Link copiado!')">Link</button>
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
            const uid = auth.currentUser ? auth.currentUser.uid : '';
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
                navigator.clipboard.writeText(e.target.dataset.link).then(() => alert('Link copiado! Envie para o cliente.'));
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

    if (artTasksContainer) {
        artTasksContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('open-art-modal-btn')) {
                openArtControlModal(parseInt(e.target.dataset.orderId));
            }
        });
    }
    // closeArtModalBtn agora é tratado dentro de openArtControlModal dinamicamente ou via delegate global

    // Ativa renderização da aba de artes
    const tabArtes = document.getElementById('tab-artes');
    const viewArtes = document.getElementById('view-artes');
    tabArtes.addEventListener('click', () => { handleTabClick(tabArtes, viewArtes); renderArtTasks(); });

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

    renderKanban();
    checkPrefillData();

    const dtfTasksContainer = document.getElementById('dtf-tasks-container');
    const tabDTF = document.getElementById('tab-dtf');
    const viewDTF = document.getElementById('view-dtf');

    tabDTF.addEventListener('click', () => { handleTabClick(tabDTF, viewDTF); renderDTFTasks(); });

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
    ['add-order-btn', 'tab-quadro', 'tab-afazeres', 'tab-cortes', 'view-quadro', 'view-afazeres', 'view-cortes', 'order-modal', 'cancel-order-btn', 'close-cutting-modal-btn', 'close-art-modal-btn']
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
        // Fechar modal de corte
        if (btn.id === 'close-cutting-modal-btn' || btn.closest && btn.closest('[data-action="close-cutting-modal"]')) {
            e.preventDefault();
            const modal = document.getElementById('cutting-modal');
            if (modal) { modal.classList.add('hidden'); console.log('processos.js: cuttingModal fechado (delegado)'); }
            activeCuttingOrderId = null;
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
        const modalIds = ['order-modal', 'cutting-modal', 'art-modal', 'art-image-fullscreen-modal'];
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
    
    // Configuração da API (Substitua pela sua chave real ou use um proxy)
    // .trim() remove espaços acidentais antes ou depois da chave
    const GEMINI_API_KEY = "AIzaSyBVog4tmzmTpLReuyhSD5OnXmobF0rLrow".trim(); 
    
    console.log("🔑 Chave Gemini Carregada:", GEMINI_API_KEY.substring(0, 8) + "..."); // Verifica no console se a chave nova carregou

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

        const payload = {
            contents: contents,
            tools: [{ functionDeclarations: aiTools }],
            systemInstruction: { parts: [{ text: systemInstruction }] }
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

        for (const model of modelsToTry) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (res.ok && data.candidates) {
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
            if (lastError && lastError.message.includes('404')) throw new Error("⚠️ <b>Erro de Permissão (404)</b><br>Sua chave de API é válida, mas não tem acesso à IA.<br><br>👉 Crie uma nova chave em <b>aistudio.google.com</b> e substitua no código.");
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

                // Processa Grade de Tamanhos (Sizes)
                let subtasks = [];
                if (args.sizes && Array.isArray(args.sizes)) {
                    subtasks = args.sizes.map(s => ({
                        id: Date.now() + Math.random(),
                        type: s.gender || 'Masculina', // Default se não informado
                        style: 'Normal',
                        size: s.size,
                        total: s.qty,
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
                        art: { completed: false, deadline: '' },
                        mockup: { completed: false, deadline: '' },
                        fabric: { completed: false, deadline: '' },
                        cutting: { completed: false, deadline: '', subtasks: subtasks },
                        sewing: { completed: false, deadline: '' },
                        printing: { completed: false, deadline: '' },
                        finishing: { completed: false, deadline: '' }
                    },
                    colors: []
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
                    // Lógica para adicionar subtasks de corte se fornecidas
                    if (args.checklistData.sizes) {
                        // Exemplo simplificado: sizes = [{"size": "P", "qty": 10}]
                        order.checklist.cutting.subtasks = args.checklistData.sizes.map(s => ({
                            id: Date.now() + Math.random(),
                            type: 'Feminina', // Default
                            style: 'Normal',
                            size: s.size,
                            total: s.qty,
                            cut: 0
                        }));
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

    // Inicializa o Chat (Sempre visível para facilitar configuração)
    createChatInterface();

    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
        const msgsArea = document.getElementById('ai-chat-messages');
        if (msgsArea) {
            const warning = document.createElement('div');
            warning.className = 'chat-msg ai';
            warning.style.cssText = 'border: 1px solid rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.1); color: #fca5a5;';
            warning.innerHTML = "⚠️ <b>Configuração Necessária</b><br>Edite o arquivo <code>processos.js</code> e adicione sua API Key do Google Gemini para ativar a inteligência.";
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
