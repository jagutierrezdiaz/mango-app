import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';

/* OBTENER FICHA TECNICA POR PRODUCTO */
export const getByProducto = async (req,res)=>{

    const { productoId } = req.params;

    try{

        const sql = `
        SELECT 
            ft.id,
            ft.producto_id,
            ft.articulo_id,
            ft.cantidad_necesaria,
            a.nombre AS articulo_nombre,
            a.unidad_id,
            u.abreviatura AS unidad_medida
        FROM ficha_tecnica ft
        JOIN articulos a ON ft.articulo_id = a.id
        LEFT JOIN unidades u ON a.unidad_id = u.id
        WHERE ft.producto_id = ?
        ORDER BY a.nombre
        `;

        const [rows]=await db.query(sql,[productoId]);

        res.json({
            success:true,
            data:rows
        });

    }catch(error){

        console.error(error);

        res.status(500).json({
            success:false,
            message:"Error al obtener ficha técnica"
        });

    }

};

/* CONSUMO DE ARTICULOS POR PRODUCTO (ficha tecnica x cantidad de orden) */
export const getConsumoByProducto = async (req, res) => {
    const { productoId } = req.params;
    const cantidadOrden = Number(req.query.cantidad ?? 1);

    if (!Number.isInteger(Number(productoId)) || Number(productoId) <= 0) {
        return res.status(400).json({ success: false, message: 'producto_id invalido' });
    }

    if (!Number.isFinite(cantidadOrden) || cantidadOrden < 0) {
        return res.status(400).json({ success: false, message: 'cantidad invalida' });
    }

    try {
        const sql = `
        SELECT
            a.id AS articulo_id,
            a.nombre AS articulo,
            ROUND(ft.cantidad_necesaria * ?, 3) AS cantidad,
            u.abreviatura AS unidad,
            a.stock_actual AS stock,
            CASE
                WHEN a.stock_actual >= (ft.cantidad_necesaria * ?)
                    THEN 'SI'
                ELSE 'NO'
            END AS disponible,
            CASE
                WHEN a.stock_actual >= (ft.cantidad_necesaria * ?)
                    THEN 0
                ELSE ROUND((ft.cantidad_necesaria * ?) - a.stock_actual, 3)
            END AS deficit,
            ROUND((ft.cantidad_necesaria * ?) * a.costo_unitario, 2) AS costo,
            a.url_foto,
            a.tipo,
            a.stock_minimo,
            a.costo_unitario,
            u.id AS unidad_id,
            u.nombre AS nombre_unidad
        FROM ficha_tecnica ft
        INNER JOIN articulos a ON ft.articulo_id = a.id
        LEFT JOIN unidades u ON a.unidad_id = u.id
        WHERE ft.producto_id = ?
        ORDER BY a.nombre
        `;

        const params = [cantidadOrden, cantidadOrden, cantidadOrden, cantidadOrden, cantidadOrden, Number(productoId)];
        const [rows] = await db.query(sql, params);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en getConsumoByProducto:', error);
        res.status(500).json({ success: false, message: 'Error al obtener consumo de articulos' });
    }
};


