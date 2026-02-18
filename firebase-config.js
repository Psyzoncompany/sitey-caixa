// c:\Users\AAAA\Desktop\sitey-caixa\firebase-config.js

// Importa as funções do Firebase (versão compat para facilitar o uso com scripts existentes)
import { onAuthStateChanged, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { app, auth, db } from "./js/firebase-init.js";


const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});
googleProvider.addScope('email');
googleProvider.addScope('profile');

const ensureAuthPersistence = async () => {
    try {
        await setPersistence(auth, browserLocalPersistence);
    } catch (error) {
        console.warn('Não foi possível definir persistência local de auth:', error);
    }
};

ensureAuthPersistence();

// Som de sucesso sutil (Web Audio API)
let audioCtx = null;
const unlockAudio = () => {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
};
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('click', unlockAudio, { once: true });

const playSuccessSound = () => {
    try {
        if (!audioCtx) unlockAudio();
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota A5
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime); // Volume baixo (5%)
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
};

// State for automatic cloud sync
let hasUnsavedChanges = false;
let initialSnapshot = "{}"; // Armazena o estado inicial para comparação
let autosaveTimer = null;
let autosaveInFlight = null;
const AUTOSAVE_DELAY_MS = 900;

// Chaves de UI/estado temporário que NÃO devem marcar o estado como alterado
// Ex.: aba ativa da tela de processos.
const NON_PERSISTENT_DIRTY_KEYS = new Set([
    'processos_tab',
    'prefill_order_form'
]);

// Helper para criar um snapshot determinístico (ordena chaves para garantir comparação correta)
const getSnapshot = (data) => {
    const sortObj = (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(sortObj);
        return Object.keys(obj).sort().reduce((acc, key) => {
            if (NON_PERSISTENT_DIRTY_KEYS.has(key)) return acc;
            acc[key] = sortObj(obj[key]);
            return acc;
        }, {});
    };
    return JSON.stringify(sortObj(data));
};
const parseLocalJson = (key, fallback = []) => {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch (_) {
        return fallback;
    }
};

