// =====================================================================
// Módulo: Recetas y Órdenes de Estudio (con PDF y WhatsApp)
// =====================================================================

// ---------- RECETA ----------
function openRecetaForm(paciente) {
    const content = el('div');
    content.appendChild(el('h3', {}, `Nueva receta — ${paciente.apellido}, ${paciente.nombre}`));

    const form = el('form');

    const medsContainer = el('div', { id: 'meds-container' });
    form.appendChild(el('label', {}, 'Medicamentos'));
    form.appendChild(medsContainer);

    const addMedBtn = el('button', {
        type: 'button', class: 'btn btn-secondary btn-sm', style: 'margin-bottom: 12px;',
        onclick: () => addMedicamentoRow(medsContainer)
    }, '+ Agregar medicamento');
    form.appendChild(addMedBtn);

    addMedicamentoRow(medsContainer);

    form.appendChild(buildField({ name: 'diagnostico', label: 'Diagnóstico', type: 'textarea' }));
    form.appendChild(buildField({ name: 'observaciones', label: 'Observaciones', type: 'textarea' }));

    const actions = el('div', { class: 'modal-actions' });
    actions.appendChild(el('button', { type: 'button', class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'));
    actions.appendChild(el('button', { type: 'submit', class: 'btn btn-success' }, 'Emitir receta'));
    form.appendChild(actions);

    form.onsubmit = async (e) => {
        e.preventDefault();
        const meds = collectMedicamentos(medsContainer);
        if (meds.length === 0) {
            toast('Agregá al menos un medicamento', 'error');
            return;
        }
        try {
            const receta = await Api.post('/recetas', {
                paciente_id: paciente.id,
                medicamentos: meds,
                diagnostico: form.diagnostico.value,
                observaciones: form.observaciones.value,
            });
            toast('Receta emitida', 'success');
            closeModal();
            // Abrir receta inmediatamente para imprimir / enviar
            imprimirReceta(receta.id);
            // recargar ficha
            const c = $('#main-content');
            await renderFichaPaciente(c, paciente.id, new URLSearchParams());
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    content.appendChild(form);
    showModal(content);
}

function addMedicamentoRow(container) {
    const row = el('div', { class: 'medicamento-row' });
    row.innerHTML = `
        <button type="button" class="remove-btn">×</button>
        <div class="form-row">
            <div class="form-group">
                <label>Medicamento *</label>
                <input type="text" data-field="nombre" required placeholder="Ej: Ibuprofeno">
            </div>
            <div class="form-group">
                <label>Dosis</label>
                <input type="text" data-field="dosis" placeholder="400 mg">
            </div>
        </div>
        <div class="form-row three">
            <div class="form-group">
                <label>Vía</label>
                <select data-field="via">
                    <option value="Oral">Oral</option>
                    <option value="Intramuscular">Intramuscular</option>
                    <option value="Endovenosa">Endovenosa</option>
                    <option value="Tópica">Tópica</option>
                    <option value="Inhalatoria">Inhalatoria</option>
                    <option value="Otra">Otra</option>
                </select>
            </div>
            <div class="form-group">
                <label>Frecuencia</label>
                <input type="text" data-field="frecuencia" placeholder="Cada 8 hs">
            </div>
            <div class="form-group">
                <label>Duración</label>
                <input type="text" data-field="duracion" placeholder="7 días">
            </div>
        </div>
        <div class="form-group">
            <label>Indicaciones específicas</label>
            <input type="text" data-field="indicaciones" placeholder="Con las comidas...">
        </div>
    `;
    row.querySelector('.remove-btn').onclick = () => row.remove();
    container.appendChild(row);
}

function collectMedicamentos(container) {
    const rows = $$('.medicamento-row', container);
    return rows.map(row => {
        const med = {};
        $$('[data-field]', row).forEach(input => {
            const v = input.value.trim();
            if (v) med[input.dataset.field] = v;
        });
        return med;
    }).filter(m => m.nombre);
}

// ---------- ESTUDIO ----------
function openEstudioForm(paciente) {
    const content = el('div');
    content.appendChild(el('h3', {}, `Nueva orden de estudios — ${paciente.apellido}, ${paciente.nombre}`));

    const form = el('form');

    const estudiosContainer = el('div', { id: 'estudios-container' });
    form.appendChild(el('label', {}, 'Estudios solicitados'));
    form.appendChild(estudiosContainer);

    const addBtn = el('button', {
        type: 'button', class: 'btn btn-secondary btn-sm', style: 'margin-bottom: 12px;',
        onclick: () => addEstudioRow(estudiosContainer)
    }, '+ Agregar estudio');
    form.appendChild(addBtn);

    addEstudioRow(estudiosContainer);

    form.appendChild(buildField({ name: 'diagnostico_presuntivo', label: 'Diagnóstico presuntivo', type: 'textarea' }));
    form.appendChild(buildField({ name: 'observaciones', label: 'Observaciones', type: 'textarea' }));

    const actions = el('div', { class: 'modal-actions' });
    actions.appendChild(el('button', { type: 'button', class: 'btn btn-secondary', onclick: closeModal }, 'Cancelar'));
    actions.appendChild(el('button', { type: 'submit', class: 'btn btn-success' }, 'Emitir orden'));
    form.appendChild(actions);

    form.onsubmit = async (e) => {
        e.preventDefault();
        const estudios = collectEstudios(estudiosContainer);
        if (estudios.length === 0) { toast('Agregá al menos un estudio', 'error'); return; }
        try {
            const estudio = await Api.post('/estudios', {
                paciente_id: paciente.id,
                estudios_solicitados: estudios,
                diagnostico_presuntivo: form.diagnostico_presuntivo.value,
                observaciones: form.observaciones.value,
            });
            toast('Orden de estudios emitida', 'success');
            closeModal();
            imprimirEstudio(estudio.id);
            const c = $('#main-content');
            await renderFichaPaciente(c, paciente.id, new URLSearchParams());
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    content.appendChild(form);
    showModal(content);
}

function addEstudioRow(container) {
    const row = el('div', { class: 'medicamento-row' });
    row.innerHTML = `
        <button type="button" class="remove-btn">×</button>
        <div class="form-row">
            <div class="form-group">
                <label>Estudio *</label>
                <input type="text" data-field="nombre" required placeholder="Ej: Hemograma completo">
            </div>
            <div class="form-group">
                <label>Tipo</label>
                <select data-field="tipo">
                    <option value="Laboratorio">Laboratorio</option>
                    <option value="Imágenes">Imágenes</option>
                    <option value="Cardiológico">Cardiológico</option>
                    <option value="Endoscopía">Endoscopía</option>
                    <option value="Anatomía patológica">Anatomía patológica</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Indicaciones / preparación</label>
            <input type="text" data-field="indicaciones" placeholder="Ayunas de 8 horas...">
        </div>
    `;
    row.querySelector('.remove-btn').onclick = () => row.remove();
    container.appendChild(row);
}

function collectEstudios(container) {
    const rows = $$('.medicamento-row', container);
    return rows.map(row => {
        const e = {};
        $$('[data-field]', row).forEach(input => {
            const v = input.value.trim();
            if (v) e[input.dataset.field] = v;
        });
        return e;
    }).filter(e => e.nombre);
}

// ---------- IMPRESIÓN / WHATSAPP ----------
async function imprimirReceta(recetaId) {
    try {
        const r = await Api.get(`/recetas/${recetaId}`);
        const html = generarHTMLReceta(r);
        const win = window.open('', '_blank', 'width=800,height=900');
        win.document.write(html);
        win.document.close();
        // Esperar a que cargue y disparar diálogo de impresión
        win.onload = () => win.print();
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function imprimirEstudio(estudioId) {
    try {
        const e = await Api.get(`/estudios/${estudioId}`);
        const html = generarHTMLEstudio(e);
        const win = window.open('', '_blank', 'width=800,height=900');
        win.document.write(html);
        win.document.close();
        win.onload = () => win.print();
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function enviarRecetaWhatsApp(recetaId, paciente) {
    try {
        const r = await Api.get(`/recetas/${recetaId}`);
        const phone = cleanPhone(paciente.telefono);
        if (!phone) { toast('El paciente no tiene teléfono', 'error'); return; }

        const msg = generarMensajeWhatsAppReceta(r);
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');

        // Sugerir también imprimir/guardar la versión visual
        setTimeout(() => {
            if (confirm('¿Querés también abrir la receta para imprimir o guardar como PDF?')) {
                imprimirReceta(recetaId);
            }
        }, 500);
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function enviarEstudioWhatsApp(estudioId, paciente) {
    try {
        const e = await Api.get(`/estudios/${estudioId}`);
        const phone = cleanPhone(paciente.telefono);
        if (!phone) { toast('El paciente no tiene teléfono', 'error'); return; }

        const msg = generarMensajeWhatsAppEstudio(e);
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');

        setTimeout(() => {
            if (confirm('¿Querés también abrir la orden para imprimir o guardar como PDF?')) {
                imprimirEstudio(estudioId);
            }
        }, 500);
    } catch (err) {
        toast(err.message, 'error');
    }
}

function generarMensajeWhatsAppReceta(r) {
    const meds = (r.medicamentos || []).map((m, i) =>
        `${i + 1}. ${m.nombre}${m.dosis ? ' ' + m.dosis : ''}` +
        `${m.via ? ' (' + m.via + ')' : ''}` +
        `${m.frecuencia ? ' — ' + m.frecuencia : ''}` +
        `${m.duracion ? ' — ' + m.duracion : ''}` +
        `${m.indicaciones ? '\n   ' + m.indicaciones : ''}`
    ).join('\n');

    return `🏥 *RECETA MÉDICA*
Fecha: ${formatDate(r.fecha)}
Paciente: ${r.paciente_nombre} ${r.paciente_apellido}
DNI: ${r.dni}

*Medicamentos prescritos:*
${meds}

${r.diagnostico ? `\nDiagnóstico: ${r.diagnostico}` : ''}
${r.observaciones ? `\nObservaciones: ${r.observaciones}` : ''}

—
Dr. ${r.medico_nombre}
${r.matricula || ''}
${r.especialidad || ''}`;
}

function generarMensajeWhatsAppEstudio(e) {
    const lista = (e.estudios_solicitados || []).map((s, i) =>
        `${i + 1}. ${s.nombre}${s.tipo ? ' (' + s.tipo + ')' : ''}` +
        `${s.indicaciones ? '\n   ' + s.indicaciones : ''}`
    ).join('\n');

    return `🏥 *ORDEN DE ESTUDIOS*
Fecha: ${formatDate(e.fecha)}
Paciente: ${e.paciente_nombre} ${e.paciente_apellido}
DNI: ${e.dni}

*Estudios solicitados:*
${lista}

${e.diagnostico_presuntivo ? `\nDiagnóstico presuntivo: ${e.diagnostico_presuntivo}` : ''}
${e.observaciones ? `\nObservaciones: ${e.observaciones}` : ''}

—
Dr. ${e.medico_nombre}
${e.matricula || ''}
${e.especialidad || ''}`;
}

function generarHTMLReceta(r) {
    const meds = (r.medicamentos || []).map((m, i) => `
        <div class="med">
            <strong>${i + 1}. ${m.nombre}${m.dosis ? ' — ' + m.dosis : ''}</strong>
            <div class="med-detail">
                ${m.via ? `Vía: ${m.via} · ` : ''}
                ${m.frecuencia ? `Frecuencia: ${m.frecuencia} · ` : ''}
                ${m.duracion ? `Duración: ${m.duracion}` : ''}
            </div>
            ${m.indicaciones ? `<div class="med-indicaciones">Indicaciones: ${m.indicaciones}</div>` : ''}
        </div>
    `).join('');

    return baseHTMLDocumento('RECETA MÉDICA', `
        <div class="paciente-box">
            <div><strong>Paciente:</strong> ${r.paciente_apellido}, ${r.paciente_nombre}</div>
            <div><strong>DNI:</strong> ${r.dni}</div>
            ${r.fecha_nacimiento ? `<div><strong>Fecha de nacimiento:</strong> ${formatDate(r.fecha_nacimiento)}</div>` : ''}
            ${r.obra_social ? `<div><strong>Obra social:</strong> ${r.obra_social}${r.nro_afiliado ? ' — Nº ' + r.nro_afiliado : ''}</div>` : ''}
        </div>
        ${r.diagnostico ? `<div class="diagnostico"><strong>Diagnóstico:</strong> ${r.diagnostico}</div>` : ''}
        <div class="section-title">Rp/</div>
        ${meds}
        ${r.observaciones ? `<div class="observaciones"><strong>Observaciones:</strong><br>${r.observaciones}</div>` : ''}
    `, r);
}

function generarHTMLEstudio(e) {
    const lista = (e.estudios_solicitados || []).map((s, i) => `
        <div class="med">
            <strong>${i + 1}. ${s.nombre}</strong>
            ${s.tipo ? `<div class="med-detail">Tipo: ${s.tipo}</div>` : ''}
            ${s.indicaciones ? `<div class="med-indicaciones">Indicaciones: ${s.indicaciones}</div>` : ''}
        </div>
    `).join('');

    return baseHTMLDocumento('ORDEN DE ESTUDIOS', `
        <div class="paciente-box">
            <div><strong>Paciente:</strong> ${e.paciente_apellido}, ${e.paciente_nombre}</div>
            <div><strong>DNI:</strong> ${e.dni}</div>
            ${e.fecha_nacimiento ? `<div><strong>Fecha de nacimiento:</strong> ${formatDate(e.fecha_nacimiento)}</div>` : ''}
            ${e.obra_social ? `<div><strong>Obra social:</strong> ${e.obra_social}${e.nro_afiliado ? ' — Nº ' + e.nro_afiliado : ''}</div>` : ''}
        </div>
        ${e.diagnostico_presuntivo ? `<div class="diagnostico"><strong>Diagnóstico presuntivo:</strong> ${e.diagnostico_presuntivo}</div>` : ''}
        <div class="section-title">Solicito:</div>
        ${lista}
        ${e.observaciones ? `<div class="observaciones"><strong>Observaciones:</strong><br>${e.observaciones}</div>` : ''}
    `, e);
}

function baseHTMLDocumento(titulo, contenido, doc) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
    body { font-family: 'Times New Roman', serif; max-width: 750px; margin: 30px auto; padding: 20px; color: #000; }
    .header { text-align: center; border-bottom: 2px solid #0d7c8a; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { color: #0d7c8a; font-size: 24px; margin: 0; }
    .header .clinica { font-size: 13px; color: #555; }
    .fecha { text-align: right; margin-bottom: 16px; font-size: 13px; }
    .paciente-box { background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px; font-size: 14px; }
    .paciente-box > div { margin-bottom: 4px; }
    .diagnostico { margin-bottom: 12px; padding: 8px; background: #e6f4f6; border-left: 3px solid #0d7c8a; }
    .section-title { font-size: 22px; font-weight: bold; margin: 20px 0 12px; color: #0d7c8a; }
    .med { border-left: 3px solid #0d7c8a; padding: 10px 14px; margin-bottom: 12px; background: #fafafa; }
    .med-detail { font-size: 13px; color: #555; margin-top: 4px; }
    .med-indicaciones { font-size: 13px; font-style: italic; margin-top: 4px; }
    .observaciones { margin-top: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
    .firma { margin-top: 60px; text-align: right; }
    .firma-line { width: 280px; border-top: 1px solid #000; margin-left: auto; padding-top: 6px; }
    .firma-line .nombre { font-weight: bold; }
    .firma-line .matricula { font-size: 12px; color: #555; }
    @media print {
        body { margin: 0; }
        .no-print { display: none; }
    }
</style>
</head>
<body>
    <div class="header">
        <h1>🏥 ${titulo}</h1>
        <div class="clinica">Sistema de Gestión Clínica</div>
    </div>
    <div class="fecha">Fecha: ${formatDate(doc.fecha)}</div>
    ${contenido}
    <div class="firma">
        <div class="firma-line">
            <div class="nombre">Dr. ${doc.medico_nombre}</div>
            <div class="matricula">
                ${doc.matricula ? doc.matricula : ''}
                ${doc.especialidad ? ' · ' + doc.especialidad : ''}
            </div>
        </div>
    </div>
    <div class="no-print" style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; cursor: pointer;">🖨 Imprimir</button>
        <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; cursor: pointer; margin-left: 8px;">Cerrar</button>
    </div>
</body>
</html>`;
}
