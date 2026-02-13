// c:\Users\AAAA\Desktop\sitey-caixa\firebase-config.js

// Importa as funções do Firebase (versão compat para facilitar o uso com scripts existentes)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- CONFIGURAÇÃO DO FIREBASE ---
// 1. Vá em console.firebase.google.com
// 2. Crie um projeto
// 3. Adicione um app Web
// 4. Copie as configurações e cole abaixo:
const firebaseConfig = {
  apiKey: "AIzaSyCJVYTzakEJdJ2lODZRjVx4V7r220-iWIQ",
  authDomain: "sitey-caixa.firebaseapp.com",
  projectId: "sitey-caixa",
  storageBucket: "sitey-caixa.firebasestorage.app",
  messagingSenderId: "995209588095",
  appId: "1:995209588095:web:d7fdc0e218f7a69f08fe4a",
  measurementId: "G-F0CJN6MTFE"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Lista de chaves do localStorage que queremos sincronizar
const SYNC_KEYS = [
    'transactions',
    'clients',
    'production_orders',
    'monthlyProduction',
    'incomeCategories',
    'expenseCategories',
    'businessSpendingLimit',
    'personalSpendingLimit',
    'psyzon_notes_v3',
    'psyzon_active_note_v3'
];

// Promessa para garantir que só tentamos baixar dados depois de verificar o login
let resolveAuth;
const authReady = new Promise(resolve => resolveAuth = resolve);

// Flag para enfileirar um push se uma alteração do usuário ocorrer durante a sincronização
let pushNeededAfterSync = false;

// Som de sucesso sutil (Web Audio API)
const playSuccessSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // Nota A5
        gain.gain.setValueAtTime(0.05, ctx.currentTime); // Volume baixo (5%)
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
};

// Helper para o indicador visual de salvamento
const updateSavingIndicator = (status) => {
    let indicator = document.getElementById('saving-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'saving-indicator';
        indicator.style.cssText = "position:fixed;bottom:20px;right:20px;background:rgba(15, 23, 42, 0.9);color:#e2e8f0;padding:8px 16px;border-radius:9999px;font-size:12px;font-family:sans-serif;z-index:9999;display:flex;align-items:center;gap:8px;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.1);transition:opacity 0.5s ease;opacity:0;pointer-events:none;";
        document.body.appendChild(indicator);
        const style = document.createElement('style');
        style.innerHTML = `@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }`;
        document.head.appendChild(style);
    }

    if (status === 'saving') {
        indicator.innerHTML = '<span style="width:8px;height:8px;background:#facc15;border-radius:50%;display:inline-block;animation:pulse-dot 1s infinite;"></span> Salvando...';
        indicator.style.opacity = '1';
    } else if (status === 'saved') {
        indicator.innerHTML = '<span style="width:8px;height:8px;background:#4ade80;border-radius:50%;display:inline-block;"></span> Salvo';
        setTimeout(() => { indicator.style.opacity = '0'; }, 2000);
    } else if (status === 'error') {
        indicator.innerHTML = '<span style="width:8px;height:8px;background:#ef4444;border-radius:50%;display:inline-block;"></span> Erro ao salvar';
        indicator.style.opacity = '1';
        setTimeout(() => { indicator.style.opacity = '0'; }, 5000);
    }
};

