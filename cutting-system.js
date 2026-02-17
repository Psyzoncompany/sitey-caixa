(function () {
  const GENDERS = ['adulto', 'infantil', 'unissex'];
  const SIZE_SUGGESTIONS = ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'Único'];

  const state = {
    getOrders: () => [],
    setOrders: () => {},
    saveOrders: () => {},
    activeOrderId: null,
    filter: 'pendentes',
    editorDraft: null,
    debounceTimer: null,
    stylesInjected: false
  };

  const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : `cut-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const toInt = (v) => Math.max(0, Math.floor(Number(v) || 0));

  const summarize = (order) => {
    const grid = Array.isArray(order?.cutting?.grid) ? order.cutting.grid : [];
    const total = grid.reduce((acc, item) => acc + toInt(item.total), 0);
    const cut = grid.reduce((acc, item) => acc + Math.min(toInt(item.cut), toInt(item.total)), 0);
    return { total, cut, done: total > 0 && cut >= total };
  };

  const sanitizeGrid = (grid) => {
    if (!Array.isArray(grid)) return [];
    return grid.map((item, index) => {
      const total = toInt(item?.total);
      const cut = Math.min(total, toInt(item?.cut));
      const gender = GENDERS.includes(item?.gender) ? item.gender : 'unissex';
      const variation = (item?.variation || 'Padrão').toString().trim() || 'Padrão';
      const size = (item?.size || 'Único').toString().trim() || 'Único';
      const label = (item?.label || `${gender} • ${variation} • ${size}`).toString().trim();
      return {
        id: item?.id ? String(item.id) : `${uid()}-${index}`,
        label,
        gender,
        variation,
        size,
        total,
        cut,
        notes: (item?.notes || '').toString().trim()
      };
    }).filter((item) => item.total >= 0);
  };

  const ensureCuttingShape = (order) => {
    const next = { ...order };
    const legacySubtasks = order?.checklist?.cutting?.subtasks;
    let grid = [];

    if (Array.isArray(order?.cutting?.grid)) {
      grid = sanitizeGrid(order.cutting.grid);
    } else if (Array.isArray(legacySubtasks) && legacySubtasks.length) {
      grid = sanitizeGrid(legacySubtasks.map((sub) => {
        const genderMap = { Feminina: 'adulto', Masculina: 'adulto', Infantil: 'infantil' };
        const gender = genderMap[sub?.gender || sub?.type] || 'unissex';
        const variation = sub?.variation || sub?.style || 'Padrão';
        const size = sub?.size || sub?.tamanho || 'Único';
        return {
          id: sub?.id || uid(),
          label: `${gender} • ${variation} • ${size}`,
          gender,
          variation,
          size,
          total: sub?.total ?? sub?.qty ?? sub?.quantity ?? 0,
          cut: sub?.cut ?? sub?.cortado ?? 0,
          notes: sub?.notes || ''
        };
      }));
    } else {
      const fallback = toInt(order?.printing?.total || order?.total || order?.totalItems || 0);
      if (fallback > 0) {
        grid = [{
          id: uid(),
          label: 'Unissex • Padrão • Único',
          gender: 'unissex',
          variation: 'Padrão',
          size: 'Único',
          total: fallback,
          cut: 0,
          notes: 'Item padrão gerado automaticamente'
        }];
      }
    }

    const oldPersonalization = order?.checklist?.cutting?.personalization || {};
    next.cutting = {
      grid,
      personalization: {
        enabled: Boolean(order?.cutting?.personalization?.enabled ?? oldPersonalization?.hasNames),
        names: Array.isArray(order?.cutting?.personalization?.names)
          ? order.cutting.personalization.names
          : String(order?.cutting?.personalization?.names || oldPersonalization?.names || '').split('\n').map((n) => n.trim()).filter(Boolean)
      },
      updatedAt: Date.now()
    };
    return next;
  };

  const migrateCuttingData = (orders) => {
    let changed = false;
    const migrated = orders.map((order) => {
      const needs = !order?.cutting || !Array.isArray(order?.cutting?.grid);
      if (!needs) {
        const sanitized = ensureCuttingShape(order);
        if (JSON.stringify(sanitized.cutting) !== JSON.stringify(order.cutting)) changed = true;
        return sanitized;
      }
      changed = true;
      return ensureCuttingShape(order);
    });
    return { migrated, changed };
  };

  const updateOrder = (orderId, mutator, immediate = true) => {
    const orders = state.getOrders();
    const idx = orders.findIndex((o) => String(o.id) === String(orderId));
    if (idx === -1) return;
    const updated = mutator(ensureCuttingShape(orders[idx]));
    const nextOrders = [...orders];
    nextOrders[idx] = updated;
    state.setOrders(nextOrders);
    if (immediate) state.saveOrders();
  };

  const scheduleSave = () => {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => state.saveOrders(), 300);
  };

  const getClientName = (order) => {
    const clients = JSON.parse(localStorage.getItem('clients') || '[]');
    return clients.find((c) => String(c.id) === String(order.clientId))?.name || 'Cliente não informado';
  };

  const ensureModal = () => {
    let modal = document.getElementById('new-cutting-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'new-cutting-modal';
    modal.className = 'hidden fixed inset-0 z-[10060] bg-black/80 backdrop-blur-sm p-3 md:p-8';
    modal.innerHTML = `
      <div class="cutsys-modal-shell">
        <div class="cutsys-modal-head">
          <h3 id="cutsys-modal-title" class="text-xl font-bold">Controle de Cortes</h3>
          <button type="button" data-action="close" class="cutsys-btn-ghost">Fechar</button>
        </div>
        <div id="cutsys-modal-body" class="cutsys-modal-body"></div>
        <div class="cutsys-modal-foot">
          <button type="button" id="cutsys-finish-btn" class="cutsys-btn-primary" disabled>Concluir Corte</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.dataset.action === 'close') modal.classList.add('hidden');
    });
    return modal;
  };

  const renderExecutionModal = () => {
    const modal = ensureModal();
    const order = state.getOrders().find((o) => String(o.id) === String(state.activeOrderId));
    const body = modal.querySelector('#cutsys-modal-body');
    const finishBtn = modal.querySelector('#cutsys-finish-btn');
    if (!order) return;
    const safeOrder = ensureCuttingShape(order);
    const summary = summarize(safeOrder);
    modal.querySelector('#cutsys-modal-title').textContent = `Controle de Cortes • ${safeOrder.description}`;

    if (!safeOrder.cutting.grid.length) {
      body.innerHTML = `<div class="cutsys-empty"><p>Este pedido não possui grade de corte cadastrada.</p><p>Edite o pedido e cadastre a grade para continuar.</p></div>`;
      finishBtn.disabled = true;
      return;
    }

    body.innerHTML = safeOrder.cutting.grid.map((item) => `
      <article class="cutsys-item" data-item-id="${item.id}">
        <div class="flex items-center justify-between gap-2"><strong>${item.label}</strong><span>${item.cut}/${item.total}</span></div>
        <div class="cutsys-stepper">
          <button type="button" data-step="-1" class="cutsys-btn-ghost">-</button>
          <input type="number" min="0" max="${item.total}" value="${item.cut}" class="cutsys-cut-input">
          <button type="button" data-step="1" class="cutsys-btn-ghost">+</button>
          <button type="button" data-complete="1" class="cutsys-btn-primary">Completar item</button>
        </div>
      </article>
    `).join('');

    finishBtn.disabled = !summary.done;

    body.querySelectorAll('.cutsys-item').forEach((card) => {
      const itemId = card.dataset.itemId;
      const input = card.querySelector('.cutsys-cut-input');
      const setCut = (next) => {
        updateOrder(state.activeOrderId, (ord) => {
          ord.cutting.grid = ord.cutting.grid.map((g) => {
            if (String(g.id) !== String(itemId)) return g;
            const cut = Math.min(toInt(g.total), Math.max(0, toInt(next)));
            return { ...g, cut };
          });
          ord.cutting.updatedAt = Date.now();
          return ord;
        }, false);
        scheduleSave();
        renderExecutionModal();
        renderCuttingTab(document.getElementById('cutting-tasks-container'));
      };
      card.querySelectorAll('button[data-step]').forEach((btn) => btn.addEventListener('click', () => setCut(toInt(input.value) + Number(btn.dataset.step))));
      card.querySelector('button[data-complete]').addEventListener('click', () => setCut(input.max));
      input.addEventListener('input', () => setCut(input.value));
    });

    finishBtn.onclick = () => {
      if (!summarize(ensureCuttingShape(state.getOrders().find((o) => String(o.id) === String(state.activeOrderId)))).done) return;
      modal.classList.add('hidden');
    };
  };

  function renderCuttingTab(containerEl) {
    if (!containerEl) return;
    const orders = state.getOrders().map(ensureCuttingShape).sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));
    const filtered = orders.filter((order) => {
      const s = summarize(order);
      if (state.filter === 'pendentes') return s.cut < s.total;
      if (state.filter === 'concluidos') return s.total > 0 && s.cut >= s.total;
      return true;
    });

    const filters = `
      <div class="cutsys-filters">
        <button data-filter="pendentes" class="${state.filter === 'pendentes' ? 'is-active' : ''}">Pendentes</button>
        <button data-filter="concluidos" class="${state.filter === 'concluidos' ? 'is-active' : ''}">Concluídos</button>
        <button data-filter="todos" class="${state.filter === 'todos' ? 'is-active' : ''}">Todos</button>
      </div>`;

    if (!filtered.length) {
      containerEl.innerHTML = `${filters}<div class="cutsys-empty">Nenhum pedido encontrado nesse filtro.</div>`;
    } else {
      containerEl.innerHTML = `${filters}<div class="space-y-4">${filtered.map((order) => {
        const s = summarize(order);
        const progress = s.total ? Math.min(100, Math.round((s.cut / s.total) * 100)) : 0;
        const status = s.total === 0 ? 'Sem grade' : s.cut >= s.total ? 'Concluído' : s.cut > 0 ? 'Em andamento' : 'Pendente';
        return `<article class="cutsys-card">
          <div class="flex items-start justify-between gap-3">
            <div><h4 class="font-bold">${order.description}</h4><p class="text-xs text-cyan-200">${getClientName(order)} • ${order.deadline || 'Sem prazo'}</p></div>
            <span class="cutsys-badge">${status}</span>
          </div>
          <div class="cutsys-progress"><span style="width:${progress}%"></span></div>
          <div class="flex items-center justify-between"><small>${s.cut}/${s.total} peças</small><button data-open-order="${order.id}" class="cutsys-btn-primary">Abrir</button></div>
        </article>`;
      }).join('')}</div>`;
    }

    containerEl.querySelectorAll('[data-filter]').forEach((btn) => btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      renderCuttingTab(containerEl);
    }));
    containerEl.querySelectorAll('[data-open-order]').forEach((btn) => btn.addEventListener('click', () => openCuttingModal(btn.dataset.openOrder)));
  }

  const renderOrderEditor = (containerEl, order) => {
    const safe = ensureCuttingShape(order || {});
    state.editorDraft = {
      grid: sanitizeGrid(safe.cutting.grid),
      personalization: { ...safe.cutting.personalization }
    };

    const draw = () => {
      const total = state.editorDraft.grid.reduce((a, b) => a + toInt(b.total), 0);
      containerEl.innerHTML = `
        <div class="cutsys-editor-head"><h4 class="font-semibold">Nova grade de corte</h4><span class="cutsys-badge">Total para cortar: ${total}</span></div>
        <div id="cutsys-editor-grid" class="space-y-3"></div>
        <button type="button" id="cutsys-add-item" class="cutsys-btn-primary">+ Adicionar item</button>
        <label class="text-sm flex items-center gap-2 mt-2"><input type="checkbox" id="cutsys-enable-person" ${state.editorDraft.personalization.enabled ? 'checked' : ''}> Personalização</label>
        <textarea id="cutsys-person-names" class="w-full p-2 rounded bg-black/20 border border-white/10 text-sm ${state.editorDraft.personalization.enabled ? '' : 'hidden'}" rows="4" placeholder="Um nome por linha">${(state.editorDraft.personalization.names || []).join('\n')}</textarea>`;

      const gridEl = containerEl.querySelector('#cutsys-editor-grid');
      gridEl.innerHTML = state.editorDraft.grid.map((item, idx) => `
        <article class="cutsys-item" data-idx="${idx}">
          <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
            <select data-field="gender" class="p-2 rounded bg-white/10">${GENDERS.map((g) => `<option value="${g}" ${g === item.gender ? 'selected' : ''}>${g}</option>`).join('')}</select>
            <input data-field="variation" class="p-2 rounded bg-white/10" value="${item.variation}">
            <input data-field="size" list="cutsys-size-suggest" class="p-2 rounded bg-white/10" value="${item.size}">
            <input data-field="total" type="number" min="0" step="1" class="p-2 rounded bg-white/10" value="${item.total}">
            <button type="button" data-remove="${idx}" class="cutsys-btn-ghost">Remover</button>
          </div>
          <textarea data-field="notes" class="w-full p-2 rounded bg-white/10 mt-2" rows="2" placeholder="Observações">${item.notes || ''}</textarea>
        </article>`).join('');

      containerEl.querySelector('#cutsys-add-item').onclick = () => {
        state.editorDraft.grid.push({ id: uid(), label: 'Unissex • Padrão • Único', gender: 'unissex', variation: 'Padrão', size: 'Único', total: 0, cut: 0, notes: '' });
        draw();
      };

      containerEl.querySelector('#cutsys-enable-person').onchange = (e) => {
        state.editorDraft.personalization.enabled = e.target.checked;
        draw();
      };
      const namesEl = containerEl.querySelector('#cutsys-person-names');
      if (namesEl) namesEl.oninput = () => { state.editorDraft.personalization.names = namesEl.value.split('\n').map((n) => n.trim()).filter(Boolean); };

      containerEl.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => {
        state.editorDraft.grid.splice(Number(btn.dataset.remove), 1);
        draw();
      }));
      containerEl.querySelectorAll('.cutsys-item').forEach((card) => {
        const idx = Number(card.dataset.idx);
        card.querySelectorAll('[data-field]').forEach((input) => input.addEventListener('input', () => {
          const field = input.dataset.field;
          let value = input.value;
          if (field === 'total') value = toInt(value);
          state.editorDraft.grid[idx][field] = value;
          state.editorDraft.grid[idx].label = `${state.editorDraft.grid[idx].gender} • ${state.editorDraft.grid[idx].variation || 'Padrão'} • ${state.editorDraft.grid[idx].size || 'Único'}`;
          if (field === 'total') draw();
        }));
      });
    };

    if (!document.getElementById('cutsys-size-suggest')) {
      const dl = document.createElement('datalist');
      dl.id = 'cutsys-size-suggest';
      dl.innerHTML = SIZE_SUGGESTIONS.map((s) => `<option value="${s}"></option>`).join('');
      document.body.appendChild(dl);
    }
    draw();
  };

  const getEditorData = () => ({
    grid: sanitizeGrid(state.editorDraft?.grid || []),
    personalization: {
      enabled: Boolean(state.editorDraft?.personalization?.enabled),
      names: Array.isArray(state.editorDraft?.personalization?.names) ? state.editorDraft.personalization.names : []
    }
  });

  function openCuttingModal(orderId) {
    state.activeOrderId = orderId;
    const modal = ensureModal();
    modal.classList.remove('hidden');
    renderExecutionModal();
  }

  const injectStyles = () => {
    if (state.stylesInjected) return;
    state.stylesInjected = true;
    const st = document.createElement('style');
    st.textContent = `
      .cutsys-card,.cutsys-item,.cutsys-modal-shell,.cutsys-empty{background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:12px}
      .cutsys-progress{height:8px;background:rgba(255,255,255,.1);border-radius:999px;overflow:hidden}.cutsys-progress span{display:block;height:100%;background:linear-gradient(90deg,#06b6d4,#8b5cf6);transition:width .25s}
      .cutsys-badge{padding:4px 10px;border-radius:999px;background:rgba(6,182,212,.2);font-size:12px}
      .cutsys-btn-primary,.cutsys-btn-ghost{border-radius:10px;padding:8px 12px;font-weight:600}
      .cutsys-btn-primary{background:linear-gradient(90deg,#06b6d4,#8b5cf6)}.cutsys-btn-ghost{background:rgba(255,255,255,.08)}
      .cutsys-filters{display:flex;gap:8px;margin-bottom:12px}.cutsys-filters button{padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.08)}.cutsys-filters .is-active{background:rgba(6,182,212,.35)}
      .cutsys-modal-shell{max-width:760px;margin:0 auto;max-height:100%;display:flex;flex-direction:column;gap:10px}.cutsys-modal-body{overflow:auto;display:flex;flex-direction:column;gap:10px}.cutsys-stepper{display:grid;grid-template-columns:46px 1fr 46px auto;gap:8px;align-items:center}
      @media (max-width: 640px){.cutsys-stepper{grid-template-columns:42px 1fr 42px}.cutsys-stepper .cutsys-btn-primary{grid-column:1/-1}}
    `;
    document.head.appendChild(st);
  };

  function init({ getOrders, setOrders, saveOrders }) {
    state.getOrders = getOrders;
    state.setOrders = setOrders;
    state.saveOrders = saveOrders;
    injectStyles();

    const { migrated, changed } = migrateCuttingData(getOrders());
    if (changed) {
      setOrders(migrated);
      saveOrders();
    }
  }

  window.CuttingSystem = { init, renderCuttingTab, openCuttingModal, renderOrderEditor, getEditorData, migrateCuttingData };
})();