const getDaysUntilDeadline = (deadline) => {
    if (!deadline) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${deadline}T00:00:00`);
    if (Number.isNaN(target.getTime())) return null;
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / 86400000);
};

const collectPendingChecklistTasks = () => {
    const orders = parseLocalJson('production_orders', []);
    const clients = parseLocalJson('clients', []);
    const checklistLabels = {
        sewing: 'Costura',
        cutting: 'Corte',
        printing: 'Estampa',
        embroidery: 'Bordado',
        finishing: 'Acabamento',
        expedition: 'Expedição'
    };

    const tasks = [];
    orders.forEach((order) => {
        if (!order || order.status === 'done' || !order.checklist) return;
        Object.entries(order.checklist).forEach(([taskKey, task]) => {
            if (!task || task.completed || !task.deadline) return;
            const daysUntil = getDaysUntilDeadline(task.deadline);
            if (daysUntil === null) return;
            const client = clients.find((item) => String(item.id) === String(order.clientId));
            tasks.push({
                orderId: order.id,
                orderDescription: order.description || 'Pedido sem descrição',
                taskKey,
                taskName: checklistLabels[taskKey] || taskKey,
                clientName: client?.name || 'Cliente',
                deadline: task.deadline,
                daysUntil
            });
        });
    });
    return tasks;
};

const createGlobalCalculator = () => {
    if (document.body.dataset.globalCalculatorReady === 'true') return;
    if (window.location.pathname.endsWith('login.html')) return;
    if (document.getElementById('calculator-fab')) return;
    document.body.dataset.globalCalculatorReady = 'true';

    const fab = document.createElement('button');
    fab.id = 'calculator-fab-global';
    fab.className = 'calculator-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Abrir calculadora');
    fab.title = 'Calculadora';
    fab.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h8"/></svg>';

    const modal = document.createElement('div');
    modal.id = 'calculator-modal-global';
    modal.className = 'calculator-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="calculator-sheet">
        <div class="calculator-head">
          <h2>Calculadora</h2>
          <button id="calculator-close-global" type="button" aria-label="Fechar calculadora">✕</button>
        </div>
        <div class="calculator-screen-wrap">
          <p id="calculator-expression-global" class="calculator-expression">0</p>
          <p id="calculator-display-global" class="calculator-display">0</p>
        </div>
        <div class="calculator-grid">
          <button data-calc-action="clear">AC</button>
          <button data-calc-action="backspace">⌫</button>
          <button data-calc-action="percent">%</button>
          <button data-calc-value="/" class="is-op">÷</button>
          <button data-calc-value="7">7</button><button data-calc-value="8">8</button><button data-calc-value="9">9</button><button data-calc-value="*" class="is-op">×</button>
          <button data-calc-value="4">4</button><button data-calc-value="5">5</button><button data-calc-value="6">6</button><button data-calc-value="-" class="is-op">−</button>
          <button data-calc-value="1">1</button><button data-calc-value="2">2</button><button data-calc-value="3">3</button><button data-calc-value="+" class="is-op">+</button>
          <button data-calc-action="toggle-sign">±</button><button data-calc-value="0">0</button><button data-calc-value=".">.</button><button data-calc-action="equals" class="is-equals">=</button>
        </div>
        <div class="calculator-history-head"><strong>Histórico</strong><button id="calculator-clear-history-global" type="button">Limpar</button></div>
        <ul id="calculator-history-global" class="calculator-history"></ul>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#calculator-close-global');
    const expressionEl = modal.querySelector('#calculator-expression-global');
    const displayEl = modal.querySelector('#calculator-display-global');
    const historyEl = modal.querySelector('#calculator-history-global');
    const clearHistoryBtn = modal.querySelector('#calculator-clear-history-global');

    const HISTORY_KEY = 'dashboardCalculatorHistory';
    const operators = new Set(['+', '-', '*', '/']);
    let expression = '';

    const formatResult = (value) => {
        if (!Number.isFinite(value)) return 'Erro';
        const fixed = Math.abs(value) >= 1 ? Number(value.toFixed(8)) : Number(value.toPrecision(8));
        return fixed.toLocaleString('pt-BR', { maximumFractionDigits: 8 });
    };

    const sanitizeExpression = (raw) => raw.replace(/,/g, '.').replace(/[^0-9+\-*/().]/g, '');
    const evaluateExpression = (raw) => {
        const clean = sanitizeExpression(raw);
        if (!clean) return null;
        try {
            return Function(`"use strict"; return (${clean});`)();
        } catch (_) {
            return null;
        }
    };
    const readHistory = () => {
        try {
            const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    };
    const writeHistory = (entries) => localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 20)));
    const renderHistory = () => {
        const entries = readHistory();
        historyEl.innerHTML = entries.length
            ? entries.map((item) => `<li><span>${item.expression}</span><strong>${item.result}</strong></li>`).join('')
            : '<li class="calculator-history-empty">Sem cálculos ainda.</li>';
    };
    const setExpression = (value) => {
        expression = value || '';
        expressionEl.textContent = expression || '0';
        const result = evaluateExpression(expression);
        displayEl.textContent = result === null ? '0' : formatResult(Number(result));
    };
    const appendValue = (value) => {
        if (value === '.') {
            const lastChunk = expression.split(/[+\-*/]/).pop();
            if (lastChunk.includes('.')) return;
        }
        if (operators.has(value)) {
            const last = expression.slice(-1);
            if (!expression && value !== '-') return;
            if (operators.has(last)) expression = expression.slice(0, -1);
        }
        setExpression(expression + value);
    };
    const applyPercent = () => {
        const result = evaluateExpression(expression);
        if (result === null) return;
        setExpression(String(Number(result) / 100));
    };
    const toggleSign = () => {
        const result = evaluateExpression(expression);
        if (result === null) return;
        setExpression(String(Number(result) * -1));
    };
    const finalize = () => {
        const result = evaluateExpression(expression);
        if (result === null) return;
        const formatted = formatResult(Number(result));
        const entries = readHistory();
        entries.unshift({ expression: expression || '0', result: formatted, at: Date.now() });
        writeHistory(entries);
        renderHistory();
        setExpression(String(Number(result)));
    };

    modal.addEventListener('click', (event) => { if (event.target === modal) modal.classList.add('hidden'); });
    fab.addEventListener('click', () => modal.classList.remove('hidden'));
    closeBtn?.addEventListener('click', () => modal.classList.add('hidden'));
    modal.querySelectorAll('[data-calc-value]').forEach((btn) => btn.addEventListener('click', () => appendValue(btn.getAttribute('data-calc-value') || '')));
    modal.querySelectorAll('[data-calc-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-calc-action');
            if (action === 'clear') setExpression('');
            if (action === 'backspace') setExpression(expression.slice(0, -1));
            if (action === 'percent') applyPercent();
            if (action === 'toggle-sign') toggleSign();
            if (action === 'equals') finalize();
        });
    });
    clearHistoryBtn?.addEventListener('click', () => {
        writeHistory([]);
        renderHistory();
    });

    renderHistory();
    setExpression('');
};


const createFloatingNotes = () => {
    if (document.body.dataset.floatingNotesReady === 'true') return;
    if (window.location.pathname.endsWith('login.html')) return;
    document.body.dataset.floatingNotesReady = 'true';

    const fab = document.createElement('button');
    fab.id = 'notes-fab-global';
    fab.className = 'notes-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Abrir bloco de anotações');
    fab.title = 'Anotações';
    fab.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>';

    const modal = document.createElement('div');
    modal.id = 'notes-modal-global';
    modal.className = 'notes-modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="notes-sheet">
        <div class="notes-head">
          <div>
            <h2>Anotações</h2>
            <p class="notes-subtitle">Bloco rápido estilo iPhone, agora com abas</p>
          </div>
          <button id="notes-close-global" type="button" aria-label="Fechar bloco de anotações">✕</button>
        </div>

        <div class="notes-tabs-wrap">
          <div id="notes-tabs-global" class="notes-tabs" role="tablist" aria-label="Abas de anotações"></div>
          <button id="notes-add-tab-global" type="button" class="notes-tab-add" aria-label="Adicionar nova aba">+ Nova</button>
        </div>

        <textarea id="notes-content-global" class="notes-textarea" placeholder="Escreva aqui o que você precisa fazer..."></textarea>

        <div class="notes-footer">
          <div class="notes-meta">
            <span id="notes-status-global" class="notes-status">Salvo</span>
            <span id="notes-updated-at-global" class="notes-updated-at">Agora</span>
          </div>
          <div class="notes-actions">
            <button id="notes-rename-tab-global" type="button">Renomear aba</button>
            <button id="notes-delete-tab-global" type="button">Excluir aba</button>
            <button id="notes-clear-global" type="button">Limpar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(modal);

    const NOTES_KEY = 'floatingQuickNotesV2';
    const textarea = modal.querySelector('#notes-content-global');
    const closeBtn = modal.querySelector('#notes-close-global');
    const clearBtn = modal.querySelector('#notes-clear-global');
    const addTabBtn = modal.querySelector('#notes-add-tab-global');
    const renameTabBtn = modal.querySelector('#notes-rename-tab-global');
    const deleteTabBtn = modal.querySelector('#notes-delete-tab-global');
    const tabsContainer = modal.querySelector('#notes-tabs-global');
    const statusEl = modal.querySelector('#notes-status-global');
    const updatedAtEl = modal.querySelector('#notes-updated-at-global');
    let saveTimer = null;

    const makeTab = (title = 'Nota') => ({
        id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title,
        content: '',
        updatedAt: Date.now()
    });

    let notesState = {
        activeId: null,
        tabs: [makeTab('Nota 1')]
    };

    const getActiveTab = () => notesState.tabs.find((tab) => tab.id === notesState.activeId) || notesState.tabs[0];

    const setStatus = (textStatus) => {
        if (statusEl) statusEl.textContent = textStatus;
    };

    const formatUpdatedAt = (timestamp) => {
        if (!timestamp) return 'Agora';
        return `Atualizado ${new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const persist = () => {
        try {
            localStorage.setItem(NOTES_KEY, JSON.stringify(notesState));
            setStatus('Salvo');
            const activeTab = getActiveTab();
            if (updatedAtEl) updatedAtEl.textContent = formatUpdatedAt(activeTab?.updatedAt);
        } catch (_) {
            setStatus('Erro ao salvar');
        }
    };

    const scheduleSave = () => {
        setStatus('Salvando...');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(persist, 260);
    };

    const renderTabs = () => {
        if (!tabsContainer) return;
        tabsContainer.innerHTML = notesState.tabs.map((tab) => `
            <button type="button" class="notes-tab-btn ${tab.id === notesState.activeId ? 'is-active' : ''}" data-note-id="${tab.id}" role="tab" aria-selected="${tab.id === notesState.activeId ? 'true' : 'false'}" title="${tab.title}">
              ${tab.title}
            </button>
        `).join('');
    };

    const syncActiveToTextarea = () => {
        const activeTab = getActiveTab();
        if (!activeTab || !textarea) return;
        notesState.activeId = activeTab.id;
        textarea.value = activeTab.content || '';
        if (updatedAtEl) updatedAtEl.textContent = formatUpdatedAt(activeTab.updatedAt);
        renderTabs();
    };

    const loadState = () => {
        try {
            const parsed = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
            if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length) {
                notesState = {
                    activeId: parsed.activeId || parsed.tabs[0]?.id || null,
                    tabs: parsed.tabs.map((tab, idx) => ({
                        id: tab?.id || `note-${Date.now()}-${idx}`,
                        title: (tab?.title || `Nota ${idx + 1}`).slice(0, 22),
                        content: tab?.content || '',
                        updatedAt: tab?.updatedAt || Date.now()
                    }))
                };
                return;
            }
        } catch (_) {}
        notesState = {
            activeId: null,
            tabs: [makeTab('Nota 1')]
        };
    };

    loadState();
    if (!notesState.activeId && notesState.tabs[0]) notesState.activeId = notesState.tabs[0].id;
    syncActiveToTextarea();
    persist();

    tabsContainer?.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-note-id]');
        if (!btn) return;
        const noteId = btn.getAttribute('data-note-id');
        const exists = notesState.tabs.some((tab) => tab.id === noteId);
        if (!exists) return;
        notesState.activeId = noteId;
        syncActiveToTextarea();
    });

    addTabBtn?.addEventListener('click', () => {
        const nextIndex = notesState.tabs.length + 1;
        const newTab = makeTab(`Nota ${nextIndex}`);
        notesState.tabs.push(newTab);
        notesState.activeId = newTab.id;
        syncActiveToTextarea();
        scheduleSave();
    });

    renameTabBtn?.addEventListener('click', () => {
        const activeTab = getActiveTab();
        if (!activeTab) return;
        const value = prompt('Nome da aba:', activeTab.title || '');
        if (value === null) return;
        const title = value.trim().slice(0, 22) || activeTab.title || 'Nota';
        activeTab.title = title;
        activeTab.updatedAt = Date.now();
        syncActiveToTextarea();
        scheduleSave();
    });

    deleteTabBtn?.addEventListener('click', () => {
        if (notesState.tabs.length <= 1) {
            alert('Você precisa manter pelo menos 1 aba de nota.');
            return;
        }
        const activeTab = getActiveTab();
        if (!activeTab) return;
        const confirmed = confirm(`Excluir a aba "${activeTab.title}"?`);
        if (!confirmed) return;
        notesState.tabs = notesState.tabs.filter((tab) => tab.id !== activeTab.id);
        notesState.activeId = notesState.tabs[0]?.id || null;
        syncActiveToTextarea();
        scheduleSave();
    });

    if (textarea) {
        textarea.addEventListener('input', () => {
            const activeTab = getActiveTab();
            if (!activeTab) return;
            activeTab.content = textarea.value;
            activeTab.updatedAt = Date.now();
            if (updatedAtEl) updatedAtEl.textContent = formatUpdatedAt(activeTab.updatedAt);
            scheduleSave();
        });
    }

    clearBtn?.addEventListener('click', () => {
        const activeTab = getActiveTab();
        if (!activeTab || !textarea) return;
        activeTab.content = '';
        activeTab.updatedAt = Date.now();
        textarea.value = '';
        if (updatedAtEl) updatedAtEl.textContent = formatUpdatedAt(activeTab.updatedAt);
        scheduleSave();
    });

    const closeModal = () => {
        clearTimeout(saveTimer);
        persist();
        modal.classList.add('hidden');
    };

    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    fab.addEventListener('click', () => {
        syncActiveToTextarea();
        modal.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', closeModal);

    window.addEventListener('beforeunload', () => {
        clearTimeout(saveTimer);
        persist();
    });
};

const createDueSoonTasksFab = () => {
    if (document.body.dataset.dueSoonFabReady === 'true') return;
    if (window.location.pathname.endsWith('login.html')) return;
    document.body.dataset.dueSoonFabReady = 'true';

    const dueFab = document.createElement('button');
    dueFab.id = 'due-soon-fab';
    dueFab.className = 'due-soon-fab';
    dueFab.type = 'button';
    dueFab.title = 'Afazeres vencendo em até 2 dias';
    dueFab.innerHTML = `
        <span class="due-soon-fab__icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 3h6"/>
                <path d="M10 7h4"/>
                <rect x="5" y="3" width="14" height="18" rx="2"/>
                <path d="M9 12h6M9 16h6"/>
            </svg>
        </span>
        <span class="due-soon-fab__label">Afazeres 2d</span>
        <span id="due-soon-fab-count" class="due-soon-fab__count">0</span>
    `;
    dueFab.addEventListener('click', () => {
        window.location.href = 'processos.html?tab=afazeres&filter=due2days';
    });
    document.body.appendChild(dueFab);

    const refreshCount = () => {
        const countEl = document.getElementById('due-soon-fab-count');
        if (!countEl) return;
        const tasks = collectPendingChecklistTasks().filter((task) => task.daysUntil >= 0 && task.daysUntil <= 2);
        countEl.textContent = String(tasks.length);
        dueFab.classList.toggle('is-empty', tasks.length === 0);
    };

    window.addEventListener('storage', refreshCount);
    setInterval(refreshCount, 60000);
    refreshCount();
};

const setupAutomaticTaskReminders = () => {
    if (window.__taskReminderInitialized) return;
    window.__taskReminderInitialized = true;

    const ONE_DAY_KEY = 'taskDueOneDayReminderSeen';
    const showTaskReminder = (task) => {
        const message = `${task.taskName} (${task.clientName}) vence em 1 dia.`;
        const toast = document.createElement('div');
        toast.className = 'global-reminder-toast';

        const icon = document.createElement('span');
        icon.className = 'global-reminder-toast__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>';

        const text = document.createElement('span');
        text.className = 'global-reminder-toast__text';
        text.textContent = message;

        toast.appendChild(icon);
        toast.appendChild(text);
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 40);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    };

    const remind = () => {
        const today = new Date().toISOString().split('T')[0];
        let seen;
        try {
            seen = JSON.parse(localStorage.getItem(ONE_DAY_KEY) || '{}');
        } catch (_) {
            seen = {};
        }
        if (seen.__lastDate !== today) seen = { __lastDate: today };

        const tasks = collectPendingChecklistTasks().filter((task) => task.daysUntil === 1);
        tasks.forEach((task) => {
            const taskId = `${task.orderId}:${task.taskKey}:${task.deadline}`;
            if (seen[taskId]) return;
            seen[taskId] = true;
            showTaskReminder(task);
        });
        localStorage.setItem(ONE_DAY_KEY, JSON.stringify(seen));
    };

    remind();
    setInterval(remind, 1800000);
};

