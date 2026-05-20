// =====================================================================
// Rutas de autenticación: login y verificación de sesión
// =====================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
        }

        const { rows } = await pool.query(
            'SELECT id, nombre, email, password_hash, rol, matricula, especialidad, activo FROM usuarios WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = rows[0];
        if (!user.activo) {
            return res.status(403).json({ error: 'Usuario desactivado' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
        );

        res.json({
            token,
            usuario: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol,
                matricula: user.matricula,
                especialidad: user.especialidad,
            },
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, nombre, email, rol, matricula, especialidad, telefono FROM usuarios WHERE id = $1',
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(rows[0]);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
