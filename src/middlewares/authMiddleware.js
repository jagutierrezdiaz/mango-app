import jwt from 'jsonwebtoken';
import { attachRenewedToken, JWT_SECRET } from '../utils/authToken.js';
import { normalizeRole, normalizeRoles } from '../utils/roles.js';

/**
 * VERIFICACIÓN BÁSICA DE TOKEN
 * Se usa para rutas que solo requieren estar logueado.
 */
export const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No hay token, acceso denegado' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.user.rol = normalizeRole(req.user?.rol);
        attachRenewedToken(res, decoded);
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token no válido o expirado' });
    }
};

/**
 * CONTROL DE ACCESO POR ROLES
 * Se usa como: authorize(['Administrador', 'Mesero'])
 */
export const authorize = (roles = []) => {
    return (req, res, next) => {
        // Primero verificamos el token (reutilizamos la lógica)
        verifyToken(req, res, () => {
            const role = normalizeRole(req.user?.rol);
            const normalizedAllowed = normalizeRoles(roles);
            if (roles.length > 0 && !normalizedAllowed.includes(role)) {
                return res.status(403).json({ 
                    success: false, 
                    message: `Permiso denegado. Se requiere rol: ${roles.join(' o ')}` 
                });
            }
            next();
        });
    };
};