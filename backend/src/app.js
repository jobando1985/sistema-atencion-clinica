// =====================================================================
// Configuración de Express
// =====================================================================
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const pacientesRoutes = require('./routes/pacientes');
const turnosRoutes = require('./routes/turnos');
const consultasRoutes = require('./routes/consultas');
const recetasRoutes = require('./routes/recetas');
const estudiosRoutes = require('./routes/estudios');

const app = express();

// Seguridad básica (helmet con CSP relajado para servir el frontend)
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// Rate limiter (proteger login)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutos
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/consultas', consultasRoutes);
app.use('/api/recetas', recetasRoutes);
app.use('/api/estudios', estudiosRoutes);

// Servir el frontend estático (../../frontend)
const frontendPath = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(frontendPath));

// SPA fallback: cualquier ruta no-API devuelve index.html
app.get(/^(?!\/api\/).*/, (req, res, next) => {
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
        if (err) next();
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    const status = err.status || 500;
    res.status(status).json({
        error: err.message || 'Error interno del servidor',
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

module.exports = app;
