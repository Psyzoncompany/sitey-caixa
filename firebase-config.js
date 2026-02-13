// c:\Users\AAAA\Desktop\sitey-caixa\firebase-config.js

// Importa as funções do Firebase (versão compat para facilitar o uso com scripts existentes)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Helper para o indicador visual de salvamento
const updateSavingIndicator = (status) => {
    let indicator = document.getElementById('saving-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'saving-indicator';
        // Posicionado no topo central para evitar conflito com teclado ou FABs no mobile
        indicator.style.cssText = "position:fixed;top:24px;left:50%;transform:translateX(-50%);background:rgba(15, 23, 42, 0.95);color:#e2e8f0;padding:8px 16px;border-radius:9999px;font-size:12px;font-family:sans-serif;z-index:10000;display:flex;align-items:center;gap:8px;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.1);transition:opacity 0.3s ease, transform 0.3s ease;opacity:0;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,0.3);white-space:nowrap;";
        document.body.appendChild(indicator);
        const style = document.createElement('style');
        style.innerHTML = `@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }`;
        document.head.appendChild(style);
    }

    if (status === 'saving') {
        indicator.innerHTML = '<span style="width:8px;height:8px;background:#facc15;border-radius:50%;display:inline-block;animation:pulse-dot 1s infinite;"></span> Salvando...';
        indicator.style.opacity = '1';
        indicator.style.transform = 'translateX(-50%) translateY(0)';
    } else if (status === 'saved') {
        indicator.innerHTML = '<span style="width:8px;height:8px;background:#4ade80;border-radius:50%;display:inline-block;"></span> Salvo';
        indicator.style.opacity = '1';
        setTimeout(() => { indicator.style.opacity = '0'; indicator.style.transform = 'translateX(-50%) translateY(-10px)'; }, 2000);
    } else if (status === 'error') {
        indicator.innerHTML = '<span style="width:8px;height:8px;background:#ef4444;border-radius:50%;display:inline-block;"></span> Erro ao salvar';
        indicator.style.opacity = '1';
        setTimeout(() => { indicator.style.opacity = '0'; indicator.style.transform = 'translateX(-50%) translateY(-10px)'; }, 5000);
    }
};

// --- BACKEND REAL (Memória + Firestore) ---
// Substitui o localStorage real por um armazenamento em memória conectado à nuvem
let memoryStore = {};
window.BackendInitialized = false;
let saveTimeout = null;

const saveToCloud = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    
    try {
        // Salva o estado atual da memória no Firestore
        await setDoc(doc(db, "users", uid), memoryStore, { merge: true });
        playSuccessSound();
        updateSavingIndicator('saved');
    } catch (e) {
        console.error("❌ Erro ao salvar na nuvem:", e);
        updateSavingIndicator('error');
    }
};

const scheduleSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    updateSavingIndicator('saving');
    saveTimeout = setTimeout(saveToCloud, 1000); // Espera 1 segundo após a última alteração
};

// Interceptador do localStorage (Mágica para fazer o site funcionar com a nuvem)
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: (key) => {
            const val = memoryStore[key];
            if (val === undefined) return null;
            // Se for objeto, retorna string JSON (comportamento padrão do localStorage)
            return typeof val === 'object' ? JSON.stringify(val) : val;
        },
        setItem: (key, value) => {
            try {
                // Tenta salvar como objeto JSON puro para o Firestore
                memoryStore[key] = JSON.parse(value);
            } catch (e) {
                // Se não for JSON, salva como string
                memoryStore[key] = value;
            }
            scheduleSave();
        },
        removeItem: (key) => {
            delete memoryStore[key];
            if (auth.currentUser) {
                // Remove o campo específico no Firestore
                updateDoc(doc(db, "users", auth.currentUser.uid), {
                    [key]: deleteField()
                }).catch(err => console.error("Erro ao deletar campo:", err));
            }
            scheduleSave();
        },
        clear: () => {
            memoryStore = {};
            scheduleSave();
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

        // Exibe tela de carregamento
        if (!document.getElementById('backend-loader')) {
            const loader = document.createElement('div');
            loader.id = 'backend-loader';
            loader.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:#111827;z-index:9999;display:flex;justify-content:center;align-items:center;color:white;font-family:sans-serif;flex-direction:column;gap:1rem;";
            loader.innerHTML = '<div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div><div class="text-gray-300">Carregando seus dados da nuvem...</div>';
            document.body.appendChild(loader);
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
            
            window.BackendInitialized = true;
            
            // Remove tela de carregamento
            const loader = document.getElementById('backend-loader');
            if (loader) loader.remove();

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
    logout: () => signOut(auth)
};
