// =====================================================================
// Middleware de autenticación JWT y control de roles
// =====================================================================
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Token requerido' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;  // { id, email, rol, nombre }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

function requireRole(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'No autenticado' });
        if (!rolesPermitidos.includes(req.user.rol)) {
            return res.status(403).json({ error: 'Permiso denegado' });
        }
        next();
    };
}

module.exports = { requireAuth, requireRole };
