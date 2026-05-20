// =====================================================================
// Utilidades de UI
// =====================================================================

function $(sel, parent = document) { return parent.querySelector(sel); }
function $$(sel, parent = document) { return Array.from(parent.querySelectorAll(sel)); }

function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
        else node.setAttribute(k, v);
    }
    for (const child of children) {
        if (child == null) continue;
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
}

function toast(msg, type = 'info') {
    const t = el('div', { class: `toast ${type}` }, msg);
    $('#toast-container').appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

function showModal(html) {
    const modal = $('#modal-content');
    modal.innerHTML = '';
    modal.appendChild(html);
    $('#modal-overlay').classList.remove('hidden');
}

function closeModal() {
    $('#modal-overlay').classList.add('hidden');
    $('#modal-content').innerHTML = '';
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
});

function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function calculateAge(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function confirmDialog(message) {
    return new Promise((resolve) => {
        const content = el('div', {});
        content.appendChild(el('h3', {}, 'Confirmar'));
        content.appendChild(el('p', { style: 'margin-bottom: 16px;' }, message));
        const actions = el('div', { class: 'modal-actions' });
        actions.appendChild(el('button', {
            class: 'btn btn-secondary',
            onclick: () => { closeModal(); resolve(false); }
        }, 'Cancelar'));
        actions.appendChild(el('button', {
            class: 'btn btn-danger',
            onclick: () => { closeModal(); resolve(true); }
        }, 'Confirmar'));
        content.appendChild(actions);
        showModal(content);
    });
}

// Limpiar número de teléfono para wa.me (solo dígitos)
function cleanPhone(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}