// --- BACKEND REAL (Memória + Firestore) ---
// Substitui o localStorage real por um armazenamento em memória conectado à nuvem
let memoryStore = {};
window.BackendInitialized = false;

const CLOUD_CACHE_PREFIX = 'sitey_cloud_cache_v1_';
const getCloudCacheKey = (uid) => `${CLOUD_CACHE_PREFIX}${uid}`;

const saveUserCache = (uid, data) => {
    if (!uid) return;
    try {
        nativeLocalStorage.setItem(getCloudCacheKey(uid), JSON.stringify({
            updatedAt: Date.now(),
            data
        }));
    } catch (error) {
        console.warn('Falha ao salvar cache local da nuvem:', error);
    }
};

const loadUserCache = (uid) => {
    if (!uid) return null;
    try {
        const raw = nativeLocalStorage.getItem(getCloudCacheKey(uid));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.data && typeof parsed.data === 'object' ? parsed.data : null;
    } catch (error) {
        console.warn('Falha ao ler cache local da nuvem:', error);
        return null;
    }
};

const hideInitialLoader = () => {
    const loader = document.getElementById('initial-loader');
    if (!loader) return;
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 500);
};

const bootstrapBackendUI = () => {
    window.BackendInitialized = true;
    createGlobalCalculator();
    createFloatingNotes();
    createDueSoonTasksFab();
    setupAutomaticTaskReminders();
    hideInitialLoader();
};

