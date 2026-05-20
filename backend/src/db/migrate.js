// =====================================================================
// Script para crear las tablas a partir de schema.sql
// Uso: npm run migrate
// =====================================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function run() {
    const sqlPath = path.join(__dirname, '..', '..', 'db', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log('[MIGRATE] Ejecutando schema.sql...');
        await pool.query(sql);
        console.log('[OK] Tablas creadas correctamente');
    } catch (err) {
        console.error('[ERROR]', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
