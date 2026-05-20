// =====================================================================
// Recetas médicas
// =====================================================================
const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// POST /api/recetas
router.post('/', requireRole('medico', 'admin'), async (req, res, next) => {
    try {
        const { paciente_id, consulta_id, medicamentos, diagnostico, observaciones } = req.body;
        if (!paciente_id) return res.status(400).json({ error: 'paciente_id obligatorio' });
        if (!Array.isArray(medicamentos) || medicamentos.length === 0) {
            return res.status(400).json({ error: 'Debe incluir al menos un medicamento' });
        }
        const { rows } = await pool.query(
            `INSERT INTO recetas (paciente_id, medico_id, consulta_id, medicamentos, diagnostico, observaciones)
             VALUES ($1, $2, $3, $4::jsonb, $5, $6) RETURNING *`,
            [paciente_id, req.user.id, consulta_id || null,
             JSON.stringify(medicamentos), diagnostico || null, observaciones || null]
        );
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
});

// GET /api/recetas/:id - con datos del paciente y médico (para impresión)
router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT r.*,
                    p.nombre as paciente_nombre, p.apellido as paciente_apellido, p.dni,
                    p.fecha_nacimiento, p.obra_social, p.nro_afiliado, p.telefono as paciente_telefono,
                    u.nombre as medico_nombre, u.matricula, u.especialidad
             FROM recetas r
             JOIN pacientes p ON p.id = r.paciente_id
             JOIN usuarios u ON u.id = r.medico_id
             WHERE r.id = $1`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Receta no encontrada' });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

module.exports = router;
