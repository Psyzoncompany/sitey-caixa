import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  limit,
  where,
  addDoc
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
const auth = getAuth(app);
const db = getFirestore(app);

const statusOptions = [
  'Aguardando envio do cliente',
  'Cliente enviou',
  'Em produção',
  'Aguardando aprovação',
  'Finalizado'
];

const state = {
  requestsById: new Map(),
  processOrders: [],
  userDoc: null,
  initialized: false,
  unsubArtRequests: null,
  unsubUserDoc: null
};

const $ = (id) => document.getElementById(id);

function money(v = 0) { return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`; }
function dateFmt(v) {
  if (!v) return '—';
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR');
}

function normalizeVersionNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function getMajorGroupLabel(versionNumber) {
  const normalized = normalizeVersionNumber(versionNumber, 0);
  const major = Math.max(0, Math.floor(normalized));
  return `${major}.x`;
}

function normalizeVersion(docSnapOrObj) {
  const raw = docSnapOrObj.data ? docSnapOrObj.data() : docSnapOrObj;
  const id = docSnapOrObj.id || raw.id || '';
  const versionNumber = normalizeVersionNumber(raw.versionNumber, 0);
  const images = raw.images || raw.uploads || raw.files || [];
  const clientText = raw.clientText || raw.text || raw.message || '';
  const source = raw.source || (raw.fromClient ? 'client' : 'internal');
  return {
    id,
    versionNumber,
    createdAt: raw.createdAt || raw.created_at || null,
    clientText,
    images: Array.isArray(images) ? images : [],
    isFree: Boolean(raw.isFree),
    cost: Number(raw.cost || 0),
    paymentStatus: raw.paymentStatus || 'nao_aplica',
    source,
    original: raw
  };
}

function getClientName(order) {
  return order?.clientName || order?.customerName || order?.client?.name || 'Cliente não informado';
}

function getProcessStatus(order) {
  if (!order) return '—';
  return order.processStatus || order.status || '—';
}

function isProcessDone(order) {
  const status = String(getProcessStatus(order)).toLowerCase();
  return status === 'done' || status === 'concluído' || status === 'concluido';
}

function isArtApproved(order) {
  if (!order) return false;
  if (typeof order.artDesignApproved === 'boolean') return order.artDesignApproved;
  if (typeof order.designApproved === 'boolean') return order.designApproved;
  if (typeof order.artApproved === 'boolean') return order.artApproved;
  return Boolean(order?.checklist?.art?.completed);
}

function computePriority(order) {
  if (!order?.deadline) return null;
  const deadline = new Date(`${order.deadline}T23:59:59`);
  if (Number.isNaN(deadline.getTime())) return null;
  const now = new Date();
  const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Atrasado', className: 'bg-red-500/20 text-red-300 border-red-500/40' };
  if (diffDays <= 2) return { label: 'Alta Prioridade', className: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
  return null;
}

function getArtLink(processId) {
  return `${window.location.origin}/Arte-Online.html?rid=${encodeURIComponent(processId)}`;
}

function getWhatsappText(item) {
  const link = getArtLink(item.processId);
  const code = item.request?.code || '----';
  return `Olá, ${item.clientName}! Segue seu portal de alterações da arte:%0A${link}%0ACódigo: ${code}`;
}

async function logEvent(processId, type, payload = {}) {
  try {
    await addDoc(collection(db, 'artRequests', processId, 'events'), {
      type,
      payload,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Falha ao registrar log de evento', err);
  }
}

async function generateUniqueCode(excludeId = null) {
  for (let i = 0; i < 12; i += 1) {
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const q = query(collection(db, 'artRequests'), where('code', '==', code), limit(3));
    const snap = await getDocs(q);
    const conflict = snap.docs.some((d) => d.id !== excludeId && d.data()?.linkGenerated !== false);
    if (!conflict) return code;
  }
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

function getProcessOrdersFromUserDoc(data) {
  if (!data) return [];
  if (Array.isArray(data.production_orders)) return data.production_orders;
  if (typeof data.production_orders === 'string') {
    try { return JSON.parse(data.production_orders); } catch { return []; }
  }
  return [];
}

function filteredItems() {
  const search = ($('artx-search-input')?.value || '').trim().toLowerCase();
  const statusFilter = $('artx-status-filter')?.value || 'all';

  const byProcessId = new Map();

  state.processOrders.forEach((order) => {
    const processId = String(order.id);
    byProcessId.set(processId, {
      processId,
      clientName: getClientName(order),
      processStatus: getProcessStatus(order),
      processOrder: order,
      request: state.requestsById.get(processId) || null,
      artDesignApproved: isArtApproved(order),
      contact: order.clientContact || order.contact || order.whatsapp || order.instagram || ''
    });
  });

  state.requestsById.forEach((request, processId) => {
    if (!byProcessId.has(processId)) {
      byProcessId.set(processId, {
        processId,
        clientName: request.clientName || 'Cliente não informado',
        processStatus: request.processStatus || '—',
        processOrder: null,
        request,
        artDesignApproved: Boolean(request.artDesignApproved),
        contact: request.clientContact || ''
      });
    } else {
      byProcessId.get(processId).request = request;
    }
  });

  const items = [...byProcessId.values()].filter((item) => {
    const request = item.request;
    const linkGenerated = Boolean(request?.linkGenerated);
    const done = isProcessDone(item.processOrder) || String(item.processStatus).toLowerCase() === 'concluído';

    const shouldShowPending = !item.artDesignApproved && (!request || !linkGenerated);
    const shouldShowOngoing = linkGenerated && !done;
    const shouldShowArchived = linkGenerated && done;

    if (!shouldShowPending && !shouldShowOngoing && !shouldShowArchived) return false;

    const mergedStatus = request?.status || 'Aguardando envio do cliente';
    const matchesStatus = statusFilter === 'all' || mergedStatus === statusFilter;
    const needle = `${item.processId} ${item.clientName} ${request?.code || ''}`.toLowerCase();
    const matchesSearch = !search || needle.includes(search);

    return matchesStatus && matchesSearch;
  });

  return {
    pending: items.filter((item) => !item.request || !item.request.linkGenerated),
    ongoing: items.filter((item) => item.request?.linkGenerated && !isProcessDone(item.processOrder) && String(item.processStatus).toLowerCase() !== 'concluído'),
    archived: items.filter((item) => item.request?.linkGenerated && (isProcessDone(item.processOrder) || String(item.processStatus).toLowerCase() === 'concluído'))
  };
}

function requestCostLabel(request) {
  const used = Number(request?.changesUsed || 0);
  const freeMax = Number(request?.freeChangesMax || 2);
  const over = Math.max(0, used - freeMax);
  if (over <= 0) return `${used}/${freeMax} grátis`;
  return `${used}/${freeMax} grátis · extra ${money(over * Number(request?.extraCostPerChange || 10))}`;
}

function buildCard(item, section) {
  const request = item.request || {};
  const priority = computePriority(item.processOrder);
  const processId = item.processId;
  const link = getArtLink(processId);
  const canGenerate = !request.linkGenerated;
  const code = request.code || '—';
  const paymentButton = Number(request.totalDue || 0) > 0
    ? `<button class="artx-btn" data-action="toggle-payment" data-id="${processId}">${request.paymentStatus === 'pago' ? 'Marcar pendente' : 'Marcar como pago'}</button>`
    : '';

  const contact = item.contact ? `<p class="artx-meta">Contato: <strong>${item.contact}</strong></p>` : '';
  const priorityBadge = priority ? `<span class="artx-badge ${priority.className}">${priority.label}</span>` : '';
  const sectionBadge = section === 'pending' ? 'Pendência do Quadro' : section === 'ongoing' ? 'Em andamento' : 'Arquivado';

  return `
    <article class="glass-card artx-card p-4" data-id="${processId}">
      <div class="artx-row">
        <h4>#${processId}</h4>
        <div class="flex gap-2 items-center">
          ${priorityBadge}
          <span class="artx-badge">${sectionBadge}</span>
        </div>
      </div>
      <p class="artx-meta">Cliente: <strong>${item.clientName}</strong></p>
      ${contact}
      <p class="artx-meta">Status processo: <strong>${item.processStatus || '—'}</strong></p>
      <p class="artx-meta">Status arte: <strong>${request.status || 'Aguardando envio do cliente'}</strong></p>
      <p class="artx-meta">Código: <strong>${code}</strong></p>
      <p class="artx-meta">Alterações: <strong>${requestCostLabel(request)}</strong></p>
      <p class="artx-meta">Total devido: <strong>${money(request.totalDue || 0)}</strong> · ${request.paymentStatus || 'nao_aplica'}</p>
      <p class="artx-meta">Última msg: ${request.lastClientMessage || 'Sem mensagem'}</p>
      <p class="artx-meta">Atualizado: ${dateFmt(request.updatedAt)}</p>

      <div class="artx-actions">
        ${canGenerate ? `<button class="artx-btn" data-action="generate-link" data-id="${processId}">Gerar Link do Cliente</button>` : ''}
        <button class="artx-btn" data-action="copy-link" data-link="${link}">Copiar Link</button>
        <button class="artx-btn" data-action="copy-code" data-code="${request.code || ''}">Copiar Código</button>
        <a class="artx-btn" href="${link}" target="_blank" rel="noopener">Abrir Portal</a>
        <button class="artx-btn" data-action="history" data-id="${processId}">Ver Versões</button>
        <button class="artx-btn" data-action="whatsapp" data-id="${processId}">WhatsApp</button>
        ${paymentButton}
      </div>
      <div class="artx-row mt-2">
        <label class="text-xs text-gray-300">Status</label>
        <select class="artx-input artx-status-select" data-action="status" data-id="${processId}">
          ${statusOptions.map((s) => `<option ${s === request.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
    </article>
  `;
}

function renderSection(title, items, section) {
  return `
    <section class="space-y-3">
      <div class="artx-row"><h3 class="text-lg font-bold">${title}</h3><span class="artx-badge">${items.length}</span></div>
      ${items.length
        ? `<div class="artx-grid">${items.map((item) => buildCard(item, section)).join('')}</div>`
        : '<div class="glass-card p-5 text-gray-400 text-sm">Sem itens nesta seção.</div>'}
    </section>
  `;
}

function renderCards() {
  const container = $('art-tasks-container');
  if (!container) return;
  const grouped = filteredItems();
  container.innerHTML = [
    renderSection('Pendentes do Quadro', grouped.pending, 'pending'),
    renderSection('Em andamento', grouped.ongoing, 'ongoing'),
    renderSection('Concluídos / Arquivados', grouped.archived, 'archived')
  ].join('');
}

function versionItemHtml(v) {
  const label = `v${String(v.versionNumber).replace(/\.0$/, '')}`;
  const sourceLabel = v.source === 'client' ? 'Cliente' : 'Interno';
  const sourceClass = v.source === 'client' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-purple-500/20 text-purple-300';
  const costLabel = v.isFree ? 'Grátis' : `Pago (${money(v.cost)})`;
  const thumbs = (v.images || []).map((img) => {
    const url = img.url || img.downloadURL || img;
    return `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="imagem da versão" /></a>`;
  }).join('');

  return `
    <div class="p-3 rounded-xl bg-white/5 border border-white/10">
      <div class="artx-row">
        <strong>${label}</strong>
        <div class="flex gap-2">
          <span class="artx-badge ${sourceClass}">${sourceLabel}</span>
          <span class="artx-badge">${costLabel}</span>
        </div>
      </div>
      <p class="text-xs text-gray-400">${dateFmt(v.createdAt)} · payment: ${v.paymentStatus}</p>
      <p class="text-sm mt-2">${v.clientText || 'Sem texto'}</p>
      <div class="artx-thumb-grid mt-2">${thumbs || '<span class="text-xs text-gray-500">Sem imagens.</span>'}</div>
    </div>
  `;
}

function groupedVersionsHtml(items) {
  const grouped = new Map();
  items.forEach((v) => {
    const key = getMajorGroupLabel(v.versionNumber);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(v);
  });

  const keys = [...grouped.keys()].sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
  return keys.map((key) => {
    const list = grouped.get(key).sort((a, b) => {
      const byVersion = normalizeVersionNumber(a.versionNumber) - normalizeVersionNumber(b.versionNumber);
      if (byVersion !== 0) return byVersion;
      const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const dbt = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return da - dbt;
    });

    return `
      <details class="rounded-xl border border-white/10 bg-white/5 p-3" open>
        <summary class="cursor-pointer font-semibold">${key} (${list.length} versões)</summary>
        <div class="space-y-3 mt-3">${list.map(versionItemHtml).join('')}</div>
      </details>
    `;
  }).join('');
}

async function openHistory(rid) {
  const modal = document.createElement('div');
  modal.className = 'artx-modal';
  modal.innerHTML = '<div class="artx-modal-card glass-card p-4"><p class="text-sm text-gray-300">Carregando versões...</p></div>';
  document.body.appendChild(modal);

  try {
    const versionsRef = query(collection(db, 'artRequests', rid, 'versions'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(versionsRef);
    const items = snap.docs.map((d) => normalizeVersion(d));

    modal.innerHTML = `
      <div class="artx-modal-card glass-card p-4">
        <div class="artx-row mb-3"><h3>Versões por grupo</h3><button class="artx-btn" data-close="1">Fechar</button></div>
        <div class="space-y-3 max-h-[70vh] overflow-y-auto">
          ${items.length ? groupedVersionsHtml(items) : '<p class="text-sm text-gray-400">Sem versões ainda.</p>'}
        </div>
      </div>`;
  } catch (e) {
    console.error(e);
    modal.innerHTML = '<div class="artx-modal-card glass-card p-4">Erro ao carregar histórico.</div>';
  }

  modal.addEventListener('click', (ev) => {
    if (ev.target === modal || ev.target.dataset.close) modal.remove();
  });
}

async function ensureArtRequestFromProcess(processId) {
  const order = state.processOrders.find((o) => String(o.id) === String(processId));
  const existing = state.requestsById.get(String(processId));
  const base = {
    processId: String(processId),
    clientName: getClientName(order),
    clientContact: order?.clientContact || '',
    status: existing?.status || 'Aguardando envio do cliente',
    freeChangesMax: Number(existing?.freeChangesMax || 2),
    changesUsed: Number(existing?.changesUsed || 0),
    extraCostPerChange: Number(existing?.extraCostPerChange || 10),
    totalDue: Number(existing?.totalDue || 0),
    paymentStatus: existing?.paymentStatus || 'nao_aplica',
    processStatus: getProcessStatus(order),
    artDesignApproved: isArtApproved(order),
    updatedAt: serverTimestamp(),
    createdAt: existing?.createdAt || serverTimestamp(),
    lastVersionNumber: Number(existing?.lastVersionNumber || 0),
    lastClientMessage: existing?.lastClientMessage || ''
  };

  const code = existing?.code || await generateUniqueCode(String(processId));
  await setDoc(doc(db, 'artRequests', String(processId)), {
    ...base,
    code,
    linkGenerated: true
  }, { merge: true });

  await logEvent(String(processId), 'link_generated', {
    code,
    processStatus: base.processStatus
  });

  return code;
}

async function syncRequestWithProcess(processId) {
  const order = state.processOrders.find((o) => String(o.id) === String(processId));
  if (!order) return;
  const request = state.requestsById.get(String(processId));
  if (!request) return;

  const patch = {
    processStatus: getProcessStatus(order),
    artDesignApproved: isArtApproved(order),
    clientName: getClientName(order),
    clientContact: order.clientContact || request.clientContact || '',
    updatedAt: serverTimestamp()
  };
  await setDoc(doc(db, 'artRequests', String(processId)), patch, { merge: true });
}

async function handleAction(target) {
  const action = target.dataset.action;
  if (!action) return;
  const processId = target.dataset.id;

  if (action === 'generate-link') {
    target.disabled = true;
    try {
      const code = await ensureArtRequestFromProcess(processId);
      const link = getArtLink(processId);
      await navigator.clipboard.writeText(`${link}\nCódigo: ${code}`);
      alert(`Link gerado com sucesso!\n\n${link}\nCódigo: ${code}`);
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar link.');
    } finally {
      target.disabled = false;
    }
    return;
  }

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
    openHistory(processId);
    return;
  }

  if (action === 'whatsapp') {
    const grouped = filteredItems();
    const all = [...grouped.pending, ...grouped.ongoing, ...grouped.archived];
    const item = all.find((x) => x.processId === processId);
    if (!item) return;
    const text = decodeURIComponent(getWhatsappText(item));
    await navigator.clipboard.writeText(text);
    target.textContent = 'Mensagem copiada';
    setTimeout(() => { target.textContent = 'WhatsApp'; }, 1200);
    return;
  }

  if (action === 'toggle-payment') {
    const reqRef = doc(db, 'artRequests', processId);
    const current = state.requestsById.get(processId);
    if (!current) return;
    const next = current.paymentStatus === 'pago' ? 'pendente' : 'pago';
    await updateDoc(reqRef, { paymentStatus: next, updatedAt: serverTimestamp() });
    await logEvent(processId, 'payment_status_changed', { paymentStatus: next });
  }
}

async function handleStatusChange(target) {
  if (!target.classList.contains('artx-status-select')) return;
  await setDoc(doc(db, 'artRequests', target.dataset.id), {
    status: target.value,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function subscribeArtRequests() {
  if (state.unsubArtRequests) state.unsubArtRequests();
  const q = query(collection(db, 'artRequests'), orderBy('updatedAt', 'desc'));
  state.unsubArtRequests = onSnapshot(q, (snap) => {
    state.requestsById.clear();
    snap.docs.forEach((d) => state.requestsById.set(d.id, { id: d.id, ...d.data() }));
    renderCards();
  });
}

function subscribeProcessOrders(uid) {
  if (state.unsubUserDoc) state.unsubUserDoc();
  state.unsubUserDoc = onSnapshot(doc(db, 'users', uid), (snap) => {
    const data = snap.exists() ? snap.data() : null;
    state.userDoc = data;
    state.processOrders = getProcessOrdersFromUserDoc(data).map((order) => ({
      ...order,
      artDesignApproved: isArtApproved(order)
    }));

    state.processOrders.forEach((order) => {
      const processId = String(order.id);
      if (state.requestsById.has(processId)) {
        syncRequestWithProcess(processId).catch((err) => console.warn('sync error', err));
      }
    });

    renderCards();
  });
}

async function createManualRequest() {
  const pseudoOrder = {
    id: Date.now().toString(),
    clientName: 'Pedido manual',
    artDesignApproved: false,
    status: 'todo'
  };
  state.processOrders = [pseudoOrder, ...state.processOrders];
  const code = await ensureArtRequestFromProcess(pseudoOrder.id);
  const link = getArtLink(pseudoOrder.id);
  await navigator.clipboard.writeText(`${link}\nCódigo: ${code}`);
  alert(`Solicitação manual criada.\n\n${link}\nCódigo: ${code}`);
  renderCards();
}

function setup() {
  if (state.initialized) return;
  if (!$('art-tasks-container')) return;

  state.initialized = true;
  $('artx-create-request-btn')?.addEventListener('click', createManualRequest);
  $('artx-search-input')?.addEventListener('input', renderCards);
  $('artx-status-filter')?.addEventListener('change', renderCards);
  $('art-tasks-container')?.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (target) handleAction(target);
  });
  $('art-tasks-container')?.addEventListener('change', (e) => handleStatusChange(e.target));

  onAuthStateChanged(auth, (user) => {
    if (!user) return;
    subscribeArtRequests();
    subscribeProcessOrders(user.uid);
  });
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
