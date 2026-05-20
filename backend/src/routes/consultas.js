// =====================================================================
// Consultas médicas
// =====================================================================
const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// POST /api/consultas - registrar una atención
router.post('/', requireRole('medico', 'admin'), async (req, res, next) => {
    try {
        const c = req.body;
        if (!c.paciente_id) return res.status(400).json({ error: 'paciente_id obligatorio' });

        const { rows } = await pool.query(
            `INSERT INTO consultas (paciente_id, medico_id, turno_id, motivo_consulta, sintomas,
                                    diagnostico, indicaciones, observaciones,
                                    peso, altura, presion, temperatura)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
            [c.paciente_id, req.user.id, c.turno_id || null, c.motivo_consulta || null,
             c.sintomas || null, c.diagnostico || null, c.indicaciones || null,
             c.observaciones || null, c.peso || null, c.altura || null,
             c.presion || null, c.temperatura || null]
        );

        // Si viene un turno_id, marcar el turno como atendido
        if (c.turno_id) {
            await pool.query(`UPDATE turnos SET estado = 'atendido' WHERE id = $1`, [c.turno_id]);
        }

        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
});

// GET /api/consultas/:id
router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT c.*, p.nombre as paciente_nombre, p.apellido as paciente_apellido, p.dni,
                    u.nombre as medico_nombre, u.matricula
             FROM consultas c
             JOIN pacientes p ON p.id = c.paciente_id
             LEFT JOIN usuarios u ON u.id = c.medico_id
             WHERE c.id = $1`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Consulta no encontrada' });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

module.exports = router;
