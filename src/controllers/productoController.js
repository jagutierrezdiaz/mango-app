// src/controllers/productoController.js
import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import { IMAGE_FOLDERS } from '../config/imageFolders.js';

// OBTENER TODOS LOS PRODUCTOS
export const getProductos = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                p.id,
                p.nombre,
                p.categoria_id,
                p.url_foto,
                p.estado,
                c.nombre AS categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            ORDER BY p.nombre ASC
        `);

        // Construir URLs completas para las fotos
        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/${IMAGE_FOLDERS.PRODUCTOS}/`;
        const data = rows.map(item => ({
            ...item,
            url_foto: item.url_foto ? `${baseUrl}${item.url_foto}` : null
        }));

        res.json(data);
    } catch (error) {
        console.error("❌ Error en getProductos:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// CREAR PRODUCTO
/**
 * Crea un nuevo producto
 */
export const createProducto = async (req, res) => {
    try {
        let { nombre, categoria_id, estado } = req.body;
        const personalId = req.user?.id ?? null;
        nombre = nombre.toUpperCase().trim();
        estado = estado ? String(estado).trim() : 'Activo';
        let url_foto = null;
        if (req.file) {
            url_foto = req.file.filename;
        }
        const sql = `
            INSERT INTO productos
            (nombre,categoria_id,url_foto,estado)
            VALUES(?,?,?,?)
        `;
        const [result] = await db.query(sql, [
            nombre,
            categoria_id,
            url_foto,
            estado
        ]);

        await registrarAccion({
            tabla: 'productos',
            operacion: 'INSERT',
            registroId: result.insertId,
            personalId,
            detalles: { nombre, categoria_id: Number(categoria_id), estado, url_foto }
        });

        res.status(200).json({
            success: true,
            data: {
                id: result.insertId
            }
        });

    } catch (error) {
        console.error("❌ Error en createProducto:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Ya existe un producto con esos datos. Verifique los campos únicos e intente con otro valor."
            });
        }

        res.status(500).json({
            success: false,
            message: "Error en la base de datos al crear el producto. Intente nuevamente o contacte al administrador."
        });
    }
};

// OBTENER PRODUCTO POR ID
export const getProductoById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT id,nombre,categoria_id,url_foto,estado FROM productos WHERE id=?`,
            [id]
        );

        const item = rows[0];
        if (item && item.url_foto) {
            const baseUrl = `${req.protocol}://${req.get('host')}/uploads/${IMAGE_FOLDERS.PRODUCTOS}/`;
            item.url_foto = `${baseUrl}${item.url_foto}`;
        }

        res.json({
            success: true,
            data: item || null
        });
    } catch (error) {
        console.error("❌ Error en getProductoById:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ACTUALIZAR PRODUCTO
/**
 * Actualiza un producto existente
 */
export const updateProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const personalId = req.user?.id ?? null;
        let { nombre, categoria_id, estado } = req.body;
        nombre = nombre.toUpperCase().trim();
        estado = estado ? String(estado).trim() : 'Activo';
        let url_foto = null;
        if (req.file) {
            url_foto = req.file.filename;
        }
        const sql = url_foto
            ? `UPDATE productos SET nombre=?,categoria_id=?,url_foto=?,estado=? WHERE id=?`
            : `UPDATE productos SET nombre=?,categoria_id=?,estado=? WHERE id=?`;
        const params = url_foto
            ? [nombre, categoria_id, url_foto, estado, id]
            : [nombre, categoria_id, estado, id];
        await db.query(sql, params);

        await registrarAccion({
            tabla: 'productos',
            operacion: 'UPDATE',
            registroId: Number(id),
            personalId,
            detalles: { nombre, categoria_id: Number(categoria_id), estado, url_foto }
        });

        res.json({
            success: true,
            message: "Producto actualizado correctamente"
        });

    } catch (error) {
        console.error("❌ Error en updateProducto:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Ya existe un producto con ese nombre"
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ELIMINAR PRODUCTO
/**
 * Elimina un producto
 */
export const deleteProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const personalId = req.user?.id ?? null;

        // Validar que id sea un número válido
        if (!id || isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "ID de producto inválido"
            });
        }

        // DELETE con validación estricta de id (Primary Key)
        const [productoRows] = await db.query('SELECT * FROM productos WHERE id = ? LIMIT 1', [Number(id)]);
        const productoEliminado = productoRows[0];

        if (!productoEliminado) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }

        const sql = "DELETE FROM productos WHERE id = ?";
        const [result] = await db.query(sql, [Number(id)]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }

        // Registrar acción en auditoría - si falla, no detenga el borrado
        try {
            await registrarAccion({
                tabla: 'productos',
                operacion: 'DELETE',
                registroId: Number(id),
                personalId,
                detalles: productoEliminado
            });
        } catch (auditError) {
            console.error("⚠️  Advertencia: No se pudo registrar la auditoría del borrado de producto:", auditError);
            // No re-lanzar error - la auditoría no debe bloquear el borrado
        }

        res.status(200).json({
            success: true,
            message: "Producto eliminado correctamente"
        });
    } catch (error) {
        console.error("❌ Error en deleteProducto:", error);

        // Manejar Safe Update Mode error (1175)
        if (error.code === 'ER_UPDATE_WITHOUT_WHERE_AND_LIMIT' || error.errno === 1175) {
            console.error("⚠️  Error de Safe Mode: La consulta DELETE debe usar WHERE con Primary Key");
            return res.status(500).json({
                success: false,
                message: "Error de configuración de servidor. Contacte al administrador."
            });
        }

        // Error genérico — MySQL ON DELETE CASCADE gestiona las dependencias automáticamente
        res.status(500).json({
            success: false,
            message: "Error al eliminar producto. Por favor, intente nuevamente."
        });
    }
};

// AGREGAR INSUMO A FICHA TÉCNICA
export const addInsumoAFicha = async (req, res) => {
    try {
        const { producto_id, articulo_id, cantidad_necesaria } = req.body;
        const personalId = req.user?.id ?? null;
        const sql = `
            INSERT INTO ficha_tecnica (producto_id, articulo_id, cantidad_necesaria)
            VALUES (?, ?, ?)
        `;
        const [result] = await db.query(sql, [
            producto_id,
            articulo_id,
            cantidad_necesaria
        ]);

        await registrarAccion({
            tabla: 'ficha_tecnica',
            operacion: 'INSERT',
            registroId: result.insertId,
            personalId,
            detalles: { producto_id: Number(producto_id), articulo_id: Number(articulo_id), cantidad_necesaria }
        });

        res.status(200).json({
            success: true,
            data: {
                id: result.insertId
            }
        });
    } catch (error) {
        console.error("❌ Error en addInsumoAFicha:", error);
        res.status(500).json({
            success: false,
            message: "Error al agregar artículo a la ficha técnica"
        });
    }
};
