// =====================================================================
// Inserta usuarios de prueba con contraseñas correctamente hasheadas
// Uso: npm run seed
// =====================================================================
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

async function seed() {
    const passwordDemo  = 'clinica123';
    const hashDemo      = await bcrypt.hash(passwordDemo, 10);
    const passwordAdmin = 'Ob4ndo1985*';
    const hashAdmin     = await bcrypt.hash(passwordAdmin, 10);

    try {
        // Usuarios de prueba (demo)
        await pool.query(`
            INSERT INTO usuarios (nombre, email, password_hash, rol, matricula, especialidad, telefono)
            VALUES
                ($1, 'medico@clinica.com',     $2, 'medico',     'MN 12345', 'Clínica Médica', '+5491133334444'),
                ($3, 'secretaria@clinica.com', $2, 'secretaria', NULL, NULL, '+5491155556666'),
                ($4, 'admin@clinica.com',      $2, 'admin',      NULL, NULL, NULL)
            ON CONFLICT (email) DO NOTHING
        `, ['Dr. Juan Pérez', hashDemo, 'María García', 'Administrador Demo']);

        // Usuario admin principal (debe cambiar clave al primer ingreso)
        await pool.query(`
            INSERT INTO usuarios (nombre, email, password_hash, rol, debe_cambiar_clave)
            VALUES ('Administrador', 'jobandoclave@clinica.com', $1, 'admin', TRUE)
            ON CONFLICT (email) DO NOTHING
        `, [hashAdmin]);

        // Relación secretaria ↔ médico de prueba
        await pool.query(`
            INSERT INTO secretaria_medico (secretaria_id, medico_id)
            SELECT s.id, m.id
            FROM usuarios s, usuarios m
            WHERE s.email = 'secretaria@clinica.com'
              AND m.email = 'medico@clinica.com'
            ON CONFLICT DO NOTHING
        `);

        // Pacientes
        await pool.query(`
            INSERT INTO pacientes (dni, nombre, apellido, fecha_nacimiento, sexo, telefono, email, obra_social, alergias, antecedentes, notas_alerta)
            VALUES
                ('30123456', 'Carlos', 'Rodríguez', '1980-05-12', 'Masculino', '5491144445555', 'carlos@mail.com',
                 'OSDE', 'Penicilina', 'Hipertensión arterial controlada', 'Anticoagulado con warfarina'),
                ('27987654', 'Ana', 'Martínez', '1975-09-23', 'Femenino', '5491166667777', 'ana@mail.com',
                 'Swiss Medical', 'Ninguna', 'Diabetes tipo 2', NULL),
                ('35111222', 'Lucas', 'Fernández', '1992-02-08', 'Masculino', '5491188889999', NULL,
                 'Particular', 'Polen, ácaros', 'Asma bronquial', 'Usa salbutamol de rescate')
            ON CONFLICT (dni) DO NOTHING
        `);

        console.log('[OK] Datos de prueba cargados');
        console.log('     Usuarios demo:');
        console.log('       medico@clinica.com / clinica123');
        console.log('       secretaria@clinica.com / clinica123');
        console.log('       admin@clinica.com / clinica123');
        console.log('     Admin principal:');
        console.log('       jobandoclave@clinica.com / Ob4ndo1985* (debe cambiar clave)');
    } catch (err) {
        console.error('[ERROR]', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seed();
