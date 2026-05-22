// =====================================================================
// Panel de Administración: usuarios y asignaciones secretaria↔médico
// =====================================================================

async function renderAdmin(container) {
    container.innerHTML = '';
    const header = el('div', { class: 'page-header' });
    header.appendChild(el('h2', {}, 'Administración de Usuarios'));
    header.appendChild(el('button', { class: 'btn', onclick: () => openCrearUsuarioModal(refreshAdmin) }, '+ Nuevo usuario'));
    container.appendChild(header);

    const tabs = el('div', { class: 'tabs', style: 'margin-bottom: 20px;' });
    const tabUsuarios = el('button', { class: 'tab-btn active', id: 'tab-usuarios', onclick: () => switchAdminTab('usuarios') }, 'Usuarios');
    const tabAsignaciones = el('button', { class: 'tab-btn', id: 'tab-asignaciones', onclick: () => switchAdminTab('asignaciones') }, 'Asignaciones Secretaria → Médico');
    tabs.appendChild(tabUsuarios);
    tabs.appendChild(tabAsignaciones);
    container.appendChild(tabs);

    const content = el('div', { id: 'admin-content' });
    container.appendChild(content);

    await renderTabUsuarios(content);
}

function switchAdminTab(tab) {
    $$('.tab-btn').forEach(b => b.classList.remove('active'));
    $(`#tab-${tab}`).classList.add('active');
    const content = $('#admin-content');
    if (tab === 'usuarios') renderTabUsuarios(content);
    else renderTabAsignaciones(content);
}

