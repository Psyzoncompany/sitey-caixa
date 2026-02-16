import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCJVYTzakEJdJ2lODZRjVx4V7r220-iWIQ",
  authDomain: "sitey-caixa.firebaseapp.com",
  projectId: "sitey-caixa",
  storageBucket: "sitey-caixa.firebasestorage.app",
  messagingSenderId: "995209588095",
  appId: "1:995209588095:web:d7fdc0e218f7a69f08fe4a",
  measurementId: "G-F0CJN6MTFE"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const qs = new URLSearchParams(window.location.search);
const id4 = (qs.get('id') || '').trim();
const ridLegacy = (qs.get('rid') || '').trim();
const requestId = id4 || ridLegacy;
const MAX_FILES = 6;
const MAX_SIZE = 5 * 1024 * 1024;

const el = (id) => document.getElementById(id);
const accessCard = el('arto-access-card');
const accessTitle = el('arto-access-title');
const accessFeedback = el('arto-access-feedback');
const portalCard = el('arto-portal-card');
const filesInput = el('arto-files');
const filesPreview = el('arto-files-preview');
const form = el('arto-form');
const submitBtn = el('arto-submit');

let requestData = null;
let localSubmitLockedUntil = 0;

function money(v = 0) { return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`; }
function setFeedback(text, type = 'info', target = accessFeedback) {
  target.textContent = text;
  target.style.color = type === 'error' ? '#fca5a5' : type === 'ok' ? '#86efac' : '#93c5fd';
}

function normalizeVersionNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

if (!requestId) {
  accessTitle.textContent = 'Link inválido';
  setFeedback('Use o link completo com ?id=1234.', 'error');
}

async function loadRequest() {
  const snap = await getDoc(doc(db, 'artRequests', requestId));
  if (!snap.exists()) throw new Error('Link inválido: pedido não encontrado.');
  requestData = { id: snap.id, ...snap.data() };
  renderStats();
}

function renderStats() {
  const used = Number(requestData.changesUsed || 0);
  const freeMax = Number(requestData.freeChangesMax || 2);
  const freeLeft = Math.max(0, freeMax - used);
  el('arto-request-title').textContent = `Pedido #${requestData.id4 || requestData.id}`;
  el('arto-stats').innerHTML = `
    <div class="arto-stat"><span>Alterações grátis restantes</span><b>${freeLeft}</b></div>
    <div class="arto-stat"><span>Taxa adicional</span><b>${money(requestData.extraCostPerChange || 10)}</b></div>
    <div class="arto-stat"><span>Total devido</span><b>${money(requestData.totalDue || 0)}</b></div>
    <div class="arto-stat"><span>Status</span><b>${requestData.status || '—'}</b></div>
  `;
}

function showPortal() {
  accessCard.classList.add('arto-hidden');
  portalCard.classList.remove('arto-hidden');
  subscribeRequest();
  subscribeHistory();
}

el('arto-logout')?.addEventListener('click', () => window.location.reload());

filesInput?.addEventListener('change', () => {
  const selected = Array.from(filesInput.files || []);
  const valid = selected.filter((f) => /image\/(jpeg|png|webp)/.test(f.type) && f.size <= MAX_SIZE).slice(0, MAX_FILES);
  filesPreview.innerHTML = valid.map((file) => `<div class="arto-stat"><b>${file.name}</b><span>${(file.size / 1024 / 1024).toFixed(1)} MB</span></div>`).join('');
  if (valid.length !== selected.length) {
    setFeedback('Alguns arquivos foram ignorados (tipo, tamanho > 5MB ou limite de 6).', 'error', el('arto-submit-feedback'));
  }
});

function updateUploadProgress(percent) {
  const bar = el('arto-progress-bar');
  const label = el('arto-progress-label');
  if (!bar || !label) return;
  bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  label.textContent = `${Math.round(percent)}%`;
}

