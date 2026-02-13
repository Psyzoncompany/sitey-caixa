// cloud-sync.js (Firebase compat v9)
// Sincroniza um "snapshot" do localStorage no Firestore por usuário logado.

window.cloudSync = (function () {
  let app, auth, db;
  let email = null;
  let password = null;

  // Onde vamos guardar o snapshot do localStorage no Firestore:
  // users/{uid}/state/localStorage
  const docPath = (uid) => `users/${uid}/state/localStorage`;

  // Debounce para evitar spam de escrita
  let pushTimer = null;

  function init(firebaseConfig, _email, _password) {
    if (!window.firebase) throw new Error("Firebase SDK não carregou.");

    // Evita inicializar duas vezes
    if (!firebase.apps || firebase.apps.length === 0) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.app();
    }

    auth = firebase.auth();
    db = firebase.firestore();

    email = _email;
    password = _password;

    // Mantém sessão no dispositivo
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
  }

  async function ensureAuth() {
    if (!auth) throw new Error("cloudSync.init() não foi chamado.");

    const user = auth.currentUser;
    if (user) return user;

    if (!email || !password) {
      throw new Error("Credenciais não definidas (email/senha).");
    }

    const cred = await auth.signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  function _readLocalStorageSnapshot() {
    const snapshot = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      snapshot[k] = localStorage.getItem(k);
    }
    return snapshot;
  }

  function _applyLocalStorageSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return;

    // Limpa e aplica (mantém simples: reproduz o mesmo estado em todos dispositivos)
    localStorage.clear();
    Object.keys(snapshot).forEach((k) => {
      if (snapshot[k] !== null && snapshot[k] !== undefined) {
        localStorage.setItem(k, String(snapshot[k]));
      }
    });
  }

  async function pull() {
    const user = await ensureAuth();
    const ref = db.doc(docPath(user.uid));
    const snap = await ref.get();

    if (!snap.exists) {
      // Se ainda não existe nada na nuvem, cria o primeiro snapshot com o estado atual
      await ref.set(
        {
          localStorage: _readLocalStorageSnapshot(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    const data = snap.data() || {};
    _applyLocalStorageSnapshot(data.localStorage);
  }

  async function push() {
    const user = await ensureAuth();
    const ref = db.doc(docPath(user.uid));

    await ref.set(
      {
        localStorage: _readLocalStorageSnapshot(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  function schedulePush(delayMs = 800) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      push().catch((e) => console.warn("cloudSync.push falhou:", e));
    }, delayMs);
  }

  // Hook: toda vez que seu script mexer no localStorage, a nuvem atualiza (com debounce)
  function hookLocalStorage() {
    const _setItem = localStorage.setItem.bind(localStorage);
    const _removeItem = localStorage.removeItem.bind(localStorage);
    const _clear = localStorage.clear.bind(localStorage);

    localStorage.setItem = function (k, v) {
      _setItem(k, v);
      schedulePush();
    };

    localStorage.removeItem = function (k) {
      _removeItem(k);
      schedulePush();
    };

    localStorage.clear = function () {
      _clear();
      schedulePush();
    };

    // Se fechar a aba, tenta salvar rápido
    window.addEventListener("beforeunload", () => {
      // dispara sem debounce
      push().catch(() => {});
    });
  }

  async function signOut() {
    if (!auth) return;
    await auth.signOut();
  }

  return {
    init,
    pull,
    push,
    hookLocalStorage,
    signOut,
  };
})();
