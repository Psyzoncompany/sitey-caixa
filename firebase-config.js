// c:\Users\AAAA\Desktop\sitey-caixa\firebase-config.js

// Importa as funções do Firebase (versão compat para facilitar o uso com scripts existentes)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Objeto global de sincronização
window.cloudSync = {
    user: null,
    
    // Puxa dados da nuvem para o localStorage
    pull: async function() {
        if (!this.user) return;
        console.log("☁️ Iniciando sincronização (Download)...");
        
        try {
            const docRef = doc(db, "users", this.user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
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
            } else {
                console.log("ℹ️ Nenhum dado encontrado na nuvem (primeiro uso?).");
            }
        } catch (error) {
            console.error("❌ Erro ao baixar dados:", error);
        }
    },

    // Envia dados do localStorage para a nuvem
    push: async function() {
        if (!this.user) return;
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
        } catch (error) {
            console.error("❌ Erro ao salvar na nuvem:", error);
        }
    },

    // Debounce para evitar muitos envios seguidos
    schedulePush: function() {
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.push(), 2000); // Espera 2s após a última alteração
    }
};

// --- LÓGICA DE AUTENTICAÇÃO ---

// Monitora estado do login
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário logado
        window.cloudSync.user = user;
        localStorage.setItem("logado", "sim"); // Mantém compatibilidade com scripts antigos
        
        // Se estivermos na página de login, redireciona para index
        if (window.location.pathname.endsWith('login.html')) {
            window.location.href = 'index.html';
        }
    } else {
        // Usuário deslogado
        window.cloudSync.user = null;
        localStorage.removeItem("logado");
        
        // Se NÃO estivermos na página de login, redireciona para login
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Intercepta alterações no localStorage para salvar automaticamente
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (SYNC_KEYS.includes(key)) {
        window.cloudSync.schedulePush();
    }
};

// Expõe funções de auth globalmente para uso nos botões
window.firebaseAuth = {
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth)
};
