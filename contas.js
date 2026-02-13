const initContas = () => {
    'use strict';

    // --- DOM ELEMENTS ---
    const el = id => document.getElementById(id);
    const qs = s => document.querySelector(s);
    const qsa = s => document.querySelectorAll(s);

    const addBillBtn = el('add-bill-btn');
    const monthSelector = el('month-selector');
    const prevMonthBtn = el('prev-month-btn');
    const nextMonthBtn = el('next-month-btn');
    const currentMonthLabel = el('current-month-label');

    // Summary Cards
    const summaryTotalEl = el('summary-total');
    const summaryPendingEl = el('summary-pending');
    const summaryPaidEl = el('summary-paid');
    const summaryOverdueEl = el('summary-overdue');

    // Bills List
    const billsTableBody = el('bills-table-body');
    const billsCardContainer = el('bills-card-container');
    const categoryPieChartCanvas = el('category-pie-chart');
    const upcomingBillsListEl = el('upcoming-bills-list');

    // Bill Modal (Add/Edit)
    const billModal = el('bill-modal');
    const billModalTitle = el('bill-modal-title');
    const billForm = el('bill-form');
    const cancelBillBtn = el('cancel-bill-btn');
    const billNameInput = el('bill-name');
    const billCategoryInput = el('bill-category');
    const billPriorityInput = el('bill-priority');
    const billTypeInput = el('bill-type');
    const billInstallmentsContainer = el('bill-installments-container');
    const billCurrentInstallmentInput = el('bill-current-installment');
    const billTotalInstallmentsInput = el('bill-total-installments');
    const billAmountInput = el('bill-amount');
    const billDueDayInput = el('bill-due-day');
    const billUniqueDateContainer = el('bill-unique-date-container');
    const billUniqueDateInput = el('bill-unique-date');
    const billPaymentMethodInput = el('bill-payment-method');
    const billNotesInput = el('bill-notes');

    // Pay Modal
    const payModal = el('pay-modal');
    const payModalName = el('pay-modal-name');
    const payForm = el('pay-form');
    const cancelPayBtn = el('cancel-pay-btn');
    const payDateInput = el('pay-date');
    const payAmountInput = el('pay-amount');
    const payNotesInput = el('pay-notes');

    // Reminders
    const remindersEnabledCheckbox = el('reminders-enabled');
    const reminderTimeInput = el('reminder-time');
    const reminderLeadTimeSelect = el('reminder-lead-time');
    const testNotificationBtn = el('test-notification-btn');
    
    // Import/Export
    const exportBtn = el('export-btn');
    const importBtn = el('import-btn');
    const importFileInput = el('import-file-input');

    // --- STATE ---
    const DB_KEY = 'psyzon_accounts_db_v1';
    let db = {
        accounts: [],
        monthly_records: {},
        settings: {
            reminders: { enabled: true, time: '09:00', leadDays: 1 }
        }
    };
    let currentEditingId = null;
    let currentPaying = { accountId: null, monthKey: null };
    let currentDate = new Date();
    let categoryPieChart = null;

    // --- UTILS ---
    const formatCurrency = (amount) => (amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const showToast = (message, type = 'info') => {
        const container = el('notification-container');
        if (!container) return;
        const colors = { info: 'bg-cyan-500', success: 'bg-green-500', warning: 'bg-yellow-500', danger: 'bg-red-500' };
        const toast = document.createElement('div');
        toast.className = `p-3 rounded-lg shadow-lg text-white text-sm ${colors[type]}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };

    // --- DATABASE ---
    const saveDb = () => localStorage.setItem(DB_KEY, JSON.stringify(db));
    const loadDb = () => {
        const data = localStorage.getItem(DB_KEY);
        if (data) {
            db = { ...db, ...JSON.parse(data) };
            // Ensure nested objects exist
            db.settings = db.settings || { reminders: { enabled: true, time: '09:00', leadDays: 1 } };
            db.settings.reminders = db.settings.reminders || { enabled: true, time: '09:00', leadDays: 1 };
        }
    };
    const exportDb = () => {
        const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `psyzon_contas_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup exportado com sucesso!', 'success');
    };
    const importDb = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData.accounts && importedData.monthly_records) {
                    if (confirm('Isso substituirá todos os dados de contas atuais. Deseja continuar?')) {
                        db = importedData;
                        saveDb();
                        renderForDate(currentDate);
                        showToast('Dados importados com sucesso!', 'success');
                    }
                } else {
                    throw new Error('Formato de arquivo inválido.');
                }
            } catch (error) {
                showToast(`Erro ao importar: ${error.message}`, 'danger');
            }
        };
        reader.readAsText(file);
    };

    // --- CORE LOGIC ---
    const getBillsForMonth = (year, month) => { // month is 1-12
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const today = new Date();
        today.setHours(0,0,0,0);

        // Generate instances from master accounts list
        const activeBills = db.accounts.map(acc => {
            let isActive = false;
            if (acc.type === 'fixed') {
                isActive = true;
            } else if (acc.type === 'unique') {
                isActive = acc.unique_date === monthKey;
            } else if (acc.type === 'installment') {
                isActive = acc.current_installment <= acc.total_installments;
            }

            if (!isActive) return null;

            // Get or create monthly record
            db.monthly_records[monthKey] = db.monthly_records[monthKey] || {};
            let record = db.monthly_records[monthKey][acc.id];
            if (!record) {
                record = { status: 'pending' };
                db.monthly_records[monthKey][acc.id] = record;
            }

            // Auto-update status to 'overdue'
            const dueDate = new Date(year, month - 1, acc.due_day);
            if (record.status === 'pending' && dueDate < today) {
                record.status = 'overdue';
            }

            return { ...acc, ...record };
        }).filter(Boolean);

        return activeBills;
    };

    const renderForDate = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;

        monthSelector.value = monthKey;
        currentMonthLabel.textContent = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const bills = getBillsForMonth(year, month);
        renderSummary(bills);
        renderBillsList(bills, monthKey);
        renderCategoryChart(bills);
        renderUpcomingBills(bills);
        saveDb(); // Save potential status updates (like 'overdue')
    };

    const renderSummary = (bills) => {
        const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
        const pending = bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);
        const paid = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.paid_amount || b.amount), 0);
        const overdue = bills.filter(b => b.status === 'overdue').reduce((sum, b) => sum + b.amount, 0);

        summaryTotalEl.textContent = formatCurrency(total);
        summaryPendingEl.textContent = formatCurrency(pending);
        summaryPaidEl.textContent = formatCurrency(paid);
        summaryOverdueEl.textContent = formatCurrency(overdue);
    };

    const renderBillsList = (bills, monthKey) => {
        bills.sort((a, b) => a.due_day - b.due_day);
        billsTableBody.innerHTML = '';
        billsCardContainer.innerHTML = '';

        if (bills.length === 0) {
            const emptyRow = `<tr><td colspan="6" class="p-4 text-center text-gray-500">Nenhuma conta para este mês.</td></tr>`;
            billsTableBody.innerHTML = emptyRow;
            billsCardContainer.innerHTML = `<div class="text-center text-gray-500 p-4">Nenhuma conta para este mês.</div>`;
            return;
        }

        bills.forEach(bill => {
            const priorityColors = { 1: '🔴', 2: '🟠', 3: '🟡', 4: '🟢' };
            const statusClasses = { pending: 'status-pending', paid: 'status-paid', overdue: 'status-overdue' };
            const statusLabels = { pending: 'Pendente', paid: 'Pago', overdue: 'Atrasado' };
            const installmentText = bill.type === 'installment' ? `(${bill.current_installment}/${bill.total_installments})` : '';

            // Desktop Row
            const row = document.createElement('tr');
            row.className = 'bill-row';
            row.innerHTML = `
                <td class="p-2 text-center">${priorityColors[bill.priority] || ''}</td>
                <td class="p-2 font-bold">${bill.name} <span class="text-xs text-gray-400">${installmentText}</span></td>
                <td class="p-2">${formatCurrency(bill.amount)}</td>
                <td class="p-2 text-center">${String(bill.due_day).padStart(2, '0')}</td>
                <td class="p-2"><span class="status-badge ${statusClasses[bill.status]}">${statusLabels[bill.status]}</span></td>
                <td class="p-2">
                    <div class="flex items-center gap-2">
                        ${bill.status !== 'paid' ? `<button class="action-btn pay-btn" data-id="${bill.id}" title="Marcar como Pago">✅</button>` : ''}
                        <button class="action-btn edit-btn" data-id="${bill.id}" title="Editar Definição">✏️</button>
                        <button class="action-btn duplicate-btn" data-id="${bill.id}" title="Duplicar">📄</button>
                        <button class="action-btn delete-btn" data-id="${bill.id}" title="Excluir">🗑️</button>
                    </div>
                </td>
            `;
            billsTableBody.appendChild(row);

            // Mobile Card
            const card = document.createElement('div');
            card.className = 'bill-card';
            card.innerHTML = `
                <div class="bill-card-priority" style="background-color: ${ {1:'#ef4444', 2:'#f97316', 3:'#facc15', 4:'#22c55e'}[bill.priority] || '#4b5563' }"></div>
                <div class="bill-card-main">
                    <div class="bill-card-name">${bill.name}</div>
                    <div class="bill-card-meta">${bill.category} ${installmentText}</div>
                </div>
                <div class="bill-card-details">
                    <div class="bill-card-amount">${formatCurrency(bill.amount)}</div>
                    <div class="bill-card-due">Vence dia ${String(bill.due_day).padStart(2, '0')}</div>
                </div>
                <div class="bill-card-status">
                    <span class="status-badge ${statusClasses[bill.status]}">${statusLabels[bill.status]}</span>
                </div>
                <div class="bill-card-actions">
                    ${bill.status !== 'paid' ? `<button class="btn-shine pay-btn text-xs" data-id="${bill.id}">Pagar</button>` : ''}
                    <div class="relative">
                        <button class="action-btn more-actions-btn">...</button>
                        <div class="more-actions-menu hidden">
                            <a href="#" class="edit-btn" data-id="${bill.id}">Editar</a>
                            <a href="#" class="duplicate-btn" data-id="${bill.id}">Duplicar</a>
                            <a href="#" class="delete-btn" data-id="${bill.id}">Excluir</a>
                        </div>
                    </div>
                </div>
            `;
            billsCardContainer.appendChild(card);
        });

        // Add event listeners for actions
        qsa('.pay-btn').forEach(btn => btn.addEventListener('click', (e) => openPayModal(e.target.dataset.id, monthKey)));
        qsa('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => openBillModal(e.target.dataset.id)));
        qsa('.duplicate-btn').forEach(btn => btn.addEventListener('click', (e) => duplicateBill(e.target.dataset.id)));
        qsa('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => deleteBill(e.target.dataset.id)));
        qsa('.more-actions-btn').forEach(btn => btn.addEventListener('click', (e) => {
            e.target.nextElementSibling.classList.toggle('hidden');
        }));
    };

    const renderCategoryChart = (bills) => {
        if (!categoryPieChartCanvas) return;

        const categoryData = bills.reduce((acc, bill) => {
            const category = bill.category || 'Outros';
            acc[category] = (acc[category] || 0) + bill.amount;
            return acc;
        }, {});

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        const chartColors = {
            'Empresa': '#3b82f6', // blue-500
            'Pessoal': '#f97316', // orange-500
            'Dívida': '#ef4444', // red-500
            'Outros': '#6b7280'  // gray-500
        };
        const backgroundColors = labels.map(label => chartColors[label] || chartColors['Outros']);

        if (categoryPieChart) {
            categoryPieChart.destroy();
        }

        const ctx = categoryPieChartCanvas.getContext('2d');
        if (labels.length === 0) {
            ctx.clearRect(0, 0, categoryPieChartCanvas.width, categoryPieChartCanvas.height);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#9ca3af';
            ctx.font = '14px Inter';
            ctx.fillText('Sem dados de gastos para este mês.', categoryPieChartCanvas.width / 2, categoryPieChartCanvas.height / 2);
            ctx.restore();
            return;
        }

        categoryPieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gastos por Categoria',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: '#1f2937', // bg-gray-800 or similar dark bg
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#d1d5db' } },
                    tooltip: { callbacks: { label: (context) => `${context.label}: ${formatCurrency(context.raw)}` } }
                }
            }
        });
    };

    const renderUpcomingBills = (bills) => {
        if (!upcomingBillsListEl) return;
        const today = new Date();
        today.setHours(0,0,0,0);
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);
        const upcoming = bills.filter(bill => {
            const dueDate = new Date(today.getFullYear(), today.getMonth(), bill.due_day);
            return (bill.status === 'pending' || bill.status === 'overdue') && dueDate >= today && dueDate <= sevenDaysFromNow;
        }).sort((a, b) => a.due_day - b.due_day);
        upcomingBillsListEl.innerHTML = '';
        if (upcoming.length === 0) {
            upcomingBillsListEl.innerHTML = '<p class="text-sm text-gray-500">Nenhuma conta vencendo nos próximos 7 dias.</p>';
            return;
        }
        upcoming.forEach(bill => {
            const diffDays = Math.round((new Date(today.getFullYear(), today.getMonth(), bill.due_day) - today) / (1000 * 60 * 60 * 24));
            let dayText = `em ${diffDays} dias`;
            if (diffDays === 0) dayText = 'Hoje';
            if (diffDays === 1) dayText = 'Amanhã';
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center text-sm border-b border-white/5 pb-1';
            item.innerHTML = `<span>${bill.name}</span><span class="font-semibold">${dayText} - ${formatCurrency(bill.amount)}</span>`;
            upcomingBillsListEl.appendChild(item);
        });
    };

    // --- MODAL & CRUD ---
    const openBillModal = (id = null) => {
        billForm.reset();
        currentEditingId = id;
        if (id) {
            const bill = db.accounts.find(b => b.id === id);
            if (!bill) return;
            billModalTitle.textContent = 'Editar Conta';
            billNameInput.value = bill.name;
            billCategoryInput.value = bill.category;
            billPriorityInput.value = bill.priority;
            billTypeInput.value = bill.type;
            billAmountInput.value = bill.amount;
            billDueDayInput.value = bill.due_day;
            billPaymentMethodInput.value = bill.payment_method;
            billNotesInput.value = bill.notes;
            if (bill.type === 'installment') {
                billCurrentInstallmentInput.value = bill.current_installment;
                billTotalInstallmentsInput.value = bill.total_installments;
            }
            if (bill.type === 'unique') {
                billUniqueDateInput.value = bill.unique_date;
            }
        } else {
            billModalTitle.textContent = 'Nova Conta';
        }
        toggleInstallmentFields();
        billModal.classList.remove('hidden');
    };

    const closeBillModal = () => billModal.classList.add('hidden');

    const saveBill = (e) => {
        e.preventDefault();
        const data = {
            id: currentEditingId || Date.now(),
            name: billNameInput.value,
            category: billCategoryInput.value,
            priority: parseInt(billPriorityInput.value),
            type: billTypeInput.value,
            amount: parseFloat(billAmountInput.value),
            due_day: parseInt(billDueDayInput.value),
            payment_method: billPaymentMethodInput.value,
            notes: billNotesInput.value,
        };
        if (data.type === 'installment') {
            data.current_installment = parseInt(billCurrentInstallmentInput.value);
            data.total_installments = parseInt(billTotalInstallmentsInput.value);
        }
        if (data.type === 'unique') {
            data.unique_date = billUniqueDateInput.value;
        }

        if (currentEditingId) {
            const index = db.accounts.findIndex(b => b.id === currentEditingId);
            db.accounts[index] = data;
        } else {
            db.accounts.push(data);
        }
        saveDb();
        renderForDate(currentDate);
        closeBillModal();
        showToast('Conta salva com sucesso!', 'success');
    };

    const deleteBill = (id) => {
        if (confirm('Tem certeza que deseja excluir a definição desta conta? Isso removerá ela de todos os meses futuros.')) {
            db.accounts = db.accounts.filter(b => b.id !== id);
            saveDb();
            renderForDate(currentDate);
            showToast('Conta excluída.', 'warning');
        }
    };

    const duplicateBill = (id) => {
        const original = db.accounts.find(b => b.id === id);
        if (!original) return;
        const newBill = { ...original, id: Date.now(), name: `${original.name} (Cópia)` };
        db.accounts.push(newBill);
        saveDb();
        renderForDate(currentDate);
        showToast('Conta duplicada.', 'info');
    };

    const toggleInstallmentFields = () => {
        billInstallmentsContainer.classList.toggle('hidden', billTypeInput.value !== 'installment');
        billUniqueDateContainer.classList.toggle('hidden', billTypeInput.value !== 'unique');
    };

    // --- PAYMENT FLOW ---
    const openPayModal = (accountId, monthKey) => {
        const bill = db.accounts.find(b => b.id == accountId);
        if (!bill) return;
        currentPaying = { accountId, monthKey };
        payModalName.textContent = bill.name;
        payDateInput.valueAsDate = new Date();
        payAmountInput.value = bill.amount;
        payModal.classList.remove('hidden');
    };

    const closePayModal = () => payModal.classList.add('hidden');

    const confirmPayment = (e) => {
        e.preventDefault();
        const { accountId, monthKey } = currentPaying;
        const record = db.monthly_records[monthKey]?.[accountId];
        if (!record) return;

        record.status = 'paid';
        record.paid_date = payDateInput.value;
        record.paid_amount = parseFloat(payAmountInput.value);
        record.paid_notes = payNotesInput.value;

        // Advance installment if applicable
        const account = db.accounts.find(acc => acc.id === accountId);
        if (account && account.type === 'installment') {
            account.current_installment = Math.min(account.current_installment + 1, account.total_installments);
        }

        saveDb();
        renderForDate(currentDate);
        closePayModal();
        showToast('Pagamento confirmado!', 'success');
    };

    // --- REMINDERS ---
    const saveReminderSettings = () => {
        db.settings.reminders = {
            enabled: remindersEnabledCheckbox.checked,
            time: reminderTimeInput.value,
            leadDays: parseInt(reminderLeadTimeSelect.value)
        };
        saveDb();
        showToast('Configurações de lembrete salvas.', 'info');
    };

    const loadReminderSettings = () => {
        const { reminders } = db.settings;
        remindersEnabledCheckbox.checked = reminders.enabled;
        reminderTimeInput.value = reminders.time;
        reminderLeadTimeSelect.value = reminders.leadDays;
    };

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            showToast('Este navegador não suporta notificações.', 'warning');
            return 'denied';
        }
        if (Notification.permission === 'granted') {
            return 'granted';
        }
        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission;
        }
        return 'denied';
    };

    const showNotification = (title, options) => {
        if (Notification.permission === 'granted') {
            new Notification(title, options);
        } else {
            showToast(`${title}: ${options.body}`, 'info');
        }
    };

    const checkAndSendReminders = async () => {
        if (!db.settings.reminders.enabled) return;

        const permission = await requestNotificationPermission();
        if (permission !== 'granted') return;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const bills = getBillsForMonth(now.getFullYear(), now.getMonth() + 1);
        const { leadDays } = db.settings.reminders;

        bills.forEach(bill => {
            if (bill.status === 'pending' || bill.status === 'overdue') {
                const dueDate = new Date(now.getFullYear(), now.getMonth(), bill.due_day);
                const reminderDate = new Date(dueDate);
                reminderDate.setDate(dueDate.getDate() - leadDays);

                if (reminderDate.getTime() === today.getTime()) {
                    const lastNotifiedKey = `notif_${bill.id}_${today.toISOString().split('T')[0]}`;
                    if (!localStorage.getItem(lastNotifiedKey)) {
                        showNotification('Lembrete de Conta', {
                            body: `${bill.name} vence ${leadDays > 0 ? `em ${leadDays} dia(s)` : 'hoje'}. Valor: ${formatCurrency(bill.amount)}`,
                            icon: 'img/logo.png'
                        });
                        localStorage.setItem(lastNotifiedKey, 'true');
                    }
                }
            }
        });
    };

    // --- EVENT LISTENERS ---
    addBillBtn.addEventListener('click', () => openBillModal());
    cancelBillBtn.addEventListener('click', closeBillModal);
    billForm.addEventListener('submit', saveBill);
    billTypeInput.addEventListener('change', toggleInstallmentFields);

    cancelPayBtn.addEventListener('click', closePayModal);
    payForm.addEventListener('submit', confirmPayment);

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderForDate(currentDate);
    });
    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderForDate(currentDate);
    });
    monthSelector.addEventListener('change', () => {
        const [year, month] = monthSelector.value.split('-').map(Number);
        currentDate = new Date(year, month - 1, 15);
        renderForDate(currentDate);
    });

    remindersEnabledCheckbox.addEventListener('change', saveReminderSettings);
    reminderTimeInput.addEventListener('change', saveReminderSettings);
    reminderLeadTimeSelect.addEventListener('change', saveReminderSettings);
    testNotificationBtn.addEventListener('click', async () => {
        const permission = await requestNotificationPermission();
        if (permission === 'granted') {
            showNotification('Teste de Notificação', { body: 'Se você vê isso, está funcionando!', icon: 'img/logo.png' });
        } else {
            showToast('As notificações estão bloqueadas ou não são suportadas.', 'warning');
        }
    });
    
    exportBtn.addEventListener('click', exportDb);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => importDb(e.target.files[0]));

    // --- INITIALIZATION ---
    loadDb();
    renderForDate(currentDate);
    loadReminderSettings();
    checkAndSendReminders(); // Check on page load
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContas);
} else {
    initContas();
}