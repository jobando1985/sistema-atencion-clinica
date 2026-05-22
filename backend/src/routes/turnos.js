// =====================================================================
// Turnos y cola de espera por orden de llegada
// =====================================================================
const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/turnos/cola - pacientes en espera (ordenados por llegada)
// ?medico_id=uuid  filtra por médico específico
// Médico: solo ve su propia cola. Secretaria/admin: filtra por medico_id o todos sus médicos.
router.get('/cola', async (req, res, next) => {
    try {
        const { medico_id } = req.query;
        let whereExtra = '';
        const params = [];

        if (req.user.rol === 'medico') {
            // El médico solo ve su propia cola
            whereExtra = 'AND t.medico_id = $1';
            params.push(req.user.id);
        } else if (medico_id) {
            whereExtra = 'AND t.medico_id = $1';
            params.push(medico_id);
        } else if (req.user.rol === 'secretaria') {
            // Secretaria sin filtro: ve la cola de todos sus médicos asignados
            whereExtra = `AND t.medico_id IN (
                SELECT medico_id FROM secretaria_medico WHERE secretaria_id = $1
            )`;
            params.push(req.user.id);
        }

        const { rows } = await pool.query(`
            SELECT t.*, p.nombre, p.apellido, p.dni, p.fecha_nacimiento,
                   p.alergias, p.notas_alerta, p.obra_social,
                   m.nombre as medico_nombre, m.especialidad as medico_especialidad
            FROM turnos t
            JOIN pacientes p ON p.id = t.paciente_id
            LEFT JOIN usuarios m ON m.id = t.medico_id
            WHERE t.estado IN ('en_espera', 'en_atencion')
            ${whereExtra}
            ORDER BY t.prioridad DESC, t.llegada_en ASC
        `, params);
        res.json(rows);
    } catch (err) { next(err); }
});

// GET /api/turnos - lista con filtros
router.get('/', async (req, res, next) => {
    try {
        const { estado, fecha, paciente_id } = req.query;
        const conditions = [];
        const params = [];
        let i = 1;
        if (estado) { conditions.push(`estado = $${i++}`); params.push(estado); }
        if (fecha) { conditions.push(`DATE(fecha_turno) = $${i++}`); params.push(fecha); }
        if (paciente_id) { conditions.push(`paciente_id = $${i++}`); params.push(paciente_id); }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const { rows } = await pool.query(
            `SELECT t.*, p.nombre, p.apellido, p.dni FROM turnos t
             JOIN pacientes p ON p.id = t.paciente_id ${where}
             ORDER BY COALESCE(t.fecha_turno, t.llegada_en) DESC LIMIT 200`,
            params
        );
        res.json(rows);
    } catch (err) { next(err); }
});

// POST /api/turnos - crear turno o agregar a cola
// Si no se envía fecha_turno, va directo a la cola por orden de llegada
router.post('/', async (req, res, next) => {
    try {
        const { paciente_id, medico_id, fecha_turno, motivo, prioridad } = req.body;
        if (!paciente_id) return res.status(400).json({ error: 'paciente_id es obligatorio' });

        const estado = fecha_turno ? 'programado' : 'en_espera';
        const { rows } = await pool.query(
            `INSERT INTO turnos (paciente_id, medico_id, fecha_turno, estado, motivo, prioridad)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [paciente_id, medico_id || null, fecha_turno || null, estado, motivo || null, prioridad || 0]
        );
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
});

// PATCH /api/turnos/:id - cambiar estado (llamar, atender, finalizar, cancelar)
router.patch('/:id', async (req, res, next) => {
    try {
        const { estado, medico_id } = req.body;
        const valid = ['programado', 'en_espera', 'en_atencion', 'atendido', 'cancelado', 'ausente'];
        if (estado && !valid.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }
        const { rows } = await pool.query(
            `UPDATE turnos SET
                estado = COALESCE($1, estado),
                medico_id = COALESCE($2, medico_id)
             WHERE id = $3 RETURNING *`,
            [estado || null, medico_id || null, req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Turno no encontrado' });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

// DELETE /api/turnos/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const result = await pool.query('DELETE FROM turnos WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Turno no encontrado' });
        res.json({ ok: true });
    } catch (err) { next(err); }
});

module.exports = router;
