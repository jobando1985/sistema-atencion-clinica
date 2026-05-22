// =====================================================================
// CRUD de pacientes con control de acceso por rol
// =====================================================================
const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// ── Helpers de control de acceso ──────────────────────────────────────

// Verifica si el usuario tiene acceso a un paciente específico.
// Tiene acceso si: tiene consulta, receta, estudio o turno activo con ese paciente.
async function checkPatientAccess(user, pacienteId) {
    if (user.rol === 'admin') return true;

    if (user.rol === 'medico') {
        const { rows } = await pool.query(`
            SELECT 1 FROM (
                SELECT 1 FROM consultas WHERE paciente_id = $1 AND medico_id = $2
                UNION ALL
                SELECT 1 FROM recetas   WHERE paciente_id = $1 AND medico_id = $2
                UNION ALL
                SELECT 1 FROM estudios  WHERE paciente_id = $1 AND medico_id = $2
                UNION ALL
                SELECT 1 FROM turnos    WHERE paciente_id = $1 AND medico_id = $2
                    AND estado NOT IN ('cancelado', 'ausente')
            ) t LIMIT 1
        `, [pacienteId, user.id]);
        return rows.length > 0;
    }

    if (user.rol === 'secretaria') {
        const { rows } = await pool.query(`
            SELECT 1 FROM secretaria_medico sm
            WHERE sm.secretaria_id = $1 AND (
                EXISTS (SELECT 1 FROM consultas WHERE paciente_id = $2 AND medico_id = sm.medico_id)
                OR EXISTS (SELECT 1 FROM recetas   WHERE paciente_id = $2 AND medico_id = sm.medico_id)
                OR EXISTS (SELECT 1 FROM estudios  WHERE paciente_id = $2 AND medico_id = sm.medico_id)
                OR EXISTS (SELECT 1 FROM turnos    WHERE paciente_id = $2 AND medico_id = sm.medico_id
                    AND estado NOT IN ('cancelado', 'ausente'))
            ) LIMIT 1
        `, [user.id, pacienteId]);
        return rows.length > 0;
    }

    return false;
}

// Devuelve un fragmento WHERE que limita pacientes al acceso del usuario.
// Muta `params` agregando user.id al final.
function buildAccessClause(user, params) {
    if (user.rol === 'medico') {
        params.push(user.id);
        const p = `$${params.length}`;
        return `(
            EXISTS (SELECT 1 FROM consultas WHERE paciente_id = pacientes.id AND medico_id = ${p})
            OR EXISTS (SELECT 1 FROM recetas   WHERE paciente_id = pacientes.id AND medico_id = ${p})
            OR EXISTS (SELECT 1 FROM estudios  WHERE paciente_id = pacientes.id AND medico_id = ${p})
            OR EXISTS (SELECT 1 FROM turnos    WHERE paciente_id = pacientes.id AND medico_id = ${p}
                AND estado NOT IN ('cancelado', 'ausente'))
        )`;
    }
    if (user.rol === 'secretaria') {
        params.push(user.id);
        const p = `$${params.length}`;
        return `(
            EXISTS (
                SELECT 1 FROM secretaria_medico sm
                WHERE sm.secretaria_id = ${p} AND (
                    EXISTS (SELECT 1 FROM consultas WHERE paciente_id = pacientes.id AND medico_id = sm.medico_id)
                    OR EXISTS (SELECT 1 FROM recetas   WHERE paciente_id = pacientes.id AND medico_id = sm.medico_id)
                    OR EXISTS (SELECT 1 FROM estudios  WHERE paciente_id = pacientes.id AND medico_id = sm.medico_id)
                    OR EXISTS (SELECT 1 FROM turnos    WHERE paciente_id = pacientes.id AND medico_id = sm.medico_id
                        AND estado NOT IN ('cancelado', 'ausente'))
                )
            )
        )`;
    }
    return 'TRUE';
}

// ── Rutas ─────────────────────────────────────────────────────────────

