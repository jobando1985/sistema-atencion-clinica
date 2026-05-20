// =====================================================================
// Conexión a PostgreSQL usando pg.Pool
// =====================================================================
const { Pool } = require('pg');

// Render requiere SSL para conexiones externas. En local, se desactiva.
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
    console.error('[DB] Error inesperado en el pool:', err);
});

module.exports = { pool };
