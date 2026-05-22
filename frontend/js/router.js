// =====================================================================
// Router por hash (#/ruta) - sin frameworks
// =====================================================================

const routes = [
    { pattern: /^#?\/?$/, handler: () => navigate('dashboard') },
    { pattern: /^#\/login\/?$/, handler: () => renderLogin() },
    { pattern: /^#\/dashboard\/?$/, handler: () => navigate('dashboard') },
    { pattern: /^#\/pacientes\/?$/, handler: () => navigate('pacientes') },
    { pattern: /^#\/turnos\/?$/, handler: () => navigate('dashboard') },
    { pattern: /^#\/admin\/?$/, handler: () => navigate('admin') },
    { pattern: /^#\/ficha\/([^/?]+)/, handler: (m, params) => navigate('ficha', { pacienteId: m[1], params }) },
];

function handleRoute() {
    const hash = location.hash || '#/';
    const [path, search] = hash.split('?');
    const params = new URLSearchParams(search || '');

    // Si no hay sesión, ir a login (salvo que sea ya login)
    if (!Api.token && path !== '#/login') {
        location.hash = '#/login';
        renderLogin();
        return;
    }

    if (Api.token && path === '#/login') {
        location.hash = '#/';
    }

    for (const route of routes) {
        const match = path.match(route.pattern);
        if (match) {
            route.handler(match, params);
            return;
        }
    }
    // 404 -> home
    location.hash = '#/';
}

function navigate(view, data = {}) {
    if (!Api.token) {
        renderLogin();
        return;
    }
    renderApp();
    const content = $('#main-content');

    // marcar nav activo
    $$('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    const activeMap = {
        dashboard: 'dashboard',
        pacientes: 'pacientes',
        ficha: 'pacientes',
        admin: 'admin',
    };
    const activeNav = $(`.sidebar-nav a[data-view="${activeMap[view]}"]`);
    if (activeNav) activeNav.classList.add('active');

    if (view === 'dashboard') renderDashboard(content);
    else if (view === 'pacientes') renderPacientes(content);
    else if (view === 'admin') renderAdmin(content);
    else if (view === 'ficha') renderFichaPaciente(content, data.pacienteId, data.params || new URLSearchParams());
}

window.addEventListener('hashchange', handleRoute);
