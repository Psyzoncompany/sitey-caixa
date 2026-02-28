(() => {
  const formatMoney = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const goals = JSON.parse(localStorage.getItem('investments_goals') || '[]');
  const reserveGoal = Number(localStorage.getItem('investment_reserve_goal') || 0);
  const totalSaved = goals.reduce((acc, item) => acc + Number(item.currentValue || 0), 0);
  const pct = reserveGoal > 0 ? Math.min((totalSaved / reserveGoal) * 100, 100) : 0;

  const totalEl = document.getElementById('meta-total-guardado');
  const goalEl = document.getElementById('meta-reserva-objetivo');
  const pctEl = document.getElementById('meta-reserva-pct');
  const listEl = document.getElementById('metas-lista');

  if (totalEl) totalEl.textContent = formatMoney(totalSaved);
  if (goalEl) goalEl.textContent = formatMoney(reserveGoal);
  if (pctEl) pctEl.textContent = `${pct.toFixed(0)}%`;

  if (!listEl) return;
  if (goals.length === 0) {
    listEl.innerHTML = '<p class="text-sm text-gray-400">Nenhuma meta cadastrada ainda.</p>';
    return;
  }

  listEl.innerHTML = goals.map((goal) => {
    const current = Number(goal.currentValue || 0);
    const target = Number(goal.targetValue || 0);
    const goalPct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    return `
      <article class="bg-white/5 border border-white/10 rounded-lg p-4">
        <div class="flex items-center justify-between gap-3 mb-2">
          <strong>${goal.name || 'Meta sem nome'}</strong>
          <span class="text-sm text-cyan-300">${goalPct.toFixed(0)}%</span>
        </div>
        <p class="text-sm text-gray-400 mb-2">${formatMoney(current)} de ${formatMoney(target)}</p>
        <div class="w-full bg-white/10 rounded-full h-2"><div class="h-2 rounded-full bg-cyan-500" style="width:${goalPct}%"></div></div>
      </article>
    `;
  }).join('');
})();
