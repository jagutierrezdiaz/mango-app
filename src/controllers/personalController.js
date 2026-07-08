import * as personalService from '../services/personalService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import { IMAGE_FOLDERS } from '../config/imageFolders.js';

const BASE_UPLOADS = process.env.NGINX_UPLOADS_PATH || 'C:/nginx-1.24.0/html/uploads_mango';
const PERSONAL_UPLOADS = path.join(BASE_UPLOADS, IMAGE_FOLDERS.PERSONAL);

// --- CONFIGURACIÓN DE ALMACENAMIENTO ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(PERSONAL_UPLOADS)) {
            fs.mkdirSync(PERSONAL_UPLOADS, { recursive: true });
        }
        cb(null, PERSONAL_UPLOADS);
    },
    filename: (req, file, cb) => {
        const ident = req.body.numero_identificacion || 'sin_id';
        const uniqueSuffix = Date.now() + path.extname(file.originalname);
        cb(null, `${ident}-${uniqueSuffix}`);
    }
});

export const upload = multer({ storage: storage }).single('foto');

/**
 * OBTENER TODO EL PERSONAL
 */
export const getPersonal = async (req, res, next) => {
    try {
        const rows = await personalService.getAllPersonal();
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

/**
 * OBTENER UN EMPLEADO POR ID
 */
export const getPersonalById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const employee = await personalService.getEmployeeById(id);
        if (!employee) {
            return res.status(404).json({ success: false, message: "Empleado no encontrado" });
        }
        res.json({ success: true, data: employee });
    } catch (error) {
        next(error);
    }
};

/**
 * CREAR NUEVO PERSONAL
 */
export const createPersonal = (req, res, next) => {
    upload(req, res, async (err) => {
        if (err) return next(err);
        try {
            const personalId = req.user?.id ?? null;
            const url_foto = req.file
                ? `/uploads/${IMAGE_FOLDERS.PERSONAL}/${req.file.filename}`
                : null;
            const insertId = await personalService.createNewEmployee(req.body, url_foto);

            await registrarAccion({
                tabla: 'personal',
                operacion: 'INSERT',
                registroId: insertId,
                personalId,
                detalles: { ...req.body, url_foto }
            });

            res.status(201).json({
                success: true,
                message: "Personal registrado correctamente.",
                id: insertId
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY' || error.message.includes('duplicado')) {
                error.statusCode = 400;
                error.message = "El documento o usuario ya existe en el sistema.";
            }
            next(error); 
        }
    });
};

/**
 * ACTUALIZAR REGISTRO COMPLETO (NUEVA FUNCIÓN)
 */
export const updatePersonal = (req, res, next) => {
    upload(req, res, async (err) => {
        if (err) return next(err);
        const { id } = req.params;
        try {
            const personalId = req.user?.id ?? null;
            let url_foto = req.body.url_foto; // Mantener foto actual si no se sube una nueva
            if (req.file) {
                url_foto = `/uploads/${IMAGE_FOLDERS.PERSONAL}/${req.file.filename}`;
            }

            const result = await personalService.updateEmployee(id, req.body, url_foto);
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Empleado no encontrado" });
            }

            await registrarAccion({
                tabla: 'personal',
                operacion: 'UPDATE',
                registroId: Number(id),
                personalId,
                detalles: { ...req.body, url_foto }
            });

            res.json({ success: true, message: "Datos actualizados correctamente" });
        } catch (error) {
            next(error);
        }
    });
};

/**
 * ELIMINAR REGISTRO (LA QUE SOLUCIONA TU PROBLEMA)
 */
export const deletePersonal = async (req, res, next) => {
    const { id } = req.params;
    try {
        const personalId = req.user?.id ?? null;
        const personalEliminado = await personalService.getEmployeeById(id);

        if (!personalEliminado) {
            return res.status(404).json({ success: false, message: "El registro no existe" });
        }

        const result = await personalService.deleteEmployee(id);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "El registro no existe" });
        }

        await registrarAccion({
            tabla: 'personal',
            operacion: 'DELETE',
            registroId: Number(id),
            personalId,
            detalles: personalEliminado
        });

        res.json({ success: true, message: "Registro eliminado de la base de datos" });
    } catch (error) {
        // Manejo por si el empleado tiene llaves foráneas (registros vinculados)
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ 
                success: false, 
                message: "No se puede eliminar: Este empleado tiene registros asociados (ventas, asistencia, etc)." 
            });
        }
        next(error);
    }
};

/**
 * BORRAR CONTRASEÑA DE UN EMPLEADO
 */
export const clearPasswordPersonal = async (req, res, next) => {
    const { id } = req.params;
    try {
        const personalId = req.user?.id ?? null;
        const result = await personalService.clearEmployeePassword(id);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
        }

        await registrarAccion({
            tabla: 'personal',
            operacion: 'UPDATE',
            registroId: Number(id),
            personalId,
            detalles: { password: null, accion: 'clear_password' }
        });

        res.json({ success: true, message: 'Contraseña eliminada correctamente' });
    } catch (error) {
        next(error);
    }
};

/**
 * ACTUALIZAR ESTADO (ACTIVO/INACTIVO)
 */
export const updateEstadoPersonal = async (req, res, next) => {
    const { id } = req.params;
    const { estado } = req.body;
    try {
        const personalId = req.user?.id ?? null;
        if (!estado || typeof estado !== 'string') {
            return res.status(400).json({ success: false, message: 'Estado requerido' });
        }

        const estadoFormateado = estado.charAt(0).toUpperCase() + estado.slice(1).toLowerCase();

        if (!['Activo', 'Inactivo'].includes(estadoFormateado)) {
            return res.status(400).json({ success: false, message: 'Estado inválido' });
        }

        const result = await personalService.updateStatus(id, estadoFormateado);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Personal no encontrado" });
        }

        await registrarAccion({
            tabla: 'personal',
            operacion: 'UPDATE',
            registroId: Number(id),
            personalId,
            detalles: { estado: estadoFormateado }
        });

        res.json({
            success: true,
            message: `Estado actualizado a ${estadoFormateado}.`,
            data: { id, estado: estadoFormateado }
        });
    } catch (error) {
        next(error);
    }
};