// Objeto global de sincronização
window.cloudSync = {
    user: null,
    isSyncing: false, // Evita loop infinito (Nuver -> Local -> Nuvem)
    isInternalWrite: false, // Nova flag para identificar escritas internas do sistema
    
    // Puxa dados da nuvem para o localStorage
    pull: async function() {
        await authReady; // Espera o Firebase confirmar o usuário
        if (!this.user) return;
        console.log("☁️ Iniciando sincronização (Download)...");
        
        try {
            const docRef = doc(db, "users", this.user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                this.isSyncing = true; // Bloqueia o push enquanto salva no local
                this.isInternalWrite = true; // Marca que estamos escrevendo dados da nuvem
                try {
                    const data = docSnap.data();
                    // Atualiza localStorage com dados da nuvem
                    Object.keys(data).forEach(key => {
                        if (SYNC_KEYS.includes(key)) {
                            // Firestore guarda objetos, localStorage guarda strings
                            const value = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
                            localStorage.setItem(key, value);
                        }
                    });
                    console.log("✅ Dados sincronizados com sucesso!");
                } finally {
                    this.isSyncing = false; // Libera o push (garantido mesmo se der erro)
                    this.isInternalWrite = false; // Desmarca a flag
                    if (pushNeededAfterSync) {
                        pushNeededAfterSync = false;
                        this.schedulePush();
                    }
                }
            } else {
                console.log("ℹ️ Nenhum dado encontrado na nuvem (primeiro uso?).");
            }
        } catch (error) {
            console.error("❌ Erro ao baixar dados:", error);
            this.isSyncing = false; // Garante desbloqueio em caso de erro de rede
            this.isInternalWrite = false;
            if (pushNeededAfterSync) {
                pushNeededAfterSync = false;
                this.schedulePush();
            }
        }
    },

    // Envia dados do localStorage para a nuvem
    push: async function() {
        if (!this.user) return;
        
        if (this.isSyncing) {
            this.schedulePush(); // Tenta novamente em breve se estiver ocupado
            return;
        }
        // console.log("☁️ Enviando alterações (Upload)..."); // Comentado para não poluir console

        const dataToSave = {};
        SYNC_KEYS.forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                try {
                    // Tenta parsear JSON para salvar como objeto no Firestore
                    dataToSave[key] = JSON.parse(item);
                } catch (e) {
                    // Se não for JSON, salva como string
                    dataToSave[key] = item;
                }
            }
        });

        try {
            await setDoc(doc(db, "users", this.user.uid), dataToSave, { merge: true });
            // console.log("✅ Alterações salvas na nuvem.");
            playSuccessSound();
            updateSavingIndicator('saved');
        } catch (error) {
            console.error("❌ Erro ao salvar na nuvem:", error);
            updateSavingIndicator('error');
        }
    },

    // Debounce para evitar muitos envios seguidos
    schedulePush: function() {
        if (this.timeout) clearTimeout(this.timeout);
        updateSavingIndicator('saving');
        this.timeout = setTimeout(() => this.push(), 500); // Espera 0.5s (mais rápido no mobile)
    }
};

// --- LÓGICA DE AUTENTICAÇÃO ---

// Monitora estado do login
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário logado
        window.cloudSync.user = user;
        localStorage.setItem("logado", "sim"); // Mantém compatibilidade com scripts antigos
        
        // Ativa escuta em tempo real (Realtime Listener)
        if (window.cloudSync.unsubscribe) window.cloudSync.unsubscribe();
        
        window.cloudSync.unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            // Ignora atualizações que nós mesmos acabamos de enviar (evita loops)
            if (docSnap.metadata.hasPendingWrites) return;

            if (docSnap.exists()) {
                window.cloudSync.isSyncing = true;
                window.cloudSync.isInternalWrite = true;
                try {
                    const data = docSnap.data();
                    Object.keys(data).forEach(key => {
                        if (SYNC_KEYS.includes(key)) {
                            const value = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
                            // Só atualiza se for diferente para evitar disparar eventos desnecessários
                            if (localStorage.getItem(key) !== value) {
                                localStorage.setItem(key, value);
                            }
                        }
                    });
                } finally {
                    window.cloudSync.isSyncing = false;
                    window.cloudSync.isInternalWrite = false;
                    if (pushNeededAfterSync) {
                        pushNeededAfterSync = false;
                        window.cloudSync.schedulePush();
                    }
                }
                // console.log("🔄 Atualização em tempo real recebida!");
            }
        });

        // Se estivermos na página de login, redireciona para index
        if (window.location.pathname.endsWith('login.html')) {
            window.location.href = 'index.html';
        }
    } else {
        // Usuário deslogado
        window.cloudSync.user = null;
        if (window.cloudSync.unsubscribe) window.cloudSync.unsubscribe();
        localStorage.removeItem("logado");
        
        // Se NÃO estivermos na página de login, redireciona para login
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
        }
    }
    // Libera o pull() para rodar
    if (resolveAuth) resolveAuth();
});

// Intercepta alterações no localStorage para salvar automaticamente
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (SYNC_KEYS.includes(key)) {
        if (window.cloudSync.isInternalWrite) {
            return; // Se for escrita interna (da nuvem), ignora e não agenda push
        }
        if (window.cloudSync.isSyncing) {
            pushNeededAfterSync = true; // Marca que uma alteração precisa ser salva
        } else {
            window.cloudSync.schedulePush();
        }
    }
};

// Intercepta remoções no localStorage (ex: limpar dados)
const originalRemoveItem = localStorage.removeItem;
localStorage.removeItem = function(key) {
    originalRemoveItem.apply(this, arguments);
    if (SYNC_KEYS.includes(key)) {
        if (window.cloudSync.isInternalWrite) {
            return;
        }
        if (window.cloudSync.isSyncing) {
            pushNeededAfterSync = true; // Marca que uma alteração precisa ser salva
        } else {
            window.cloudSync.schedulePush();
        }
    }
};

// Expõe funções de auth globalmente para uso nos botões
window.firebaseAuth = {
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth)
};

// Força o salvamento imediato se o usuário minimizar o app ou trocar de aba no mobile
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        window.cloudSync.push();
    }
});
