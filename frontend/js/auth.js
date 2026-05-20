// =====================================================================
// Pantalla de login
// =====================================================================

function renderLogin() {
    const app = $('#app');
    app.innerHTML = '';
    const page = el('div', { class: 'login-page' });
    const card = el('div', { class: 'login-card' });
    card.appendChild(el('h1', {}, '🏥 Sistema Clínica'));
    card.appendChild(el('p', { class: 'subtitle' }, 'Iniciá sesión para continuar'));

    const errorBox = el('div', { class: 'error-msg hidden', id: 'login-error' });
    card.appendChild(errorBox);

    const form = el('form', { onsubmit: handleLogin });

    const fgEmail = el('div', { class: 'form-group' });
    fgEmail.appendChild(el('label', { for: 'email' }, 'Email'));
    fgEmail.appendChild(el('input', {
        type: 'email', id: 'email', required: 'true',
        placeholder: 'usuario@clinica.com', autocomplete: 'username'
    }));
    form.appendChild(fgEmail);

    const fgPass = el('div', { class: 'form-group' });
    fgPass.appendChild(el('label', { for: 'password' }, 'Contraseña'));
    fgPass.appendChild(el('input', {
        type: 'password', id: 'password', required: 'true',
        autocomplete: 'current-password'
    }));
    form.appendChild(fgPass);

    form.appendChild(el('button', {
        type: 'submit', class: 'btn btn-block', id: 'login-btn'
    }, 'Ingresar'));

    card.appendChild(form);

    const hint = el('div', {
        style: 'margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center;'
    });
    hint.innerHTML = 'Cuentas demo:<br>medico@clinica.com / clinica123<br>secretaria@clinica.com / clinica123';
    card.appendChild(hint);

    page.appendChild(card);
    app.appendChild(page);
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = $('#login-btn');
    const errorBox = $('#login-error');
    btn.disabled = true;
    btn.textContent = 'Ingresando...';
    errorBox.classList.add('hidden');

    try {
        const data = await Api.post('/auth/login', {
            email: $('#email').value,
            password: $('#password').value,
        });
        Api.setSession(data.token, data.usuario);
        location.hash = '#/';
        renderApp();
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Ingresar';
    }
}

function logout() {
    Api.clearSession();
    location.hash = '#/login';
    renderLogin();
}
