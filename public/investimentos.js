document.addEventListener("DOMContentLoaded", () => {
    // 1. Data Initialization
    let goals = JSON.parse(localStorage.getItem('investments_goals')) || [];
    let moves = JSON.parse(localStorage.getItem('investments_moves')) || [];

    if (goals.length === 0) {
        goals.push({
            id: Date.now(),
            name: "Reserva de Caixa (Empresa)",
            type: "reserve",
            priority: 1,
            targetValue: 3000,
            currentValue: 0,
            isPrimary: true,
            lockRule: "block_withdraw_without_reason"
        });
        localStorage.setItem('investments_goals', JSON.stringify(goals));
    }

    const formatMoney = (val) => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // 2. Elements Mapping
    const totalSavedEl = document.getElementById('page-total-saved');
    const reservaCurrentEl = document.getElementById('page-reserva-current');
    const reservaBarEl = document.getElementById('page-reserva-bar');
    const reservaPctEl = document.getElementById('page-reserva-pct');
    const recommendEl = document.getElementById('page-recommended');
    const statusDescEl = document.getElementById('page-status-desc');
    const guardsAlertEl = document.getElementById('page-guards-alert');
    const goalsListEl = document.getElementById('goals-list');
    const movesBodyEl = document.getElementById('moves-table-body');

    // Modals
    const goalModal = document.getElementById('goal-modal');
    const goalForm = document.getElementById('goal-form');
    const moveModal = document.getElementById('move-modal');
    const moveForm = document.getElementById('move-form');

    // 3. UI Updater
    const updateUI = () => {
        // Advisor
        let adv = window.Advisor ? window.Advisor.analyze() : null;

        let totalGuardado = goals.reduce((acc, g) => acc + (g.currentValue || 0), 0);
        totalSavedEl.textContent = formatMoney(totalGuardado);

        // Achando reserva principal
        let reserva = goals.find(g => g.isPrimary);
        if (!reserva && goals.length > 0) reserva = goals[0];

        if (reserva) {
            let pct = reserva.targetValue > 0 ? (reserva.currentValue / reserva.targetValue) * 100 : 0;
            pct = Math.min(pct, 100);
            reservaCurrentEl.innerHTML = `${formatMoney(reserva.currentValue)} <span class="text-sm font-normal text-gray-500">/ ${formatMoney(reserva.targetValue)}</span>`;
            reservaBarEl.style.width = pct + '%';
            reservaPctEl.textContent = pct.toFixed(1) + '% atingido';
        }

        if (adv) {
            recommendEl.textContent = formatMoney(adv.recommendedToSaveThisMonth);
            recommendEl.classList.toggle('text-yellow-400', adv.recommendedToSaveThisMonth > 0);
            recommendEl.classList.toggle('text-gray-400', adv.recommendedToSaveThisMonth === 0);

            let statusHtml = `Resumo: ${adv.reasons.join(" ")}`;
            statusDescEl.textContent = statusHtml;

            if (adv.guards.includes("BLOCK_INVESTMENT_DEPOSIT")) {
                guardsAlertEl.classList.remove('hidden');
            } else {
                guardsAlertEl.classList.add('hidden');
            }
        }

        renderGoals();
        renderMoves();
    };

    const renderGoals = () => {
        goalsListEl.innerHTML = '';
        goals.forEach(g => {
            const isPrimary = g.isPrimary;
            const pct = g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0;

            const card = document.createElement('div');
            card.className = `glass-card p-5 relative overflow-hidden flex flex-col justify-between ${isPrimary ? 'ring-1 ring-cyan-500/50' : ''}`;

            const typeStr = g.type === 'reserve' ? 'Reserva' : (g.type === 'growth' ? 'Crescimento' : 'Outro');
            const colorType = g.type === 'reserve' ? 'bg-cyan-500' : 'bg-purple-500';

            card.innerHTML = `
                ${isPrimary ? '<div class="absolute top-0 right-0 py-1 px-3 bg-cyan-500 text-black text-xs font-bold rounded-bl-lg">PRINCIPAL</div>' : ''}
                <div>
                   <div class="flex items-center gap-2 mb-2">
                      <span class="w-2 h-2 rounded-full ${colorType}"></span>
                      <span class="text-xs text-gray-400 uppercase tracking-widest font-bold">${typeStr}</span>
                   </div>
                   <h3 class="text-lg font-bold text-white mb-2 line-clamp-1" title="${g.name}">${g.name}</h3>
                   <div class="text-2xl font-black text-white mb-1">${formatMoney(g.currentValue)}</div>
                   <div class="text-sm text-gray-500 mb-4">Meta: ${formatMoney(g.targetValue)}</div>
                   
                   <div class="w-full bg-white/10 rounded-full h-1.5 mb-1">
                      <div class="h-1.5 rounded-full ${colorType} transition-all duration-500" style="width: ${Math.min(pct, 100)}%"></div>
                   </div>
                   <div class="text-xs text-right text-gray-400 mb-5">${pct.toFixed(1)}% alcançado</div>
                </div>

                <div class="flex flex-wrap gap-2 mt-auto">
                   <button onclick="window.openMoveModal(${g.id}, 'deposit')" class="flex-1 min-w-[30%] py-2 rounded bg-green-500/10 text-green-400 border border-green-500/30 font-bold hover:bg-green-500/20 transition-colors text-sm">DEPÓSITO</button>
                   <button onclick="window.openMoveModal(${g.id}, 'withdraw')" class="flex-1 min-w-[30%] py-2 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-bold hover:bg-red-500/20 transition-colors text-sm">RETIRAR</button>
                   <button onclick="window.openGoalModal(${g.id})" class="flex-1 py-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-sm">Editar</button>
                </div>
            `;
            goalsListEl.appendChild(card);
        });
    };

    const renderMoves = () => {
        movesBodyEl.innerHTML = '';
        if (moves.length === 0) {
            movesBodyEl.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-gray-500">Nenhum movimento registrado.</td></tr>`;
            return;
        }

        const sortedMoves = [...moves].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO)).slice(0, 20); // ultímos 20

        sortedMoves.forEach(m => {
            const goal = goals.find(g => g.id === m.goalId);
            const goalName = goal ? goal.name : 'Meta Removida';

            const tr = document.createElement('tr');
            const isDep = m.kind === 'deposit';
            const valClass = isDep ? 'text-green-400' : 'text-red-400';
            const valSign = isDep ? '+' : '-';
            const fmtDate = new Date(m.dateISO).toLocaleDateString('pt-BR');

            tr.innerHTML = `
                <td class="py-3 px-2 whitespace-nowrap">${fmtDate}</td>
                <td class="py-3 px-2 font-medium">${goalName}</td>
                <td class="py-3 px-2 text-xs uppercase tracking-wider ${valClass}">${isDep ? 'Depósito' : 'Retirada'}</td>
                <td class="py-3 px-2 font-bold ${valClass}">${valSign} ${formatMoney(m.amount)}</td>
                <td class="py-3 px-2 text-right">
                   ${m.note ? `<span class="bg-white/10 px-2 py-1 rounded text-xs text-gray-400 max-w-[150px] inline-block truncate" title="${m.note}">${m.note}</span>` : ''}
                </td>
            `;
            movesBodyEl.appendChild(tr);
        });
    };

    // 4. Modal de Movimento (Depósito/Retirada)
    window.openMoveModal = (goalId, kind) => {
        let adv = window.Advisor ? window.Advisor.analyze() : null;

        // Bloqueios / Guards
        if (kind === 'deposit' && adv && adv.riskLevel === "CRITICO") {
            const warning = confirm("BLOQUEADO: Seu caixa não cobre as contas do mês. \nPriorize sobreviver!\n\nDeseja ignorar e depositar mesmo assim?");
            if (!warning) return;
        }

        const g = goals.find(g => g.id === goalId);
        if (!g) return;

        document.getElementById('move-modal-title').textContent = (kind === 'deposit' ? 'Aportar em ' : 'Retirar de ') + g.name;
        document.getElementById('move-goal-id').value = goalId;
        document.getElementById('move-type').value = kind;
        document.getElementById('move-amount').value = '';
        document.getElementById('move-note').value = '';

        moveModal.classList.remove('hidden');
    };

    document.getElementById('move-cancel').onclick = () => moveModal.classList.add('hidden');

    moveForm.onsubmit = (e) => {
        e.preventDefault();
        const goalId = parseInt(document.getElementById('move-goal-id').value);
        const kind = document.getElementById('move-type').value;
        const amount = parseFloat(document.getElementById('move-amount').value);
        const note = document.getElementById('move-note').value.trim();

        if (isNaN(amount) || amount <= 0) {
            alert("Valor inválido.");
            return;
        }

        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;

        if (kind === 'withdraw' && goal.isPrimary && !note) {
            alert("Por ser a Reserva de Caixa, é obrigatório preencher um MOTIVO para a retirada.");
            return;
        }

        if (kind === 'withdraw' && amount > goal.currentValue) {
            alert("Você não pode retirar um valor maior do que o guardado.");
            return;
        }

        // Action
        if (kind === 'deposit') {
            goal.currentValue += amount;
        } else {
            goal.currentValue -= amount;
        }

        moves.push({
            id: Date.now(),
            goalId,
            dateISO: new Date().toISOString(),
            kind,
            amount,
            note
        });

        localStorage.setItem('investments_goals', JSON.stringify(goals));
        localStorage.setItem('investments_moves', JSON.stringify(moves));

        moveModal.classList.add('hidden');
        updateUI();

        // Optional: show a standard browser alert or a custom toast if available
        alert(kind === 'deposit' ? "Depósito registrado!" : "Retirada registrada!");
    };


    // 5. Modal de Metas (Criar/Editar)
    window.openGoalModal = (id = null) => {
        document.getElementById('goal-id').value = id || '';
        if (id) {
            const g = goals.find(g => g.id === id);
            if (g) {
                document.getElementById('goal-modal-title').textContent = "Editar Meta: " + g.name;
                document.getElementById('goal-name').value = g.name;
                document.getElementById('goal-target').value = g.targetValue;
                document.getElementById('goal-type').value = g.type;
                if (g.isPrimary) {
                    document.getElementById('goal-type').disabled = true;
                } else {
                    document.getElementById('goal-type').disabled = false;
                }
            }
        } else {
            document.getElementById('goal-modal-title').textContent = "Nova Meta";
            document.getElementById('goal-name').value = '';
            document.getElementById('goal-target').value = '';
            document.getElementById('goal-type').value = 'growth';
            document.getElementById('goal-type').disabled = false;
        }
        goalModal.classList.remove('hidden');
    };

    document.getElementById('add-goal-btn').onclick = () => window.openGoalModal();
    document.getElementById('goal-cancel').onclick = () => goalModal.classList.add('hidden');

    goalForm.onsubmit = (e) => {
        e.preventDefault();
        const idRaw = document.getElementById('goal-id').value;
        const name = document.getElementById('goal-name').value.trim();
        const targetValue = parseFloat(document.getElementById('goal-target').value);
        let type = document.getElementById('goal-type').value;

        if (!name || isNaN(targetValue) || targetValue <= 0) {
            alert("Preencha corretamente.");
            return;
        }

        if (idRaw) {
            const id = parseInt(idRaw);
            const g = goals.find(x => x.id === id);
            if (g) {
                g.name = name;
                g.targetValue = targetValue;
                if (!g.isPrimary) g.type = type; // n deixa mudar tipo do primário
            }
        } else {
            goals.push({
                id: Date.now(),
                name,
                type,
                targetValue,
                currentValue: 0,
                priority: 3,
                isPrimary: false
            });
        }

        localStorage.setItem('investments_goals', JSON.stringify(goals));
        goalModal.classList.add('hidden');
        updateUI();
    };


    updateUI();
});
