// =====================================================================
// Inicialización y layout principal
// =====================================================================

function renderApp() {
    if (!Api.token) {
        renderLogin();
        return;
    }
    const app = $('#app');
    if (app.querySelector('.layout')) return; // ya renderizado

    app.innerHTML = '';
    const layout = el('div', { class: 'layout' });

    // Sidebar
    const sidebar = el('aside', { class: 'sidebar' });

    const brand = el('div', { class: 'sidebar-brand' });
    brand.appendChild(el('h1', {}, '🏥 Clínica'));
    brand.appendChild(el('small', {}, 'Sistema de gestión'));
    sidebar.appendChild(brand);

    const nav = el('ul', { class: 'sidebar-nav' });
    const items = [
        { view: 'dashboard', label: '🕐 Cola / Turnos', hash: '#/dashboard' },
        { view: 'pacientes', label: '👥 Pacientes', hash: '#/pacientes' },
    ];
    if (Api.usuario.rol === 'admin') {
        items.push({ view: 'admin', label: '⚙ Administración', hash: '#/admin' });
    }
    for (const it of items) {
        const li = el('li');
        const a = el('a', {
            'data-view': it.view,
            onclick: (e) => { e.preventDefault(); location.hash = it.hash; }
        }, it.label);
        li.appendChild(a);
        nav.appendChild(li);
    }
    sidebar.appendChild(nav);

    const userBox = el('div', { class: 'sidebar-user' });
    userBox.appendChild(el('div', {}, Api.usuario.nombre));
    userBox.appendChild(el('div', { style: 'font-size: 11px; opacity: 0.8;' },
        Api.usuario.rol === 'medico' ? 'Médico' :
        Api.usuario.rol === 'secretaria' ? 'Secretaría' : 'Administrador'));
    userBox.appendChild(el('button', { class: 'logout', onclick: logout }, 'Cerrar sesión'));
    sidebar.appendChild(userBox);

    layout.appendChild(sidebar);

    const main = el('main', { class: 'main', id: 'main-content' });
    layout.appendChild(main);

    app.appendChild(layout);
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    handleRoute();
});

// Si el script se carga después del DOMContentLoaded (cache)
if (document.readyState !== 'loading') {
    handleRoute();
}
