// =====================================================================
// Módulo: Ficha Clínica Integral y registro de Consultas
// =====================================================================

async function renderFichaPaciente(container, pacienteId, params) {
    container.innerHTML = '<p style="padding: 20px;">Cargando ficha...</p>';

    try {
        const data = await Api.get(`/pacientes/${pacienteId}/historial`);
        const { paciente, consultas, recetas, estudios } = data;
        const turnoId = params.get('turno');

        container.innerHTML = '';

        // Header con acciones
        const header = el('div', { class: 'page-header' });
        const titleBox = el('div');
        titleBox.appendChild(el('h2', {}, `${paciente.apellido}, ${paciente.nombre}`));
        const edad = calculateAge(paciente.fecha_nacimiento);
        titleBox.appendChild(el('div', { style: 'color: #6b7280; font-size: 14px; margin-top: 4px;' },
            `DNI ${paciente.dni}` + (edad ? ` · ${edad} años` : '') + (paciente.obra_social ? ` · ${paciente.obra_social}` : '')
        ));
        header.appendChild(titleBox);

        const actions = el('div', { style: 'display: flex; gap: 8px; flex-wrap: wrap;' });
        actions.appendChild(el('button', {
            class: 'btn btn-secondary', onclick: () => location.hash = '#/pacientes'
        }, '← Volver'));

        if (Api.usuario.rol === 'medico') {
            actions.appendChild(el('button', {
                class: 'btn', onclick: () => openConsultaForm(paciente, turnoId)
            }, '+ Nueva consulta'));
            actions.appendChild(el('button', {
                class: 'btn', onclick: () => openRecetaForm(paciente)
            }, '+ Receta'));
            actions.appendChild(el('button', {
                class: 'btn', onclick: () => openEstudioForm(paciente)
            }, '+ Estudios'));
        }
        header.appendChild(actions);
        container.appendChild(header);

        // Alertas
        if (paciente.notas_alerta) {
            const alert = el('div', { class: 'alert-box danger' });
            alert.innerHTML = `<strong>⚠ NOTA DE ALERTA:</strong> ${paciente.notas_alerta}`;
            container.appendChild(alert);
        }
        if (paciente.alergias && paciente.alergias.toLowerCase() !== 'ninguna') {
            const alert = el('div', { class: 'alert-box' });
            alert.innerHTML = `<strong>Alergias:</strong> ${paciente.alergias}`;
            container.appendChild(alert);
        }

        // Datos personales y antecedentes
        const datosCard = el('div', { class: 'card' });
        datosCard.appendChild(el('h3', { style: 'color: var(--primary-dark); margin-bottom: 12px;' }, 'Datos del paciente'));

        const ficha = el('div', { class: 'ficha-grid' });
        const campos = [
            ['Fecha de nacimiento', formatDate(paciente.fecha_nacimiento)],
            ['Sexo', paciente.sexo || '-'],
            ['Teléfono', paciente.telefono || '-'],
            ['Email', paciente.email || '-'],
            ['Dirección', paciente.direccion || '-'],
            ['Grupo sanguíneo', paciente.grupo_sanguineo || '-'],
            ['Obra social', paciente.obra_social || '-'],
            ['Nº afiliado', paciente.nro_afiliado || '-'],
        ];
        for (const [label, value] of campos) {
            const f = el('div', { class: 'ficha-field' });
            f.appendChild(el('div', { class: 'label' }, label));
            f.appendChild(el('div', { class: 'value' }, value));
            ficha.appendChild(f);
        }
        datosCard.appendChild(ficha);

        // Antecedentes
        const ant = el('div', { class: 'ficha-section', style: 'margin-top: 20px;' });
        ant.appendChild(el('h4', {}, 'Antecedentes y patologías'));
        ant.appendChild(el('p', { style: 'font-size: 13px; margin-bottom: 6px;' },
            paciente.antecedentes || 'Sin antecedentes registrados'));
        if (paciente.patologias) {
            ant.appendChild(el('p', { style: 'font-size: 13px;' }, `Patologías: ${paciente.patologias}`));
        }
        datosCard.appendChild(ant);

        container.appendChild(datosCard);

        // Historial de consultas
        const hCard = el('div', { class: 'card' });
        hCard.appendChild(el('div', { class: 'card-header' }, el('h3', {}, `Historial de consultas (${consultas.length})`)));
        if (consultas.length === 0) {
            hCard.appendChild(el('p', { style: 'color: #6b7280;' }, 'Sin consultas previas'));
        } else {
            for (const c of consultas) {
                const item = el('div', { class: 'timeline-item' });
                item.appendChild(el('div', { class: 'date' },
                    `${formatDateTime(c.fecha)} — Dr. ${c.medico_nombre || ''}`));
                if (c.motivo_consulta) item.appendChild(el('div', {}, el('strong', {}, 'Motivo: '), c.motivo_consulta));
                if (c.diagnostico) item.appendChild(el('div', {}, el('strong', {}, 'Diagnóstico: '), c.diagnostico));
                if (c.indicaciones) item.appendChild(el('div', { style: 'font-size: 13px; color: #6b7280; margin-top:4px;' }, el('strong', {}, 'Indicaciones: '), c.indicaciones));
                hCard.appendChild(item);
            }
        }
        container.appendChild(hCard);

        // Recetas previas
        const rCard = el('div', { class: 'card' });
        rCard.appendChild(el('div', { class: 'card-header' }, el('h3', {}, `Recetas (${recetas.length})`)));
        if (recetas.length === 0) {
            rCard.appendChild(el('p', { style: 'color: #6b7280;' }, 'Sin recetas previas'));
        } else {
            for (const r of recetas) {
                const item = el('div', { class: 'timeline-item' });
                item.appendChild(el('div', { class: 'date' },
                    `${formatDateTime(r.fecha)} — Dr. ${r.medico_nombre || ''}`));
                const meds = (r.medicamentos || []).map(m =>
                    `${m.nombre}${m.dosis ? ' ' + m.dosis : ''}${m.frecuencia ? ' · ' + m.frecuencia : ''}`
                ).join('; ');
                item.appendChild(el('div', { style: 'font-size: 13px;' }, meds));
                const actionsR = el('div', { style: 'margin-top: 6px; display: flex; gap: 6px;' });
                actionsR.appendChild(el('button', {
                    class: 'btn btn-sm btn-secondary',
                    onclick: () => imprimirReceta(r.id)
                }, '🖨 Ver / Imprimir'));
                if (paciente.telefono) {
                    actionsR.appendChild(el('button', {
                        class: 'btn btn-sm',
                        onclick: () => enviarRecetaWhatsApp(r.id, paciente)
                    }, '📱 WhatsApp'));
                }
                item.appendChild(actionsR);
                rCard.appendChild(item);
            }
        }
        container.appendChild(rCard);

        // Estudios previos
        const eCard = el('div', { class: 'card' });
        eCard.appendChild(el('div', { class: 'card-header' }, el('h3', {}, `Estudios solicitados (${estudios.length})`)));
        if (estudios.length === 0) {
            eCard.appendChild(el('p', { style: 'color: #6b7280;' }, 'Sin estudios previos'));
        } else {
            for (const est of estudios) {
                const item = el('div', { class: 'timeline-item' });
                item.appendChild(el('div', { class: 'date' },
                    `${formatDateTime(est.fecha)} — Dr. ${est.medico_nombre || ''}`));
                const list = (est.estudios_solicitados || []).map(s => s.nombre).join(', ');
                item.appendChild(el('div', { style: 'font-size: 13px;' }, list));
                const actionsE = el('div', { style: 'margin-top: 6px; display: flex; gap: 6px;' });
                actionsE.appendChild(el('button', {
                    class: 'btn btn-sm btn-secondary',
                    onclick: () => imprimirEstudio(est.id)
                }, '🖨 Ver / Imprimir'));
                if (paciente.telefono) {
                    actionsE.appendChild(el('button', {
                        class: 'btn btn-sm',
                        onclick: () => enviarEstudioWhatsApp(est.id, paciente)
                    }, '📱 WhatsApp'));
                }
                item.appendChild(actionsE);
                eCard.appendChild(item);
            }
        }
        container.appendChild(eCard);

    } catch (err) {
        container.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

async function openConsultaForm(paciente, turnoId) {
    const content = el('div');
    content.appendChild(el('h3', {}, `Nueva consulta — ${paciente.apellido}, ${paciente.nombre}`));

    const form = el('form');

    const fields = [
        { single: { name: 'motivo_consulta', label: 'Motivo de consulta', type: 'textarea' } },
        { single: { name: 'sintomas', label: 'Síntomas', type: 'textarea' } },
        { row: [
            { name: 'peso', label: 'Peso (kg)', type: 'number', step: '0.1' },
            { name: 'altura', label: 'Altura (m)', type: 'number', step: '0.01' }
        ]},
        { row: [
            { name: 'presion', label: 'Presión arterial', placeholder: '120/80' },
            { name: 'temperatura', label: 'Temperatura (°C)', type: 'number', step: '0.1' }
        ]},
        { single: { name: 'diagnostico', label: 'Diagnóstico', type: 'textarea' } },
        { single: { name: 'indicaciones', label: 'Indicaciones', type: 'textarea' } },
        { single: { name: 'observaciones', label: 'Observaciones', type: 'textarea' } },
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
    actions.appendChild(el('button', { type: 'submit', class: 'btn btn-success' }, 'Guardar consulta'));
    form.appendChild(actions);

    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        data.paciente_id = paciente.id;
        if (turnoId) data.turno_id = turnoId;
        try {
            await Api.post('/consultas', data);
            toast('Consulta registrada', 'success');
            closeModal();
            // recargar ficha
            const c = $('#main-content');
            const params = new URLSearchParams();
            await renderFichaPaciente(c, paciente.id, params);
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    content.appendChild(form);
    showModal(content);
}
