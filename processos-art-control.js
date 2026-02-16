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
  requestsById4: new Map(),
  requestByProcessId: new Map(),
  processOrders: [],
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

function toast(message, type = 'info') {
  const host = document.body;
  if (!host) return;
  const node = document.createElement('div');
  node.className = `artx-toast artx-toast-${type}`;
  node.textContent = message;
  host.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 250);
  }, 2600);
}

function isPermissionDenied(err) {
  return String(err?.code || '').includes('permission-denied');
}

async function copyTextSafe(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
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
  const major = Math.max(1, Math.floor(normalizeVersionNumber(versionNumber, 1)));
  return `${major}.x`;
}

function normalizeVersion(docSnapOrObj) {
  const raw = docSnapOrObj.data ? docSnapOrObj.data() : docSnapOrObj;
  const id = docSnapOrObj.id || raw.id || '';
  const versionNumber = normalizeVersionNumber(raw.versionNumber, 1);
  const images = raw.images || raw.uploads || raw.files || [];
  const clientText = raw.clientText || raw.text || raw.message || '';
  const source = raw.source || (raw.fromClient ? 'client' : 'internal');
  return {
    id,
    versionNumber,
    createdAt: raw.createdAt || raw.created_at || null,
    clientText,
    images: Array.isArray(images) ? images : [],
    isFree: raw.isFree !== false,
    cost: Number(raw.cost || 0),
    paymentStatus: raw.paymentStatus || 'nao_aplica',
    source
  };
}

function getClientName(order) {
  return order?.clientName || order?.customerName || order?.client?.name || 'Cliente não informado';
}

function getProcessStatus(order) {
  if (!order) return '—';
  return order.processStatus || order.status || '—';
}

function isProcessDone(orderOrStatus) {
  const status = typeof orderOrStatus === 'string' ? orderOrStatus : getProcessStatus(orderOrStatus);
  const normalized = String(status || '').toLowerCase();
  return normalized === 'done' || normalized === 'concluído' || normalized === 'concluido';
}

function isRequestActive(req) {
  if (!req) return false;
  if (typeof req.active === 'boolean') return req.active;
  if (req.processStatus) return !isProcessDone(req.processStatus);
  return req.status !== 'Concluído';
}

function isArtApproved(order) {
  if (!order) return false;
  if (typeof order.artDesignApproved === 'boolean') return order.artDesignApproved;
  if (typeof order.designApproved === 'boolean') return order.designApproved;
  if (typeof order.artApproved === 'boolean') return order.artApproved;
  return Boolean(order?.checklist?.art?.completed);
}

function getDueDate(order) {
  return order?.dueDate || order?.dataEntrega || order?.deadline || null;
}

