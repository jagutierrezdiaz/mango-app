import bcrypt from 'bcrypt';
import db from '../config/db.js';
import { signAuthToken } from '../utils/authToken.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import { registrarLogIngreso } from '../helpers/loginLog.helper.js';

const hasUsableHash = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * LOGIN DE USUARIOS
 * Maneja la autenticación y el primer inicio de sesión (password NULL).
 */
export const login = async (req, res, next) => {
    const { username, password } = req.body || {};

    try {
        if (!username || !password) {
            registrarLogIngreso(req, {
                estado: 'FALLO',
                usuario: username || 'desconocido',
                motivo: 'Usuario y contraseña son requeridos'
            });
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son requeridos.'
            });
        }

        // 1. Buscamos el usuario activo
        const [rows] = await db.query(
            'SELECT id, nombres, apellidos, usuario, password, rol, estado, url_foto FROM personal WHERE usuario = ? AND estado = "Activo"', 
            [username]
        );

        if (rows.length === 0) {
            registrarLogIngreso(req, {
                estado: 'FALLO',
                usuario: username,
                motivo: 'Usuario no encontrado o cuenta inactiva'
            });
            const error = new Error('Usuario no encontrado o cuenta inactiva.');
            error.statusCode = 401;
            throw error;
        }

        const user = rows[0];

        // 2. Gestión de "Primer Inicio de Sesión"
        // Si la contraseña es NULL, el usuario debe configurarla.
        if (user.password === null) {
            registrarLogIngreso(req, {
                estado: 'SETUP',
                usuario: user.usuario,
                userId: user.id,
                rol: user.rol,
                motivo: 'Debe configurar contraseña por primera vez'
            });
            return res.status(200).json({
                success: false,
                requiresSetup: true, // El frontend detecta esto para cambiar de formulario
                message: 'Debe configurar su contraseña por primera vez.',
                userId: user.id
            });
        }

        if (!hasUsableHash(user.password)) {
            registrarLogIngreso(req, {
                estado: 'FALLO',
                usuario: user.usuario,
                userId: user.id,
                rol: user.rol,
                motivo: 'Cuenta sin contraseña válida configurada'
            });
            return res.status(401).json({
                success: false,
                message: 'La cuenta no tiene una contraseña válida configurada. Contacte al administrador.'
            });
        }

        // 3. Comparación de contraseña encriptada
        const validPassword = await bcrypt.compare(String(password), user.password);

        if (!validPassword) {
            registrarLogIngreso(req, {
                estado: 'FALLO',
                usuario: user.usuario,
                userId: user.id,
                rol: user.rol,
                motivo: 'Contraseña incorrecta'
            });
            const error = new Error('La contraseña es incorrecta.');
            error.statusCode = 401;
            throw error;
        }

        // 4. Generar el Token
        const token = signAuthToken(user);

        registrarLogIngreso(req, {
            estado: 'OK',
            usuario: user.usuario,
            userId: user.id,
            rol: user.rol
        });

        // 5. Respuesta exitosa
        res.json({
            success: true, // Aseguramos que success sea true para el frontend
            token: token,
            user: {
                id: user.id,
                nombre: `${user.nombres} ${user.apellidos}`,
                rol: user.rol,
                url_foto: user.url_foto || null
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * CONFIGURAR CONTRASEÑA POR PRIMERA VEZ
 */
export const setupPassword = async (req, res, next) => {
    const { userId, password } = req.body;

    try {
        const personalId = req.user?.id ?? null;
        const parsedUserId = Number(userId);

        // 1. Validar que la contraseña no esté vacía y tenga longitud mínima
        if (!password || password.length < 4) {
            registrarLogIngreso(req, {
                estado: 'FALLO',
                userId: parsedUserId || userId,
                motivo: 'Setup password: contraseña menor a 4 caracteres'
            });
            const error = new Error('La contraseña debe tener al menos 4 caracteres.');
            error.statusCode = 400;
            throw error;
        }

        const [[userRow]] = await db.query(
            'SELECT id, usuario, rol FROM personal WHERE id = ? LIMIT 1',
            [parsedUserId]
        );

        // 2. Encriptar la nueva contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3. Actualizar en la base de datos
        // Solo actualiza si la contraseña actual es NULL por seguridad
        const [result] = await db.query(
            'UPDATE personal SET password = ? WHERE id = ? AND password IS NULL',
            [hashedPassword, parsedUserId]
        );

        if (result.affectedRows === 0) {
            registrarLogIngreso(req, {
                estado: 'FALLO',
                usuario: userRow?.usuario,
                userId: parsedUserId,
                rol: userRow?.rol,
                motivo: 'Setup password: usuario no existe o ya tiene contraseña'
            });
            const error = new Error('No se pudo actualizar. El usuario no existe o ya tiene una contraseña configurada.');
            error.statusCode = 400;
            throw error;
        }

        await registrarAccion({
            tabla: 'personal',
            operacion: 'UPDATE',
            registroId: parsedUserId,
            personalId,
            detalles: { accion: 'setup_password' }
        });

        registrarLogIngreso(req, {
            estado: 'SETUP_PASSWORD',
            usuario: userRow?.usuario,
            userId: parsedUserId,
            rol: userRow?.rol,
            motivo: 'Contraseña configurada por primera vez'
        });

        res.json({
            success: true,
            message: 'Contraseña configurada exitosamente. Ya puede iniciar sesión.'
        });

    } catch (error) {
        next(error);
    }
};

/**
 * RENOVAR TOKEN DE SESIÓN
 * Requiere token válido y devuelve uno nuevo para extender la sesión.
 */
export const refreshToken = async (req, res, next) => {
    try {
        const userId = Number(req.user?.id);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido: usuario no identificado.'
            });
        }

        const [rows] = await db.query(
            'SELECT id, nombres, apellidos, usuario, rol, estado, url_foto FROM personal WHERE id = ? AND estado = "Activo" LIMIT 1',
            [userId]
        );

        if (!rows.length) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no válido o inactivo.'
            });
        }

        const user = rows[0];

        const token = signAuthToken(user);

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                nombre: `${user.nombres} ${user.apellidos}`,
                rol: user.rol,
                url_foto: user.url_foto || null
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * VALIDAR CONTRASEÑA (para acciones administrativas sensibles)
 * Requiere token válido y valida que la contraseña sea correcta
 */
export const validarContrasena = async (req, res, next) => {
    try {
        const { password } = req.body;
        const userId = req.user?.id;
        const userRole = String(req.user?.rol || '').trim().toUpperCase();

        // Validar que el usuario esté autenticado
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado.'
            });
        }

        if (!userRole.includes('ADMIN')) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Esta validación solo aplica para administradores.'
            });
        }

        // Validar que la contraseña sea proporcionada
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña es requerida.'
            });
        }

        // Obtener la contraseña hasheada del usuario
        const [rows] = await db.query(
            'SELECT id, password FROM personal WHERE id = ? AND estado = "Activo" LIMIT 1',
            [userId]
        );

        if (!rows.length) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no válido o inactivo.'
            });
        }

        const user = rows[0];

        // Validar la contraseña contra el hash almacenado
        if (!hasUsableHash(user.password)) {
            return res.status(401).json({
                success: false,
                message: 'La cuenta no tiene una contraseña válida configurada.'
            });
        }

        const validPassword = await bcrypt.compare(String(password), user.password);

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'La contraseña es incorrecta.'
            });
        }

        // Contraseña válida
        return res.status(200).json({
            success: true,
            message: 'Contraseña validada correctamente.'
        });

    } catch (error) {
        next(error);
    }
};