async function renderTabUsuarios(container) {
    container.innerHTML = '<p style="padding:20px;color:#6b7280">Cargando...</p>';
    try {
        const usuarios = await Api.get('/usuarios');
        container.innerHTML = '';

        const table = el('div', { class: 'card' });
        const rolLabel = { medico: 'Médico', secretaria: 'Secretaría', admin: 'Admin' };

        for (const u of usuarios) {
            const row = el('div', { class: 'queue-item', style: u.activo ? '' : 'opacity:0.5' });

            const info = el('div', { class: 'info' });
            info.innerHTML = `
                <h4>${u.nombre} ${!u.activo ? '<span class="badge" style="background:#6b7280">Inactivo</span>' : ''}
                    ${u.debe_cambiar_clave ? '<span class="badge badge-alerta">Debe cambiar clave</span>' : ''}
                </h4>
                <div class="meta">${u.email} · <strong>${rolLabel[u.rol] || u.rol}</strong>
                    ${u.especialidad ? ` · ${u.especialidad}` : ''}
                    ${u.matricula ? ` · ${u.matricula}` : ''}
                </div>
            `;
            row.appendChild(info);

            const actions = el('div', { class: 'actions' });
            actions.appendChild(el('button', {
                class: 'btn btn-secondary btn-sm',
                onclick: () => openEditarUsuarioModal(u, refreshAdmin)
            }, 'Editar'));
            actions.appendChild(el('button', {
                class: 'btn btn-secondary btn-sm',
                onclick: () => openResetPasswordModal(u)
            }, 'Reset clave'));
            actions.appendChild(el('button', {
                class: `btn btn-sm ${u.activo ? 'btn-danger' : 'btn'}`,
                onclick: async () => {
                    const accion = u.activo ? 'desactivar' : 'activar';
                    if (!await confirmDialog(`¿${accion} al usuario ${u.nombre}?`)) return;
                    await Api.put(`/usuarios/${u.id}`, { activo: !u.activo });
                    toast(`Usuario ${accion === 'activar' ? 'activado' : 'desactivado'}`, 'success');
                    refreshAdmin();
                }
            }, u.activo ? 'Desactivar' : 'Activar'));
            row.appendChild(actions);
            table.appendChild(row);
        }
        container.appendChild(table);
    } catch (err) {
        container.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

async function renderTabAsignaciones(container) {
    container.innerHTML = '<p style="padding:20px;color:#6b7280">Cargando...</p>';
    try {
        const [asignaciones, usuarios] = await Promise.all([
            Api.get('/secretaria-medico'),
            Api.get('/usuarios'),
        ]);
        const secretarias = usuarios.filter(u => u.rol === 'secretaria' && u.activo);
        const medicos     = usuarios.filter(u => u.rol === 'medico' && u.activo);

        container.innerHTML = '';

        // Formulario de nueva asignación
        const formCard = el('div', { class: 'card', style: 'margin-bottom:16px; padding:16px;' });
        formCard.appendChild(el('h4', { style: 'margin-bottom:12px;' }, 'Nueva asignación'));
        const formRow = el('div', { class: 'form-row' });

        const fgSec = el('div', { class: 'form-group' });
        fgSec.appendChild(el('label', {}, 'Secretaria'));
        const selSec = el('select', { id: 'asig-sec' });
        selSec.appendChild(el('option', { value: '' }, '-- Seleccionar --'));
        secretarias.forEach(s => selSec.appendChild(el('option', { value: s.id }, s.nombre)));
        fgSec.appendChild(selSec);
        formRow.appendChild(fgSec);

        const fgMed = el('div', { class: 'form-group' });
        fgMed.appendChild(el('label', {}, 'Médico'));
        const selMed = el('select', { id: 'asig-med' });
        selMed.appendChild(el('option', { value: '' }, '-- Seleccionar --'));
        medicos.forEach(m => selMed.appendChild(el('option', { value: m.id }, `${m.nombre}${m.especialidad ? ' — '+m.especialidad : ''}`)));
        fgMed.appendChild(selMed);
        formRow.appendChild(fgMed);

        formCard.appendChild(formRow);
        formCard.appendChild(el('button', {
            class: 'btn',
            onclick: async () => {
                const sid = $('#asig-sec').value;
                const mid = $('#asig-med').value;
                if (!sid || !mid) { toast('Seleccioná secretaria y médico', 'error'); return; }
                await Api.post('/secretaria-medico', { secretaria_id: sid, medico_id: mid });
                toast('Asignación creada', 'success');
                renderTabAsignaciones(container);
            }
        }, 'Asignar'));
        container.appendChild(formCard);

        // Lista de asignaciones existentes
        const card = el('div', { class: 'card' });
        if (asignaciones.length === 0) {
            card.appendChild(el('p', { style: 'padding:20px;color:#6b7280;' }, 'No hay asignaciones'));
        } else {
            for (const a of asignaciones) {
                const row = el('div', { class: 'queue-item' });
                const info = el('div', { class: 'info' });
                info.innerHTML = `<h4>${a.secretaria_nombre} <span style="color:#6b7280">→</span> ${a.medico_nombre}</h4>
                    <div class="meta">${a.especialidad || ''}</div>`;
                row.appendChild(info);
                const actions = el('div', { class: 'actions' });
                actions.appendChild(el('button', {
                    class: 'btn btn-danger btn-sm',
                    onclick: async () => {
                        if (!await confirmDialog('¿Eliminar esta asignación?')) return;
                        await Api.delete('/secretaria-medico', { secretaria_id: a.secretaria_id, medico_id: a.medico_id });
                        toast('Asignación eliminada', 'success');
                        renderTabAsignaciones(container);
                    }
                }, 'Eliminar'));
                row.appendChild(actions);
                card.appendChild(row);
            }
        }
        container.appendChild(card);
    } catch (err) {
        container.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

function refreshAdmin() {
    const c = $('#main-content');
    renderAdmin(c);
}

// ---------- Modales ----------

function openCrearUsuarioModal(onSuccess) {
    const content = el('div');
    content.appendChild(el('h3', {}, 'Nuevo usuario'));
    const form = buildUsuarioForm({});
    content.appendChild(form.el);
    const actions = el('div', { class: 'modal-actions' });
    actions.appendChild(el('button', { class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'));
    actions.appendChild(el('button', {
        class: 'btn',
        onclick: async () => {
            const data = form.collect();
            if (!data.nombre || !data.email || !data.password || !data.rol) {
                toast('Nombre, email, contraseña y rol son obligatorios', 'error'); return;
            }
            try {
                await Api.post('/usuarios', data);
                toast('Usuario creado', 'success');
                closeModal();
                onSuccess && onSuccess();
            } catch (err) { toast(err.message, 'error'); }
        }
    }, 'Crear'));
    content.appendChild(actions);
    showModal(content);
}

function openEditarUsuarioModal(usuario, onSuccess) {
    const content = el('div');
    content.appendChild(el('h3', {}, `Editar: ${usuario.nombre}`));
    const form = buildUsuarioForm(usuario, true);
    content.appendChild(form.el);
    const actions = el('div', { class: 'modal-actions' });
    actions.appendChild(el('button', { class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'));
    actions.appendChild(el('button', {
        class: 'btn',
        onclick: async () => {
            const data = form.collect();
            delete data.password;
            try {
                await Api.put(`/usuarios/${usuario.id}`, data);
                toast('Usuario actualizado', 'success');
                closeModal();
                onSuccess && onSuccess();
            } catch (err) { toast(err.message, 'error'); }
        }
    }, 'Guardar'));
    content.appendChild(actions);
    showModal(content);
}

function openResetPasswordModal(usuario) {
    const content = el('div');
    content.appendChild(el('h3', {}, `Resetear clave: ${usuario.nombre}`));
    const fg = el('div', { class: 'form-group' });
    fg.appendChild(el('label', {}, 'Nueva contraseña'));
    fg.appendChild(el('input', { type: 'password', id: 'reset-pwd', placeholder: 'Mínimo 6 caracteres' }));
    content.appendChild(fg);
    const note = el('p', { style: 'font-size:13px;color:#6b7280;margin-top:8px;' },
        'El usuario deberá cambiar su contraseña al próximo ingreso.');
    content.appendChild(note);
    const actions = el('div', { class: 'modal-actions' });
    actions.appendChild(el('button', { class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'));
    actions.appendChild(el('button', {
        class: 'btn',
        onclick: async () => {
            const pwd = $('#reset-pwd').value;
            if (!pwd || pwd.length < 6) { toast('Mínimo 6 caracteres', 'error'); return; }
            try {
                await Api.patch(`/usuarios/${usuario.id}/password`, { password: pwd });
                toast('Contraseña reseteada', 'success');
                closeModal();
            } catch (err) { toast(err.message, 'error'); }
        }
    }, 'Resetear'));
    content.appendChild(actions);
    showModal(content);
}

function buildUsuarioForm(u, editMode = false) {
    const wrapper = el('div');
    const fields = [
        { name: 'nombre', label: 'Nombre completo', type: 'text', value: u.nombre || '' },
        { name: 'email',  label: 'Email',            type: 'email', value: u.email || '' },
    ];
    if (!editMode) fields.push({ name: 'password', label: 'Contraseña provisional', type: 'password', value: '' });
    fields.push({ name: 'telefono', label: 'Teléfono', type: 'text', value: u.telefono || '' });

    for (const f of fields) {
        const fg = el('div', { class: 'form-group' });
        fg.appendChild(el('label', {}, f.label));
        fg.appendChild(el('input', { type: f.type, id: `uf-${f.name}`, value: f.value }));
        wrapper.appendChild(fg);
    }

    // Rol
    const fgRol = el('div', { class: 'form-group' });
    fgRol.appendChild(el('label', {}, 'Rol'));
    const selRol = el('select', { id: 'uf-rol' });
    [['medico','Médico'],['secretaria','Secretaría'],['admin','Admin']].forEach(([v,l]) => {
        selRol.appendChild(el('option', { value: v, ...(u.rol === v ? { selected: true } : {}) }, l));
    });
    fgRol.appendChild(selRol);
    wrapper.appendChild(fgRol);

    // Campos de médico (condicional)
    const fgMedico = el('div', { id: 'uf-medico-fields' });
    fgMedico.appendChild(buildField({ name: 'matricula', label: 'Matrícula', value: u.matricula || '' }));
    fgMedico.appendChild(buildField({ name: 'especialidad', label: 'Especialidad', value: u.especialidad || '' }));
    wrapper.appendChild(fgMedico);

    const toggleMedicoFields = () => {
        fgMedico.style.display = selRol.value === 'medico' ? '' : 'none';
    };
    selRol.addEventListener('change', toggleMedicoFields);
    toggleMedicoFields();

    return {
        el: wrapper,
        collect: () => ({
            nombre:      $('#uf-nombre').value.trim(),
            email:       $('#uf-email').value.trim(),
            password:    editMode ? undefined : $('#uf-password')?.value,
            rol:         $('#uf-rol').value,
            telefono:    $('#uf-telefono').value.trim() || null,
            matricula:   $('#uf-matricula')?.value.trim() || null,
            especialidad:$('#uf-especialidad')?.value.trim() || null,
        }),
    };
}
