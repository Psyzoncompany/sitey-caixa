// cloud-sync.js (HTML/JS puro - Vercel) ✅
// Sincroniza localStorage <-> Firestore para PC e celular verem os mesmos dados.

window.cloudSync = (() => {
  let config = null;
  let email = null;
  let pass = null;

  // Onde salvar no Firestore
  const COL = "psyzon";
  const DOC = "dashboard";

  // Chaves que você já usa no localStorage (pelo seu script.js)
  const SYNC_KEYS = [
    "transactions",
    "clients",
    "production_orders",
    "monthlyProduction",
    "incomeCategories",
    "expenseCategories",
    "businessSpendingLimit",
    "personalSpendingLimit",
  ];

  let dirty = false;
  let timer = null;

  function markDirty() {
    dirty = true;
    if (timer) return;
    timer = setTimeout(async () => {
      timer = null;
      if (!dirty) return;
      dirty = false;
      await push();
    }, 1200);
  }

  async function ensureFirebaseLoaded() {
    if (!window.firebase) throw new Error("Firebase CDN não carregou.");
    if (!firebase.apps.length) firebase.initializeApp(config);
  }

  async function ensureAuth() {
    await ensureFirebaseLoaded();
    const auth = firebase.auth();
    if (auth.currentUser) return;

    // Login silencioso (pra sincronizar)
    await auth.signInWithEmailAndPassword(email, pass);
  }

  function getLocalPayload() {
    const data = {};
    SYNC_KEYS.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v !== null) data[k] = v; // guarda como string (já vem JSON string)
    });
    data.updatedAt = Date.now();
    return data;
  }

  async function pull() {
    try {
      await ensureAuth();
      const db = firebase.firestore();
      const ref = db.collection(COL).doc(DOC);
      const snap = await ref.get();
      if (!snap.exists) return;

      const cloud = snap.data() || {};
      const cloudUpdated = cloud.updatedAt || 0;
      const localUpdated = Number(localStorage.getItem("cloud_last_updated") || "0");

      // Se a nuvem está mais nova, baixa pro dispositivo
      if (cloudUpdated > localUpdated) {
        SYNC_KEYS.forEach((k) => {
          if (typeof cloud[k] === "string") localStorage.setItem(k, cloud[k]);
        });
        localStorage.setItem("cloud_last_updated", String(cloudUpdated));
      }
    } catch (error) {
      console.warn("Aviso: Falha ao sincronizar com Firebase (prosseguindo sem sincronização):", error.message);
      // Mesmo se falhar, deixa o site carregar normalmente
    }
  }

  async function push() {
    try {
      await ensureAuth();
      const db = firebase.firestore();
      const ref = db.collection(COL).doc(DOC);

      const payload = getLocalPayload();
      await ref.set(payload, { merge: true });

      localStorage.setItem("cloud_last_updated", String(payload.updatedAt));
    } catch (error) {
      console.warn("Aviso: Falha ao fazer push para Firebase:", error.message);
      // Continua funcionando mesmo se falhar o push
    }
  }

  function patchLocalStorage() {
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (key, value) {
      original(key, value);
      if (SYNC_KEYS.includes(key)) markDirty();
    };
  }

  function init(firebaseConfig, authEmail, authPass) {
    config = firebaseConfig;
    email = authEmail;
    pass = authPass;
    patchLocalStorage();
  }

  return { init, pull, push };
})();

