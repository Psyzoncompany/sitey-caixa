import { db, storage } from './js/firebase-init.js';
import { collection, doc, getDocs, limit, onSnapshot, query, serverTimestamp, updateDoc, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getDownloadURL, ref, uploadBytes } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

const token = new URLSearchParams(window.location.search).get('token');
const accessForm = document.getElementById('access-form');
const accessError = document.getElementById('access-error');
const accessStep = document.getElementById('access-step');
const clientPanel = document.getElementById('client-panel');
const descEditor = document.getElementById('desc-editor');

let pedido = null;
let refFiles = [];

const showError = (m) => {
  accessError.textContent = m;
  accessError.classList.remove('hidden');
};

if (!token) showError('Link inválido: token não encontrado.');

document.querySelectorAll('.fmt-btn').forEach((btn) => btn.addEventListener('click', () => document.execCommand(btn.dataset.cmd)));

descEditor.addEventListener('focus', () => {});

autoPlaceholder();
function autoPlaceholder() {
  const placeholder = descEditor.dataset.placeholder;
  if (!descEditor.textContent.trim()) descEditor.innerHTML = `<span class="text-slate-500">${placeholder}</span>`;
  descEditor.addEventListener('focus', () => {
    if (descEditor.textContent === placeholder) descEditor.innerHTML = '';
  });
}

accessForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  accessError.classList.add('hidden');
  const code = document.getElementById('access-code').value.trim();
  if (!/^\d{4}$/.test(code)) return showError('Digite um código válido com 4 números.');

  const q = query(collection(db, 'pedidos_arte'), where('token', '==', token), where('codigo', '==', code), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return showError('Token ou código inválido. Confira e tente novamente.');

  pedido = { id: snap.docs[0].id, ...snap.docs[0].data() };
  accessStep.classList.add('hidden');
  clientPanel.classList.remove('hidden');
  startRealtime();
});

function bindUploadArea() {
  const drop = document.getElementById('dropzone');
  const input = document.getElementById('ref-input');
  const preview = document.getElementById('ref-preview');
  const render = () => {
    preview.innerHTML = refFiles.map((f) => `<img class="h-20 w-full object-cover rounded-lg border border-slate-700" src="${URL.createObjectURL(f)}"/>`).join('');
  };
  input.addEventListener('change', () => {
    refFiles = [...refFiles, ...Array.from(input.files || [])].slice(0, 5);
    render();
  });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('dragover'); }));
  drop.addEventListener('drop', (e) => {
    refFiles = [...refFiles, ...Array.from(e.dataTransfer.files || [])].slice(0, 5);
    render();
  });
}
bindUploadArea();

async function uploadClientFiles(files, folder) {
  const urls = [];
  for (const file of files) {
    const fileRef = ref(storage, `pedidos_arte/${pedido.id}/${folder}/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    urls.push(await getDownloadURL(fileRef));
  }
  return urls;
}

document.getElementById('send-order-btn').addEventListener('click', async () => {
  if (!pedido) return;
  const placeholder = descEditor.dataset.placeholder;
  const text = descEditor.innerText.trim() === placeholder ? '' : descEditor.innerHTML.trim();
  if (!text) return alert('Descreva a arte antes de enviar.');

  const urls = await uploadClientFiles(refFiles, 'referencias');
  await updateDoc(doc(db, 'pedidos_arte', pedido.id), {
    descricao_cliente: text,
    imagens: urls,
    status: 'em_producao',
    atualizado_em: serverTimestamp(),
    last_event: 'pedido_enviado'
  });
  refFiles = [];
  document.getElementById('ref-preview').innerHTML = '';
  alert('Pedido enviado com sucesso!');
});

function startRealtime() {
  onSnapshot(doc(db, 'pedidos_arte', pedido.id), (snap) => {
    if (!snap.exists()) return;
    pedido = { id: snap.id, ...snap.data() };
    renderPedido();
  });
}

function renderPedido() {
  const used = pedido.revisoes_usadas || 0;
  const free = pedido.revisoes_gratuitas || 2;
  const warn = used >= free ? '<span class="text-rose-300 font-bold">Próxima revisão: R$10,00</span>' : '';
  document.getElementById('revision-counter').innerHTML = `Revisões usadas: ${used} de ${free} gratuitas. ${warn}`;

  const versions = Array.isArray(pedido.versoes) ? pedido.versoes : [];
  document.getElementById('versions-list').innerHTML = versions.length ? versions.map((v, i) => `
    <article class="rounded-xl border border-slate-700 bg-slate-900 p-3">
      <p class="text-xs text-slate-400">Versão ${v.numero || i + 1} • ${new Date(v.criado_em || Date.now()).toLocaleString('pt-BR')} • ${v.status || 'arte_enviada'}</p>
      ${v.imagem ? `<img src="${v.imagem}" class="mt-2 rounded-lg w-full max-h-80 object-contain bg-slate-950">` : ''}
      <p class="text-sm mt-2 text-slate-300">${v.mensagem || 'Sem mensagem.'}</p>
    </article>`).join('') : '<p class="text-sm text-slate-400">Nenhuma versão recebida ainda.</p>';
}

const modal = document.getElementById('revision-modal');
document.getElementById('open-revision-modal').addEventListener('click', () => {
  const paid = (pedido.revisoes_usadas || 0) >= (pedido.revisoes_gratuitas || 2);
  document.getElementById('revision-price').textContent = paid ? 'Esta revisão será cobrada: R$10,00' : 'Esta revisão ainda é gratuita.';
  modal.showModal();
});
document.getElementById('close-revision-modal').addEventListener('click', () => modal.close());

document.getElementById('revision-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pedido) return;
  const txt = document.getElementById('revision-text').value.trim();
  if (!txt) return;
  const files = Array.from(document.getElementById('revision-files').files || []).slice(0, 5);
  const extraRefs = files.length ? await uploadClientFiles(files, 'revisoes') : [];

  const revisoes = (pedido.revisoes_usadas || 0) + 1;
  const gratis = pedido.revisoes_gratuitas || 2;
  const extraCost = revisoes > gratis ? 10 : 0;

  const historico = Array.isArray(pedido.revision_history) ? pedido.revision_history : [];
  historico.push({ texto: txt, referencias: extraRefs, criado_em: new Date().toISOString(), pago: extraCost > 0, valor: extraCost });

  await updateDoc(doc(db, 'pedidos_arte', pedido.id), {
    revisoes_usadas: revisoes,
    custo_adicional: (pedido.custo_adicional || 0) + extraCost,
    revision_history: historico,
    status: 'em_revisao',
    atualizado_em: serverTimestamp(),
    last_event: 'revisao_solicitada'
  });

  modal.close();
  e.target.reset();
});
