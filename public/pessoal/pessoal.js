const CATEGORIES = {
  Alimentação: { emoji: '🍔', color: '#ffedd5', chartColor: '#f97316' },
  Transporte: { emoji: '🚗', color: '#dbeafe', chartColor: '#3b82f6' },
  Moradia: { emoji: '🏠', color: '#ede9fe', chartColor: '#8b5cf6' },
  Compras: { emoji: '🛍️', color: '#fce7f3', chartColor: '#ec4899' },
  Salário: { emoji: '💵', color: '#dcfce7', chartColor: '#22c55e' },
  Outros: { emoji: '🎒', color: '#f3f4f6', chartColor: '#6b7280' }
};

let activeTab = 'resumo';
let activeModal = null;

let transactions = [
  { id: 1, title: 'Restaurante', category: 'Alimentação', type: 'expense', amount: 85, date: 'Hoje, 14:30' },
  { id: 2, title: 'Combustível', category: 'Transporte', type: 'expense', amount: 250, date: 'Ontem, 18:45' },
  { id: 3, title: 'Salário', category: 'Salário', type: 'income', amount: 5500, date: '5 dias atrás' },
  { id: 4, title: 'Supermercado', category: 'Alimentação', type: 'expense', amount: 420, date: '6 dias atrás' }
];

let billsData = [
  { id: 1, title: 'Aluguel', dueDate: '2026-03-05', amount: 1500, status: 'pending' },
  { id: 2, title: 'Cartão de Crédito', dueDate: '2026-03-10', amount: 2340.5, status: 'pending' },
  { id: 3, title: 'Internet', dueDate: '2026-02-20', amount: 120, status: 'paid' }
];

let goalsData = [
  { id: 1, title: 'Reserva de Emergência', current: 15000, target: 30000, color: '#3b82f6' },
  { id: 2, title: 'Viagem para o Japão', current: 4500, target: 25000, color: '#ec4899' }
];

const tabButtons = document.getElementById('tabButtons');
const content = document.getElementById('content');
const fab = document.getElementById('fab');
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');

const brl = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

function getTotals() {
  let receitas = 0;
  let despesas = 0;
  const map = {};

  transactions.forEach((t) => {
    if (t.type === 'income') receitas += t.amount;
    if (t.type === 'expense') {
      despesas += t.amount;
      map[t.category] = (map[t.category] || 0) + t.amount;
    }
  });

  const categoriasAgrupadas = Object.keys(map)
    .map((name) => ({
      name,
      amount: map[name],
      percentage: despesas ? (map[name] / despesas) * 100 : 0,
      color: CATEGORIES[name]?.chartColor || '#6b7280'
    }))
    .sort((a, b) => b.amount - a.amount);

  return { receitas, despesas, saldo: receitas - despesas, categoriasAgrupadas };
}

function renderTabs() {
  const tabs = ['resumo', 'contas', 'metas'];
  tabButtons.innerHTML = tabs
    .map((tab) => `<button class="tab-btn ${activeTab === tab ? 'active' : ''}" data-tab="${tab}">${tab}</button>`)
    .join('');
}

