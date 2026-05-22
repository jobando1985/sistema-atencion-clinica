// =====================================================================
// Cliente HTTP para hablar con el backend
// =====================================================================

// Si el front se sirve desde el mismo dominio que el backend, dejar vacío.
// Para desarrollo local con el backend en otro puerto, ajustar aquí:
const API_BASE = window.API_BASE_URL || '';  // ej: 'http://localhost:4000'

const Api = {
    token: localStorage.getItem('token') || null,
    usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),

    setSession(token, usuario) {
        this.token = token;
        this.usuario = usuario;
        localStorage.setItem('token', token);
        localStorage.setItem('usuario', JSON.stringify(usuario));
    },

    clearSession() {
        this.token = null;
        this.usuario = null;
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
    },

    async request(method, path, body) {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

        const res = await fetch(`${API_BASE}/api${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (res.status === 401) {
            this.clearSession();
            location.hash = '#/login';
            throw new Error('Sesión expirada');
        }

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        return data;
    },

    get(path) { return this.request('GET', path); },
    post(path, body) { return this.request('POST', path, body); },
    put(path, body) { return this.request('PUT', path, body); },
    patch(path, body) { return this.request('PATCH', path, body); },
    del(path) { return this.request('DELETE', path); },
    delete(path, body) { return this.request('DELETE', path, body); },
};
