// =====================================================================
// Módulo: Turnos y Cola de Espera
// =====================================================================

// Cache de médicos asignados al usuario actual
let _misMedicos = null;

async function getMisMedicos() {
    if (_misMedicos) return _misMedicos;
    _misMedicos = await Api.get('/secretaria-medico/mis-medicos');
    return _misMedicos;
}

async function renderDashboard(container) {
    _misMedicos = null; // refrescar lista al cargar
    container.innerHTML = '';

    const header = el('div', { class: 'page-header' });
    const titulo = Api.usuario.rol === 'medico' ? 'Pacientes en espera' : 'Panel de Recepción';
    header.appendChild(el('h2', {}, titulo));
    if (Api.usuario.rol !== 'medico') {
        header.appendChild(el('button', {
            class: 'btn', onclick: () => openNuevoTurnoModal()
        }, '+ Agregar a la cola'));
    }
    container.appendChild(header);

    if (Api.usuario.rol === 'medico') {
        // El médico solo ve su propia cola
        await renderColaMedico(container, Api.usuario.id);
    } else {
        // Secretaria/admin: tabs por médico
        await renderColaSecretaria(container);
    }
}

// ── Cola del médico (solo la suya) ──────────────────────────────────
async function renderColaMedico(container, medicoId) {
    const statsDiv = el('div', { class: 'stats', id: 'stats' });
    container.appendChild(statsDiv);

    const card = el('div', { class: 'card' });
    card.appendChild(el('div', { class: 'card-header' }, el('h3', {}, 'Cola por orden de llegada')));
    const list = el('div', { id: 'cola-list' });
    card.appendChild(list);
    container.appendChild(card);

    await loadCola(medicoId);
}

// ── Cola multi-médico para secretaria/admin ──────────────────────────
async function renderColaSecretaria(container) {
    const medicos = await getMisMedicos();

    if (medicos.length === 0) {
        container.appendChild(el('div', { class: 'card', style: 'padding:24px;' },
            el('p', { style: 'color:#6b7280;' }, 'No tenés médicos asignados. Pedile al administrador que te asigne médicos.')));
        return;
    }

    // Tabs de médicos
    const tabsBar = el('div', { class: 'tabs', style: 'margin-bottom:16px;' });
    container.appendChild(tabsBar);

    const colaContainer = el('div', { id: 'cola-container' });
    container.appendChild(colaContainer);

    let medicoActivo = medicos[0].id;

    const renderTab = async (medicoId) => {
        medicoActivo = medicoId;
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        $(`#tab-med-${medicoId}`)?.classList.add('active');

        colaContainer.innerHTML = '';
        const statsDiv = el('div', { class: 'stats', id: 'stats' });
        colaContainer.appendChild(statsDiv);
        const card = el('div', { class: 'card' });
        card.appendChild(el('div', { class: 'card-header' },
            el('h3', {}, `Cola de ${medicos.find(m => m.id === medicoId)?.nombre || ''}`)
        ));
        const list = el('div', { id: 'cola-list' });
        card.appendChild(list);
        colaContainer.appendChild(card);
        await loadCola(medicoId);
    };

    for (const m of medicos) {
        const btn = el('button', {
            class: 'tab-btn' + (m.id === medicoActivo ? ' active' : ''),
            id: `tab-med-${m.id}`,
            onclick: () => renderTab(m.id)
        }, m.nombre + (m.especialidad ? ` (${m.especialidad})` : ''));
        tabsBar.appendChild(btn);
    }

    await renderTab(medicoActivo);
}

