// c:\Users\AAAA\Desktop\sitey-caixa\firebase-config.js

// Importa as funções do Firebase (versão compat para facilitar o uso com scripts existentes)
import { onAuthStateChanged, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const sanitizeOrderForClient = (order) => {
    const oid = String(order?.id || '');
    const versions = Array.isArray(order?.artControl?.versions) ? order.artControl.versions : [];
    const normalizedVersions = versions.map((ver, idx) => ({
        id: ver?.id || `v_${oid}_${idx + 1}`,
        versionNumber: ver?.versionNumber || ver?.version || idx + 1,
        previewUrl: ver?.previewUrl || (Array.isArray(ver?.images) ? ver.images[0] : '') || '',
        status: ver?.status || 'draft',
        createdAt: ver?.createdAt || Date.now()
    }));
    const activeVersionId = order?.art?.activeVersionId;
    const activeVersion = normalizedVersions.find((v) => v.id === activeVersionId) || normalizedVersions[normalizedVersions.length - 1] || null;

    return {
        oid,
        title: order?.description || `Pedido #${oid}`,
        customer: order?.clientName || order?.customerName || '',
        deadline: order?.deadline || null,
        status: order?.art?.status || 'pending',
        activeVersion: activeVersion || null,
        versions: normalizedVersions,
        updatedAt: serverTimestamp()
    };
};

const upsertOrderClientBridge = async (order, token) => {
    const oid = String(order?.id || '');
    if (!oid || !token) return null;

    await setDoc(doc(db, 'order_clients', token), {
        oid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    }, { merge: true });

    await setDoc(doc(db, 'orders_public', oid), sanitizeOrderForClient(order), { merge: true });
    return { oid, token };
};

const appendClientFeedbackByToken = async (token, payload = {}) => {
    if (!token) throw new Error('Token obrigatório');
    const bridgeRef = doc(db, 'order_clients', token);
    const bridgeSnap = await getDoc(bridgeRef);
    if (!bridgeSnap.exists()) throw new Error('Token inválido');
    const data = bridgeSnap.data() || {};
    const oid = String(data.oid || '');
    if (!oid) throw new Error('OID não encontrado no token');

    await setDoc(doc(db, 'order_feedback', token), {
        token,
        oid,
        lastEventAt: serverTimestamp(),
        lastEventType: payload?.type || 'feedback'
    }, { merge: true });

    await addDoc(collection(db, 'order_feedback', token, 'items'), {
        token,
        oid,
        createdAt: serverTimestamp(),
        ...payload
    });

    return { oid };
};
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
    upsertOrderClientBridge,
    appendClientFeedbackByToken
};