function computePriority(order) {
  const dueDate = getDueDate(order);
  if (!dueDate) return null;
  const deadline = new Date(`${dueDate}T23:59:59`);
  if (Number.isNaN(deadline.getTime())) return null;
  const now = new Date();
  const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Atrasado', className: 'bg-red-500/20 text-red-300 border-red-500/40' };
  if (diffDays === 0) return { label: 'Hoje', className: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
  if (diffDays === 1) return { label: 'Amanhã', className: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
  return null;
}

function getArtLink(id4) {
  return `${window.location.origin}/Arte-Online.html?id=${encodeURIComponent(id4)}`;
}

function pickRequestForProcess(processId, candidates) {
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((a, b) => {
    const aScore = (a.linkGenerated ? 20 : 0) + (isRequestActive(a) ? 10 : 0);
    const bScore = (b.linkGenerated ? 20 : 0) + (isRequestActive(b) ? 10 : 0);
    if (aScore !== bScore) return bScore - aScore;
    const at = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt || 0).getTime();
    const bt = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt || 0).getTime();
    return bt - at;
  });
  return sorted[0];
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
      request: state.requestByProcessId.get(processId) || null,
      artDesignApproved: isArtApproved(order),
      contact: order.clientContact || order.contact || order.whatsapp || order.instagram || '',
      dueDate: getDueDate(order)
    });
  });

  state.requestByProcessId.forEach((request, processId) => {
    if (!byProcessId.has(processId)) {
      byProcessId.set(processId, {
        processId,
        clientName: request.clientName || 'Cliente não informado',
        processStatus: request.processStatus || '—',
        processOrder: null,
        request,
        artDesignApproved: Boolean(request.artDesignApproved),
        contact: request.clientContact || '',
        dueDate: request.dueDate || null
      });
    }
  });

  const items = [...byProcessId.values()].filter((item) => {
    const request = item.request;
    const linkGenerated = Boolean(request?.linkGenerated);
    const done = isProcessDone(item.processOrder) || isProcessDone(item.processStatus);
    const shouldShowPending = !item.artDesignApproved && !done;
    const shouldShowOngoing = linkGenerated && !done;
    const shouldShowArchived = linkGenerated && done;

    if (!shouldShowPending && !shouldShowOngoing && !shouldShowArchived) return false;

    const mergedStatus = request?.status || 'Aguardando envio do cliente';
    const matchesStatus = statusFilter === 'all' || mergedStatus === statusFilter;
    const codeNeedle = request?.id4 || request?.code || request?.id || '';
    const needle = `${item.processId} ${item.clientName} ${codeNeedle}`.toLowerCase();
    const matchesSearch = !search || needle.includes(search);
    return matchesStatus && matchesSearch;
  });

  return {
    pending: items.filter((item) => !item.request || !item.request.linkGenerated),
    ongoing: items.filter((item) => item.request?.linkGenerated && !isProcessDone(item.processOrder) && !isProcessDone(item.processStatus)),
    archived: items.filter((item) => item.request?.linkGenerated && (isProcessDone(item.processOrder) || isProcessDone(item.processStatus)))
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
  const requestId = request.id || '';
  const id4 = request.id4 || request.code || request.id || '—';
  const link = request.id ? getArtLink(id4) : '#';
  const canGenerate = !request.linkGenerated;
  const paymentButton = Number(request.totalDue || 0) > 0
    ? `<button class="artx-btn" data-action="toggle-payment" data-id="${requestId}">${request.paymentStatus === 'pago' ? 'Marcar pendente' : 'Marcar como pago'}</button>`
    : '';

  const contact = item.contact ? `<p class="artx-meta">Contato: <strong>${item.contact}</strong></p>` : '';
  const due = item.dueDate ? `<p class="artx-meta">Prazo: <strong>${item.dueDate}</strong></p>` : '';
  const priorityBadge = priority ? `<span class="artx-badge ${priority.className}">${priority.label}</span>` : '';
  const actionBadge = request.needsDesignerAction ? '<span class="artx-badge bg-pink-500/20 text-pink-300 border-pink-500/30">Ação do designer</span>' : '';
  const sectionBadge = section === 'pending' ? 'Pendência do Quadro' : section === 'ongoing' ? 'Em andamento' : 'Arquivado';

  return `
    <article class="glass-card artx-card p-4" data-id="${processId}">
      <div class="artx-row">
        <h4>#${processId}</h4>
        <div class="flex gap-2 items-center">
          ${priorityBadge}
          ${actionBadge}
          <span class="artx-badge">${sectionBadge}</span>
        </div>
      </div>
      <p class="artx-meta">Cliente: <strong>${item.clientName}</strong></p>
      ${contact}
      ${due}
      <p class="artx-meta">Status processo: <strong>${item.processStatus || '—'}</strong></p>
      <p class="artx-meta">Status arte: <strong>${request.status || 'Aguardando envio do cliente'}</strong></p>
      <p class="artx-meta">ID/Código cliente: <strong>${id4}</strong></p>
      <p class="artx-meta">Alterações: <strong>${requestCostLabel(request)}</strong></p>
      <p class="artx-meta">Total devido: <strong>${money(request.totalDue || 0)}</strong> · ${request.paymentStatus || 'nao_aplica'}</p>
      <p class="artx-meta">Última msg: ${request.lastClientMessage || 'Sem mensagem'}</p>
      <p class="artx-meta">Atualizado: ${dateFmt(request.updatedAt)}</p>

      <div class="artx-actions">
        ${canGenerate ? `<button class="artx-btn" data-action="generate-link" data-id="${processId}">Gerar Link</button>` : ''}
        ${request.id ? `<button class="artx-btn" data-action="copy-link" data-link="${link}">Copiar Link</button>` : ''}
        ${request.id ? `<button class="artx-btn" data-action="copy-code" data-code="${id4}">Copiar Código</button>` : ''}
        ${request.id ? `<a class="artx-btn" href="${link}" target="_blank" rel="noopener">Abrir Portal</a>` : ''}
        ${request.id ? `<button class="artx-btn" data-action="history" data-id="${request.id}">Versões</button>` : ''}
        ${request.id ? '<button class="artx-btn" data-action="mark-seen" data-id="'+request.id+'">Marcar visto</button>' : ''}
        ${request.id ? '<button class="artx-btn" data-action="export-history" data-id="'+request.id+'">Exportar histórico</button>' : ''}
        ${paymentButton}
      </div>
      ${request.id ? `<div class="artx-row mt-2">
        <label class="text-xs text-gray-300">Status</label>
        <select class="artx-input artx-status-select" data-action="status" data-id="${request.id}">
          ${statusOptions.map((s) => `<option ${s === request.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>` : ''}
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

async function openHistory(requestId) {
  const modal = document.createElement('div');
  modal.className = 'artx-modal';
  modal.innerHTML = '<div class="artx-modal-card glass-card p-4"><p class="text-sm text-gray-300">Carregando versões...</p></div>';
  document.body.appendChild(modal);

  try {
    const versionsRef = query(collection(db, 'artRequests', requestId, 'versions'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(versionsRef);
    const allItems = snap.docs.map((d) => normalizeVersion(d));

    const renderByTab = (tab = 'all') => {
      const list = tab === 'all' ? allItems : allItems.filter((v) => (v.source || 'internal') === tab);
      return groupedVersionsHtml(list);
    };

    modal.innerHTML = `
      <div class="artx-modal-card glass-card p-4">
        <div class="artx-row mb-3"><h3>Versões por grupo</h3><button class="artx-btn" data-close="1">Fechar</button></div>
        <div class="artx-actions mb-3" style="grid-template-columns:repeat(3,1fr)">
          <button class="artx-btn" data-tab="all">Tudo</button>
          <button class="artx-btn" data-tab="client">Cliente</button>
          <button class="artx-btn" data-tab="internal">Interno</button>
        </div>
        <div class="space-y-3 max-h-[70vh] overflow-y-auto" data-content>
          ${allItems.length ? renderByTab('all') : '<p class="text-sm text-gray-400">Sem versões ainda.</p>'}
        </div>
      </div>`;

    modal.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        modal.querySelector('[data-content]').innerHTML = allItems.length ? renderByTab(target) : '<p class="text-sm text-gray-400">Sem versões ainda.</p>';
      });
    });
  } catch (e) {
    console.error(e);
    modal.innerHTML = '<div class="artx-modal-card glass-card p-4">Erro ao carregar histórico.</div>';
  }

  modal.addEventListener('click', (ev) => {
    if (ev.target === modal || ev.target.dataset.close) modal.remove();
  });
}

