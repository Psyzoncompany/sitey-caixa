window.Advisor = {
    analyze: function () {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        
        // 1. Transactions
        const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        const totalBalance = transactions.reduce((acc, t) => acc + t.amount, 0);
        
        const monthlyTransactions = transactions.filter(t => {
            const date = new Date(t.date + 'T03:00:00');
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        const incomeMonth = monthlyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const businessExpenseMonth = monthlyTransactions.filter(t => t.type === 'expense' && t.scope !== 'personal').reduce((acc, t) => acc + Math.abs(t.amount), 0);
        const businessProfitMonth = incomeMonth - businessExpenseMonth;
        
        // 2. Bills (contas_mes)
        const billsDataRaw = localStorage.getItem('psyzon_accounts_db_v1');
        let billsDb = billsDataRaw ? JSON.parse(billsDataRaw) : { accounts: [], monthly_records: {} };
        const monthlyRecords = billsDb.monthly_records?.[currentMonthStr] || {};
        let monthlyBillsTotal = 0;
        
        billsDb.accounts.forEach(acc => {
             const record = monthlyRecords[acc.id] || { status: 'pending' };
             const isActive = acc.type === 'fixed' || (acc.type === 'unique' && acc.unique_date === currentMonthStr) || (acc.type === 'installment' && acc.current_installment <= acc.total_installments);
             if (isActive) {
                 monthlyBillsTotal += acc.amount || 0;
             }
        });
        
        const proLaborePlanejado = parseFloat(localStorage.getItem('advisor_prolabore')) || 0;
        monthlyBillsTotal += proLaborePlanejado;

        // 3. Receivables
        const productionOrdersList = JSON.parse(localStorage.getItem('production_orders')) || [];
        let receivablesTotal = 0;
        let overdueReceivablesTotal = 0;
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        productionOrdersList.forEach(o => {
            if (!o.isPaid) {
                const pending = (o.totalValue || 0) - (o.amountPaid || 0);
                if (pending > 0.01) {
                    receivablesTotal += pending;
                    if (o.deadline) {
                        const d = new Date(o.deadline + 'T03:00:00');
                        if (d < todayDate) overdueReceivablesTotal += pending;
                    }
                }
            }
        });

        // 4. Goals (Reserva)
        const goals = JSON.parse(localStorage.getItem('investments_goals')) || [];
        let reservaGoal = goals.find(g => g.isPrimary);
        if (!reservaGoal && goals.length > 0) {
            reservaGoal = goals[0];
        }
        const reservaAtual = reservaGoal ? reservaGoal.currentValue : 0;
        const metaReserva = reservaGoal ? reservaGoal.targetValue : 3000;

        // B) Risco
        let riskLevel = "OK";
        if (totalBalance < monthlyBillsTotal) {
            riskLevel = "CRITICO";
        } else if (totalBalance >= monthlyBillsTotal && reservaAtual < (metaReserva * 0.5)) {
            riskLevel = "ATENCAO";
        }

        // C) Recomendação
        let recommendedAmount = 0;
        if (businessProfitMonth <= 0 || totalBalance < monthlyBillsTotal) {
            recommendedAmount = 0;
        } else {
            if (reservaAtual < metaReserva) {
                recommendedAmount = Math.min(businessProfitMonth * 0.30, metaReserva - reservaAtual);
            } else {
                recommendedAmount = businessProfitMonth * 0.10;
            }
        }

        // D) Ajuste por risco de recebimento
        if (receivablesTotal > 0 && overdueReceivablesTotal > (receivablesTotal * 0.5)) {
             recommendedAmount *= 0.8;
        }

        // Reasons
        const formatBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const reasons = [];
        if (riskLevel === "CRITICO") {
            reasons.push(`Seu caixa atual (${formatBRL(totalBalance)}) não cobre as contas do mês e pró-labore (${formatBRL(monthlyBillsTotal)}).`);
        } else if (riskLevel === "ATENCAO") {
            reasons.push(`Sua reserva atual (${formatBRL(reservaAtual)}) está abaixo de 50% da meta (${formatBRL(metaReserva)}).`);
        } else {
            reasons.push(`Sua saúde financeira está OK.`);
        }

        if (businessProfitMonth <= 0) {
            reasons.push(`O negócio não gerou lucro neste mês (${formatBRL(businessProfitMonth)}). Priorize estabilidade.`);
        } else {
            reasons.push(`O lucro do negócio neste mês é de ${formatBRL(businessProfitMonth)}.`);
        }

        if (receivablesTotal > 0 && overdueReceivablesTotal > (receivablesTotal * 0.5)) {
            reasons.push(`Alerta: alto valor a receber pendente (${formatBRL(overdueReceivablesTotal)}). Recomendação foi reduzida por segurança.`);
        }

        // Guards
        const guards = [];
        if (riskLevel === "CRITICO") {
            guards.push("BLOCK_INVESTMENT_DEPOSIT");
        }

        return {
            recommendedToSaveThisMonth: recommendedAmount,
            riskLevel,
            reasons,
            guards,
            stats: { totalBalance, monthlyBillsTotal, businessProfitMonth, reservaAtual, metaReserva, receivablesTotal }
        };
    }
};