async function uploadImages(versionId, files) {
  if (!files.length) {
    updateUploadProgress(100);
    return [];
  }

  let uploadedBytes = 0;
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  updateUploadProgress(0);

  const uploads = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `artRequests/${requestId}/versions/${versionId}/img_${index + 1}.${ext}`;
    const storageRef = ref(storage, path);

    await new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file);
      task.on('state_changed', (snapshot) => {
        const currentFileProgress = snapshot.bytesTransferred;
        const percent = ((uploadedBytes + currentFileProgress) / totalBytes) * 100;
        updateUploadProgress(percent);
      }, reject, async () => {
        uploadedBytes += file.size;
        const url = await getDownloadURL(task.snapshot.ref);
        uploads.push({ url, path, name: file.name, size: file.size });
        resolve();
      });
    });
  }

  updateUploadProgress(100);
  return uploads;
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const now = Date.now();
  if (now < localSubmitLockedUntil) {
    setFeedback('Aguarde alguns segundos antes de enviar novamente.', 'error', el('arto-submit-feedback'));
    return;
  }

  const text = el('arto-text').value.trim();
  const files = Array.from(filesInput.files || []).filter((f) => /image\/(jpeg|png|webp)/.test(f.type) && f.size <= MAX_SIZE).slice(0, MAX_FILES);
  if (!text && !files.length) {
    setFeedback('Envie ao menos texto ou imagem.', 'error', el('arto-submit-feedback'));
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';
  localSubmitLockedUntil = now + 5000;
  setFeedback('Subindo arquivos...', 'info', el('arto-submit-feedback'));

  try {
    const versionRef = doc(collection(db, 'artRequests', requestId, 'versions'));
    const images = await uploadImages(versionRef.id, files);

    await runTransaction(db, async (tx) => {
      const requestRef = doc(db, 'artRequests', requestId);
      const reqSnap = await tx.get(requestRef);
      if (!reqSnap.exists()) throw new Error('Solicitação não encontrada');
      const req = reqSnap.data();

      const lastSubmitAt = req.lastSubmitAt?.toMillis ? req.lastSubmitAt.toMillis() : new Date(req.lastSubmitAt || 0).getTime();
      if (Number.isFinite(lastSubmitAt) && lastSubmitAt > 0 && (Date.now() - lastSubmitAt) < 5000) {
        throw new Error('Envio duplicado detectado. Aguarde 5 segundos.');
      }

      const newChangesUsed = Number(req.changesUsed || 0) + 1;
      const freeMax = Number(req.freeChangesMax || 2);
      const extraCost = Number(req.extraCostPerChange || 10);
      const isFree = newChangesUsed <= freeMax;
      const cost = isFree ? 0 : extraCost;
      const totalDue = Math.max(0, (newChangesUsed - freeMax) * extraCost);
      const paymentStatus = totalDue > 0 ? (req.paymentStatus === 'pago' ? 'pago' : 'pendente') : 'nao_aplica';

      const rawLastVersion = req.lastVersionNumber || 0;
      const lastVersion = normalizeVersionNumber(rawLastVersion, 0);
      const versionNumber = Number((lastVersion + 1).toFixed(1));

      tx.set(versionRef, {
        versionNumber,
        createdAt: serverTimestamp(),
        clientText: text,
        source: 'client',
        isFree,
        cost,
        paymentStatus: isFree ? 'nao_aplica' : 'pendente',
        images
      });

      tx.update(requestRef, {
        changesUsed: newChangesUsed,
        totalDue,
        paymentStatus,
        lastClientMessage: text,
        lastVersionNumber: versionNumber,
        lastSubmitAt: serverTimestamp(),
        status: 'Cliente enviou',
        needsDesignerAction: true,
        updatedAt: serverTimestamp()
      });
    });

    el('arto-text').value = '';
    filesInput.value = '';
    filesPreview.innerHTML = '';
    updateUploadProgress(0);
    setFeedback('Alteração enviada com sucesso! ✅', 'ok', el('arto-submit-feedback'));
  } catch (err) {
    console.error(err);
    setFeedback(err?.message || 'Falha no envio. Tente novamente.', 'error', el('arto-submit-feedback'));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'ENVIAR ALTERAÇÃO';
  }
});

function subscribeRequest() {
  onSnapshot(doc(db, 'artRequests', requestId), (snap) => {
    if (!snap.exists()) {
      accessTitle.textContent = 'Link inválido';
      setFeedback('Pedido removido ou inexistente.', 'error');
      portalCard.classList.add('arto-hidden');
      accessCard.classList.remove('arto-hidden');
      return;
    }
    requestData = { id: snap.id, ...snap.data() };
    renderStats();
  });
}

function subscribeHistory() {
  const q = query(collection(db, 'artRequests', requestId, 'versions'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .filter((v) => (v.source || (v.fromClient ? 'client' : 'internal')) === 'client');

    const html = rows.map((v) => {
      const created = v.createdAt?.toDate ? v.createdAt.toDate().toLocaleString('pt-BR') : 'agora';
      const images = v.images || v.uploads || v.files || [];
      return `
        <article class="arto-history-item">
          <div class="arto-header"><strong>Versão v${v.versionNumber}</strong><span>${v.isFree ? 'Grátis' : `Pago (${money(v.cost)})`}</span></div>
          <p class="arto-muted">${created} · ${v.paymentStatus || 'nao_aplica'}</p>
          <p>${v.clientText || v.text || v.message || 'Sem descrição.'}</p>
          <div class="arto-thumb-grid">${images.map((img) => {
            const url = img.url || img.downloadURL || img;
            return `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="Imagem enviada" /></a>`;
          }).join('')}</div>
        </article>
      `;
    }).join('');
    el('arto-history').innerHTML = html || '<p class="arto-muted">Nenhuma versão enviada ainda.</p>';
  });
}

(async function bootstrap() {
  if (!requestId) return;
  try {
    await loadRequest();
    setFeedback('Link validado. Carregando pedido...', 'ok');
    showPortal();
  } catch (err) {
    accessTitle.textContent = 'Link inválido';
    setFeedback(err?.message || 'Não foi possível abrir o pedido.', 'error');
  }
})();