/* CREAR ITEM */
export const create = async (req,res)=>{

    try{

        const payload = req.body || {};
        const personalId = req.user?.id ?? null;
        const productoId = Number(payload.producto_id);
        const articuloId = Number(payload.articulo_id);
        const cantidad = Number(payload.cantidad_necesaria);

        // Log de depuracion para confirmar variables recibidas por backend.
        console.log('[ficha-tecnica:create] payload recibido:', {
            producto_id: payload.producto_id,
            articulo_id: payload.articulo_id,
            unidad_id: payload.unidad_id,
            cantidad_necesaria: payload.cantidad_necesaria
        });

        if (!Number.isInteger(productoId) || productoId <= 0) {
            return res.status(400).json({ success:false, message:'producto_id inválido' });
        }

        if (!Number.isInteger(articuloId) || articuloId <= 0) {
            return res.status(400).json({ success:false, message:'articulo_id inválido' });
        }

        if (!Number.isFinite(cantidad) || cantidad <= 0) {
            return res.status(400).json({ success:false, message:'cantidad_necesaria inválida' });
        }

        const [artRows] = await db.query(
            'SELECT id, unidad_id FROM articulos WHERE id = ? LIMIT 1',
            [articuloId]
        );

        if (!artRows.length) {
            return res.status(400).json({
                success:false,
                message:'El articulo seleccionado no existe'
            });
        }

        const sql=`
        INSERT INTO ficha_tecnica
        (producto_id, articulo_id, cantidad_necesaria)
        VALUES (?,?,?)
        `;

        const [result] = await db.query(sql,[productoId, articuloId, cantidad.toFixed(2)]);

        await registrarAccion({
            tabla: 'ficha_tecnica',
            operacion: 'INSERT',
            registroId: result.insertId,
            personalId,
            detalles: { producto_id: productoId, articulo_id: articuloId, cantidad_necesaria: cantidad.toFixed(2) }
        });

        res.json({
            success:true,
            message:"Artículo agregado a la ficha técnica"
        });

    }catch(error){

        console.error('[ficha-tecnica:create] error:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success:false,
                message:'El artículo ya existe en la ficha técnica del producto'
            });
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success:false,
                message:'Referencia inválida de producto, artículo o unidad'
            });
        }

        res.status(500).json({
            success:false,
            message:"Error al crear ficha técnica"
        });

    }

};


/* ACTUALIZAR */
export const update = async (req,res)=>{

    const { id } = req.params;

    const { articulo_id, cantidad_necesaria } = req.body;
    const personalId = req.user?.id ?? null;

    try{

        const articuloId = Number(articulo_id);
        const cantidad = Number(cantidad_necesaria);

        if (!Number.isInteger(articuloId) || articuloId <= 0) {
            return res.status(400).json({ success:false, message:'articulo_id inválido' });
        }

        if (!Number.isFinite(cantidad) || cantidad <= 0) {
            return res.status(400).json({ success:false, message:'cantidad_necesaria inválida' });
        }

        const sql=`
        UPDATE ficha_tecnica
        SET articulo_id=?,
            cantidad_necesaria=?
        WHERE id=?
        `;

        await db.query(sql,[articuloId, cantidad.toFixed(2), id]);

        await registrarAccion({
            tabla: 'ficha_tecnica',
            operacion: 'UPDATE',
            registroId: Number(id),
            personalId,
            detalles: { articulo_id: articuloId, cantidad_necesaria: cantidad.toFixed(2) }
        });

        res.json({
            success:true,
            message:"Artículo actualizado"
        });

    }catch(error){

        console.error(error);

        res.status(500).json({
            success:false,
            message:"Error al actualizar ficha técnica"
        });

    }

};


/* ELIMINAR */
export const deleteItem = async (req,res)=>{

    const { id } = req.params;
    const personalId = req.user?.id ?? null;

    try{

        const [itemRows] = await db.query(
            'SELECT * FROM ficha_tecnica WHERE id = ? LIMIT 1',
            [Number(id)]
        );
        const itemEliminado = itemRows[0];

        if (!itemEliminado) {
            return res.status(404).json({
                success:false,
                message:"Articulo no encontrado"
            });
        }

        const [result] = await db.query(
            "DELETE FROM ficha_tecnica WHERE id=?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success:false,
                message:"Articulo no encontrado"
            });
        }

        await registrarAccion({
            tabla: 'ficha_tecnica',
            operacion: 'DELETE',
            registroId: Number(id),
            personalId,
            detalles: itemEliminado
        });

        res.json({
            success:true,
            message:"Artículo eliminado"
        });

    }catch(error){

        console.error(error);

        res.status(500).json({
            success:false,
            message:"Error al eliminar"
        });

    }

};