// ── Carga la cola de un médico ────────────────────────────────────────
async function loadCola(medicoId) {
    const list = $('#cola-list');
    if (!list) return;
    list.innerHTML = '<p style="padding: 20px; color: #6b7280;">Cargando...</p>';

    try {
        const url = medicoId ? `/turnos/cola?medico_id=${medicoId}` : '/turnos/cola';
        const cola = await Api.get(url);

        const statsDiv = $('#stats');
        if (statsDiv) {
            const enEspera   = cola.filter(t => t.estado === 'en_espera').length;
            const enAtencion = cola.filter(t => t.estado === 'en_atencion').length;
            statsDiv.innerHTML = `
                <div class="stat-card"><div class="label">En espera</div><div class="value">${enEspera}</div></div>
                <div class="stat-card"><div class="label">En atención</div><div class="value">${enAtencion}</div></div>
                <div class="stat-card"><div class="label">Total en cola</div><div class="value">${cola.length}</div></div>
            `;
        }

        if (cola.length === 0) {
            list.innerHTML = '<div class="empty-state"><h3>Cola vacía</h3><p>No hay pacientes esperando</p></div>';
            return;
        }

        list.innerHTML = '';
        cola.forEach((t, idx) => {
            const item = el('div', { class: 'queue-item' + (t.prioridad > 0 ? ' urgente' : '') });
            const info = el('div', { class: 'info' });
            const edad = calculateAge(t.fecha_nacimiento);
            info.innerHTML = `
                <h4>${idx + 1}. ${t.apellido}, ${t.nombre}
                    ${t.prioridad > 0 ? '<span class="badge badge-alerta">URGENTE</span>' : ''}
                    <span class="badge badge-${t.estado === 'en_atencion' ? 'atencion' : 'espera'}">
                        ${t.estado === 'en_atencion' ? 'En atención' : 'En espera'}
                    </span>
                </h4>
                <div class="meta">
                    DNI ${t.dni} ${edad ? `· ${edad} años` : ''} · Llegó ${formatDateTime(t.llegada_en)}
                    ${t.obra_social ? `· ${t.obra_social}` : ''}
                    ${t.medico_nombre && Api.usuario.rol !== 'medico' ? `· <strong>${t.medico_nombre}</strong>` : ''}
                </div>
                ${t.notas_alerta ? `<div class="alert-box danger" style="margin-top:6px;"><strong>⚠ Alerta:</strong> ${t.notas_alerta}</div>` : ''}
                ${t.alergias ? `<div class="meta" style="margin-top:4px;"><strong>Alergias:</strong> ${t.alergias}</div>` : ''}
            `;
            item.appendChild(info);

            const actions = el('div', { class: 'actions' });

            if (Api.usuario.rol === 'medico' && t.estado === 'en_espera') {
                actions.appendChild(el('button', {
                    class: 'btn btn-success btn-sm',
                    onclick: () => atenderPaciente(t)
                }, 'Atender'));
            }
            if (Api.usuario.rol === 'medico' && t.estado === 'en_atencion' && t.medico_id === Api.usuario.id) {
                actions.appendChild(el('button', {
                    class: 'btn btn-success btn-sm',
                    onclick: () => location.hash = `#/ficha/${t.paciente_id}?turno=${t.id}`
                }, 'Continuar atención'));
            }
            actions.appendChild(el('button', {
                class: 'btn btn-secondary btn-sm',
                onclick: () => location.hash = `#/ficha/${t.paciente_id}`
            }, 'Ver ficha'));
            if (Api.usuario.rol !== 'medico') {
                actions.appendChild(el('button', {
                    class: 'btn btn-danger btn-sm',
                    onclick: async () => {
                        if (!await confirmDialog('¿Quitar de la cola?')) return;
                        await Api.patch(`/turnos/${t.id}`, { estado: 'cancelado' });
                        toast('Turno cancelado', 'success');
                        loadCola(medicoId);
                    }
                }, 'Cancelar'));
            }
            item.appendChild(actions);
            list.appendChild(item);
        });
    } catch (err) {
        list.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

async function atenderPaciente(turno) {
    try {
        await Api.patch(`/turnos/${turno.id}`, { estado: 'en_atencion', medico_id: Api.usuario.id });
        location.hash = `#/ficha/${turno.paciente_id}?turno=${turno.id}`;
    } catch (err) {
        toast(err.message, 'error');
    }
}

// ── Modal: agregar paciente a la cola con selector de médico ──────────
async function openNuevoTurnoModal() {
    const medicos = await getMisMedicos();

    const content = el('div');
    content.appendChild(el('h3', {}, 'Agregar paciente a la cola'));

    // Selector de médico
    if (medicos.length > 0) {
        const fgMed = el('div', { class: 'form-group' });
        fgMed.appendChild(el('label', {}, 'Médico *'));
        const selMed = el('select', { id: 'turno-medico' });
        if (medicos.length > 1) selMed.appendChild(el('option', { value: '' }, '-- Seleccionar médico --'));
        medicos.forEach(m => selMed.appendChild(
            el('option', { value: m.id, ...(medicos.length === 1 ? { selected: true } : {}) },
                m.nombre + (m.especialidad ? ` — ${m.especialidad}` : ''))
        ));
        fgMed.appendChild(selMed);
        content.appendChild(fgMed);
    }

    // Búsqueda de paciente
    const searchFg = el('div', { class: 'form-group' });
    searchFg.appendChild(el('label', {}, 'Buscar paciente'));
    const searchInput = el('input', { type: 'text', placeholder: 'Nombre, apellido o DNI...', id: 'turno-search' });
    searchFg.appendChild(searchInput);
    content.appendChild(searchFg);

    const resultsBox = el('div', { id: 'turno-results', style: 'max-height: 250px; overflow-y: auto; margin-bottom: 12px;' });
    content.appendChild(resultsBox);

    const fgFecha = el('div', { class: 'form-group' });
    fgFecha.appendChild(el('label', {}, 'Fecha de turno (opcional — dejar vacío para cola por orden de llegada)'));
    fgFecha.appendChild(el('input', { type: 'datetime-local', id: 'turno-fecha' }));
    content.appendChild(fgFecha);

    const fgMotivo = el('div', { class: 'form-group' });
    fgMotivo.appendChild(el('label', {}, 'Motivo'));
    fgMotivo.appendChild(el('input', { type: 'text', id: 'turno-motivo', placeholder: 'Control, consulta...' }));
    content.appendChild(fgMotivo);

    const fgPrior = el('div', { class: 'form-group' });
    const cbWrap = el('label', { style: 'display: flex; align-items: center; gap: 8px;' });
    cbWrap.appendChild(el('input', { type: 'checkbox', id: 'turno-urgente' }));
    cbWrap.appendChild(document.createTextNode(' Marcar como urgente'));
    fgPrior.appendChild(cbWrap);
    content.appendChild(fgPrior);

    let selectedId = null;
    let timer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const q = e.target.value.trim();
            if (q.length < 2) { resultsBox.innerHTML = ''; return; }
            try {
                const pacs = await Api.get(`/pacientes?q=${encodeURIComponent(q)}`);
                resultsBox.innerHTML = '';
                if (pacs.length === 0) {
                    resultsBox.innerHTML = '<p style="color:#6b7280; padding:8px;">Sin resultados</p>';
                    return;
                }
                for (const p of pacs.slice(0, 8)) {
                    const item = el('div', {
                        style: 'padding: 8px; border-bottom: 1px solid #e5e7eb; cursor: pointer;',
                        onclick: () => {
                            selectedId = p.id;
                            searchInput.value = `${p.apellido}, ${p.nombre} (DNI ${p.dni})`;
                            resultsBox.innerHTML = '';
                        }
                    }, `${p.apellido}, ${p.nombre} — DNI ${p.dni}`);
                    resultsBox.appendChild(item);
                }
            } catch (err) { /* silent */ }
        }, 250);
    });

    const actions = el('div', { class: 'modal-actions' });
    actions.appendChild(el('button', { class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'));
    actions.appendChild(el('button', {
        class: 'btn',
        onclick: async () => {
            if (!selectedId) { toast('Seleccioná un paciente', 'error'); return; }
            const medicoSel = $('#turno-medico');
            const medicoId  = medicoSel ? medicoSel.value : null;
            if (medicos.length > 0 && !medicoId) { toast('Seleccioná un médico', 'error'); return; }
            const fecha   = $('#turno-fecha').value;
            const urgente = $('#turno-urgente').checked;
            try {
                await Api.post('/turnos', {
                    paciente_id: selectedId,
                    medico_id:   medicoId || null,
                    fecha_turno: fecha || null,
                    motivo:      $('#turno-motivo').value,
                    prioridad:   urgente ? 1 : 0,
                });
                toast('Paciente agregado a la cola', 'success');
                closeModal();
                // Refrescar la vista actual
                const c = $('#main-content');
                renderDashboard(c);
            } catch (err) {
                toast(err.message, 'error');
            }
        }
    }, 'Agregar a la cola'));
    content.appendChild(actions);

    showModal(content);
}
