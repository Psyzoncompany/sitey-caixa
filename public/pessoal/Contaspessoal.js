(() => {
  const formatMoney = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const db = JSON.parse(localStorage.getItem('__pessoal_json_v1__psyzon_accounts_db_v1') || '{}');
  const accounts = Array.isArray(db.accounts) ? db.accounts : [];
  const records = db.monthly_records || {};

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyRecords = records[monthKey] || {};

  let pendingTotal = 0;
  let paidTotal = 0;

  const rows = accounts.map((account) => {
    const record = monthlyRecords[account.id] || { status: 'pending' };
    const amount = Number(account.amount || 0);
    if (record.status === 'paid') paidTotal += amount;
    else pendingTotal += amount;

    return {
      name: account.name || 'Conta sem nome',
      amount,
      status: record.status === 'paid' ? 'Paga' : 'Pendente'
    };
  });

  const pendingEl = document.getElementById('contas-pendentes-total');
  const paidEl = document.getElementById('contas-pagas-total');
  const qtyEl = document.getElementById('contas-qtde');
  const listEl = document.getElementById('contas-lista');

  if (pendingEl) pendingEl.textContent = formatMoney(pendingTotal);
  if (paidEl) paidEl.textContent = formatMoney(paidTotal);
  if (qtyEl) qtyEl.textContent = `${rows.length} conta${rows.length === 1 ? '' : 's'}`;

  if (!listEl) return;
  if (rows.length === 0) {
    listEl.innerHTML = '<p class="text-sm text-gray-400">Nenhuma conta encontrada.</p>';
    return;
  }

  listEl.innerHTML = rows.map((row) => `
    <article class="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between gap-3">
      <div>
        <p class="font-semibold">${row.name}</p>
        <p class="text-sm text-gray-400">${row.status}</p>
      </div>
      <strong class="${row.status === 'Paga' ? 'text-green-400' : 'text-orange-300'}">${formatMoney(row.amount)}</strong>
    </article>
  `).join('');
})();
