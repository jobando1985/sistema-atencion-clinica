// =====================================================================
// Módulo: Pacientes
// =====================================================================

async function renderPacientes(container) {
    container.innerHTML = '';

    const header = el('div', { class: 'page-header' });
    header.appendChild(el('h2', {}, 'Pacientes'));
    header.appendChild(el('button', {
        class: 'btn', onclick: () => openPacienteForm()
    }, '+ Nuevo paciente'));
    container.appendChild(header);

    const searchBar = el('div', { class: 'search-bar' });
    const searchInput = el('input', {
        type: 'text', placeholder: 'Buscar por nombre, apellido o DNI...', id: 'pac-search'
    });
    searchBar.appendChild(searchInput);
    container.appendChild(searchBar);

    const card = el('div', { class: 'card' });
    const tableWrap = el('div', { id: 'pacientes-list' });
    card.appendChild(tableWrap);
    container.appendChild(card);

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => loadPacientes(e.target.value), 300);
    });

    await loadPacientes('');
}

async function loadPacientes(query) {
    const wrap = $('#pacientes-list');
    wrap.innerHTML = '<p style="padding: 20px; color: #6b7280;">Cargando...</p>';

    try {
        const pacientes = await Api.get(`/pacientes?q=${encodeURIComponent(query || '')}`);
        if (pacientes.length === 0) {
            wrap.innerHTML = '<div class="empty-state"><h3>Sin resultados</h3><p>No se encontraron pacientes</p></div>';
            return;
        }

        const table = el('table');
        const thead = el('thead');
        thead.innerHTML = '<tr><th>Apellido y Nombre</th><th>DNI</th><th>Obra Social</th><th>Teléfono</th><th>Alertas</th><th>Acciones</th></tr>';
        table.appendChild(thead);

        const tbody = el('tbody');
        for (const p of pacientes) {
            const tr = el('tr');
            tr.innerHTML = `
                <td><strong>${p.apellido}, ${p.nombre}</strong></td>
                <td>${p.dni}</td>
                <td>${p.obra_social || '-'}</td>
                <td>${p.telefono || '-'}</td>
                <td>${p.notas_alerta ? '<span class="badge badge-alerta">⚠ Alerta</span>' : '-'}</td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-secondary" data-action="ficha">Ficha</button>
                    <button class="btn btn-sm btn-secondary" data-action="edit">Editar</button>
                    <button class="btn btn-sm" data-action="cola">→ Cola</button>
                </td>`;
            tr.querySelector('[data-action="ficha"]').onclick = (e) => {
                e.stopPropagation(); location.hash = `#/ficha/${p.id}`;
            };
            tr.querySelector('[data-action="edit"]').onclick = (e) => {
                e.stopPropagation(); openPacienteForm(p);
            };
            tr.querySelector('[data-action="cola"]').onclick = (e) => {
                e.stopPropagation(); agregarACola(p);
            };
            tr.onclick = () => location.hash = `#/ficha/${p.id}`;
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        wrap.innerHTML = '';
        wrap.appendChild(table);
    } catch (err) {
        wrap.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

function openPacienteForm(paciente = null) {
    const isEdit = !!paciente;
    const p = paciente || {};

    const content = el('div');
    content.appendChild(el('h3', {}, isEdit ? 'Editar paciente' : 'Nuevo paciente'));

    const form = el('form', { onsubmit: async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        try {
            if (isEdit) {
                await Api.put(`/pacientes/${p.id}`, data);
                toast('Paciente actualizado', 'success');
                closeModal();
                loadPacientes($('#pac-search')?.value || '');
            } else {
                const nuevoPaciente = await Api.post('/pacientes', data);
                toast('Paciente creado', 'success');
                closeModal();
                openNuevoTurnoModal(nuevoPaciente);
            }
        } catch (err) {
            toast(err.message, 'error');
        }
    }});

    const fields = [
        { row: [{ name: 'dni', label: 'DNI *', value: p.dni, required: true }, { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date', value: p.fecha_nacimiento?.split('T')[0] }] },
        { row: [{ name: 'apellido', label: 'Apellido *', value: p.apellido, required: true }, { name: 'nombre', label: 'Nombre *', value: p.nombre, required: true }] },
        { row: [{ name: 'sexo', label: 'Sexo', type: 'select', value: p.sexo, options: ['', 'Masculino', 'Femenino', 'Otro'] }, { name: 'grupo_sanguineo', label: 'Grupo sanguíneo', value: p.grupo_sanguineo, placeholder: 'A+, O-, etc.' }] },
        { row: [{ name: 'telefono', label: 'Teléfono (con código país)', value: p.telefono, placeholder: '5491133334444' }, { name: 'email', label: 'Email', type: 'email', value: p.email }] },
        { row: [{ name: 'obra_social', label: 'Obra social', value: p.obra_social }, { name: 'nro_afiliado', label: 'Nº afiliado', value: p.nro_afiliado }] },
        { single: { name: 'direccion', label: 'Dirección', value: p.direccion } },
        { single: { name: 'alergias', label: 'Alergias', type: 'textarea', value: p.alergias } },
        { single: { name: 'antecedentes', label: 'Antecedentes médicos', type: 'textarea', value: p.antecedentes } },
        { single: { name: 'patologias', label: 'Patologías', type: 'textarea', value: p.patologias } },
        { single: { name: 'notas_alerta', label: '⚠ Notas de alerta (anticoagulantes, marcapasos, etc.)', type: 'textarea', value: p.notas_alerta } },
    ];

    for (const f of fields) {
        if (f.row) {
            const row = el('div', { class: 'form-row' });
            for (const field of f.row) row.appendChild(buildField(field));
            form.appendChild(row);
        } else {
            form.appendChild(buildField(f.single));
        }
    }

    const actions = el('div', { class: 'modal-actions' });
    actions.appendChild(el('button', { type: 'button', class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'));
    actions.appendChild(el('button', { type: 'submit', class: 'btn' }, isEdit ? 'Guardar cambios' : 'Crear paciente'));
    form.appendChild(actions);

    content.appendChild(form);
    showModal(content);
}

function buildField({ name, label, type = 'text', value = '', required = false, placeholder = '', options }) {
    const fg = el('div', { class: 'form-group' });
    fg.appendChild(el('label', { for: name }, label));
    let input;
    if (type === 'textarea') {
        input = el('textarea', { name, id: name, placeholder });
        input.value = value || '';
    } else if (type === 'select') {
        input = el('select', { name, id: name });
        for (const opt of options) {
            const o = el('option', { value: opt }, opt || '-- Seleccionar --');
            if (opt === value) o.setAttribute('selected', 'true');
            input.appendChild(o);
        }
    } else {
        const attrs = { type, name, id: name, value: value || '', placeholder };
        if (required) attrs.required = 'true';
        input = el('input', attrs);
    }
    fg.appendChild(input);
    return fg;
}

function agregarACola(paciente) {
    openNuevoTurnoModal(paciente);
}
