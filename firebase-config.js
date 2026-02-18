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

// State for unsaved changes
let hasUnsavedChanges = false;
let initialSnapshot = "{}"; // Armazena o estado inicial para comparação

// Chaves de UI/estado temporário que NÃO devem marcar o botão como "não salvo"
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

// Floating Save Button Logic
const createFloatingSaveButton = () => {
    if (document.getElementById('floating-save-btn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'floating-save-btn';
    // Classes iniciais (estilos movidos para style.css para responsividade)
    btn.className = 'saved';
    // Estilos base que não mudam com media queries podem ficar aqui ou no CSS
    btn.style.cssText = "position:fixed; z-index:10000; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); border:none; color:white; box-shadow:0 4px 14px rgba(0,0,0,0.4); bottom:24px; right:24px; width:64px; height:64px; border-radius:50%; background:#3b82f6;";
    // Ícone de disquete (Save)
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
    btn.title = "Salvar Alterações";
    
    btn.onclick = async () => {
        if (!hasUnsavedChanges) return;
        
        // Feedback visual de carregamento (spinner)
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`;
        btn.style.pointerEvents = 'none'; // Evita cliques duplos

        await saveToCloud();
        
        // Restaura ícone
        btn.innerHTML = originalContent;
        btn.style.pointerEvents = 'auto';
    };

    document.body.appendChild(btn);
    
    // Garante que o botão nasça com o estado correto (Vermelho se já houver alterações)
    updateSaveButtonState();
};

const updateSaveButtonState = () => {
    const btn = document.getElementById('floating-save-btn');
    if (!btn) return;

    if (hasUnsavedChanges) {
        btn.classList.remove('saved');
        btn.classList.add('unsaved');
        btn.style.background = "#ef4444"; // Vermelho (Alterado)
        // Transform removido daqui para ser controlado pelo CSS no mobile
        btn.style.boxShadow = "0 0 15px rgba(239, 68, 68, 0.6)";
    } else {
        btn.classList.remove('unsaved');
        btn.classList.add('saved');
        btn.style.background = "#3b82f6"; // Azul (Salvo)
        // Transform removido daqui
        btn.style.boxShadow = "0 4px 14px rgba(0,0,0,0.4)";
    }
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

// Aviso ao sair da página
window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Modal Personalizado para Alterações Não Salvas
const showUnsavedModal = (onSave, onDiscard) => {
    if (document.getElementById('unsaved-changes-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'unsaved-changes-modal';
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;";
    
    modal.innerHTML = `
        <div style="background:#1f2937;border:1px solid rgba(255,255,255,0.1);padding:1.5rem;border-radius:0.75rem;width:100%;max-width:24rem;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);color:white;font-family:sans-serif;">
            <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;">Alterações não salvas</h3>
            <p style="color:#d1d5db;margin-bottom:1.5rem;">Você tem alterações pendentes. O que deseja fazer?</p>
            <div style="display:flex;justify-content:flex-end;gap:0.75rem;">
                <button id="unsaved-discard-btn" style="padding:0.5rem 1rem;border-radius:0.5rem;background:rgba(239,68,68,0.2);color:#fca5a5;border:none;cursor:pointer;font-weight:600;transition:background 0.2s;">NÃO SALVAR</button>
                <button id="unsaved-save-btn" style="padding:0.5rem 1rem;border-radius:0.5rem;background:#0891b2;color:white;border:none;cursor:pointer;font-weight:600;transition:background 0.2s;">SALVAR</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('unsaved-save-btn').onclick = () => {
        modal.remove();
        onSave();
    };
    document.getElementById('unsaved-discard-btn').onclick = () => {
        modal.remove();
        onDiscard();
    };
};

// Intercepta cliques em links para avisar sobre alterações não salvas
document.addEventListener('click', async (e) => {
    const link = e.target.closest('a');
    
    // Trava de segurança: Só avisa se o botão estiver visualmente marcado como "não salvo" (vermelho)
    const saveBtn = document.getElementById('floating-save-btn');
    const isVisuallyUnsaved = saveBtn && saveBtn.classList.contains('unsaved');

    // Verifica se é um link de navegação interna válido
    if (link && hasUnsavedChanges && isVisuallyUnsaved && link.href && !link.target && !link.href.includes('#') && !link.getAttribute('download')) {
        if (link.hostname === window.location.hostname) {
            e.preventDefault();
            
            showUnsavedModal(
                async () => { // Ação SALVAR
                    await saveToCloud();
                    window.location.href = link.href;
                },
                () => { // Ação NÃO SALVAR
                    hasUnsavedChanges = false; // Evita que o beforeunload dispare
                    updateSaveButtonState();
                    window.location.href = link.href;
                }
            );
        }
    }
});

// --- BACKEND REAL (Memória + Firestore) ---
// Substitui o localStorage real por um armazenamento em memória conectado à nuvem
let memoryStore = {};
window.BackendInitialized = false;

const saveToCloud = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    
    try {
        // Salva o estado atual da memória no Firestore
        await setDoc(doc(db, "users", uid), memoryStore, { merge: true });
        
        // Atualiza o snapshot inicial para refletir o novo estado salvo
        initialSnapshot = getSnapshot(memoryStore);
        hasUnsavedChanges = false;
        updateSaveButtonState();
        playSuccessSound();
    } catch (e) {
        console.error("❌ Erro ao salvar na nuvem:", e);
        alert("Erro ao salvar na nuvem. Verifique sua conexão.");
    }
};

const checkDirtyState = () => {
    const currentSnapshot = getSnapshot(memoryStore);
    // O botão fica vermelho APENAS se o estado atual for diferente do inicial
    hasUnsavedChanges = currentSnapshot !== initialSnapshot;
    updateSaveButtonState();
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
            
            // Define o ponto de partida (estado limpo)
            initialSnapshot = getSnapshot(memoryStore);
            hasUnsavedChanges = false;
            
            window.BackendInitialized = true;
            createFloatingSaveButton();
            createGlobalCalculator();
            createDueSoonTasksFab();
            setupAutomaticTaskReminders();
            
            // Remove tela de carregamento
            const loader = document.getElementById('initial-loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => loader.remove(), 500);
            }

        } catch (error) {
            console.error("Erro crítico ao carregar dados:", error);
            alert("Erro de conexão. Tente recarregar a página.");
        }
    } else {
        // Não logado
        window.BackendInitialized = false;
        memoryStore = {};
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