const saveToCloud = async ({ silent = false, force = false } = {}) => {
    if (!auth.currentUser) return;
    if (!force && !hasUnsavedChanges) return;
    if (autosaveInFlight) return autosaveInFlight;

    const uid = auth.currentUser.uid;
    autosaveInFlight = (async () => {
        try {
            await setDoc(doc(db, "users", uid), memoryStore, { merge: true });
            saveUserCache(uid, memoryStore);
            initialSnapshot = getSnapshot(memoryStore);
            hasUnsavedChanges = false;
            if (!silent) playSuccessSound();
        } catch (e) {
            console.error("❌ Erro ao salvar na nuvem:", e);
            if (!silent) alert("Erro ao salvar na nuvem. Verifique sua conexão.");
        } finally {
            autosaveInFlight = null;
        }
    })();

    return autosaveInFlight;
};

const scheduleAutoSave = () => {
    if (!auth.currentUser || !hasUnsavedChanges) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
        saveToCloud({ silent: true });
    }, AUTOSAVE_DELAY_MS);
};

const checkDirtyState = () => {
    const currentSnapshot = getSnapshot(memoryStore);
    hasUnsavedChanges = currentSnapshot !== initialSnapshot;
    if (hasUnsavedChanges) scheduleAutoSave();
};

// Interceptador do localStorage (Mágica para fazer o site funcionar com a nuvem)
// IMPORTANTE: chaves internas do Firebase Auth devem continuar no localStorage nativo
// para evitar perda de sessão entre páginas (loop voltando para login).
const nativeLocalStorage = window.localStorage;
const isFirebaseStorageKey = (key) => typeof key === 'string' && (
    key.startsWith('firebase:') ||
    key.startsWith('__firebase') ||
    key.startsWith('firebaseLocalStorageDb') ||
    key.includes('firebase')
);

Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: (key) => {
            if (isFirebaseStorageKey(key)) return nativeLocalStorage.getItem(key);
            const val = memoryStore[key];
            if (val === undefined) return null;
            // Se for objeto, retorna string JSON (comportamento padrão do localStorage)
            return typeof val === 'object' ? JSON.stringify(val) : val;
        },
        setItem: (key, value) => {
            if (isFirebaseStorageKey(key)) {
                nativeLocalStorage.setItem(key, value);
                return;
            }

            const stringValue = String(value);
            // Verifica se o valor realmente mudou para evitar "falsos positivos" de alterações não salvas
            const currentValue = memoryStore[key];
            const currentString = typeof currentValue === 'object' ? JSON.stringify(currentValue) : (currentValue === undefined ? null : String(currentValue));
            
            // Se o valor for idêntico, não faz nada (não marca como não salvo)
            // Nota: localStorage sempre armazena strings. Se currentString for null (undefined), é mudança.
            if (currentString === stringValue) return;

            try {
                // Tenta salvar como objeto JSON puro para o Firestore
                memoryStore[key] = JSON.parse(stringValue);
            } catch (e) {
                // Se não for JSON, salva como string
                memoryStore[key] = stringValue;
            }
            checkDirtyState();
        },
        removeItem: (key) => {
            if (isFirebaseStorageKey(key)) {
                nativeLocalStorage.removeItem(key);
                return;
            }

            if (!(key in memoryStore)) return; // Se a chave não existe, não faz nada (evita ficar vermelho à toa)
            delete memoryStore[key];
            if (auth.currentUser) {
                // Remove o campo específico no Firestore
                updateDoc(doc(db, "users", auth.currentUser.uid), {
                    [key]: deleteField()
                }).catch(err => console.error("Erro ao deletar campo:", err));
            }
            checkDirtyState();
        },
        clear: () => {
            memoryStore = {};
            checkDirtyState();
            // Não limpa o storage nativo para preservar sessão Firebase
        },
        key: (index) => {
            const keys = Object.keys(memoryStore);
            return keys[index] || null;
        },
        get length() {
            return Object.keys(memoryStore).length;
        }
    },
    writable: true
});