function renderResumo() {
  const { receitas, despesas, saldo, categoriasAgrupadas } = getTotals();
  return `
    <div class="stack">
      <article class="card glass">
        <div class="muted">Saldo Atual</div>
        <div class="balance">${brl(saldo)}</div>
        <div class="grid-2">
          <div class="metric"><p class="muted">Receitas</p><p style="color:var(--green);font-weight:700">+${brl(receitas)}</p></div>
          <div class="metric"><p class="muted">Despesas</p><p style="color:var(--red);font-weight:700">-${brl(despesas)}</p></div>
        </div>
      </article>

      <article class="card glass">
        <h3>Transações Recentes</h3>
        <div class="stack">
          ${transactions.map((tx) => {
            const categoryData = CATEGORIES[tx.category] || CATEGORIES.Outros;
            return `
            <div class="list-item">
              <div class="row-left">
                <div class="emoji" style="background:${categoryData.color}">${categoryData.emoji}</div>
                <div>
                  <div class="title">${tx.title}</div>
                  <div class="meta">${tx.date}</div>
                </div>
              </div>
              <div class="inline-actions">
                <div class="amount ${tx.type === 'income' ? 'income' : 'expense'}">${tx.type === 'income' ? '+' : '-'}${brl(tx.amount)}</div>
                <button class="delete-btn" data-delete="transaction" data-id="${tx.id}">Excluir</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </article>

      ${despesas > 0 ? `
      <article class="card glass">
        <h3>Onde estou gastando</h3>
        ${categoriasAgrupadas.map((cat) => `
          <div class="progress-wrap">
            <div class="progress-head"><span>${cat.name}</span><span>${cat.percentage.toFixed(0)}%</span></div>
            <div class="progress-track"><div class="progress-bar" style="background:${cat.color};width:${cat.percentage}%"></div></div>
          </div>`).join('')}
      </article>` : ''}
    </div>`;
}

function renderContas() {
  return `
    <div class="stack">
      <article class="card glass">
        <h3>Próximos Vencimentos</h3>
        <div class="stack">
          ${billsData.map((bill) => `
            <div class="list-item">
              <div>
                <div class="title">${bill.title}</div>
                <div class="meta">${bill.status === 'paid' ? '✅ Pago' : '⏰ Pendente'} • ${fmtDate(bill.dueDate)}</div>
              </div>
              <div class="inline-actions">
                <div>${brl(bill.amount)}</div>
                <button class="delete-btn" data-delete="bill" data-id="${bill.id}">Excluir</button>
              </div>
            </div>
          `).join('')}
        </div>
      </article>
    </div>`;
}

function renderMetas() {
  return `
    <div class="stack">
      <article class="card glass">
        <h3>Objetivos</h3>
        <div class="stack">
          ${goalsData.map((goal) => {
            const pct = Math.min(Math.round((goal.current / goal.target) * 100), 100);
            return `
              <div class="list-item" style="display:block">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px">
                  <div>
                    <div class="title">${goal.title}</div>
                    <div class="meta">${brl(goal.current)} de ${brl(goal.target)}</div>
                  </div>
                  <button class="delete-btn" data-delete="goal" data-id="${goal.id}">Excluir</button>
                </div>
                <div class="progress-track"><div class="progress-bar" style="background:${goal.color};width:${pct}%"></div></div>
              </div>`;
          }).join('')}
        </div>
      </article>
    </div>`;
}

function render() {
  renderTabs();
  if (activeTab === 'resumo') content.innerHTML = renderResumo();
  if (activeTab === 'contas') content.innerHTML = renderContas();
  if (activeTab === 'metas') content.innerHTML = renderMetas();
}

function openModal(type) {
  activeModal = type;
  const title = type === 'transaction' ? 'Novo Lançamento' : type === 'bill' ? 'Nova Conta' : 'Nova Meta';
  const body = type === 'transaction' ? transactionFormHtml() : type === 'bill' ? billFormHtml() : goalFormHtml();

  modalContent.innerHTML = `<header><h2>${title}</h2><button class="close-btn" id="closeModal">✕</button></header>${body}`;
  modalOverlay.classList.remove('hidden');
}

function closeModal() {
  activeModal = null;
  modalOverlay.classList.add('hidden');
  modalContent.innerHTML = '';
}

function transactionFormHtml() {
  return `
  <form id="formTransaction">
    <input name="title" placeholder="Descrição" required />
    <input name="amount" type="number" step="0.01" placeholder="Valor" required />
    <select name="type">
      <option value="expense">Despesa</option>
      <option value="income">Receita</option>
    </select>
    <select name="category">
      ${Object.keys(CATEGORIES).map((cat) => `<option value="${cat}">${cat}</option>`).join('')}
    </select>
    <button class="submit-btn" type="submit">Adicionar lançamento</button>
  </form>`;
}

function billFormHtml() {
  return `
  <form id="formBill">
    <input name="title" placeholder="Título" required />
    <input name="amount" type="number" step="0.01" placeholder="Valor" required />
    <input name="dueDate" type="date" required />
    <button class="submit-btn" type="submit">Adicionar conta</button>
  </form>`;
}

function goalFormHtml() {
  return `
  <form id="formGoal">
    <input name="title" placeholder="Meta" required />
    <input name="target" type="number" step="0.01" placeholder="Valor alvo" required />
    <input name="current" type="number" step="0.01" placeholder="Valor atual (opcional)" />
    <button class="submit-btn" type="submit">Adicionar meta</button>
  </form>`;
}

function bindEvents() {
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      activeTab = tab.dataset.tab;
      render();
      return;
    }

    const del = e.target.closest('[data-delete]');
    if (del) {
      const id = Number(del.dataset.id);
      if (del.dataset.delete === 'transaction') transactions = transactions.filter((item) => item.id !== id);
      if (del.dataset.delete === 'bill') billsData = billsData.filter((item) => item.id !== id);
      if (del.dataset.delete === 'goal') goalsData = goalsData.filter((item) => item.id !== id);
      render();
      return;
    }

    if (e.target.id === 'closeModal' || e.target === modalOverlay) {
      closeModal();
      return;
    }
  });

  fab.addEventListener('click', () => {
    if (activeTab === 'resumo') openModal('transaction');
    if (activeTab === 'contas') openModal('bill');
    if (activeTab === 'metas') openModal('goal');
  });

  modalOverlay.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;

    if (form.id === 'formTransaction') {
      const data = new FormData(form);
      transactions.unshift({
        id: Date.now(),
        title: String(data.get('title')),
        amount: Number(data.get('amount')),
        type: String(data.get('type')),
        category: String(data.get('category')),
        date: 'Agora mesmo'
      });
    }

    if (form.id === 'formBill') {
      const data = new FormData(form);
      billsData.unshift({
        id: Date.now(),
        title: String(data.get('title')),
        amount: Number(data.get('amount')),
        dueDate: String(data.get('dueDate')),
        status: 'pending'
      });
    }

    if (form.id === 'formGoal') {
      const data = new FormData(form);
      goalsData.unshift({
        id: Date.now(),
        title: String(data.get('title')),
        target: Number(data.get('target')),
        current: Number(data.get('current') || 0),
        color: '#3b82f6'
      });
    }

    closeModal();
    render();
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (window.firebaseAuth?.logout) window.firebaseAuth.logout();
    else window.location.href = '../login.html';
  });
}

bindEvents();
render();
