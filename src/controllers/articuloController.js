import pool from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import { IMAGE_FOLDERS } from '../config/imageFolders.js';

/**
 * ARTICULO CONTROLLER
 * Maneja la lógica de negocio para el inventario de artículos.
 */

// 1. OBTENER TODOS LOS ARTÍCULOS (Corregido: Quitamos referencia a tabla categorías)
export const getArticulos = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                a.*, 
                u.nombre as unidad_nombre, 
                u.abreviatura AS unidad_medida
            FROM articulos a
            LEFT JOIN unidades u ON a.unidad_id = u.id
            ORDER BY a.nombre ASC
        `);

        // Construir URL completa para la foto (igual que en Personal)
        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/${IMAGE_FOLDERS.ARTICULOS}/`;
        const data = rows.map(item => ({
            ...item,
            url_foto: item.url_foto ? `${baseUrl}${item.url_foto}` : null
        }));

        res.json(data);
    } catch (error) {
        console.error('Error al obtener artículos:', error);
        res.status(500).json({ message: 'Error al obtener la lista de artículos' });
    }
};

// 2. OBTENER UN ARTÍCULO POR ID
export const getArticuloById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT a.*, u.abreviatura AS unidad_medida 
            FROM articulos a
            LEFT JOIN unidades u ON a.unidad_id = u.id
            WHERE a.id = ?`, [id]);
        
        if (rows.length === 0) return res.status(404).json({ message: 'No encontrado' });

        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/${IMAGE_FOLDERS.ARTICULOS}/`;
        const item = rows[0];
        item.url_foto = item.url_foto ? `${baseUrl}${item.url_foto}` : null;

        res.json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. CREAR NUEVO ARTÍCULO (Limpieza de campos obsoletos)
export const createArticulo = async (req, res) => {
    try {
        const { 
            nombre, tipo, unidad_id, 
            stock_actual, stock_minimo, costo_unitario 
        } = req.body;
        const personalId = req.user?.id ?? null;

        const url_foto = req.file ? req.file.filename : null;

        // Corregido: Se eliminó categoria_id y unidad_medida de la consulta
        const [result] = await pool.query(
            `INSERT INTO articulos 
            (nombre, url_foto, tipo, unidad_id, stock_actual, stock_minimo, costo_unitario) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nombre, url_foto, tipo, unidad_id, stock_actual || 0, stock_minimo || 0, costo_unitario || 0]
        );

        await registrarAccion({
            tabla: 'articulos',
            operacion: 'INSERT',
            registroId: result.insertId,
            personalId,
            detalles: { nombre, tipo, unidad_id: Number(unidad_id), stock_actual, stock_minimo, costo_unitario, url_foto }
        });

        res.status(201).json({ 
            success: true,
            id: result.insertId, 
            message: 'Artículo creado exitosamente' 
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ 
                message: `El artículo "${req.body.nombre}" ya existe.` 
            });
        }
        console.error('Error al crear:', error);
        res.status(500).json({ message: 'Error interno al guardar el artículo' });
    }
};

// 4. ACTUALIZAR ARTÍCULO (Limpieza de campos obsoletos)
export const updateArticulo = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            nombre, tipo, unidad_id, 
            stock_actual, stock_minimo, costo_unitario 
        } = req.body;
        const personalId = req.user?.id ?? null;

        const [oldData] = await pool.query('SELECT url_foto FROM articulos WHERE id = ?', [id]);
        if (oldData.length === 0) return res.status(404).json({ message: 'No existe el artículo' });

        let url_foto = oldData[0].url_foto;
        if (req.file) {
            url_foto = req.file.filename;
        }

        // Corregido: Se eliminó categoria_id y unidad_medida del UPDATE
        await pool.query(
            `UPDATE articulos SET 
                nombre = ?, url_foto = ?, tipo = ?, 
                unidad_id = ?, stock_actual = ?, 
                stock_minimo = ?, costo_unitario = ?
            WHERE id = ?`,
            [nombre, url_foto, tipo, unidad_id, stock_actual, stock_minimo, costo_unitario, id]
        );

        await registrarAccion({
            tabla: 'articulos',
            operacion: 'UPDATE',
            registroId: Number(id),
            personalId,
            detalles: { nombre, tipo, unidad_id: Number(unidad_id), stock_actual, stock_minimo, costo_unitario, url_foto }
        });

        res.json({ success: true, message: 'Artículo actualizado correctamente' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ 
                message: `Ya existe otro artículo con el nombre "${req.body.nombre}".` 
            });
        }
        res.status(500).json({ message: error.message });
    }
};

// 5. ELIMINAR ARTÍCULO
export const deleteArticulo = async (req, res) => {
    try {
        const { id } = req.params;
        const personalId = req.user?.id ?? null;

        // Validar que id sea un número válido
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                success: false,
                message: 'ID de artículo inválido' 
            });
        }

        // DELETE con validación estricta de id (Primary Key)
        const [articuloRows] = await pool.query('SELECT * FROM articulos WHERE id = ? LIMIT 1', [Number(id)]);
        const articuloEliminado = articuloRows[0];

        if (!articuloEliminado) {
            return res.status(404).json({
                success: false,
                message: 'Artículo no encontrado'
            });
        }

        const [kardexRows] = await pool.query(
            'SELECT COUNT(*) AS total FROM kardex_articulos WHERE articulo_id = ?',
            [Number(id)]
        );
        const totalMovimientos = Number(kardexRows?.[0]?.total || 0);

        if (totalMovimientos > 0) {
            return res.status(409).json({
                success: false,
                message: 'No se puede borrar el artículo porque tiene historial en Kardex. Sugerencia: inactívelo para preservar la contabilidad histórica.'
            });
        }

        const [result] = await pool.query('DELETE FROM articulos WHERE id = ?', [Number(id)]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Artículo no encontrado' 
            });
        }

        // Registrar acción en auditoría - si falla, no detenga el borrado
        try {
            await registrarAccion({
                tabla: 'articulos',
                operacion: 'DELETE',
                registroId: Number(id),
                personalId,
                detalles: articuloEliminado
            });
        } catch (auditError) {
            console.error("⚠️  Advertencia: No se pudo registrar la auditoría del borrado de artículo:", auditError);
            // No re-lanzar error - la auditoría no debe bloquear el borrado
        }

        res.json({ success: true, message: 'Artículo eliminado correctamente' });
    } catch (error) {
        console.error("❌ Error en deleteArticulo:", error);
        res.status(500).json({ 
            success: false,
            message: 'Error al eliminar artículo. Por favor, intente nuevamente.' 
        });
    }
};