// =====================================================================
// Inserta usuarios de prueba con contraseñas correctamente hasheadas
// Uso: npm run seed
// =====================================================================
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

async function seed() {
    const password = 'clinica123';
    const hash = await bcrypt.hash(password, 10);

    try {
        // Usuarios
        await pool.query(`
            INSERT INTO usuarios (nombre, email, password_hash, rol, matricula, especialidad, telefono)
            VALUES
                ($1, 'medico@clinica.com', $2, 'medico', 'MN 12345', 'Clínica Médica', '+5491133334444'),
                ($3, 'secretaria@clinica.com', $2, 'secretaria', NULL, NULL, '+5491155556666'),
                ($4, 'admin@clinica.com', $2, 'admin', NULL, NULL, NULL)
            ON CONFLICT (email) DO NOTHING
        `, ['Dr. Juan Pérez', hash, 'María García', 'Administrador']);

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
        console.log('     Usuarios:');
        console.log('       medico@clinica.com / clinica123');
        console.log('       secretaria@clinica.com / clinica123');
        console.log('       admin@clinica.com / clinica123');
    } catch (err) {
        console.error('[ERROR]', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seed();
