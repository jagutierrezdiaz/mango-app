import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';

const allowedUbicaciones = ['Salón Principal', 'Terraza', 'Bar', 'VIP'];
const allowedEstados = ['Libre', 'Ocupada', 'Sucia', 'Reservada'];

const toInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const validateMesa = (payload = {}) => {
  const numero = toInt(payload.numero, -1);
  const puestos = toInt(payload.puestos, -1);

  if (numero <= 0) return 'El numero de mesa debe ser mayor a 0';
  if (puestos <= 0) return 'Los puestos deben ser mayores a 0';

  if (payload.ubicacion && !allowedUbicaciones.includes(payload.ubicacion)) {
    return 'La ubicacion no es valida';
  }

  if (payload.estado && !allowedEstados.includes(payload.estado)) {
    return 'El estado no es valido';
  }

  return null;
};

export const listarMesas = async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM mesas ORDER BY nombre ASC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error en listarMesas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener mesas' });
  }
};

export const obtenerMesaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM mesas WHERE id = ? LIMIT 1', [Number(id)]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error en obtenerMesaPorId:', error);
    res.status(500).json({ success: false, message: 'Error al obtener mesa' });
  }
};

export const crearMesa = async (req, res) => {
  try {
    const payload = req.body || {};
    const personalId = req.user?.id ?? null;
    const validationError = validateMesa(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const numero = toInt(payload.numero);
    const nombre = payload.nombre ? String(payload.nombre).trim() : null;
    const puestos = toInt(payload.puestos, 2);
    const ubicacion = payload.ubicacion || 'Salón Principal';
    const estado = payload.estado || 'Libre';

    const [result] = await db.query(
      'INSERT INTO mesas (numero, nombre, puestos, ubicacion, estado) VALUES (?, ?, ?, ?, ?)',
      [numero, nombre, puestos, ubicacion, estado]
    );

    await registrarAccion({
      tabla: 'mesas',
      operacion: 'INSERT',
      registroId: result.insertId,
      personalId,
      detalles: { numero, nombre, puestos, ubicacion, estado }
    });

    const [created] = await db.query('SELECT * FROM mesas WHERE id = ? LIMIT 1', [result.insertId]);
    res.status(201).json({ success: true, message: 'Mesa creada correctamente', data: created[0] });
  } catch (error) {
    console.error('Error en crearMesa:', error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'El numero de mesa ya existe' });
    }
    res.status(500).json({ success: false, message: 'Error al crear mesa' });
  }
};

export const actualizarMesa = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const personalId = req.user?.id ?? null;
    const validationError = validateMesa(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const numero = toInt(payload.numero);
    const nombre = payload.nombre ? String(payload.nombre).trim() : null;
    const puestos = toInt(payload.puestos, 2);
    const ubicacion = payload.ubicacion || 'Salón Principal';
    const estado = payload.estado || 'Libre';

    const [result] = await db.query(
      'UPDATE mesas SET numero = ?, nombre = ?, puestos = ?, ubicacion = ?, estado = ? WHERE id = ?',
      [numero, nombre, puestos, ubicacion, estado, Number(id)]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
    }

    await registrarAccion({
      tabla: 'mesas',
      operacion: 'UPDATE',
      registroId: Number(id),
      personalId,
      detalles: { numero, nombre, puestos, ubicacion, estado }
    });

    const [updated] = await db.query('SELECT * FROM mesas WHERE id = ? LIMIT 1', [Number(id)]);
    res.json({ success: true, message: 'Mesa actualizada correctamente', data: updated[0] });
  } catch (error) {
    console.error('Error en actualizarMesa:', error);
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'El numero de mesa ya existe' });
    }
    res.status(500).json({ success: false, message: 'Error al actualizar mesa' });
  }
};

export const eliminarMesa = async (req, res) => {
  try {
    const { id } = req.params;
    const personalId = req.user?.id ?? null;

    const [mesaRows] = await db.query('SELECT * FROM mesas WHERE id = ? LIMIT 1', [Number(id)]);
    const mesaEliminada = mesaRows[0];

    if (!mesaEliminada) {
      return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
    }

    const [result] = await db.query('DELETE FROM mesas WHERE id = ?', [Number(id)]);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
    }

    await registrarAccion({
      tabla: 'mesas',
      operacion: 'DELETE',
      registroId: Number(id),
      personalId,
      detalles: mesaEliminada
    });

    res.json({ success: true, message: 'Mesa eliminada correctamente' });
  } catch (error) {
    console.error('Error en eliminarMesa:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar mesa' });
  }
};
