import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatNoSecondsNow = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:00`;
};

const mapHistorial = (row) => ({
  ...row,
  precio_unitario: Number(row.precio_unitario),
  fecha_registro: row.fecha_registro || null
});

export const getListaPrecios = async (_req, res) => {
  try {
    const [productos] = await db.query(
      `
        SELECT
          p.id,
          p.nombre,
          p.url_foto,
          p.estado,
          c.nombre AS categoria_nombre
        FROM productos p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE p.estado = 'Activo'
        ORDER BY c.nombre ASC, p.nombre ASC
      `
    );

    if (!productos.length) {
      return res.json({ success: true, data: [] });
    }

    const productIds = productos.map((item) => item.id);
    const placeholders = productIds.map(() => '?').join(',');

    const [historial] = await db.query(
      `
        SELECT
          hp.id,
          hp.producto_id,
          hp.precio_unitario,
          hp.estado,
          hp.observaciones,
          DATE_FORMAT(hp.fecha_registro, '%Y-%m-%d %H:%i') AS fecha_registro
        FROM historial_precios hp
        WHERE hp.producto_id IN (${placeholders})
         AND hp.estado = 'Activo'
         ORDER BY hp.fecha_registro DESC, hp.id DESC
      `,
      productIds
    );

    const historialByProducto = historial.reduce((acc, item) => {
      const key = Number(item.producto_id);
      if (!acc[key]) acc[key] = [];
      acc[key].push(mapHistorial(item));
      return acc;
    }, {});

    const data = productos.map((producto) => ({
      ...producto,
      historial_precios: historialByProducto[Number(producto.id)] || []
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error en getListaPrecios:', error);
    res.status(500).json({ success: false, message: 'Error al obtener lista de precios' });
  }
};

export const createPrecioProducto = async (req, res) => {
  try {
    const { productoId } = req.params;
    const { precio_unitario: precioUnitario, observaciones } = req.body || {};
    const personalId = req.user?.id ?? null;

    const productoIdNum = Number(productoId);
    const precio = toNumber(precioUnitario, -1);

    if (!productoIdNum || productoIdNum <= 0) {
      return res.status(400).json({ success: false, message: 'Producto no valido' });
    }

    if (precio < 0) {
      return res.status(400).json({ success: false, message: 'Precio unitario no valido' });
    }

    const [productoRows] = await db.query('SELECT id FROM productos WHERE id = ? LIMIT 1', [productoIdNum]);
    if (!productoRows.length) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    const fechaRegistro = formatNoSecondsNow();

    const [result] = await db.query(
      `
        INSERT INTO historial_precios (
          producto_id,
          precio_unitario,
          estado,
          fecha_registro,
          observaciones
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [productoIdNum, precio, 'Activo', fechaRegistro, observaciones ? String(observaciones).trim() : null]
    );

    await registrarAccion({
      tabla: 'historial_precios',
      operacion: 'INSERT',
      registroId: result.insertId,
      personalId,
      detalles: { producto_id: productoIdNum, precio_unitario: precio, observaciones: observaciones ? String(observaciones).trim() : null }
    });

    const [rows] = await db.query(
      `
        SELECT
          id,
          producto_id,
          precio_unitario,
          estado,
          observaciones,
          DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i') AS fecha_registro
        FROM historial_precios
        WHERE id = ?
        LIMIT 1
      `,
      [result.insertId]
    );

    res.status(201).json({ success: true, data: mapHistorial(rows[0]) });
  } catch (error) {
    console.error('Error en createPrecioProducto:', error);
    res.status(500).json({ success: false, message: 'Error al crear precio del producto' });
  }
};

export const updatePrecioProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { precio_unitario: precioUnitario, observaciones } = req.body || {};
    const personalId = req.user?.id ?? null;

    const precio = toNumber(precioUnitario, -1);
    if (precio < 0) {
      return res.status(400).json({ success: false, message: 'Precio unitario no valido' });
    }

    const [result] = await db.query(
      `
        UPDATE historial_precios
        SET precio_unitario = ?,
            observaciones = ?
        WHERE id = ?
      `,
      [precio, observaciones ? String(observaciones).trim() : null, Number(id)]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Registro de precio no encontrado' });
    }

    await registrarAccion({
      tabla: 'historial_precios',
      operacion: 'UPDATE',
      registroId: Number(id),
      personalId,
      detalles: { precio_unitario: precio, observaciones: observaciones ? String(observaciones).trim() : null }
    });

    const [rows] = await db.query(
      `
        SELECT
          id,
          producto_id,
          precio_unitario,
          estado,
          observaciones,
          DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i') AS fecha_registro
        FROM historial_precios
        WHERE id = ?
        LIMIT 1
      `,
      [Number(id)]
    );

    res.json({ success: true, data: mapHistorial(rows[0]) });
  } catch (error) {
    console.error('Error en updatePrecioProducto:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar precio del producto' });
  }
};

export const deletePrecioProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const personalId = req.user?.id ?? null;

    const [precioRows] = await db.query('SELECT * FROM historial_precios WHERE id = ? LIMIT 1', [Number(id)]);
    const precioEliminado = precioRows[0];

    if (!precioEliminado) {
      return res.status(404).json({ success: false, message: 'Registro de precio no encontrado' });
    }

    const [result] = await db.query('DELETE FROM historial_precios WHERE id = ?', [Number(id)]);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Registro de precio no encontrado' });
    }

    await registrarAccion({
      tabla: 'historial_precios',
      operacion: 'DELETE',
      registroId: Number(id),
      personalId,
      detalles: precioEliminado
    });

    res.json({ success: true, message: 'Registro de precio eliminado' });
  } catch (error) {
    console.error('Error en deletePrecioProducto:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar registro de precio' });
  }
};
