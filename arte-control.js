import { auth, db, storage } from './js/firebase-init.js';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getDownloadURL, ref, uploadBytes } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

const STATUS_META = {
  aguardando_envio: { label: 'Aguardando Envio', cls: 'bg-amber-500/20 text-amber-200 border-amber-400/40' },
  em_producao: { label: 'Em Produção', cls: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40' },
  arte_enviada: { label: 'Arte Enviada', cls: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40' },
  em_revisao: { label: 'Em Revisão', cls: 'bg-purple-500/20 text-purple-200 border-purple-400/40' },
  concluido: { label: 'Concluído', cls: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' }
};

const ARTE_LINK_OWNER_UID = 'QGxXshwTBbPH0VcodwyVJtDPbTI3';

const state = {
  pedidos: [],
  selectedId: null,
  filter: 'all',
  search: '',
  unsubscribe: null,
  initialized: false
};

const getPedidosArteCollection = () => collection(db, 'users', ARTE_LINK_OWNER_UID, 'pedidos_arte');

const getPedidosArteQuery = () => query(collection(db, 'users', ARTE_LINK_OWNER_UID, 'pedidos_arte'), orderBy('atualizado_em', 'desc'));

const ensurePermittedUid = () => {
  const sessionUid = auth?.currentUser?.uid;
  if (!sessionUid) {
    throw new Error('Faça login para gerar o link de arte.');
  }
  if (sessionUid !== ARTE_LINK_OWNER_UID) {
    throw new Error('Este usuário não possui permissão para gerar link de arte.');
  }
  return sessionUid;
};

const fmtDate = (v) => {
  const d = v?.toDate ? v.toDate() : (v ? new Date(v) : null);
  return d ? d.toLocaleString('pt-BR') : '—';
};
const statusLabel = (s) => (STATUS_META[s] || STATUS_META.aguardando_envio).label;

const toast = (msg) => {
  const el = document.createElement('div');
  el.className = 'fixed right-4 top-20 z-[90] px-4 py-3 rounded-xl border border-cyan-300/40 bg-gray-900/95 text-cyan-100 shadow-2xl';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
};

async function generateUniqueCode() {
  const targetCollection = getPedidosArteCollection();
  for (let i = 0; i < 25; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const q = query(targetCollection, where('codigo', '==', code), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return code;
  }
  throw new Error('Não foi possível gerar um código único.');
}

async function generateUniqueToken() {
  const targetCollection = getPedidosArteCollection();
  for (let i = 0; i < 25; i++) {
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
    const q = query(targetCollection, where('token', '==', token), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return token;
  }
  throw new Error('Não foi possível gerar um token único.');
}

function renderUI() {
  const root = document.getElementById('art-tasks-container');
  if (!root) return;

  const filtered = state.pedidos.filter((p) => {
    if (state.filter !== 'all' && p.status !== state.filter) return false;
    if (!state.search) return true;
    const hay = `${p.token || ''} ${p.codigo || ''}`.toLowerCase();
    return hay.includes(state.search.toLowerCase());
  });

  const selected = state.pedidos.find((p) => p.id === state.selectedId) || filtered[0] || null;
  if (!state.selectedId && selected) state.selectedId = selected.id;

  root.innerHTML = `
    <section class="glass-card p-5 md:p-6 space-y-4">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-cyan-200">Gerar Link de Arte</h2>
          <p class="text-sm text-gray-400">Cria token, PIN de 4 dígitos e documento em <code>pedidos_arte</code>.</p>
        </div>
        <button id="generate-art-link-btn" class="btn-shine py-2 px-4 rounded-lg glass-button font-bold">+ Gerar Link de Arte</button>
      </div>
      <div id="generated-art-card" class="hidden rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4 md:p-5"></div>
    </section>

    <section class="grid lg:grid-cols-[minmax(280px,360px),1fr] gap-4 md:gap-6 pb-24">
      <article class="glass-card p-4 space-y-4">
        <div class="flex flex-wrap gap-2">
          ${['all', 'aguardando_envio', 'em_producao', 'arte_enviada', 'em_revisao', 'concluido'].map((s) => `<button data-filter="${s}" class="art-filter-btn px-3 py-1 rounded-full text-xs border ${state.filter === s ? 'bg-cyan-500/30 text-cyan-100 border-cyan-300/60' : 'bg-white/5 text-gray-300 border-white/10'}">${s === 'all' ? 'Todos' : statusLabel(s)}</button>`).join('')}
        </div>
        <input id="art-search-input" class="w-full p-2 rounded-lg glass-input" placeholder="Buscar por código ou token" value="${state.search}">
        <div class="space-y-3 max-h-[62vh] overflow-auto pr-1">
          ${filtered.length ? filtered.map((p) => `
            <button data-id="${p.id}" class="art-pedido-card w-full text-left rounded-xl border p-3 transition ${p.id === state.selectedId ? 'border-cyan-300/70 bg-cyan-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}">
              <div class="flex items-center justify-between gap-2"><strong class="text-sm">Código ${p.codigo || '----'}</strong><span class="text-[10px] uppercase px-2 py-1 rounded-full border ${(STATUS_META[p.status] || STATUS_META.aguardando_envio).cls}">${statusLabel(p.status)}</span></div>
              <p class="text-xs text-gray-300 mt-1">Token: ${p.token || '—'}</p>
              <p class="text-xs text-gray-400 mt-1">Revisões: ${p.revisoes_usadas || 0} / ${p.revisoes_gratuitas || 2}</p>
              <p class="text-[11px] text-gray-500 mt-1">Atualizado: ${fmtDate(p.atualizado_em)}</p>
            </button>`).join('') : '<p class="text-sm text-gray-400">Nenhum pedido encontrado.</p>'}
        </div>
      </article>

      <article class="glass-card p-4 md:p-5">${selected ? renderDetail(selected) : '<p class="text-gray-400">Selecione um pedido.</p>'}</article>
    </section>
  `;

  bindEvents(selected);
}

function renderDetail(p) {
  const versoes = Array.isArray(p.versoes) ? p.versoes : [];
  const imagens = Array.isArray(p.imagens) ? p.imagens : [];
  return `
    <div class="space-y-4">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 class="text-lg font-bold">Pedido ${p.codigo || ''}</h3>
          <p class="text-xs text-gray-400">Token: ${p.token}</p>
        </div>
        <select id="admin-art-status" class="p-2 rounded-lg glass-input">
          ${Object.keys(STATUS_META).map((k) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${statusLabel(k)}</option>`).join('')}
        </select>
      </div>
      <div class="grid sm:grid-cols-2 gap-3 text-sm">
        <div class="rounded-xl border border-white/10 bg-white/5 p-3"><p class="text-gray-400">Revisões usadas</p><p class="font-bold text-lg">${p.revisoes_usadas || 0}</p></div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3"><p class="text-gray-400">Custo adicional</p><p class="font-bold text-lg text-amber-300">R$ ${(p.custo_adicional || 0).toFixed(2)}</p></div>
      </div>
      <div>
        <p class="font-semibold mb-2">Descrição do cliente</p>
        <p class="text-sm text-gray-300 rounded-xl border border-white/10 bg-white/5 p-3 min-h-16">${p.descricao_cliente || 'Sem descrição ainda.'}</p>
      </div>
      <div>
        <p class="font-semibold mb-2">Referências enviadas</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">${imagens.length ? imagens.map((u) => `<a href="${u}" target="_blank" class="rounded-xl overflow-hidden border border-white/10"><img src="${u}" class="w-full h-24 object-cover"/></a>`).join('') : '<p class="text-sm text-gray-400">Sem imagens.</p>'}</div>
      </div>
      <div>
        <p class="font-semibold mb-2">Histórico de versões</p>
        <div class="space-y-2 max-h-44 overflow-auto pr-1">${versoes.length ? versoes.map((v, i) => `<div class="rounded-xl border border-white/10 bg-white/5 p-2 text-xs"><p class="font-semibold">Versão ${v.numero || i + 1} • ${fmtDate(v.criado_em)}</p><p class="text-gray-400">${v.mensagem || 'Sem observação'}</p></div>`).join('') : '<p class="text-sm text-gray-400">Nenhuma versão enviada.</p>'}</div>
      </div>
      <form id="send-art-form" class="space-y-3 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
        <p class="font-semibold text-cyan-200">Enviar arte ao cliente</p>
        <input id="admin-art-file" type="file" accept="image/*" required class="w-full text-sm">
        <textarea id="admin-art-message" rows="2" class="w-full p-2 rounded-lg glass-input" placeholder="Mensagem opcional"></textarea>
        <button class="btn-shine py-2 px-4 rounded-lg glass-button font-semibold" type="submit">Enviar Arte ao Cliente</button>
      </form>
    </div>`;
}

function bindEvents(selected) {
  document.getElementById('generate-art-link-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('generate-art-link-btn');
    const card = document.getElementById('generated-art-card');
    try {
      btn.disabled = true;
      btn.textContent = 'Gerando...';
      const uid = ensurePermittedUid();
      const [codigo, token] = await Promise.all([generateUniqueCode(), generateUniqueToken()]);
      const pedidoRef = await addDoc(getPedidosArteCollection(), {
        token,
        codigo,
        owner_uid: uid,
        clienteId: '',
        status: 'aguardando_envio',
        revisoes_usadas: 0,
        revisoes_gratuitas: 2,
        custo_adicional: 0,
        imagens: [],
        descricao_cliente: '',
        versoes: [],
        criado_em: serverTimestamp(),
        atualizado_em: serverTimestamp(),
        last_event: 'link_gerado'
      });
      const link = `${window.location.origin}/Arte-Online.html?token=${token}&owner=${ARTE_LINK_OWNER_UID}`;

      await updateDoc(doc(db, 'users', ARTE_LINK_OWNER_UID), {
        [`arte_link_index.${token}`]: {
          pedidoId: pedidoRef.id,
          ownerUid: ARTE_LINK_OWNER_UID,
          codigo,
          atualizado_em: new Date().toISOString()
        }
      });
      card.classList.remove('hidden');
      card.innerHTML = `<p class="text-xs uppercase tracking-[0.14em] text-cyan-200">Acesso do cliente</p>
        <p class="text-5xl font-black tracking-[0.25em] mt-2 text-white">${codigo}</p>
        <div class="mt-3 space-y-2 text-sm"><p class="break-all text-cyan-100">${link}</p>
        <div class="flex flex-wrap gap-2"><button class="copy-link px-3 py-1 rounded-lg bg-white/10 border border-white/20">Copiar link</button><button class="copy-code px-3 py-1 rounded-lg bg-white/10 border border-white/20">Copiar código</button></div></div>`;
      card.querySelector('.copy-link').onclick = () => navigator.clipboard.writeText(link).then(() => toast('Link copiado!'));
      card.querySelector('.copy-code').onclick = () => navigator.clipboard.writeText(codigo).then(() => toast('Código copiado!'));
      toast('Link de arte criado com sucesso.');
    } catch (e) {
      if (e?.code === 'permission-denied') {
        toast('Sem permissão no Firestore para criar pedidos_arte. Verifique as regras da coleção users/{uid}/pedidos_arte.');
      } else {
        toast(e.message || 'Erro ao gerar link.');
      }
    } finally {
      btn.disabled = false;
      btn.textContent = '+ Gerar Link de Arte';
    }
  });

  document.querySelectorAll('.art-filter-btn').forEach((b) => b.addEventListener('click', () => {
    state.filter = b.dataset.filter;
    renderUI();
  }));
  document.getElementById('art-search-input')?.addEventListener('input', (e) => {
    state.search = e.target.value;
    renderUI();
  });
  document.querySelectorAll('.art-pedido-card').forEach((b) => b.addEventListener('click', () => {
    state.selectedId = b.dataset.id;
    renderUI();
  }));

  document.getElementById('admin-art-status')?.addEventListener('change', async (e) => {
    if (!selected) return;
    ensurePermittedUid();
    const targetDoc = doc(db, 'users', ARTE_LINK_OWNER_UID, 'pedidos_arte', selected.id);
    await updateDoc(targetDoc, { status: e.target.value, atualizado_em: serverTimestamp() });
    toast('Status atualizado.');
  });

  document.getElementById('send-art-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selected) return;
    const file = document.getElementById('admin-art-file').files?.[0];
    if (!file) return;
    const msg = document.getElementById('admin-art-message').value.trim();
    const versoes = Array.isArray(selected.versoes) ? selected.versoes : [];
    const fileRef = ref(storage, `pedidos_arte/${selected.id}/versoes/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    versoes.push({ numero: versoes.length + 1, imagem: url, mensagem: msg, status: 'arte_enviada', criado_em: new Date().toISOString() });
    ensurePermittedUid();
    const targetDoc = doc(db, 'users', ARTE_LINK_OWNER_UID, 'pedidos_arte', selected.id);
    await updateDoc(targetDoc, {
      versoes,
      status: 'arte_enviada',
      atualizado_em: serverTimestamp(),
      last_event: 'arte_enviada'
    });
    toast('Arte enviada ao cliente.');
    e.target.reset();
  });
}

function initRealtime() {
  if (state.unsubscribe) return;
  const q = getPedidosArteQuery();
  state.unsubscribe = onSnapshot(q, (snap) => {
    const prev = new Map(state.pedidos.map((p) => [p.id, p]));
    state.pedidos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    snap.docChanges().forEach((chg) => {
      if (!state.initialized) return;
      const data = { id: chg.doc.id, ...chg.doc.data() };
      const before = prev.get(data.id);
      if (chg.type === 'added') toast(`Novo pedido de arte: ${data.codigo}`);
      if (before && before.last_event !== data.last_event && ['pedido_enviado', 'revisao_solicitada'].includes(data.last_event)) {
        toast(`Notificação: ${data.last_event === 'pedido_enviado' ? 'cliente enviou pedido' : 'cliente pediu revisão'} (${data.codigo})`);
      }
    });
    state.initialized = true;
    renderUI();
  });
}

window.ArteControl = {
  enabled: true,
  render() {
    initRealtime();
    renderUI();
  }
};
