import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// =========================================================================
// CHAVES DE ACESSO DO BANCO DE DADOS (Como se fossem o login e senha do seu baú)
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCJVYTzakEJdJ2lODZRjVx4V7r220-iWIQ",
  authDomain: "sitey-caixa.firebaseapp.com",
  projectId: "sitey-caixa",
  storageBucket: "sitey-caixa.firebasestorage.app",
  messagingSenderId: "995209588095",
  appId: "1:995209588095:web:d7fdc0e218f7a69f08fe4a",
  measurementId: "G-F0CJN6MTFE"
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
