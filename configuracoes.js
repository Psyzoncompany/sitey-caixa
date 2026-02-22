const init = () => {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton) { mobileMenuButton.addEventListener('click', () => mobileMenu.classList.toggle('open')); }

    const incomeList = document.getElementById('income-categories-list');
    const expenseList = document.getElementById('expense-categories-list');
    const newIncomeCategoryInput = document.getElementById('new-income-category');
    const newExpenseCategoryInput = document.getElementById('new-expense-category');
    const addIncomeCategoryBtn = document.getElementById('add-income-category-btn');
    const addExpenseCategoryBtn = document.getElementById('add-expense-category-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const businessLimitInput = document.getElementById('business-limit');
    const personalLimitInput = document.getElementById('personal-limit');
    const saveLimitsBtn = document.getElementById('save-limits-btn');
    const keysStatus = document.getElementById('keys-status');
    const refreshKeysStatusBtn = document.getElementById('refresh-keys-status-btn');
    const exportDataBtn = document.getElementById('export-data-btn');
    const importDataFile = document.getElementById('import-data-file');

    let incomeCategories = JSON.parse(localStorage.getItem('incomeCategories')) || ['Venda de Produto', 'Adiantamento', 'Serviços', 'Outros'];
    let expenseCategories = JSON.parse(localStorage.getItem('expenseCategories')) || ['Matéria-Prima (Custo Direto)', 'Aluguel', 'Contas (Água, Luz, Internet)', 'Marketing e Vendas', 'Salários e Pró-labore', 'Impostos', 'Software e Ferramentas', 'Manutenção', 'Despesas Pessoais', 'Outros'];

    const loadLimits = () => {
        const businessLimit = localStorage.getItem('businessSpendingLimit');
        const personalLimit = localStorage.getItem('personalSpendingLimit');
        if (businessLimit) businessLimitInput.value = businessLimit;
        if (personalLimit) personalLimitInput.value = personalLimit;
    };



    const maskKey = (value) => {
        if (!value || typeof value !== 'string') return 'não encontrada';
        if (value.length <= 8) return '••••••••';
        return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
    };

    const renderKeyCard = ({ title, value, status, hint }) => {
        const color = status === 'ok' ? 'text-green-300 border-green-500/30 bg-green-500/5' : 'text-yellow-300 border-yellow-500/30 bg-yellow-500/5';
        return `<div class="rounded-md p-3 border ${color}">
            <div class="font-semibold">${title}</div>
            <div class="mt-1 break-all">${value}</div>
            <div class="text-xs opacity-80 mt-1">${hint}</div>
        </div>`;
    };

    const loadKeysStatus = async () => {
        if (!keysStatus) return;
        const firebaseApiKey = window.firebasePublicConfig?.apiKey || '';
        const cards = [];

        cards.push(renderKeyCard({
            title: 'Firebase (cliente web)',
            value: maskKey(firebaseApiKey),
            status: firebaseApiKey ? 'ok' : 'warn',
            hint: firebaseApiKey
                ? 'Chave pública visível no front-end por design do Firebase.'
                : 'Configuração não carregada no cliente.'
        }));

        keysStatus.innerHTML = cards.join('');
    };

    saveLimitsBtn.addEventListener('click', () => {
        const businessLimit = parseFloat(businessLimitInput.value);
        const personalLimit = parseFloat(personalLimitInput.value);
        if (!isNaN(businessLimit) && businessLimit >= 0) {
            localStorage.setItem('businessSpendingLimit', businessLimit);
        } else {
            localStorage.removeItem('businessSpendingLimit');
        }
        if (!isNaN(personalLimit) && personalLimit >= 0) {
            localStorage.setItem('personalSpendingLimit', personalLimit);
        } else {
            localStorage.removeItem('personalSpendingLimit');
        }
        alert('Orçamentos salvos com sucesso!');
    });

    const saveCategories = () => {
        localStorage.setItem('incomeCategories', JSON.stringify(incomeCategories));
        localStorage.setItem('expenseCategories', JSON.stringify(expenseCategories));
    };

    const renderCategories = () => {
        incomeList.innerHTML = '';
        expenseList.innerHTML = '';
        incomeCategories.forEach((cat, index) => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center bg-white/5 p-2 rounded-md';
            li.innerHTML = `<span>${cat}</span><button data-index="${index}" data-type="income" class="text-gray-500 hover:text-red-400">&times;</button>`;
            incomeList.appendChild(li);
        });
        expenseCategories.forEach((cat, index) => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center bg-white/5 p-2 rounded-md';
            li.innerHTML = `<span>${cat}</span><button data-index="${index}" data-type="expense" class="text-gray-500 hover:text-red-400">&times;</button>`;
            expenseList.appendChild(li);
        });
    };

    const addCategory = (type) => {
        if (type === 'income') {
            const newCat = newIncomeCategoryInput.value.trim();
            if (newCat && !incomeCategories.includes(newCat)) {
                incomeCategories.push(newCat);
                newIncomeCategoryInput.value = '';
            }
        } else {
            const newCat = newExpenseCategoryInput.value.trim();
            if (newCat && !expenseCategories.includes(newCat)) {
                expenseCategories.push(newCat);
                newExpenseCategoryInput.value = '';
            }
        }
        saveAndRender();
    };

    const removeCategory = (type, index) => {
        if (type === 'income') {
            incomeCategories.splice(index, 1);
        } else {
            expenseCategories.splice(index, 1);
        }
        saveAndRender();
    };

    const saveAndRender = () => {
        saveCategories();
        renderCategories();
    };

    addIncomeCategoryBtn.addEventListener('click', () => addCategory('income'));
    addExpenseCategoryBtn.addEventListener('click', () => addCategory('expense'));

    incomeList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') removeCategory(e.target.dataset.type, e.target.dataset.index);
    });
    expenseList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') removeCategory(e.target.dataset.type, e.target.dataset.index);
    });

    clearDataBtn.addEventListener('click', () => {
        if (confirm("ATENÇÃO! Você tem certeza que deseja apagar TODAS as transações? Esta ação é irreversível.")) {
            if (prompt("Para confirmar, digite a palavra 'DELETAR' em maiúsculas.") === 'DELETAR') {
                localStorage.removeItem('transactions');
                alert("Todos os dados de transações foram apagados com sucesso.");
            } else {
                alert("Ação cancelada.");
            }
        }
    });

    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', () => {
            const confirmExport = confirm('Deseja baixar um arquivo de backup com todos os seus dados?');
            if (!confirmExport) return;

            try {
                const dataToExport = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && !key.startsWith('firebase:') && !key.startsWith('__firebase') && !key.startsWith('firebaseLocalStorage')) {
                        const value = localStorage.getItem(key);
                        try {
                            dataToExport[key] = JSON.parse(value);
                        } catch (e) {
                            dataToExport[key] = value;
                        }
                    }
                }

                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                const dateStr = new Date().toISOString().split('T')[0];
                downloadAnchorNode.setAttribute("download", `psyzon_caixa_backup_${dateStr}.json`);
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            } catch (error) {
                console.error(error);
                alert('Erro ao exportar backup');
            }
        });
    }

    if (importDataFile) {
        importDataFile.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const confirmImport = confirm('ATENÇÃO: Importar backup irá substituir e APAGAR todos os dados atuais que não estão salvos. Deseja continuar?');
            if (!confirmImport) {
                importDataFile.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);

                    // Remove current keys (except Firebase ones) to avoid ghosts
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && !key.startsWith('firebase:') && !key.startsWith('__firebase') && !key.startsWith('firebaseLocalStorage')) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(k => localStorage.removeItem(k));

                    // Add new keys
                    for (const key in importedData) {
                        const val = importedData[key];
                        localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : val);
                    }

                    alert('Backup importado com sucesso! A página será atualizada.');
                    window.location.reload();
                } catch (error) {
                    console.error(error);
                    alert('Erro ao ler o arquivo. Certifique-se de que é um arquivo JSON válido exportado do sistema.');
                }
                importDataFile.value = '';
            };
            reader.readAsText(file);
        });
    }

    if (refreshKeysStatusBtn) refreshKeysStatusBtn.addEventListener('click', loadKeysStatus);

    loadLimits();
    renderCategories();
    loadKeysStatus();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}