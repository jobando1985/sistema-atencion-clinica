// =====================================================================
// CRUD de pacientes
// =====================================================================
const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/pacientes?q=busqueda
router.get('/', async (req, res, next) => {
    try {
        const q = (req.query.q || '').trim();
        let result;
        if (q) {
            result = await pool.query(
                `SELECT * FROM pacientes
                 WHERE LOWER(nombre) LIKE $1 OR LOWER(apellido) LIKE $1 OR dni LIKE $1
                 ORDER BY apellido, nombre LIMIT 100`,
                [`%${q.toLowerCase()}%`]
            );
        } else {
            result = await pool.query('SELECT * FROM pacientes ORDER BY apellido, nombre LIMIT 100');
        }
        res.json(result.rows);
    } catch (err) { next(err); }
});

// GET /api/pacientes/:id
router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await pool.query('SELECT * FROM pacientes WHERE id = $1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

// GET /api/pacientes/:id/historial - ficha clínica integral
router.get('/:id/historial', async (req, res, next) => {
    try {
        const pacienteId = req.params.id;
        const [paciente, consultas, recetas, estudios] = await Promise.all([
            pool.query('SELECT * FROM pacientes WHERE id = $1', [pacienteId]),
            pool.query(`SELECT c.*, u.nombre as medico_nombre, u.matricula
                        FROM consultas c LEFT JOIN usuarios u ON u.id = c.medico_id
                        WHERE c.paciente_id = $1 ORDER BY c.fecha DESC`, [pacienteId]),
            pool.query(`SELECT r.*, u.nombre as medico_nombre, u.matricula
                        FROM recetas r LEFT JOIN usuarios u ON u.id = r.medico_id
                        WHERE r.paciente_id = $1 ORDER BY r.fecha DESC`, [pacienteId]),
            pool.query(`SELECT e.*, u.nombre as medico_nombre, u.matricula
                        FROM estudios e LEFT JOIN usuarios u ON u.id = e.medico_id
                        WHERE e.paciente_id = $1 ORDER BY e.fecha DESC`, [pacienteId]),
        ]);
        if (paciente.rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
        res.json({
            paciente: paciente.rows[0],
            consultas: consultas.rows,
            recetas: recetas.rows,
            estudios: estudios.rows,
        });
    } catch (err) { next(err); }
});

// POST /api/pacientes
router.post('/', async (req, res, next) => {
    try {
        const p = req.body;
        if (!p.dni || !p.nombre || !p.apellido) {
            return res.status(400).json({ error: 'dni, nombre y apellido son obligatorios' });
        }
        const { rows } = await pool.query(
            `INSERT INTO pacientes (dni, nombre, apellido, fecha_nacimiento, sexo, telefono, email,
                                    direccion, obra_social, nro_afiliado, grupo_sanguineo,
                                    alergias, antecedentes, patologias, notas_alerta)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
            [p.dni, p.nombre, p.apellido, p.fecha_nacimiento || null, p.sexo || null,
             p.telefono || null, p.email || null, p.direccion || null, p.obra_social || null,
             p.nro_afiliado || null, p.grupo_sanguineo || null, p.alergias || null,
             p.antecedentes || null, p.patologias || null, p.notas_alerta || null]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Ya existe un paciente con ese DNI' });
        }
        next(err);
    }
});

// PUT /api/pacientes/:id
router.put('/:id', async (req, res, next) => {
    try {
        const p = req.body;
        const { rows } = await pool.query(
            `UPDATE pacientes SET
                dni=$1, nombre=$2, apellido=$3, fecha_nacimiento=$4, sexo=$5, telefono=$6, email=$7,
                direccion=$8, obra_social=$9, nro_afiliado=$10, grupo_sanguineo=$11,
                alergias=$12, antecedentes=$13, patologias=$14, notas_alerta=$15
             WHERE id=$16 RETURNING *`,
            [p.dni, p.nombre, p.apellido, p.fecha_nacimiento || null, p.sexo || null,
             p.telefono || null, p.email || null, p.direccion || null, p.obra_social || null,
             p.nro_afiliado || null, p.grupo_sanguineo || null, p.alergias || null,
             p.antecedentes || null, p.patologias || null, p.notas_alerta || null,
             req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

// DELETE /api/pacientes/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const result = await pool.query('DELETE FROM pacientes WHERE id = $1', [req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
        res.json({ ok: true });
    } catch (err) { next(err); }
});

module.exports = router;
