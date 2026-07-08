import jwt from 'jsonwebtoken';
import { attachRenewedToken, JWT_SECRET } from '../utils/authToken.js';
import { normalizeRole, normalizeRoles } from '../utils/roles.js';

/**
 * Middleware para proteger rutas.
 * @param {Array} rolesPermitidos - Lista de roles que pueden acceder (ej: ['ADMIN', 'MESERO'])
 */
export const guard = (rolesPermitidos = []) => {
    return (req, res, next) => {
        try {
            const authHeader = String(req.headers.authorization || '').trim();
            if (!authHeader) {
                return res.status(401).json({ error: 'invalid_token' });
            }

            const [scheme, token] = authHeader.split(/\s+/);
            if (scheme !== 'Bearer' || !token) {
                return res.status(401).json({ error: 'invalid_token' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET);
            req.user = decoded;
            req.user.rol = normalizeRole(req.user.rol);

            if (rolesPermitidos.length > 0) {
                const normalizedAllowed = normalizeRoles(rolesPermitidos);
                if (!normalizedAllowed.includes(req.user.rol)) {
                    return res.status(403).json({
                        success: false,
                        message: 'No tienes permisos suficientes para realizar esta acción.'
                    });
                }
            }

            attachRenewedToken(res, decoded);
            return next();
        } catch (_error) {
            return res.status(401).json({ error: 'invalid_token' });
        }
    };
};