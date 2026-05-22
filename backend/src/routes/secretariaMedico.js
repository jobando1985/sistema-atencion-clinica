// =====================================================================
// Relación Secretaria ↔ Médico
// =====================================================================
const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/secretaria-medico/mis-medicos
// Secretaria: médicos que tiene asignados. Admin: todos.
router.get('/mis-medicos', async (req, res, next) => {
    try {
        if (req.user.rol === 'admin') {
            const { rows } = await pool.query(
                `SELECT id, nombre, especialidad, matricula FROM usuarios
                 WHERE rol = 'medico' AND activo = TRUE ORDER BY nombre`
            );
            return res.json(rows);
        }
        if (req.user.rol === 'secretaria') {
            const { rows } = await pool.query(`
                SELECT u.id, u.nombre, u.especialidad, u.matricula
                FROM secretaria_medico sm
                JOIN usuarios u ON u.id = sm.medico_id
                WHERE sm.secretaria_id = $1 AND u.activo = TRUE
                ORDER BY u.nombre
            `, [req.user.id]);
            return res.json(rows);
        }
        // médico: devuelve solo a sí mismo
        const { rows } = await pool.query(
            `SELECT id, nombre, especialidad, matricula FROM usuarios WHERE id = $1`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) { next(err); }
});

// GET /api/secretaria-medico — todas las asignaciones (solo admin)
router.get('/', requireRole('admin'), async (req, res, next) => {
    try {
        const { rows } = await pool.query(`
            SELECT sm.secretaria_id, sm.medico_id,
                   s.nombre as secretaria_nombre,
                   m.nombre as medico_nombre, m.especialidad
            FROM secretaria_medico sm
            JOIN usuarios s ON s.id = sm.secretaria_id
            JOIN usuarios m ON m.id = sm.medico_id
            ORDER BY s.nombre, m.nombre
        `);
        res.json(rows);
    } catch (err) { next(err); }
});

// POST /api/secretaria-medico — asignar (solo admin)
router.post('/', requireRole('admin'), async (req, res, next) => {
    try {
        const { secretaria_id, medico_id } = req.body;
        if (!secretaria_id || !medico_id) {
            return res.status(400).json({ error: 'secretaria_id y medico_id son obligatorios' });
        }
        await pool.query(
            `INSERT INTO secretaria_medico (secretaria_id, medico_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [secretaria_id, medico_id]
        );
        res.status(201).json({ ok: true });
    } catch (err) { next(err); }
});

// DELETE /api/secretaria-medico — desasignar (solo admin)
router.delete('/', requireRole('admin'), async (req, res, next) => {
    try {
        const { secretaria_id, medico_id } = req.body;
        await pool.query(
            `DELETE FROM secretaria_medico WHERE secretaria_id = $1 AND medico_id = $2`,
            [secretaria_id, medico_id]
        );
        res.json({ ok: true });
    } catch (err) { next(err); }
});

module.exports = router;
