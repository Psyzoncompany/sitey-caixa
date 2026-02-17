import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { db, storage } from "./js/firebase-init.js";

const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const oidFromUrl = params.get('oid');

const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024;

const el = (id) => document.getElementById(id);
const state = { order: null, selectedVersionId: null, files: [], oid: null };

const statusLabel = (status) => ({
  draft: 'Rascunho',
  sent: 'Enviada',
  changes_requested: 'Ajustes solicitados',
  approved: 'Aprovada',
  done: 'Finalizado',
  pending: 'Pendente'
}[status] || status || 'Pendente');

const showInvalid = (message) => {
  el('cliente-loading')?.classList.add('hidden');
  el('cliente-app')?.classList.add('hidden');
  el('invalid-link')?.classList.remove('hidden');
  if (message) el('invalid-message').textContent = message;
};

const getActiveVersion = (order) => {
  const versions = Array.isArray(order?.versions) ? order.versions : [];
  return versions.find((v) => v.id === state.selectedVersionId)
    || versions.find((v) => v.id === order?.activeVersion?.id)
    || order?.activeVersion
    || versions[versions.length - 1]
    || null;
};

const renderVersions = () => {
  const list = el('versions-list');
  list.innerHTML = '';
  const versions = [...(state.order?.versions || [])]
    .sort((a, b) => (b.versionNumber || b.version || 0) - (a.versionNumber || a.version || 0));

  versions.forEach((ver) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'cliente-version-item';
    const previewUrl = ver.previewUrl || ver.images?.[0] || '';
    item.innerHTML = `
      <img src="${previewUrl}" alt="Versão ${ver.versionNumber || ver.version || '-'}" />
      <span>Versão ${ver.versionNumber || ver.version || '-'}</span>
      <small>${statusLabel(ver.status)}</small>
    `;
    item.onclick = () => {
      state.selectedVersionId = ver.id;
      render();
    };
    list.appendChild(item);
  });
};

const renderUploadPreview = () => {
  const box = el('upload-preview');
  box.innerHTML = '';
  state.files.forEach((file, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'cliente-upload-item';
    wrap.innerHTML = `
      <img src="${URL.createObjectURL(file)}" alt="upload-${idx}" />
      <button type="button" aria-label="Remover imagem">✕</button>
    `;
    wrap.querySelector('button').onclick = () => {
      state.files.splice(idx, 1);
      renderUploadPreview();
    };
    box.appendChild(wrap);
  });
};

const render = () => {
  const order = state.order;
  const active = getActiveVersion(order);

  el('order-title').textContent = order.title || `Pedido #${order.oid}`;
  el('order-subtitle').textContent = `${order.customer || 'Cliente'} • Prazo ${order.deadline || 'não informado'}`;

  const status = order?.status || active?.status || 'pending';
  el('order-status').textContent = statusLabel(status);

  const preview = el('active-preview');
  preview.src = active?.previewUrl || active?.images?.[0] || '';
  preview.style.display = preview.src ? 'block' : 'none';

  renderVersions();
};

const compressImage = async (file) => {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, 1600 / bitmap.width);
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.84));
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
};

const uploadSelectedImages = async () => {
  if (!state.files.length) return [];

  const urls = [];
  let uploadedCount = 0;

  for (const file of state.files) {
    const compressed = await compressImage(file);
    const path = `client_uploads/${token}/${Date.now()}-${Math.random().toString(36).slice(2)}-${compressed.name}`;
    const task = uploadBytesResumable(ref(storage, path), compressed);
    const url = await new Promise((resolve, reject) => {
      task.on('state_changed', (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        const allPct = Math.min(100, Math.round(((uploadedCount + (pct / 100)) / state.files.length) * 100));
        el('upload-progress').style.width = `${allPct}%`;
      }, reject, async () => {
        uploadedCount += 1;
        resolve(await getDownloadURL(task.snapshot.ref));
      });
    });

    urls.push({ url, name: file.name, uploadedAt: Date.now() });
  }

  return urls;
};

const sendClientEvent = async (type) => {
  const active = getActiveVersion(state.order);
  if (!active) throw new Error('Sem versão ativa para feedback.');

  const message = el('feedback-message').value.trim();
  if (type !== 'approved' && !message && !state.files.length) {
    throw new Error('Informe o ajuste ou anexe imagens antes de enviar.');
  }

  const images = await uploadSelectedImages();

  await addDoc(collection(db, 'order_feedback', token, 'items'), {
    type,
    token,
    oid: state.oid,
    versionId: active.id || null,
    versionNumber: active.versionNumber || active.version || null,
    message,
    images,
    createdAtClient: Date.now(),
    createdAt: serverTimestamp()
  });

  alert(type === 'approved' ? 'Versão aprovada com sucesso.' : 'Ajustes enviados com sucesso.');
  window.location.reload();
};

const load = async () => {
  if (!token) {
    showInvalid('Token não informado na URL.');
    return;
  }

  const bridgeSnap = await getDoc(doc(db, 'order_clients', token));
  if (!bridgeSnap.exists()) {
    showInvalid('Token inválido ou expirado.');
    return;
  }

  state.oid = String((bridgeSnap.data() || {}).oid || '');
  if (!state.oid) {
    showInvalid('Pedido não vinculado ao token.');
    return;
  }

  if (oidFromUrl && oidFromUrl !== state.oid) {
    showInvalid('OID não confere com o token informado.');
    return;
  }

  const orderSnap = await getDoc(doc(db, 'orders_public', state.oid));
  if (!orderSnap.exists()) {
    showInvalid('Pedido público não encontrado.');
    return;
  }

  const found = orderSnap.data() || {};
  found.oid = found.oid || state.oid;
  found.versions = Array.isArray(found.versions) ? found.versions : [];
  state.order = found;

  render();
  el('cliente-loading').classList.add('hidden');
  el('cliente-app').classList.remove('hidden');

  el('btn-pick-images').onclick = () => el('feedback-images').click();
  el('feedback-images').onchange = (event) => {
    const incoming = [...(event.target.files || [])];
    const valid = incoming.filter((f) => /image\/(jpeg|png|webp)/.test(f.type) && f.size <= MAX_SIZE);
    state.files = [...state.files, ...valid].slice(0, MAX_FILES);
    renderUploadPreview();
  };

  el('btn-send-feedback').onclick = () => sendClientEvent('changes_requested').catch((err) => {
    console.error(err);
    alert(err.message || 'Falha ao enviar ajustes.');
  });

  el('btn-approve').onclick = () => sendClientEvent('approved').catch((err) => {
    console.error(err);
    alert(err.message || 'Falha ao aprovar.');
  });
};

load().catch((err) => {
  console.error(err);
  showInvalid('Não foi possível carregar o pedido agora.');
});
