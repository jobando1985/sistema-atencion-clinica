// =====================================================================
// Punto de entrada del servidor backend
// =====================================================================
require('dotenv').config();
const app = require('./app');
const { pool } = require('./db/pool');

const PORT = process.env.PORT || 4000;

async function start() {
    try {
        // Probar conexión a la base de datos
        await pool.query('SELECT 1');
        console.log('[OK] Conexión a PostgreSQL establecida');

        app.listen(PORT, () => {
            console.log(`[OK] Servidor escuchando en puerto ${PORT}`);
            console.log(`     Modo: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (err) {
        console.error('[ERROR] No se pudo iniciar el servidor:', err.message);
        process.exit(1);
    }
}

start();
