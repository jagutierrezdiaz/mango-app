import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';

/**
 * OBTENER TODAS LAS UNIDADES
 */
export const getAllUnidades = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM unidades ORDER BY nombre ASC');
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error("DETALLE DEL ERROR 500:", error.message);
        next(error);
    }
};

/**
 * CREAR NUEVA UNIDAD
 */
export const createUnidad = async (req, res, next) => {
    const { nombre, abreviatura } = req.body;
    const personalId = req.user?.id ?? null;

    // Validación simple
    if (!nombre || !abreviatura) {
        const error = new Error('Nombre y abreviatura son requeridos.');
        error.statusCode = 400;
        return next(error);
    }

    try {
        const [result] = await db.query(
            'INSERT INTO unidades (nombre, abreviatura) VALUES (?, ?)',
            [nombre, abreviatura]
        );

        await registrarAccion({
            tabla: 'unidades',
            operacion: 'INSERT',
            registroId: result.insertId,
            personalId,
            detalles: { nombre, abreviatura }
        });
        
        res.status(201).json({
            success: true,
            message: 'Unidad creada exitosamente.',
            id: result.insertId
        });
        } catch (error) {
            if (error.errno === 1062) {
                // MySQL nos dice qué índice falló. Enviamos mensaje amigable:
                const campo = error.message.includes('nombre') ? 'El nombre' : 'La nomenclatura';
                return res.status(400).json({ 
                    success: false, 
                    message: `${campo} ya está registrado.` 
                });
            }
            next(error);
        }
};

/**
 * ACTUALIZAR UNIDAD
 */
export const updateUnidad = async (req, res, next) => {
    const { id } = req.params;
    const { nombre, abreviatura } = req.body;
    const personalId = req.user?.id ?? null;

    try {
        const [result] = await db.query(
            'UPDATE unidades SET nombre = ?, abreviatura = ? WHERE id = ?',
            [nombre, abreviatura, id]
        );

        if (result.affectedRows === 0) {
            const error = new Error('Unidad no encontrada.');
            error.statusCode = 404;
            throw error;
        }

        await registrarAccion({
            tabla: 'unidades',
            operacion: 'UPDATE',
            registroId: Number(id),
            personalId,
            detalles: { nombre, abreviatura }
        });

        res.json({
            success: true,
            message: 'Unidad actualizada correctamente.'
        });
        } catch (error) {
            if (error.errno === 1062) {
                // MySQL nos dice qué índice falló. Enviamos mensaje amigable:
                const campo = error.message.includes('nombre') ? 'El nombre' : 'La nomenclatura';
                return res.status(400).json({ 
                    success: false, 
                    message: `${campo} ya está registrado.` 
                });
            }
            next(error);
        }
};

/**
 * ELIMINAR UNIDAD
 */
export const deleteUnidad = async (req, res, next) => {
    const { id } = req.params;
    const personalId = req.user?.id ?? null;

    try {
        const [unidadRows] = await db.query('SELECT * FROM unidades WHERE id = ? LIMIT 1', [Number(id)]);
        const unidadEliminada = unidadRows[0];

        if (!unidadEliminada) {
            const error = new Error('Unidad no encontrada.');
            error.statusCode = 404;
            throw error;
        }

        const [result] = await db.query('DELETE FROM unidades WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            const error = new Error('Unidad no encontrada.');
            error.statusCode = 404;
            throw error;
        }

        await registrarAccion({
            tabla: 'unidades',
            operacion: 'DELETE',
            registroId: Number(id),
            personalId,
            detalles: unidadEliminada
        });

        res.json({
            success: true,
            message: 'Unidad eliminada correctamente.'
        });
    } catch (error) {
        next(error);
    }
};