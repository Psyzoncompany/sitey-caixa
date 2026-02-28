(function () {
  const STORAGE_KEYS = {
    transactions: 'psyzon_personal_transactions_v1',
    bills: 'psyzon_personal_bills_v1',
    investments: 'psyzon_personal_investments_v1',
    debts: 'psyzon_personal_debts_v1'
  };

  const CATEGORIES = {
    despesa: ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Moradia', 'Educação', 'Assinaturas', 'Vestuário', 'Beleza', 'Outros'],
    receita: ['Salário/Pró-labore', 'Freelance', 'Investimento', 'Presente/Doação', 'Outros']
  };

  const state = {
    transactions: loadArray(STORAGE_KEYS.transactions),
    bills: loadArray(STORAGE_KEYS.bills),
    investments: loadObject(STORAGE_KEYS.investments, { metas: [] }),
    debts: loadArray(STORAGE_KEYS.debts),
    charts: {}
  };

  const tabs = document.querySelectorAll('.personal-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const modalOverlay = document.getElementById('modal-overlay');

  document.getElementById('mobile-menu-button')?.addEventListener('click', () => {
    document.getElementById('mobile-menu')?.classList.toggle('hidden');
  });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((btn) => btn.classList.remove('active'));
      tab.classList.add('active');
      const key = tab.dataset.tab;
      tabContents.forEach((content) => content.classList.toggle('hidden', content.id !== `tab-${key}`));
    });
  });

  document.getElementById('open-transaction-modal')?.addEventListener('click', () => openTransactionModal());
  document.getElementById('open-bill-modal')?.addEventListener('click', () => openBillModal());
  document.getElementById('open-investment-modal')?.addEventListener('click', () => openInvestmentModal());
  document.getElementById('open-debt-modal')?.addEventListener('click', () => openDebtModal());

  document.getElementById('transactions-type-filter')?.addEventListener('change', renderTransactionsTable);
  document.getElementById('transactions-month-filter')?.addEventListener('change', renderTransactionsTable);

  renderAll();

  function renderAll() {
    renderMetrics();
    renderRecentTransactions();
    renderTransactionsTable();
    renderBills();
    renderInvestments();
    renderDebts();
    renderCharts();
  }

  function renderMetrics() {
    const now = new Date();
    const currentMonth = toMonthInputValue(now);
    const monthTransactions = state.transactions.filter((t) => (t.data || '').slice(0, 7) === currentMonth);

    const saldoTotal = sumByType(state.transactions, 'receita') - sumByType(state.transactions, 'despesa');
    const receitasMes = sumByType(monthTransactions, 'receita');
    const despesasMes = sumByType(monthTransactions, 'despesa');
    const saldoMes = receitasMes - despesasMes;

    const cards = [
      { title: 'Saldo Pessoal', value: saldoTotal, tone: saldoTotal >= 0 ? 'ok' : 'bad' },
      { title: 'Receitas do Mês', value: receitasMes, tone: 'ok' },
      { title: 'Despesas do Mês', value: despesasMes, tone: 'bad' },
      { title: 'Saldo do Mês', value: saldoMes, tone: saldoMes >= 0 ? 'ok' : 'bad' }
    ];

    const html = cards.map((card) => `
      <article class="personal-card p-5">
        <p class="text-sm text-slate-500">${card.title}</p>
        <p class="text-2xl font-bold mt-2 ${card.tone === 'ok' ? 'text-emerald-600' : 'text-rose-600'}">${formatCurrency(card.value)}</p>
      </article>
    `).join('');

    document.getElementById('metric-cards').innerHTML = html;
  }

  function renderRecentTransactions() {
    const latest = [...state.transactions]
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .slice(0, 10);

    const container = document.getElementById('recent-transactions');
    if (!latest.length) {
      container.innerHTML = '<p class="text-slate-500">Nenhum lançamento cadastrado.</p>';
      return;
    }

    container.innerHTML = latest.map((tx) => `
      <div class="flex justify-between border-b border-slate-100 py-2 gap-3">
        <div>
          <p class="font-medium">${escapeHtml(tx.descricao)}</p>
          <p class="text-xs text-slate-500">${formatDate(tx.data)} • ${escapeHtml(tx.categoria)}</p>
        </div>
        <p class="font-bold ${tx.tipo === 'receita' ? 'text-emerald-600' : 'text-rose-600'}">${tx.tipo === 'receita' ? '+' : '-'} ${formatCurrency(tx.valor)}</p>
      </div>
    `).join('');
  }

  function renderTransactionsTable() {
    const filterType = document.getElementById('transactions-type-filter')?.value || 'todos';
    const filterMonth = document.getElementById('transactions-month-filter')?.value || '';

    const filtered = state.transactions
      .filter((t) => filterType === 'todos' || t.tipo === filterType)
      .filter((t) => !filterMonth || (t.data || '').startsWith(filterMonth))
      .sort((a, b) => new Date(b.data) - new Date(a.data));

    const tbody = document.getElementById('transactions-table-body');
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-slate-500">Nenhum lançamento encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((tx) => `
      <tr class="personal-row">
        <td class="py-2">${formatDate(tx.data)}</td>
        <td class="py-2">${escapeHtml(tx.descricao)}</td>
        <td class="py-2">${escapeHtml(tx.categoria)}</td>
        <td class="py-2 capitalize">${tx.tipo}</td>
        <td class="py-2 font-semibold ${tx.tipo === 'receita' ? 'text-emerald-600' : 'text-rose-600'}">${formatCurrency(tx.valor)}</td>
        <td class="py-2"><button class="personal-btn personal-btn-danger" data-delete-tx="${tx.id}">Excluir</button></td>
      </tr>
    `).join('');

    document.querySelectorAll('[data-delete-tx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.transactions = state.transactions.filter((tx) => tx.id !== btn.dataset.deleteTx);
        persist(STORAGE_KEYS.transactions, state.transactions);
        renderAll();
      });
    });
  }

  function renderBills() {
    const month = toMonthInputValue(new Date());
    const total = state.bills.reduce((acc, b) => acc + Number(b.valor || 0), 0);
    const totalPago = state.bills.reduce((acc, bill) => acc + (isBillPaidForMonth(bill, month) ? Number(bill.valor || 0) : 0), 0);
    const totalPendente = Math.max(0, total - totalPago);

    document.getElementById('bills-summary').innerHTML = [
      { label: 'Total de contas fixas', value: state.bills.length },
      { label: 'Total pago no mês', value: formatCurrency(totalPago) },
      { label: 'Total pendente', value: formatCurrency(totalPendente) }
    ].map((item) => `<article class="personal-card p-4"><p class="text-sm text-slate-500">${item.label}</p><p class="text-2xl font-bold mt-1">${item.value}</p></article>`).join('');

    const today = new Date();
    const billsList = document.getElementById('bills-list');
    if (!state.bills.length) {
      billsList.innerHTML = '<p class="text-slate-500">Nenhuma conta fixa cadastrada.</p>';
      return;
    }

    billsList.innerHTML = state.bills.map((bill) => {
      const paid = isBillPaidForMonth(bill, month);
      const vencDate = new Date(today.getFullYear(), today.getMonth(), Number(bill.vencimentoDia || 1));
      const overdue = !paid && today > vencDate;
      const status = paid ? 'Paga' : (overdue ? 'Atrasada' : 'Pendente');
      const statusClass = paid ? 'text-emerald-600' : (overdue ? 'text-rose-600' : 'text-slate-500');
      return `
        <div class="personal-list-item">
          <div>
            <p class="font-semibold">${escapeHtml(bill.nome)}</p>
            <p class="text-sm text-slate-500">Vence dia ${bill.vencimentoDia} • ${formatCurrency(bill.valor)}</p>
          </div>
          <div class="text-right">
            <p class="font-semibold ${statusClass}">${status}</p>
            <div class="flex gap-2 justify-end mt-2">
              <button class="personal-btn personal-btn-primary" data-pay-bill="${bill.id}">Marcar como paga</button>
              <button class="personal-btn personal-btn-danger" data-delete-bill="${bill.id}">Excluir</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('[data-pay-bill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bill = state.bills.find((b) => b.id === btn.dataset.payBill);
        if (!bill) return;
        const pagamentos = Array.isArray(bill.pagamentos) ? bill.pagamentos : [];
        if (!pagamentos.find((p) => p.mes === month)) {
          pagamentos.push({ mes: month, pago: true, dataPagamento: new Date().toISOString().slice(0, 10) });
          bill.pagamentos = pagamentos;
          persist(STORAGE_KEYS.bills, state.bills);
          renderBills();
        }
      });
    });

    document.querySelectorAll('[data-delete-bill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.bills = state.bills.filter((b) => b.id !== btn.dataset.deleteBill);
        persist(STORAGE_KEYS.bills, state.bills);
        renderBills();
      });
    });
  }

  function renderInvestments() {
    const metas = state.investments?.metas || [];
    const container = document.getElementById('investments-list');
    if (!metas.length) {
      container.innerHTML = '<p class="text-slate-500">Nenhuma meta cadastrada.</p>';
      return;
    }

    container.innerHTML = metas.map((meta) => {
      const totalDepositos = (meta.depositos || []).reduce((acc, dep) => acc + Number(dep.valor || 0), 0);
      const progresso = Math.min(100, (totalDepositos / Number(meta.valorMeta || 1)) * 100);
      const prazoDate = meta.prazo ? new Date(`${meta.prazo}-01`) : null;
      const hoje = new Date();
      const status = totalDepositos >= Number(meta.valorMeta || 0)
        ? 'Adiantado'
        : (prazoDate && hoje > prazoDate ? 'Atrasado' : 'No prazo');
      const statusClass = status === 'Atrasado' ? 'text-rose-600' : (status === 'Adiantado' ? 'text-emerald-600' : 'text-slate-500');

      return `
        <div class="personal-list-item block">
          <div class="flex flex-wrap justify-between gap-2">
            <div>
              <p class="font-semibold">${escapeHtml(meta.nome)}</p>
              <p class="text-sm text-slate-500">Meta: ${formatCurrency(meta.valorMeta)} • Prazo: ${meta.prazo || 'N/D'}</p>
            </div>
            <p class="font-semibold ${statusClass}">${status}</p>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2 mt-3"><div class="h-2 rounded-full bg-indigo-600" style="width:${progresso}%"></div></div>
          <p class="text-sm mt-2">${formatCurrency(totalDepositos)} guardados</p>
          <div class="flex gap-2 mt-3">
            <button class="personal-btn personal-btn-primary" data-deposit-meta="${meta.id}">Depositar</button>
            <button class="personal-btn personal-btn-danger" data-delete-meta="${meta.id}">Excluir</button>
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('[data-deposit-meta]').forEach((btn) => {
      btn.addEventListener('click', () => openDepositModal(btn.dataset.depositMeta));
    });

    document.querySelectorAll('[data-delete-meta]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.investments.metas = state.investments.metas.filter((m) => m.id !== btn.dataset.deleteMeta);
        persist(STORAGE_KEYS.investments, state.investments);
        renderInvestments();
      });
    });
  }

  function renderDebts() {
    const devo = state.debts.filter((d) => d.tipo === 'devo');
    const meDevem = state.debts.filter((d) => d.tipo === 'me_devem');

    renderDebtColumn(document.getElementById('debts-i-owe'), devo);
    renderDebtColumn(document.getElementById('debts-owed-to-me'), meDevem);
  }

  function renderDebtColumn(container, debts) {
    if (!debts.length) {
      container.innerHTML = '<p class="text-slate-500">Nenhum item cadastrado.</p>';
      return;
    }

    container.innerHTML = debts.map((debt) => {
      const aberto = Math.max(0, Number(debt.valorTotal || 0) - Number(debt.valorPago || 0));
      const quitada = debt.quitada || aberto <= 0;
      return `
        <div class="personal-list-item block">
          <div class="flex justify-between gap-2">
            <div>
              <p class="font-semibold">${escapeHtml(debt.nome)}</p>
              <p class="text-sm text-slate-500">Total: ${formatCurrency(debt.valorTotal)} • Pago/Recebido: ${formatCurrency(debt.valorPago || 0)}</p>
            </div>
            <p class="font-semibold ${quitada ? 'text-emerald-600' : 'text-amber-600'}">${quitada ? 'Quitada' : 'Em aberto'}</p>
          </div>
          <p class="text-sm mt-2">Aberto: ${formatCurrency(aberto)}</p>
          <div class="flex gap-2 mt-3 flex-wrap">
            <button class="personal-btn personal-btn-primary" data-pay-debt="${debt.id}">Registrar pagamento parcial</button>
            <button class="personal-btn personal-btn-ghost" data-close-debt="${debt.id}">Marcar como quitada</button>
            <button class="personal-btn personal-btn-danger" data-delete-debt="${debt.id}">Excluir</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-pay-debt]').forEach((btn) => {
      btn.addEventListener('click', () => openDebtPaymentModal(btn.dataset.payDebt));
    });
    container.querySelectorAll('[data-close-debt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const debt = state.debts.find((d) => d.id === btn.dataset.closeDebt);
        if (!debt) return;
        debt.valorPago = Number(debt.valorTotal || 0);
        debt.quitada = true;
        persist(STORAGE_KEYS.debts, state.debts);
        renderDebts();
      });
    });
    container.querySelectorAll('[data-delete-debt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.debts = state.debts.filter((d) => d.id !== btn.dataset.deleteDebt);
        persist(STORAGE_KEYS.debts, state.debts);
        renderDebts();
      });
    });
  }

  function renderCharts() {
    renderExpenseCategoryChart();
    renderIncomeExpenseChart();
  }

  function renderExpenseCategoryChart() {
    const ctx = document.getElementById('expensesCategoryChart');
    if (!ctx) return;

    const grouped = {};
    state.transactions.filter((t) => t.tipo === 'despesa').forEach((t) => {
      grouped[t.categoria] = (grouped[t.categoria] || 0) + Number(t.valor || 0);
    });

    destroyChart('expenseCategory');
    state.charts.expenseCategory = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(grouped).length ? Object.keys(grouped) : ['Sem dados'],
        datasets: [{
          data: Object.values(grouped).length ? Object.values(grouped) : [1],
          backgroundColor: ['#4f46e5', '#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316', '#ef4444', '#84cc16', '#64748b']
        }]
      },
      options: { plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1' } } } }
    });
  }

  function renderIncomeExpenseChart() {
    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return;

    const labels = [];
    const receitas = [];
    const despesas = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = toMonthInputValue(d);
      labels.push(month);
      const txMonth = state.transactions.filter((t) => (t.data || '').slice(0, 7) === month);
      receitas.push(sumByType(txMonth, 'receita'));
      despesas.push(sumByType(txMonth, 'despesa'));
    }

    destroyChart('incomeExpense');
    state.charts.incomeExpense = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Receitas', data: receitas, backgroundColor: '#10b981' },
          { label: 'Despesas', data: despesas, backgroundColor: '#ef4444' }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1' } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.18)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.18)' } } } }
    });
  }

  function openTransactionModal() {
    const today = new Date().toISOString().slice(0, 10);
    const categoriesOptions = CATEGORIES.despesa.map((c) => `<option value="${c}">${c}</option>`).join('');

    openModal(`
      <h3 class="text-lg font-bold mb-3">Novo Lançamento</h3>
      <form id="transaction-form" class="space-y-3">
        <input class="personal-input w-full" name="descricao" placeholder="Descrição" required>
        <input class="personal-input w-full" type="number" min="0" step="0.01" name="valor" placeholder="Valor" required>
        <select class="personal-input w-full" name="tipo" id="transaction-type">
          <option value="receita">Receita</option>
          <option value="despesa" selected>Despesa</option>
        </select>
        <select class="personal-input w-full" name="categoria" id="transaction-category">${categoriesOptions}</select>
        <input class="personal-input w-full" type="date" name="data" value="${today}" required>
        <button class="personal-btn personal-btn-primary w-full" type="submit">Salvar</button>
      </form>
    `);

    const typeSelect = document.getElementById('transaction-type');
    const categorySelect = document.getElementById('transaction-category');
    typeSelect.addEventListener('change', () => {
      const options = CATEGORIES[typeSelect.value].map((c) => `<option value="${c}">${c}</option>`).join('');
      categorySelect.innerHTML = options;
    });

    document.getElementById('transaction-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state.transactions.push({
        id: uid(),
        descricao: String(form.get('descricao') || '').trim(),
        valor: Number(form.get('valor') || 0),
        tipo: String(form.get('tipo') || 'despesa'),
        categoria: String(form.get('categoria') || 'Outros'),
        data: String(form.get('data') || today)
      });
      persist(STORAGE_KEYS.transactions, state.transactions);
      closeModal();
      renderAll();
    });
  }

  function openBillModal() {
    openModal(`
      <h3 class="text-lg font-bold mb-3">Nova Conta Fixa</h3>
      <form id="bill-form" class="space-y-3">
        <input class="personal-input w-full" name="nome" placeholder="Nome da conta" required>
        <input class="personal-input w-full" type="number" min="0" step="0.01" name="valor" placeholder="Valor mensal" required>
        <input class="personal-input w-full" type="number" min="1" max="31" name="vencimentoDia" placeholder="Dia do vencimento" required>
        <button class="personal-btn personal-btn-primary w-full" type="submit">Salvar</button>
      </form>
    `);

    document.getElementById('bill-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state.bills.push({
        id: uid(),
        nome: String(form.get('nome') || '').trim(),
        valor: Number(form.get('valor') || 0),
        vencimentoDia: Number(form.get('vencimentoDia') || 1),
        pagamentos: []
      });
      persist(STORAGE_KEYS.bills, state.bills);
      closeModal();
      renderBills();
    });
  }

  function openInvestmentModal() {
    openModal(`
      <h3 class="text-lg font-bold mb-3">Nova Meta</h3>
      <form id="investment-form" class="space-y-3">
        <input class="personal-input w-full" name="nome" placeholder="Nome da meta" required>
        <input class="personal-input w-full" type="number" min="0" step="0.01" name="valorMeta" placeholder="Valor da meta" required>
        <input class="personal-input w-full" type="month" name="prazo" required>
        <button class="personal-btn personal-btn-primary w-full" type="submit">Salvar</button>
      </form>
    `);

    document.getElementById('investment-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state.investments.metas.push({
        id: uid(),
        nome: String(form.get('nome') || '').trim(),
        valorMeta: Number(form.get('valorMeta') || 0),
        prazo: String(form.get('prazo') || ''),
        depositos: []
      });
      persist(STORAGE_KEYS.investments, state.investments);
      closeModal();
      renderInvestments();
    });
  }

  function openDepositModal(metaId) {
    const today = new Date().toISOString().slice(0, 10);
    openModal(`
      <h3 class="text-lg font-bold mb-3">Registrar Depósito</h3>
      <form id="deposit-form" class="space-y-3">
        <input class="personal-input w-full" type="number" name="valor" min="0" step="0.01" placeholder="Valor" required>
        <input class="personal-input w-full" type="date" name="data" value="${today}" required>
        <button class="personal-btn personal-btn-primary w-full" type="submit">Salvar</button>
      </form>
    `);

    document.getElementById('deposit-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const meta = state.investments.metas.find((item) => item.id === metaId);
      if (!meta) return;
      meta.depositos = meta.depositos || [];
      meta.depositos.push({ id: uid(), valor: Number(form.get('valor') || 0), data: String(form.get('data') || today) });
      persist(STORAGE_KEYS.investments, state.investments);
      closeModal();
      renderInvestments();
    });
  }

  function openDebtModal() {
    openModal(`
      <h3 class="text-lg font-bold mb-3">Nova Dívida</h3>
      <form id="debt-form" class="space-y-3">
        <select class="personal-input w-full" name="tipo">
          <option value="devo">Devo</option>
          <option value="me_devem">Me devem</option>
        </select>
        <input class="personal-input w-full" name="nome" placeholder="Credor/Devedor" required>
        <input class="personal-input w-full" type="number" name="valorTotal" min="0" step="0.01" placeholder="Valor total" required>
        <input class="personal-input w-full" type="number" name="parcelas" min="0" step="1" placeholder="Parcelas (opcional)">
        <button class="personal-btn personal-btn-primary w-full" type="submit">Salvar</button>
      </form>
    `);

    document.getElementById('debt-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state.debts.push({
        id: uid(),
        tipo: String(form.get('tipo') || 'devo'),
        nome: String(form.get('nome') || '').trim(),
        valorTotal: Number(form.get('valorTotal') || 0),
        valorPago: 0,
        parcelas: Number(form.get('parcelas') || 0),
        quitada: false,
        pagamentos: []
      });
      persist(STORAGE_KEYS.debts, state.debts);
      closeModal();
      renderDebts();
    });
  }

  function openDebtPaymentModal(debtId) {
    const today = new Date().toISOString().slice(0, 10);
    openModal(`
      <h3 class="text-lg font-bold mb-3">Registrar pagamento parcial</h3>
      <form id="debt-payment-form" class="space-y-3">
        <input class="personal-input w-full" type="number" name="valor" min="0" step="0.01" placeholder="Valor" required>
        <input class="personal-input w-full" type="date" name="data" value="${today}" required>
        <button class="personal-btn personal-btn-primary w-full" type="submit">Salvar</button>
      </form>
    `);

    document.getElementById('debt-payment-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const debt = state.debts.find((d) => d.id === debtId);
      if (!debt) return;
      const valor = Number(form.get('valor') || 0);
      debt.valorPago = Number(debt.valorPago || 0) + valor;
      debt.pagamentos = debt.pagamentos || [];
      debt.pagamentos.push({ valor, data: String(form.get('data') || today) });
      if (debt.valorPago >= debt.valorTotal) debt.quitada = true;
      persist(STORAGE_KEYS.debts, state.debts);
      closeModal();
      renderDebts();
    });
  }

  function openModal(content) {
    modalOverlay.innerHTML = `<div class="personal-modal"><button id="close-modal" class="personal-modal-close">✕</button>${content}</div>`;
    modalOverlay.classList.remove('hidden');
    document.getElementById('close-modal')?.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', onOverlayClick);
  }

  function onOverlayClick(event) {
    if (event.target === modalOverlay) closeModal();
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
    modalOverlay.innerHTML = '';
    modalOverlay.removeEventListener('click', onOverlayClick);
  }

  function isBillPaidForMonth(bill, month) {
    return (bill.pagamentos || []).some((p) => p.mes === month && p.pago);
  }

  function sumByType(transactions, type) {
    return transactions.filter((t) => t.tipo === type).reduce((acc, t) => acc + Number(t.valor || 0), 0);
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDate(value) {
    if (!value) return '-';
    return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
  }

  function toMonthInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  function loadArray(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function loadObject(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function persist(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function uid() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function destroyChart(name) {
    if (state.charts[name]) {
      state.charts[name].destroy();
      state.charts[name] = null;
    }
  }
})();
