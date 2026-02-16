import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  limit,
  where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const statusOptions = [
  'Aguardando envio do cliente',
  'Cliente enviou',
  'Em produção',
  'Aguardando aprovação',
  'Finalizado'
];

const state = { requests: [], unsub: null, initialized: false };
const $ = (id) => document.getElementById(id);

function money(v = 0) { return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`; }
function dateFmt(v) {
  if (!v) return '—';
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR');
}

async function generateUniqueCode() {
  for (let i = 0; i < 8; i += 1) {
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const q = query(collection(db, 'artRequests'), where('code', '==', code), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return code;
  }
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

async function createRequest() {
  const btn = $('artx-create-request-btn');
  if (btn) btn.disabled = true;
  try {
    const code = await generateUniqueCode();
    const ref = doc(collection(db, 'artRequests'));
    await setDoc(ref, {
      code,
      status: 'Aguardando envio do cliente',
      freeChangesMax: 2,
      changesUsed: 0,
      extraCostPerChange: 10,
      totalDue: 0,
      paymentStatus: 'nao_aplica',
      lastClientMessage: '',
      lastVersionNumber: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const link = `${window.location.origin}/Arte-Online.html?rid=${ref.id}`;
    await navigator.clipboard.writeText(`${link}\nCódigo: ${code}`);
    alert(`Solicitação criada!\n\nLink: ${link}\nCódigo: ${code}\n\nCopiado para a área de transferência.`);
  } catch (e) {
    console.error(e);
    alert('Não foi possível criar solicitação agora.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function filteredRequests() {
  const search = ($('artx-search-input')?.value || '').trim().toLowerCase();
  const status = $('artx-status-filter')?.value || 'all';
  return state.requests.filter((item) => {
    const hitStatus = status === 'all' || item.status === status;
    const hitSearch = !search
      || item.id.toLowerCase().includes(search)
      || String(item.code || '').includes(search);
    return hitStatus && hitSearch;
  });
}

function versionBadge(req) {
  const used = Number(req.changesUsed || 0);
  if (used <= 2) return `${used}/2 grátis`;
  return `${used} (${money((used - 2) * 10)})`;
}

function renderCards() {
  const container = $('art-tasks-container');
  if (!container) return;
  const rows = filteredRequests();
  if (!rows.length) {
    container.innerHTML = '<div class="glass-card p-6 text-center text-gray-300">Nenhuma solicitação encontrada.</div>';
    return;
  }

  container.innerHTML = rows.map((req) => {
    const shortId = req.id.slice(0, 8).toUpperCase();
    const link = `${window.location.origin}/Arte-Online.html?rid=${req.id}`;
    const paidToggle = Number(req.totalDue || 0) > 0 ? `
      <button class="artx-btn" data-action="toggle-payment" data-id="${req.id}">${req.paymentStatus === 'pago' ? 'Marcar Pendente' : 'Marcar como Pago'}</button>
    ` : '';

    return `
      <article class="glass-card artx-card p-4" data-id="${req.id}">
        <div class="artx-row">
          <h4>#${shortId}</h4>
          <span class="artx-badge">${req.status || '—'}</span>
        </div>
        <p class="artx-meta">Código: <strong>${req.code || '—'}</strong></p>
        <p class="artx-meta">Alterações: <strong>${versionBadge(req)}</strong></p>
        <p class="artx-meta">Total devido: <strong>${money(req.totalDue)}</strong> · ${req.paymentStatus || 'nao_aplica'}</p>
        <p class="artx-meta">Última msg: ${req.lastClientMessage || 'Sem mensagem'}</p>
        <p class="artx-meta">Atualizado: ${dateFmt(req.updatedAt)}</p>

        <div class="artx-actions">
          <button class="artx-btn" data-action="copy-link" data-link="${link}">Copiar Link</button>
          <button class="artx-btn" data-action="copy-code" data-code="${req.code || ''}">Copiar Código</button>
          <a class="artx-btn" href="${link}" target="_blank" rel="noopener">Abrir Portal</a>
          <button class="artx-btn" data-action="history" data-id="${req.id}">Ver Histórico</button>
          ${paidToggle}
        </div>
        <div class="artx-row mt-2">
          <label class="text-xs text-gray-300">Status</label>
          <select class="artx-input artx-status-select" data-action="status" data-id="${req.id}">
            ${statusOptions.map((s) => `<option ${s === req.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </article>
    `;
  }).join('');
}