async function generateUniqueId4() {
  for (let i = 0; i < 20; i += 1) {
    const id4 = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const snap = await getDoc(doc(db, 'artRequests', id4));
    if (!snap.exists() || !isRequestActive(snap.data())) return id4;
  }
  throw new Error('Sem IDs disponíveis, tente novamente');
}

async function logEvent(requestId, type, payload = {}) {
  try {
    await addDoc(collection(db, 'artRequests', requestId, 'events'), {
      type,
      payload,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Falha ao registrar log de evento', err);
  }
}

async function ensureArtRequestFromProcess(processId) {
  const order = state.processOrders.find((o) => String(o.id) === String(processId));
  const existing = state.requestByProcessId.get(String(processId));
  if (existing?.linkGenerated && existing?.id) return existing;

  const id4 = existing?.id || await generateUniqueId4();
  const payload = {
    id4,
    code: id4,
    processId: String(processId),
    clientName: getClientName(order),
    clientContact: order?.clientContact || existing?.clientContact || '',
    status: existing?.status || 'Aguardando envio do cliente',
    processStatus: getProcessStatus(order),
    artDesignApproved: isArtApproved(order),
    dueDate: getDueDate(order),
    linkGenerated: true,
    changesUsed: Number(existing?.changesUsed || 0),
    freeChangesMax: Number(existing?.freeChangesMax || 2),
    extraCostPerChange: Number(existing?.extraCostPerChange || 10),
    totalDue: Number(existing?.totalDue || 0),
    paymentStatus: existing?.paymentStatus || 'nao_aplica',
    lastClientMessage: existing?.lastClientMessage || '',
    lastVersionNumber: Number(existing?.lastVersionNumber || 0),
    needsDesignerAction: Boolean(existing?.needsDesignerAction),
    active: !isProcessDone(getProcessStatus(order)),
    createdAt: existing?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, 'artRequests', id4), payload, { merge: true });
  await logEvent(id4, 'link_generated', { id4, processId: String(processId) });
  return { ...payload, id: id4 };
}

async function syncRequestWithProcess(processId) {
  const order = state.processOrders.find((o) => String(o.id) === String(processId));
  const request = state.requestByProcessId.get(String(processId));
  if (!order || !request?.id) return;

  await setDoc(doc(db, 'artRequests', request.id), {
    processStatus: getProcessStatus(order),
    artDesignApproved: isArtApproved(order),
    clientName: getClientName(order),
    clientContact: order.clientContact || request.clientContact || '',
    dueDate: getDueDate(order),
    active: !isProcessDone(order),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function exportHistory(requestId) {
  const request = state.requestsById4.get(requestId);
  if (!request) return;
  const snap = await getDocs(query(collection(db, 'artRequests', requestId, 'versions'), orderBy('createdAt', 'asc')));
  const lines = [];
  lines.push(`Pedido arte #${requestId} | Cliente: ${request.clientName || '—'}`);
  lines.push(`Processo: ${request.processId || '—'} | Status: ${request.status || '—'}`);
  lines.push(`Alterações usadas: ${request.changesUsed || 0} | Total devido: ${money(request.totalDue || 0)}`);
  snap.docs.forEach((d) => {
    const v = normalizeVersion(d);
    lines.push(`- v${v.versionNumber} [${v.source}] ${dateFmt(v.createdAt)} | ${v.isFree ? 'Grátis' : money(v.cost)}`);
    if (v.clientText) lines.push(`  Texto: ${v.clientText}`);
    (v.images || []).forEach((img) => {
      const url = img.url || img.downloadURL || img;
      lines.push(`  Imagem: ${url}`);
    });
  });
  const ok = await copyTextSafe(lines.join('\n'));
  toast(ok ? 'Histórico copiado!' : 'Não foi possível copiar o histórico.', ok ? 'ok' : 'error');
}

async function handleAction(target) {
  const action = target.dataset.action;
  if (!action) return;
  const processId = target.dataset.id;

  try {

  if (action === 'generate-link') {
    target.disabled = true;
    try {
      const request = await ensureArtRequestFromProcess(processId);
      const link = getArtLink(request.id4 || request.id);
      const copied = await copyTextSafe(`${link}\nID/Código: ${request.id4 || request.id}`);
      toast(copied ? 'Link gerado e copiado com sucesso!' : 'Link gerado (copie manualmente).', copied ? 'ok' : 'warning');
    } catch (err) {
      console.error(err);
      toast(err?.message || 'Erro ao gerar link.', 'error');
    } finally {
      target.disabled = false;
    }
    return;
  }

  if (action === 'copy-link') {
    const ok = await copyTextSafe(target.dataset.link || '');
    toast(ok ? 'Link copiado!' : 'Falha ao copiar link.', ok ? 'ok' : 'error');
    return;
  }

  if (action === 'copy-code') {
    const ok = await copyTextSafe(target.dataset.code || '');
    toast(ok ? 'Código copiado!' : 'Falha ao copiar código.', ok ? 'ok' : 'error');
    return;
  }

  if (action === 'history') {
    openHistory(processId);
    return;
  }

  if (action === 'toggle-payment') {
    const reqRef = doc(db, 'artRequests', processId);
    const current = state.requestsById4.get(processId);
    if (!current) return;
    const next = current.paymentStatus === 'pago' ? 'pendente' : 'pago';
    await updateDoc(reqRef, { paymentStatus: next, updatedAt: serverTimestamp() });
    await logEvent(processId, 'payment_status_changed', { paymentStatus: next });
    toast(`Pagamento marcado como ${next}.`, 'ok');
    return;
  }

  if (action === 'mark-seen') {
    await setDoc(doc(db, 'artRequests', processId), {
      needsDesignerAction: false,
      status: 'Em produção',
      updatedAt: serverTimestamp()
    }, { merge: true });
    toast('Solicitação marcada como vista.', 'ok');
    return;
  }

  if (action === 'export-history') {
    await exportHistory(processId);
  }
  } catch (err) {
    console.error(err);
    if (isPermissionDenied(err)) {
      toast('Sem permissão no Firestore para esta ação.', 'error');
    } else {
      toast('Falha ao executar ação.', 'error');
    }
  }
}

async function handleStatusChange(target) {
  if (!target.classList.contains('artx-status-select')) return;
  try {
    await setDoc(doc(db, 'artRequests', target.dataset.id), {
      status: target.value,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error(err);
    toast(isPermissionDenied(err) ? 'Sem permissão para atualizar status.' : 'Erro ao atualizar status.', 'error');
  }
}

function subscribeArtRequests() {
  if (state.unsubArtRequests) state.unsubArtRequests();
  const q = query(collection(db, 'artRequests'), orderBy('updatedAt', 'desc'));
  state.unsubArtRequests = onSnapshot(q, (snap) => {
    state.requestsById4.clear();
    const groupedByProcess = new Map();

    snap.docs.forEach((d) => {
      const req = { id: d.id, ...d.data() };
      state.requestsById4.set(d.id, req);
      const processId = String(req.processId || d.id);
      if (!groupedByProcess.has(processId)) groupedByProcess.set(processId, []);
      groupedByProcess.get(processId).push(req);
    });

    state.requestByProcessId.clear();
    groupedByProcess.forEach((candidates, processId) => {
      const selected = pickRequestForProcess(processId, candidates);
      if (selected) state.requestByProcessId.set(processId, selected);
    });

    renderCards();
  }, (err) => {
    console.error(err);
    toast(isPermissionDenied(err) ? 'Sem permissão para listar artRequests.' : 'Erro ao carregar solicitações.', 'error');
  });
}

function subscribeProcessOrders(uid) {
  if (state.unsubUserDoc) state.unsubUserDoc();
  state.unsubUserDoc = onSnapshot(doc(db, 'users', uid), (snap) => {
    const data = snap.exists() ? snap.data() : null;
    state.processOrders = getProcessOrdersFromUserDoc(data).map((order) => ({
      ...order,
      artDesignApproved: isArtApproved(order)
    }));

    state.processOrders.forEach((order) => {
      const processId = String(order.id);
      if (state.requestByProcessId.has(processId)) {
        syncRequestWithProcess(processId).catch((err) => console.warn('sync error', err));
      }
    });

    renderCards();
  }, (err) => {
    console.error(err);
    toast(isPermissionDenied(err) ? 'Sem permissão para ler pedidos do usuário.' : 'Erro ao carregar pedidos.', 'error');
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
  const request = await ensureArtRequestFromProcess(pseudoOrder.id);
  const link = getArtLink(request.id);
  const ok = await copyTextSafe(`${link}\nID/Código: ${request.id}`);
  toast(ok ? 'Solicitação manual criada e copiada.' : 'Solicitação manual criada.', ok ? 'ok' : 'warning');
  renderCards();
}

function setup() {
  if (state.initialized || !$('art-tasks-container')) return;
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup);
} else {
  setup();
}
