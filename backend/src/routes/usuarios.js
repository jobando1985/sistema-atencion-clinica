// =====================================================================
// Gestión de usuarios (solo admin)
// =====================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// GET /api/usuarios
router.get('/', async (req, res, next) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, nombre, email, rol, matricula, especialidad, telefono,
                   activo, debe_cambiar_clave, creado_en
            FROM usuarios
            ORDER BY rol, nombre
        `);
        res.json(rows);
    } catch (err) { next(err); }
});

// GET /api/usuarios/medicos  — lista pública de médicos activos (también secretaria)
router.get('/medicos', async (req, res, next) => {
    try {
        const { rows } = await pool.query(`
            SELECT id, nombre, especialidad, matricula
            FROM usuarios
            WHERE rol = 'medico' AND activo = TRUE
            ORDER BY nombre
        `);
        res.json(rows);
    } catch (err) { next(err); }
});

// POST /api/usuarios — crear usuario
router.post('/', async (req, res, next) => {
    try {
        const { nombre, email, password, rol, matricula, especialidad, telefono } = req.body;
        if (!nombre || !email || !password || !rol) {
            return res.status(400).json({ error: 'nombre, email, password y rol son obligatorios' });
        }
        const rolesValidos = ['medico', 'secretaria', 'admin'];
        if (!rolesValidos.includes(rol)) {
            return res.status(400).json({ error: 'Rol inválido' });
        }
        const hash = await bcrypt.hash(password, 10);
        const { rows } = await pool.query(`
            INSERT INTO usuarios (nombre, email, password_hash, rol, matricula, especialidad, telefono, debe_cambiar_clave)
            VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
            RETURNING id, nombre, email, rol, matricula, especialidad, telefono, activo, debe_cambiar_clave
        `, [nombre, email.toLowerCase().trim(), hash, rol, matricula || null, especialidad || null, telefono || null]);
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'El email ya está registrado' });
        next(err);
    }
});

// PUT /api/usuarios/:id — editar usuario
router.put('/:id', async (req, res, next) => {
    try {
        const { nombre, email, rol, matricula, especialidad, telefono, activo } = req.body;
        const { rows } = await pool.query(`
            UPDATE usuarios SET
                nombre     = COALESCE($1, nombre),
                email      = COALESCE($2, email),
                rol        = COALESCE($3, rol),
                matricula  = $4,
                especialidad = $5,
                telefono   = $6,
                activo     = COALESCE($7, activo)
            WHERE id = $8
            RETURNING id, nombre, email, rol, matricula, especialidad, telefono, activo, debe_cambiar_clave
        `, [nombre || null, email ? email.toLowerCase().trim() : null, rol || null,
            matricula ?? null, especialidad ?? null, telefono ?? null,
            activo ?? null, req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'El email ya está registrado' });
        next(err);
    }
});

// PATCH /api/usuarios/:id/password — resetear contraseña (admin)
router.patch('/:id/password', async (req, res, next) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        const hash = await bcrypt.hash(password, 10);
        const { rows } = await pool.query(`
            UPDATE usuarios SET password_hash = $1, debe_cambiar_clave = TRUE
            WHERE id = $2 RETURNING id, nombre, email
        `, [hash, req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ ok: true, usuario: rows[0] });
    } catch (err) { next(err); }
});

module.exports = router;
