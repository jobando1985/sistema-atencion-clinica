// =====================================================================
// Órdenes de estudios médicos
// =====================================================================
const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// POST /api/estudios
router.post('/', requireRole('medico', 'admin'), async (req, res, next) => {
    try {
        const { paciente_id, consulta_id, estudios_solicitados, diagnostico_presuntivo, observaciones } = req.body;
        if (!paciente_id) return res.status(400).json({ error: 'paciente_id obligatorio' });
        if (!Array.isArray(estudios_solicitados) || estudios_solicitados.length === 0) {
            return res.status(400).json({ error: 'Debe incluir al menos un estudio' });
        }
        const { rows } = await pool.query(
            `INSERT INTO estudios (paciente_id, medico_id, consulta_id, estudios_solicitados,
                                   diagnostico_presuntivo, observaciones)
             VALUES ($1, $2, $3, $4::jsonb, $5, $6) RETURNING *`,
            [paciente_id, req.user.id, consulta_id || null,
             JSON.stringify(estudios_solicitados), diagnostico_presuntivo || null, observaciones || null]
        );
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
});

// GET /api/estudios/:id
router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT e.*,
                    p.nombre as paciente_nombre, p.apellido as paciente_apellido, p.dni,
                    p.fecha_nacimiento, p.obra_social, p.nro_afiliado, p.telefono as paciente_telefono,
                    u.nombre as medico_nombre, u.matricula, u.especialidad
             FROM estudios e
             JOIN pacientes p ON p.id = e.paciente_id
             JOIN usuarios u ON u.id = e.medico_id
             WHERE e.id = $1`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Estudio no encontrado' });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

module.exports = router;
