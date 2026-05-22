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
        if (data.debe_cambiar_clave) {
            renderCambiarClave();
        } else {
            location.hash = '#/';
            renderApp();
        }
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

function renderCambiarClave() {
    const app = $('#app');
    app.innerHTML = '';
    const page = el('div', { class: 'login-page' });
    const card = el('div', { class: 'login-card' });
    card.appendChild(el('h1', {}, '🔐 Cambio de contraseña'));
    card.appendChild(el('p', { class: 'subtitle' }, 'Debés cambiar tu contraseña antes de continuar'));

    const errorBox = el('div', { class: 'error-msg hidden', id: 'cambio-error' });
    card.appendChild(errorBox);

    const fgActual = el('div', { class: 'form-group' });
    fgActual.appendChild(el('label', {}, 'Contraseña actual'));
    fgActual.appendChild(el('input', { type: 'password', id: 'pwd-actual', autocomplete: 'current-password' }));
    card.appendChild(fgActual);

    const fgNueva = el('div', { class: 'form-group' });
    fgNueva.appendChild(el('label', {}, 'Nueva contraseña'));
    fgNueva.appendChild(el('input', { type: 'password', id: 'pwd-nueva', autocomplete: 'new-password' }));
    card.appendChild(fgNueva);

    const fgConfirm = el('div', { class: 'form-group' });
    fgConfirm.appendChild(el('label', {}, 'Confirmar nueva contraseña'));
    fgConfirm.appendChild(el('input', { type: 'password', id: 'pwd-confirm', autocomplete: 'new-password' }));
    card.appendChild(fgConfirm);

    const btn = el('button', { class: 'btn btn-block', onclick: async () => {
        const actual  = $('#pwd-actual').value;
        const nueva   = $('#pwd-nueva').value;
        const confirm = $('#pwd-confirm').value;
        const errBox  = $('#cambio-error');
        errBox.classList.add('hidden');

        if (nueva.length < 6) {
            errBox.textContent = 'La nueva contraseña debe tener al menos 6 caracteres';
            errBox.classList.remove('hidden');
            return;
        }
        if (nueva !== confirm) {
            errBox.textContent = 'Las contraseñas no coinciden';
            errBox.classList.remove('hidden');
            return;
        }
        btn.disabled = true;
        btn.textContent = 'Guardando...';
        try {
            await Api.patch('/auth/cambiar-password', { password_actual: actual, password_nuevo: nueva });
            toast('Contraseña cambiada correctamente', 'success');
            location.hash = '#/';
            renderApp();
        } catch (err) {
            errBox.textContent = err.message;
            errBox.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Cambiar contraseña';
        }
    }}, 'Cambiar contraseña');
    card.appendChild(btn);

    page.appendChild(card);
    app.appendChild(page);
}
