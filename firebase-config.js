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

// State for unsaved changes
let hasUnsavedChanges = false;

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
        playSuccessSound();
        hasUnsavedChanges = false;
        updateSaveButtonState();
    } catch (e) {
        console.error("❌ Erro ao salvar na nuvem:", e);
        alert("Erro ao salvar na nuvem. Verifique sua conexão.");
    }
};

const markUnsaved = () => {
    hasUnsavedChanges = true;
    updateSaveButtonState();
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
            markUnsaved();
        },
        removeItem: (key) => {
            delete memoryStore[key];
            if (auth.currentUser) {
                // Remove o campo específico no Firestore
                updateDoc(doc(db, "users", auth.currentUser.uid), {
                    [key]: deleteField()
                }).catch(err => console.error("Erro ao deletar campo:", err));
            }
            markUnsaved();
        },
        clear: () => {
            memoryStore = {};
            markUnsaved();
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
            loader.innerHTML = `
                <style>
                    @keyframes pulse-logo { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
                </style>
                <img src="img/logo.png" alt="Logo" style="width: 100px; height: auto; animation: pulse-logo 2s infinite ease-in-out;">
                <div class="text-gray-300 mt-4 font-medium">Carregando...</div>
            `;
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
            createFloatingSaveButton();
            
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
