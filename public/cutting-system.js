(function () {
  const STYLE_OPTIONS = ['Gola Polo', 'Comum', 'Regata'];
  const GENDER_OPTIONS = ['Feminino', 'Masculino', 'Infantil'];
  const SIZE_OPTIONS = ['PP', 'P', 'M', 'G', 'GG', 'EXG', 'G1+'];
  const COLOR_PALETTE = [
    { name: 'Branco', value: '#F8FAFC' },
    { name: 'Preto', value: '#0F172A' },
    { name: 'Azul', value: '#2563EB' },
    { name: 'Vermelho', value: '#DC2626' },
    { name: 'Verde', value: '#16A34A' },
    { name: 'Amarelo', value: '#EAB308' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Roxo', value: '#7C3AED' },
    { name: 'Laranja', value: '#F97316' }
  ];

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
  const toInt = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));

  const normalizeItem = (item, index) => {
    const gender = GENDER_OPTIONS.includes(item?.gender) ? item.gender : 'Masculino';
    const total = toInt(item?.total);
    const cut = clamp(toInt(item?.cut), 0, total);
    const age = clamp(toInt(item?.age || item?.size), 1, 14);
    const size = gender === 'Infantil'
      ? `Idade ${age}`
      : (SIZE_OPTIONS.includes(item?.size) ? item.size : 'M');

    return {
      id: item?.id ? String(item.id) : `${uid()}-${index}`,
      style: STYLE_OPTIONS.includes(item?.style) ? item.style : 'Comum',
      gender,
      size,
      age,
      colors: Array.isArray(item?.colors)
        ? item.colors.filter((c) => COLOR_PALETTE.some((p) => p.value === c))
        : [],
      total,
      cut,
      notes: String(item?.notes || '').trim()
    };
  };

  const sanitizeGrid = (grid) => (Array.isArray(grid) ? grid : []).map(normalizeItem);

  const summarize = (order) => {
    const grid = Array.isArray(order?.cutting?.grid) ? order.cutting.grid : [];
    const total = grid.reduce((acc, item) => acc + toInt(item.total), 0);
    const cut = grid.reduce((acc, item) => acc + clamp(toInt(item.cut), 0, toInt(item.total)), 0);
    const doneItems = grid.filter((item) => toInt(item.total) > 0 && toInt(item.cut) >= toInt(item.total)).length;
    return { total, cut, done: total > 0 && cut >= total, doneItems, itemCount: grid.length };
  };

  const ensureCuttingShape = (order) => {
    const next = { ...order };
    let grid = [];

    if (Array.isArray(order?.cutting?.grid)) {
      grid = sanitizeGrid(order.cutting.grid);
    } else if (Array.isArray(order?.checklist?.cutting?.subtasks)) {
      grid = sanitizeGrid(order.checklist.cutting.subtasks.map((s) => ({
        id: s.id,
        style: s.variation || s.style || 'Comum',
        gender: s.gender === 'infantil' || s.gender === 'Infantil' ? 'Infantil' : 'Masculino',
        size: s.size || 'M',
        total: s.total ?? s.qty ?? 0,
        cut: s.cut ?? 0,
        notes: s.notes || '',
        colors: s.colors || []
      })));
    } else {
      const fallback = toInt(order?.printing?.total || order?.totalItems || 0);
      if (fallback > 0) {
        grid = [normalizeItem({
          id: uid(),
          style: 'Comum',
          gender: 'Masculino',
          size: 'M',
          total: fallback,
          cut: 0,
          colors: ['#F8FAFC']
        }, 0)];
      }
    }

    next.cutting = {
      grid,
      personalization: {
        enabled: Boolean(order?.cutting?.personalization?.enabled),
        names: Array.isArray(order?.cutting?.personalization?.names) ? order.cutting.personalization.names : []
      },
      finalNotes: String(order?.cutting?.finalNotes || '').trim(),
      updatedAt: Date.now()
    };

    if (next.checklist?.cutting) {
      const s = summarize(next);
      next.checklist.cutting.completed = s.done;
    }

    return next;
  };

  const migrateCuttingData = (orders) => {
    let changed = false;
    const migrated = (Array.isArray(orders) ? orders : []).map((order) => {
      const normalized = ensureCuttingShape(order);
      if (JSON.stringify(normalized.cutting) !== JSON.stringify(order?.cutting)) changed = true;
      return normalized;
    });
    return { migrated, changed };
  };

  const getClientName = (order) => {
    const clients = JSON.parse(localStorage.getItem('clients') || '[]');
    const client = clients.find((c) => String(c.id) === String(order.clientId));
    return client?.name || 'Cliente não informado';
  };

  const scheduleSave = () => {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => state.saveOrders(), 300);
  };

  const commitOrderUpdate = (orderId, mutator, immediate = false) => {
    const orders = state.getOrders();
    const idx = orders.findIndex((o) => String(o.id) === String(orderId));
    if (idx < 0) return;
    const current = ensureCuttingShape(orders[idx]);
    const updated = ensureCuttingShape(mutator({ ...current }));
    const next = [...orders];
    next[idx] = updated;
    state.setOrders(next);
    if (immediate) state.saveOrders();
    else scheduleSave();
  };

  const icon = {
    select: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2m-8 0 1 12h8l1-12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clone: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 9h10v10H9zM5 5h10v2M5 5v10h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 5h10v10M19 5 8 16M5 9v10h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  const buildColorDots = (colors) => {
    const safe = Array.isArray(colors) ? colors : [];
    return safe.map((color) => `<span class="cutsys-mini-dot" style="--dot:${color}"></span>`).join('') || '<span class="cutsys-muted">Sem cor</span>';
  };

  const fireBurst = (target, level = 'item') => {
    if (!target) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'cutsys-confetti';
    target.appendChild(canvas);
    const rect = target.getBoundingClientRect();
    canvas.width = Math.max(220, rect.width);
    canvas.height = Math.max(120, rect.height * (level === 'all' ? 1.1 : 0.7));
    const ctx = canvas.getContext('2d');
    const count = level === 'all' ? 160 : 80;
    const particles = Array.from({ length: count }, () => ({
      x: canvas.width / 2,
      y: canvas.height * 0.65,
      r: Math.random() * 3 + 1.4,
      c: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)].value,
      vx: (Math.random() - 0.5) * (level === 'all' ? 7 : 5),
      vy: -(Math.random() * (level === 'all' ? 9 : 7) + 2),
      life: Math.random() * 40 + 70
    }));
    let frame = 0;
    const tick = () => {
      frame += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;
        p.life -= 1;
        ctx.globalAlpha = Math.max(0, p.life / 100);
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      if (frame < 120) requestAnimationFrame(tick);
      else canvas.remove();
    };
    requestAnimationFrame(tick);
  };

  const ensureModal = () => {
    let modal = document.getElementById('new-cutting-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'new-cutting-modal';
    modal.className = 'hidden fixed inset-0 z-[10060] bg-black/75 backdrop-blur-sm p-2 md:p-6';
    modal.innerHTML = `
      <div class="cutsys-modal-shell">
        <div class="cutsys-modal-head">
          <h3 id="cutsys-modal-title">Controle de Cortes</h3>
          <button type="button" data-action="close" class="cutsys-btn-icon" title="Fechar">×</button>
        </div>
        <div id="cutsys-modal-body" class="cutsys-modal-body"></div>
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
    if (!order) return;
    const safe = ensureCuttingShape(order);
    const summary = summarize(safe);

    modal.querySelector('#cutsys-modal-title').innerHTML = `${esc(safe.description || 'Pedido')} <span class="cutsys-modal-sub">${summary.cut}/${summary.total} peças</span>`;
    const body = modal.querySelector('#cutsys-modal-body');

    if (!safe.cutting.grid.length) {
      body.innerHTML = '<div class="cutsys-empty">Este pedido ainda não possui grade de corte.</div>';
      return;
    }

    body.innerHTML = `
      <div class="cutsys-modal-grid">
        ${safe.cutting.grid.map((item) => {
          const total = toInt(item.total);
          const cut = clamp(toInt(item.cut), 0, total);
          const done = total > 0 && cut >= total;
          return `<article class="cutsys-control-item ${done ? 'is-done' : ''}" data-item-id="${item.id}">
            <div class="cutsys-control-top">
              <div>
                <h4>${esc(item.style)} • ${esc(item.gender)} • ${esc(item.gender === 'Infantil' ? `Idade ${item.age}` : item.size)}</h4>
                <div class="cutsys-mini-dots">${buildColorDots(item.colors)}</div>
              </div>
              <span class="cutsys-chip">${cut}/${total}</span>
            </div>
            <div class="cutsys-progress"><span style="width:${total ? Math.round((cut / total) * 100) : 0}%"></span></div>
            <div class="cutsys-stepper">
              <button type="button" class="cutsys-step" data-step="-1">-</button>
              <input type="number" class="cutsys-cut-input" min="0" max="${total}" value="${cut}">
              <button type="button" class="cutsys-step" data-step="1">+</button>
              <button type="button" class="cutsys-btn-primary" data-complete="1">Finalizar item</button>
            </div>
          </article>`;
        }).join('')}
      </div>
      <section class="cutsys-final-note-wrap">
        <label for="cutsys-final-notes">Observações Finais do Corte</label>
        <textarea id="cutsys-final-notes" rows="4" placeholder="Registre ajustes finais, perda, observações para costura...">${esc(safe.cutting.finalNotes || '')}</textarea>
      </section>
      <div class="cutsys-final-row">
        ${summary.done ? '<span class="cutsys-badge-done">Corte Finalizado</span>' : '<span class="cutsys-muted">Finalize todos os itens para concluir o corte.</span>'}
        <button type="button" id="cutsys-close-control" class="cutsys-btn-ghost">Fechar</button>
      </div>`;

    body.querySelector('#cutsys-close-control').onclick = () => modal.classList.add('hidden');

    body.querySelectorAll('.cutsys-control-item').forEach((card) => {
      const itemId = card.dataset.itemId;
      const input = card.querySelector('.cutsys-cut-input');
      const setCut = (raw) => {
        const current = safe.cutting.grid.find((g) => String(g.id) === String(itemId));
        const prevCut = toInt(current?.cut);
        const max = toInt(current?.total);
        const nextCut = clamp(toInt(raw), 0, max);
        commitOrderUpdate(state.activeOrderId, (ord) => {
          ord.cutting.grid = ord.cutting.grid.map((it) => {
            if (String(it.id) !== String(itemId)) return it;
            return { ...it, cut: clamp(nextCut, 0, toInt(it.total)) };
          });
          ord.cutting.updatedAt = Date.now();
          return ord;
        });
        if (max > 0 && prevCut < max && nextCut >= max) fireBurst(card, 'item');
        renderExecutionModal();
        const container = document.getElementById('cutting-tasks-container');
        renderCuttingTab(container);
      };
      card.querySelectorAll('[data-step]').forEach((btn) => btn.addEventListener('click', () => setCut(toInt(input.value) + Number(btn.dataset.step))));
      card.querySelector('[data-complete]').addEventListener('click', () => setCut(input.max));
      input.addEventListener('input', () => setCut(input.value));
    });

    const notesEl = body.querySelector('#cutsys-final-notes');
    notesEl.addEventListener('input', () => {
      const value = notesEl.value.slice(0, 2400);
      commitOrderUpdate(state.activeOrderId, (ord) => {
        ord.cutting.finalNotes = value;
        ord.cutting.updatedAt = Date.now();
        return ord;
      });
    });

    if (summary.done) {
      const shell = modal.querySelector('.cutsys-modal-shell');
      if (!shell.dataset.didCelebrate || shell.dataset.didCelebrate !== String(state.activeOrderId)) {
        shell.dataset.didCelebrate = String(state.activeOrderId);
        fireBurst(shell, 'all');
      }
    }
  };

  const createDraftItem = () => normalizeItem({ id: uid(), style: 'Comum', gender: 'Masculino', size: 'M', total: 0, cut: 0, colors: [] }, 0);

  const renderOrderEditor = (containerEl, order) => {
    const safe = ensureCuttingShape(order || {});
    state.editorDraft = {
      grid: sanitizeGrid(safe.cutting.grid),
      personalization: { ...safe.cutting.personalization }
    };

    const draw = () => {
      const totalPieces = state.editorDraft.grid.reduce((acc, item) => acc + toInt(item.total), 0);
      containerEl.innerHTML = `
        <div class="cutsys-editor-head">
          <div>
            <h4>Grade de Corte</h4>
            <p>Itens organizados por estilo, sexo, tamanho e cores.</p>
          </div>
          <div class="cutsys-counter ${totalPieces === 0 ? 'is-zero' : ''}">
            <strong>${totalPieces}</strong>
            <span>peças totais</span>
          </div>
        </div>
        <div id="cutsys-editor-grid" class="cutsys-editor-grid"></div>
        <button type="button" id="cutsys-add-item" class="cutsys-btn-primary">Adicionar item</button>`;

      const gridEl = containerEl.querySelector('#cutsys-editor-grid');
      if (!state.editorDraft.grid.length) {
        gridEl.innerHTML = '<div class="cutsys-empty">A grade está vazia. Adicione itens para iniciar o corte.</div>';
      } else {
        gridEl.innerHTML = state.editorDraft.grid.map((item, idx) => {
          const isInfantil = item.gender === 'Infantil';
          return `<article class="cutsys-editor-card" data-idx="${idx}">
            <div class="cutsys-row-main">
              <label class="cutsys-field cutsys-select-wrap"><span>Estilo</span><select data-field="style">${STYLE_OPTIONS.map((opt) => `<option value="${opt}" ${opt === item.style ? 'selected' : ''}>${opt}</option>`).join('')}</select><i class="cutsys-select-icon">${icon.select}</i></label>
              <label class="cutsys-field cutsys-select-wrap"><span>Sexo</span><select data-field="gender">${GENDER_OPTIONS.map((opt) => `<option value="${opt}" ${opt === item.gender ? 'selected' : ''}>${opt}</option>`).join('')}</select><i class="cutsys-select-icon">${icon.select}</i></label>
              ${isInfantil
                ? `<label class="cutsys-field"><span>Idade</span><input data-field="age" type="number" min="1" max="14" placeholder="Ex: 8" value="${item.age}"></label>`
                : `<label class="cutsys-field cutsys-select-wrap"><span>Tamanho</span><select data-field="size">${SIZE_OPTIONS.map((size) => `<option value="${size}" ${size === item.size ? 'selected' : ''}>${size}</option>`).join('')}</select><i class="cutsys-select-icon">${icon.select}</i></label>`}
              <div class="cutsys-field"><span>Cor</span><div class="cutsys-palette">${COLOR_PALETTE.map((color) => `<button type="button" class="cutsys-color ${item.colors.includes(color.value) ? 'is-selected' : ''}" title="${color.name}" data-color="${color.value}" style="--color:${color.value}"></button>`).join('')}</div></div>
            </div>
            <div class="cutsys-row-sub">
              <label class="cutsys-field cutsys-total"><span>Total</span><div class="cutsys-stepper-mini"><button type="button" data-adjust="-1">-</button><input data-field="total" type="number" min="0" step="1" value="${item.total}"><button type="button" data-adjust="1">+</button></div></label>
              <label class="cutsys-field"><span>Observação</span><textarea data-field="notes" rows="2" placeholder="Opcional">${esc(item.notes || '')}</textarea></label>
            </div>
            <div class="cutsys-actions">
              <button type="button" class="cutsys-btn-ghost" data-remove="${idx}" title="Apagar">${icon.trash}<span>Apagar</span></button>
              <button type="button" class="cutsys-btn-ghost" data-duplicate="${idx}" title="Duplicar">${icon.clone}<span>Duplicar</span></button>
            </div>
          </article>`;
        }).join('');
      }

      containerEl.querySelector('#cutsys-add-item').onclick = () => {
        state.editorDraft.grid.push(createDraftItem());
        draw();
      };

      containerEl.querySelectorAll('[data-remove]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const index = Number(btn.dataset.remove);
          const card = btn.closest('.cutsys-editor-card');
          const confirmed = window.confirm('Deseja apagar este item da grade?');
          if (!confirmed) return;
          if (card) card.classList.add('is-removing');
          setTimeout(() => {
            state.editorDraft.grid.splice(index, 1);
            draw();
          }, 180);
        });
      });

      containerEl.querySelectorAll('[data-duplicate]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const index = Number(btn.dataset.duplicate);
          const base = state.editorDraft.grid[index];
          state.editorDraft.grid.splice(index + 1, 0, { ...base, id: uid() });
          draw();
          const card = containerEl.querySelector(`.cutsys-editor-card[data-idx="${index + 1}"]`);
          if (card) {
            card.classList.add('is-new');
            setTimeout(() => card.classList.remove('is-new'), 360);
          }
        });
      });

      containerEl.querySelectorAll('.cutsys-editor-card').forEach((card) => {
        const idx = Number(card.dataset.idx);
        const item = state.editorDraft.grid[idx];
        card.querySelectorAll('[data-field]').forEach((input) => {
          input.addEventListener('input', () => {
            const field = input.dataset.field;
            if (field === 'gender') {
              item.gender = GENDER_OPTIONS.includes(input.value) ? input.value : 'Masculino';
              if (item.gender === 'Infantil') {
                item.age = clamp(toInt(item.age || 8), 1, 14);
                item.size = `Idade ${item.age}`;
              } else {
                item.size = SIZE_OPTIONS.includes(item.size) ? item.size : 'M';
              }
              draw();
              return;
            }
            if (field === 'size') item.size = SIZE_OPTIONS.includes(input.value) ? input.value : 'M';
            if (field === 'age') {
              item.age = clamp(toInt(input.value), 1, 14);
              item.size = `Idade ${item.age}`;
              input.value = item.age;
            }
            if (field === 'style') item.style = STYLE_OPTIONS.includes(input.value) ? input.value : 'Comum';
            if (field === 'total') {
              item.total = toInt(input.value);
              input.value = item.total;
              card.classList.add('pulse');
              setTimeout(() => card.classList.remove('pulse'), 220);
            }
            if (field === 'notes') item.notes = input.value.slice(0, 240);
          });
        });
        card.querySelectorAll('[data-color]').forEach((colorBtn) => {
          colorBtn.addEventListener('click', () => {
            const color = colorBtn.dataset.color;
            if (!color) return;
            if (item.colors.includes(color)) item.colors = item.colors.filter((c) => c !== color);
            else item.colors.push(color);
            draw();
          });
        });
        card.querySelectorAll('[data-adjust]').forEach((stepBtn) => {
          stepBtn.addEventListener('click', () => {
            item.total = Math.max(0, toInt(item.total) + Number(stepBtn.dataset.adjust || 0));
            draw();
          });
        });
      });
    };

    draw();
  };

  const getEditorData = () => ({
    grid: sanitizeGrid(state.editorDraft?.grid || []),
    personalization: {
      enabled: Boolean(state.editorDraft?.personalization?.enabled),
      names: Array.isArray(state.editorDraft?.personalization?.names) ? state.editorDraft.personalization.names : []
    }
  });

  const openCuttingModal = (orderId) => {
    state.activeOrderId = orderId;
    const modal = ensureModal();
    modal.classList.remove('hidden');
    renderExecutionModal();
  };

  const renderCuttingTab = (containerEl) => {
    if (!containerEl) return;
    const orders = state.getOrders().map(ensureCuttingShape);
    const sorted = orders.sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));
    const filtered = sorted.filter((order) => {
      const s = summarize(order);
      if (state.filter === 'pendentes') return !s.done;
      if (state.filter === 'concluidos') return s.done;
      return true;
    });

    const filters = `
      <div class="cutsys-filters">
        <button data-filter="pendentes" class="${state.filter === 'pendentes' ? 'is-active' : ''}">Pendentes</button>
        <button data-filter="concluidos" class="${state.filter === 'concluidos' ? 'is-active' : ''}">Concluídos</button>
        <button data-filter="todos" class="${state.filter === 'todos' ? 'is-active' : ''}">Todos</button>
      </div>`;

    if (!filtered.length) {
      containerEl.innerHTML = `${filters}<div class="cutsys-empty">Nenhum pedido encontrado para este filtro.</div>`;
    } else {
      containerEl.innerHTML = `${filters}<div class="cutsys-orders">${filtered.map((order) => {
        const s = summarize(order);
        const progress = s.total ? Math.round((s.cut / s.total) * 100) : 0;
        const status = s.total === 0 ? 'Pendente' : s.done ? 'Concluído' : s.cut > 0 ? 'Em andamento' : 'Pendente';
        const badgeClass = status === 'Concluído' ? 'is-done' : status === 'Em andamento' ? 'is-doing' : 'is-pending';
        return `<article class="cutsys-card-order">
          <div class="cutsys-card-head">
            <div>
              <h4>${esc(order.description || 'Pedido sem nome')}</h4>
              <p>${esc(getClientName(order))} • Prazo: ${esc(order.deadline || 'Sem prazo')}</p>
            </div>
            <span class="cutsys-status ${badgeClass}">${status}</span>
          </div>
          <div class="cutsys-progress"><span style="width:${progress}%"></span></div>
          <div class="cutsys-card-foot">
            <small>${s.cut}/${s.total} peças • ${s.doneItems}/${s.itemCount} itens finalizados</small>
            <button type="button" class="cutsys-btn-primary" data-open-order="${order.id}">${icon.open}<span>Abrir Controle</span></button>
          </div>
        </article>`;
      }).join('')}</div>`;
    }

    containerEl.querySelectorAll('[data-filter]').forEach((btn) => btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      renderCuttingTab(containerEl);
    }));
    containerEl.querySelectorAll('[data-open-order]').forEach((btn) => btn.addEventListener('click', () => openCuttingModal(btn.dataset.openOrder)));
  };

  const injectStyles = () => {
    if (state.stylesInjected) return;
    state.stylesInjected = true;
    const st = document.createElement('style');
    st.textContent = `
      .cutsys-orders,.cutsys-modal-grid,.cutsys-editor-grid{display:grid;gap:14px}.cutsys-orders{grid-template-columns:repeat(auto-fit,minmax(270px,1fr))}
      .cutsys-card-order,.cutsys-editor-card,.cutsys-control-item,.cutsys-modal-shell,.cutsys-empty{border-radius:14px;border:1px solid rgba(148,163,184,.35);background:linear-gradient(145deg,rgba(15,23,42,.65),rgba(30,41,59,.45));box-shadow:0 10px 30px rgba(15,23,42,.24);backdrop-filter:blur(8px);transition:all .2s ease}
      .cutsys-card-order:hover,.cutsys-editor-card:hover,.cutsys-control-item:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(15,23,42,.32)}
      .cutsys-card-order{padding:14px}.cutsys-card-head{display:flex;justify-content:space-between;gap:10px}.cutsys-card-head h4{font-weight:700}.cutsys-card-head p{font-size:12px;color:#cbd5e1}
      .cutsys-status{padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700}.cutsys-status.is-pending{background:rgba(245,158,11,.18);color:#fcd34d}.cutsys-status.is-doing{background:rgba(59,130,246,.18);color:#93c5fd}.cutsys-status.is-done{background:rgba(34,197,94,.2);color:#86efac}
      .cutsys-progress{height:10px;border-radius:999px;background:rgba(148,163,184,.2);overflow:hidden;margin:10px 0}.cutsys-progress span{display:block;height:100%;background:linear-gradient(90deg,#06b6d4,#8b5cf6);transition:width .2s ease}
      .cutsys-card-foot{display:flex;justify-content:space-between;align-items:center;gap:8px}.cutsys-card-foot small{font-size:11px;color:#cbd5e1}
      .cutsys-btn-primary,.cutsys-btn-ghost,.cutsys-btn-icon{display:inline-flex;align-items:center;gap:6px;border-radius:10px;padding:8px 12px;font-weight:600;transition:all .2s ease;border:1px solid transparent}
      .cutsys-btn-primary{background:linear-gradient(90deg,#06b6d4,#8b5cf6);color:#fff}.cutsys-btn-primary:hover{filter:brightness(1.08)}
      .cutsys-btn-primary svg,.cutsys-btn-ghost svg{width:14px;height:14px}.cutsys-btn-ghost{background:rgba(15,23,42,.45);border-color:rgba(148,163,184,.35);color:#e2e8f0}.cutsys-btn-ghost:hover{border-color:rgba(6,182,212,.5)}
      .cutsys-btn-icon{background:rgba(15,23,42,.5);padding:6px 10px;font-size:20px;line-height:1;color:#f8fafc}
      .cutsys-filters{display:flex;gap:8px;margin-bottom:14px}.cutsys-filters button{padding:7px 12px;border-radius:999px;background:rgba(15,23,42,.44);font-size:12px;border:1px solid rgba(148,163,184,.35)}.cutsys-filters .is-active{background:rgba(6,182,212,.2);border-color:rgba(6,182,212,.6)}
      .cutsys-modal-shell{max-width:980px;margin:0 auto;max-height:100%;display:flex;flex-direction:column;padding:16px}.cutsys-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .cutsys-modal-head h3{font-size:20px;font-weight:800}.cutsys-modal-sub{font-size:12px;color:#cbd5e1;margin-left:8px}.cutsys-modal-body{overflow:auto;padding-top:12px;display:grid;gap:14px}
      .cutsys-control-item{padding:12px}.cutsys-control-item.is-done{border-color:rgba(16,185,129,.7)}.cutsys-control-top{display:flex;justify-content:space-between;gap:10px}.cutsys-control-top h4{font-weight:700}
      .cutsys-mini-dots{display:flex;align-items:center;gap:6px;margin-top:6px}.cutsys-mini-dot{width:12px;height:12px;border-radius:999px;background:var(--dot);border:1px solid rgba(255,255,255,.8)}
      .cutsys-chip{padding:2px 8px;border-radius:999px;font-size:11px;background:rgba(148,163,184,.2)}
      .cutsys-stepper{display:grid;grid-template-columns:40px 1fr 40px auto;gap:8px;align-items:center}.cutsys-step{border-radius:10px;background:rgba(15,23,42,.5);border:1px solid rgba(148,163,184,.35);padding:8px 0}
      .cutsys-cut-input,.cutsys-field input,.cutsys-field select,.cutsys-field textarea,#cutsys-final-notes{width:100%;border-radius:10px;border:1px solid rgba(148,163,184,.35);background:rgba(15,23,42,.5);padding:8px 10px;outline:none;transition:all .2s ease}
      .cutsys-cut-input:focus,.cutsys-field input:focus,.cutsys-field select:focus,.cutsys-field textarea:focus,#cutsys-final-notes:focus{border-color:#22d3ee;box-shadow:0 0 0 3px rgba(34,211,238,.15)}
      .cutsys-final-note-wrap{display:grid;gap:7px}.cutsys-final-note-wrap label{font-size:13px;font-weight:600}.cutsys-final-row{display:flex;justify-content:space-between;align-items:center;gap:8px}
      .cutsys-badge-done{padding:6px 12px;border-radius:999px;background:rgba(34,197,94,.2);font-size:12px;font-weight:700;color:#86efac}.cutsys-muted{font-size:12px;color:#94a3b8}
      .cutsys-editor-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px}.cutsys-editor-head h4{font-size:18px;font-weight:800}.cutsys-editor-head p{font-size:12px;color:#94a3b8}
      .cutsys-counter{display:grid;text-align:right}.cutsys-counter strong{font-size:22px}.cutsys-counter.is-zero strong{color:#f59e0b}.cutsys-counter span{font-size:11px;color:#cbd5e1}
      .cutsys-editor-card{padding:12px;display:grid;gap:10px}.cutsys-row-main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.cutsys-row-sub{display:grid;grid-template-columns:190px 1fr;gap:10px}
      .cutsys-field{display:grid;gap:6px}.cutsys-field span{font-size:12px;color:#cbd5e1;font-weight:600}
      .cutsys-select-wrap{position:relative}.cutsys-select-wrap select{appearance:none;padding-right:30px}.cutsys-select-icon{position:absolute;right:10px;bottom:9px;width:14px;height:14px;color:#94a3b8;pointer-events:none}.cutsys-select-icon svg{width:100%;height:100%}
      .cutsys-palette{display:flex;flex-wrap:wrap;gap:8px}.cutsys-color{width:23px;height:23px;border-radius:999px;background:var(--color);border:2px solid rgba(255,255,255,.45);box-shadow:inset 0 0 0 1px rgba(15,23,42,.3);transition:all .2s ease}.cutsys-color.is-selected{transform:scale(1.12);border-color:#22d3ee;box-shadow:0 0 0 3px rgba(34,211,238,.23)}
      .cutsys-stepper-mini{display:grid;grid-template-columns:30px 1fr 30px;gap:6px}.cutsys-stepper-mini button{border-radius:8px;background:rgba(15,23,42,.5);border:1px solid rgba(148,163,184,.35)}
      .cutsys-actions{display:flex;gap:8px;justify-content:flex-end}.cutsys-empty{padding:16px;text-align:center;color:#cbd5e1}.cutsys-confetti{position:absolute;inset:0;pointer-events:none}
      .cutsys-control-item,.cutsys-modal-shell{position:relative}.cutsys-editor-card.is-removing{opacity:0;transform:scale(.98)}.cutsys-editor-card.is-new{animation:cutsysPop .35s ease}.cutsys-editor-card.pulse{animation:cutsysPulse .22s ease}
      @keyframes cutsysPop{0%{transform:scale(.97);opacity:.5}100%{transform:scale(1);opacity:1}}@keyframes cutsysPulse{50%{transform:translateY(-1px)}}
      @media (max-width: 920px){.cutsys-row-main{grid-template-columns:1fr 1fr}.cutsys-row-sub{grid-template-columns:1fr}}
      @media (max-width: 680px){.cutsys-stepper{grid-template-columns:36px 1fr 36px}.cutsys-stepper .cutsys-btn-primary{grid-column:1/-1}.cutsys-final-row{flex-direction:column;align-items:flex-start}.cutsys-actions{justify-content:stretch}.cutsys-actions .cutsys-btn-ghost{flex:1;justify-content:center}}
    `;
    document.head.appendChild(st);
  };

  const init = ({ getOrders, setOrders, saveOrders }) => {
    state.getOrders = getOrders;
    state.setOrders = setOrders;
    state.saveOrders = saveOrders;
    injectStyles();
    const { migrated, changed } = migrateCuttingData(getOrders());
    if (changed) {
      setOrders(migrated);
      saveOrders();
    }
  };

  window.CuttingSystem = { init, renderCuttingTab, openCuttingModal, renderOrderEditor, getEditorData, migrateCuttingData };
})();
