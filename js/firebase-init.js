import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// =========================================================================
// CHAVES DE ACESSO DO BANCO DE DADOS (Como se fossem o login e senha do seu baú)
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyANqzrj3lzHUqMbClwcVHAVQjswjp1nUiY",
  authDomain: "sitey-caixa-16e06.firebaseapp.com",
  projectId: "sitey-caixa-16e06",
  storageBucket: "sitey-caixa-16e06.firebasestorage.app",
  messagingSenderId: "1077514189419",
  appId: "1:1077514189419:web:034755d7bf1ab27729cf2e",
  measurementId: "G-MT69LT56JH"
};

// =========================================================================
// INICIALIZAÇÃO E LIGAÇÃO COM O SERVIDOR
// =========================================================================

// "Liga o servidor" usando as chaves acima
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
// Habilita as 3 ferramentas do Firebase: Contas de Login, Banco de Dados e as Imagens na Nuvem
const auth = getAuth(app);         // Módulo de Login e Senha
const db = getFirestore(app);      // Módulo de Dados em Tempo Real (Documentos)
const storage = getStorage(app);   // Módulo do HD virtual (Imagens)

// Deixa o "firebaseConfig" disponível pro restante do site se precisar usar
if (typeof window !== "undefined") {
  window.firebasePublicConfig = firebaseConfig;
}

export { app, auth, db, storage, firebaseConfig };