async function openHistory(rid) {
  const modal = document.createElement('div');
  modal.className = 'artx-modal';
  modal.innerHTML = '<div class="artx-modal-card glass-card p-4"><p class="text-sm text-gray-300">Carregando histórico...</p></div>';
  document.body.appendChild(modal);

  try {
    const versionsRef = query(collection(db, 'artRequests', rid, 'versions'), orderBy('versionNumber', 'desc'));
    const snap = await getDocs(versionsRef);
    const items = snap.docs.map((d) => d.data());

    modal.innerHTML = `
      <div class="artx-modal-card glass-card p-4">
        <div class="artx-row mb-3"><h3>Histórico de Versões</h3><button class="artx-btn" data-close="1">Fechar</button></div>
        <div class="space-y-3 max-h-[70vh] overflow-y-auto">
          ${items.length ? items.map((v) => `
            <div class="p-3 rounded-xl bg-white/5 border border-white/10">
              <div class="artx-row"><strong>v${v.versionNumber}</strong><span class="artx-badge">${v.isFree ? 'Grátis' : `Pago (${money(v.cost)})`}</span></div>
              <p class="text-xs text-gray-400">${dateFmt(v.createdAt)} · pagamento: ${v.paymentStatus || 'nao_aplica'}</p>
              <p class="text-sm mt-2">${v.clientText || 'Sem texto'}</p>
              <div class="artx-thumb-grid mt-2">${(v.images || []).map((img) => `<a href="${img.url}" target="_blank" rel="noopener"><img src="${img.url}" alt="upload cliente"/></a>`).join('')}</div>
            </div>
          `).join('') : '<p class="text-sm text-gray-400">Sem versões ainda.</p>'}
        </div>
      </div>`;
  } catch (e) {
    modal.innerHTML = '<div class="artx-modal-card glass-card p-4">Erro ao carregar histórico.</div>';
  }

  modal.addEventListener('click', (ev) => {
    if (ev.target === modal || ev.target.dataset.close) modal.remove();
  });
}

async function handleAction(target) {
  const action = target.dataset.action;
  if (!action) return;

  if (action === 'copy-link') {
    await navigator.clipboard.writeText(target.dataset.link || '');
    target.textContent = 'Link copiado';
    setTimeout(() => { target.textContent = 'Copiar Link'; }, 1200);
    return;
  }
  if (action === 'copy-code') {
    await navigator.clipboard.writeText(target.dataset.code || '');
    target.textContent = 'Código copiado';
    setTimeout(() => { target.textContent = 'Copiar Código'; }, 1200);
    return;
  }
  if (action === 'history') {
    openHistory(target.dataset.id);
    return;
  }
  if (action === 'toggle-payment') {
    const reqRef = doc(db, 'artRequests', target.dataset.id);
    const current = state.requests.find((r) => r.id === target.dataset.id);
    const next = current?.paymentStatus === 'pago' ? 'pendente' : 'pago';
    await updateDoc(reqRef, { paymentStatus: next, updatedAt: serverTimestamp() });
  }
}

async function handleStatusChange(target) {
  if (!target.classList.contains('artx-status-select')) return;
  await updateDoc(doc(db, 'artRequests', target.dataset.id), {
    status: target.value,
    updatedAt: serverTimestamp()
  });
}

function subscribeRealtime() {
  if (state.unsub) state.unsub();
  const q = query(collection(db, 'artRequests'), orderBy('updatedAt', 'desc'));
  state.unsub = onSnapshot(q, (snap) => {
    state.requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderCards();
  });
}

function setup() {
  if (state.initialized) return;
  if (!$('art-tasks-container')) return;

  state.initialized = true;
  $('artx-create-request-btn')?.addEventListener('click', createRequest);
  $('artx-search-input')?.addEventListener('input', renderCards);
  $('artx-status-filter')?.addEventListener('change', renderCards);
  $('art-tasks-container')?.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (target) handleAction(target);
  });
  $('art-tasks-container')?.addEventListener('change', (e) => handleStatusChange(e.target));
  subscribeRealtime();
}

window.ArteControl = {
  enabled: true,
  render: renderCards
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup);
} else {
  setup();
}