// GET /api/pacientes?q=busqueda[&for_queue=1]
// for_queue=1: búsqueda sin restricciones para el modal de cola (devuelve solo datos básicos)
router.get('/', async (req, res, next) => {
    try {
        const q = (req.query.q || '').trim();
        const forQueue = req.query.for_queue === '1';

        if (forQueue) {
            const params = [];
            let where = '';
            if (q) {
                params.push(`%${q.toLowerCase()}%`);
                where = `WHERE LOWER(nombre) LIKE $1 OR LOWER(apellido) LIKE $1 OR dni LIKE $1`;
            }
            const { rows } = await pool.query(
                `SELECT id, dni, nombre, apellido FROM pacientes ${where} ORDER BY apellido, nombre LIMIT 20`,
                params
            );
            return res.json(rows);
        }

        const params = [];
        const clauses = [];

        if (q) {
            params.push(`%${q.toLowerCase()}%`);
            clauses.push(`(LOWER(nombre) LIKE $${params.length} OR LOWER(apellido) LIKE $${params.length} OR dni LIKE $${params.length})`);
        }

        if (req.user.rol !== 'admin') {
            clauses.push(buildAccessClause(req.user, params));
        }

        const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
        const { rows } = await pool.query(
            `SELECT * FROM pacientes ${where} ORDER BY apellido, nombre LIMIT 100`,
            params
        );
        res.json(rows);
    } catch (err) { next(err); }
});

// GET /api/pacientes/:id
router.get('/:id', async (req, res, next) => {
    try {
        if (req.user.rol !== 'admin') {
            const ok = await checkPatientAccess(req.user, req.params.id);
            if (!ok) return res.status(403).json({ error: 'Sin acceso a este paciente' });
        }
        const { rows } = await pool.query('SELECT * FROM pacientes WHERE id = $1', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

// GET /api/pacientes/:id/historial — ficha clínica integral
// Médico: solo sus propias consultas/recetas/estudios
// Secretaria: solo registros de sus médicos asignados
// Admin: todo
router.get('/:id/historial', async (req, res, next) => {
    try {
        const pacienteId = req.params.id;

        if (req.user.rol !== 'admin') {
            const ok = await checkPatientAccess(req.user, pacienteId);
            if (!ok) return res.status(403).json({ error: 'Sin acceso a este paciente' });
        }

        let recFilter = '';
        let recParams = [pacienteId];
        if (req.user.rol === 'medico') {
            recParams.push(req.user.id);
            recFilter = `AND medico_id = $2`;
        } else if (req.user.rol === 'secretaria') {
            recParams.push(req.user.id);
            recFilter = `AND medico_id IN (SELECT medico_id FROM secretaria_medico WHERE secretaria_id = $2)`;
        }

        const [paciente, consultas, recetas, estudios] = await Promise.all([
            pool.query('SELECT * FROM pacientes WHERE id = $1', [pacienteId]),
            pool.query(
                `SELECT c.*, u.nombre as medico_nombre, u.matricula
                 FROM consultas c LEFT JOIN usuarios u ON u.id = c.medico_id
                 WHERE c.paciente_id = $1 ${recFilter} ORDER BY c.fecha DESC`, recParams),
            pool.query(
                `SELECT r.*, u.nombre as medico_nombre, u.matricula
                 FROM recetas r LEFT JOIN usuarios u ON u.id = r.medico_id
                 WHERE r.paciente_id = $1 ${recFilter} ORDER BY r.fecha DESC`, recParams),
            pool.query(
                `SELECT e.*, u.nombre as medico_nombre, u.matricula
                 FROM estudios e LEFT JOIN usuarios u ON u.id = e.medico_id
                 WHERE e.paciente_id = $1 ${recFilter} ORDER BY e.fecha DESC`, recParams),
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

// POST /api/pacientes — cualquier usuario autenticado puede registrar un paciente nuevo
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
        if (err.code === '23505') return res.status(409).json({ error: 'Ya existe un paciente con ese DNI' });
        next(err);
    }
});

// PUT /api/pacientes/:id
router.put('/:id', async (req, res, next) => {
    try {
        if (req.user.rol !== 'admin') {
            const ok = await checkPatientAccess(req.user, req.params.id);
            if (!ok) return res.status(403).json({ error: 'Sin acceso a este paciente' });
        }
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