// --- AUTENTICAÇÃO E CARREGAMENTO INICIAL ---

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Se estivermos na página de login, redireciona para index
        if (window.location.pathname.endsWith('login.html')) {
            window.location.href = 'index.html';
            return;
        }

        // O loader agora já existe no HTML (id="initial-loader") para aparecer instantaneamente.
        // Não precisamos criá-lo aqui, apenas garantir que ele não seja removido antes da hora.

        const cachedData = loadUserCache(user.uid);
        if (cachedData) {
            memoryStore = cachedData;
            initialSnapshot = getSnapshot(memoryStore);
            hasUnsavedChanges = false;
            bootstrapBackendUI();
        }

        try {
            // Baixa TUDO do Firestore de uma vez
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                memoryStore = docSnap.data();
                console.log("✅ Dados carregados da nuvem.");
            } else {
                memoryStore = {};
                console.log("ℹ️ Novo usuário ou sem dados.");
            }
            saveUserCache(user.uid, memoryStore);
            
            // Define o ponto de partida (estado limpo)
            initialSnapshot = getSnapshot(memoryStore);
            hasUnsavedChanges = false;
            bootstrapBackendUI();

        } catch (error) {
            console.error("Erro crítico ao carregar dados:", error);
            alert("Erro de conexão. Tente recarregar a página.");
        }
    } else {
        // Não logado
        window.BackendInitialized = false;
        memoryStore = {};
        clearTimeout(autosaveTimer);
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Expõe funções de auth globalmente para uso nos botões
window.firebaseAuth = {
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    loginWithGoogle: async () => {
        try {
            return await signInWithPopup(auth, googleProvider);
        } catch (error) {
            const fallbackCodes = new Set([
                'auth/popup-blocked',
                'auth/cancelled-popup-request',
                'auth/popup-closed-by-user'
            ]);
            if (fallbackCodes.has(error?.code)) {
                return signInWithRedirect(auth, googleProvider);
            }
            throw error;
        }
    },
    logout: () => signOut(auth),
    currentUser: () => auth.currentUser,

};
