import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import { IMAGE_FOLDERS } from '../config/imageFolders.js';

/**
 * Crea una nueva categoría
 */
export const crearCategoria = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        const personalId = req.user?.id ?? null;
        const url_foto = req.file ? req.file.filename : null;

        const sql = `INSERT INTO categorias (nombre, descripcion, url_foto) VALUES (?, ?, ?)`;
        const [result] = await db.query(sql, [nombre, descripcion, url_foto]);

        await registrarAccion({
            tabla: 'categorias',
            operacion: 'INSERT',
            registroId: result.insertId,
            personalId,
            detalles: { nombre, descripcion, url_foto }
        });

        res.status(201).json({
            success: true,
            message: "Categoría creada correctamente",
            data: { id: result.insertId, nombre, url_foto }
        });
    } catch (error) {
        console.error("🚨 Error en crearCategoria:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "La categoría ya existe." });
        }
        res.status(500).json({ success: false, message: "Error interno del servidor." });
    }
};

/**
 * Lista todas las categorías
 */
export const listarCategorias = async (req, res) => {
    try {
        const sql = 'SELECT * FROM categorias ORDER BY nombre ASC';
        const [rows] = await db.query(sql);

        // Construir URLs completas para las fotos
        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/${IMAGE_FOLDERS.CATEGORIAS}/`;
        const data = rows.map(item => ({
            ...item,
            url_foto: item.url_foto ? `${baseUrl}${item.url_foto}` : null
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("❌ Error en listarCategorias:", error);
        res.status(500).json({ success: false, message: "Error al obtener las categorías." });
    }
};

/**
 * Obtiene una sola categoría (Para llenar el modal al editar)
 */
export const obtenerCategoriaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query("SELECT * FROM categorias WHERE id = ?", [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Categoría no encontrada" });
        }
        res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al obtener la categoría" });
    }
};

/**
 * Actualiza una categoría existente
 */
export const actualizarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;
        const personalId = req.user?.id ?? null;
        let sql;
        let params;

        if (req.file) {
            // Si subió una foto nueva, actualizamos todo incluyendo url_foto
            sql = "UPDATE categorias SET nombre = ?, descripcion = ?, url_foto = ? WHERE id = ?";
            params = [nombre, descripcion, req.file.filename, id];
        } else {
            // Si no subió foto, mantenemos la que ya tenía
            sql = "UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?";
            params = [nombre, descripcion, id];
        }

        const [result] = await db.query(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Categoría no encontrada" });
        }

        await registrarAccion({
            tabla: 'categorias',
            operacion: 'UPDATE',
            registroId: Number(id),
            personalId,
            detalles: { nombre, descripcion, url_foto: req.file ? req.file.filename : undefined }
        });

        res.status(200).json({ success: true, message: "Categoría actualizada correctamente" });
    } catch (error) {
        console.error("❌ Error en actualizarCategoria:", error);
        res.status(500).json({ success: false, message: "Error al actualizar la categoría." });
    }
};

/**
 * Eliminar categoría
 */
export const eliminarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const personalId = req.user?.id ?? null;

        // Validar que id sea un número válido
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                success: false, 
                message: "ID de categoría inválido" 
            });
        }

        // DELETE con validación estricta de id (Primary Key)
        const [categoriaRows] = await db.query('SELECT * FROM categorias WHERE id = ? LIMIT 1', [Number(id)]);
        const categoriaEliminada = categoriaRows[0];

        if (!categoriaEliminada) {
            return res.status(404).json({ success: false, message: "Categoría no encontrada" });
        }

        const sql = "DELETE FROM categorias WHERE id = ?";
        const [result] = await db.query(sql, [Number(id)]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Categoría no encontrada" });
        }

        // Registrar acción en auditoría - si falla, no detenga el borrado
        try {
            await registrarAccion({
                tabla: 'categorias',
                operacion: 'DELETE',
                registroId: Number(id),
                personalId,
                detalles: categoriaEliminada
            });
        } catch (auditError) {
            console.error("⚠️  Advertencia: No se pudo registrar la auditoría del borrado de categoría:", auditError);
            // No re-lanzar error - la auditoría no debe bloquear el borrado
        }

        res.status(200).json({ success: true, message: "Categoría eliminada correctamente" });
    } catch (error) {
        console.error("❌ Error al eliminar categoría:", error);
        res.status(500).json({ success: false, message: "Error al eliminar la categoría." });
    }
};