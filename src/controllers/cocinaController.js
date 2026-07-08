import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';

const PRIORIDAD_PESO = {
  Alta: 1,
  Media: 2,
  Baja: 3
};

export const getProgramacionCocina = async (_req, res) => {
  try {
    const [mesas] = await db.query(
      `SELECT id, numero, nombre, estado
       FROM mesas
       ORDER BY numero ASC, id ASC`
    );

    const [comandas] = await db.query(
      `SELECT
        c.id,
        c.mesa_id,
        c.personal_id,
        c.fecha_hora,
        c.prioridad,
        c.estado_comanda,
        p.nombres AS personal_nombres,
        p.apellidos AS personal_apellidos,
        p.url_foto AS personal_url_foto
      FROM comandas c
      INNER JOIN personal p ON p.id = c.personal_id
      WHERE c.estado_comanda IN ('Abierta', 'En Proceso')
      ORDER BY c.fecha_hora DESC, c.id DESC`
    );

    const [pendientesPorComanda] = await db.query(
      `SELECT
        cd.comanda_id,
        COUNT(*) AS total_ordenados
      FROM comandas_detalle cd
      WHERE cd.estado_producto = 'Ordenado'
      GROUP BY cd.comanda_id`
    );

    const pendientesMap = new Map(
      pendientesPorComanda.map((row) => [Number(row.comanda_id), Number(row.total_ordenados)])
    );

    const comandasPorMesa = new Map();
    for (const comanda of comandas) {
      const mesaId = Number(comanda.mesa_id);
      const item = {
        id: comanda.id,
        mesa_id: mesaId,
        personal_id: comanda.personal_id,
        fecha_hora: comanda.fecha_hora,
        prioridad: comanda.prioridad,
        estado_comanda: comanda.estado_comanda,
        personal_nombres: comanda.personal_nombres,
        personal_apellidos: comanda.personal_apellidos,
        personal_url_foto: comanda.personal_url_foto,
        personal_rol: comanda.personal_rol,
        total_ordenados: pendientesMap.get(Number(comanda.id)) || 0
      };

      if (!comandasPorMesa.has(mesaId)) comandasPorMesa.set(mesaId, []);
      comandasPorMesa.get(mesaId).push(item);
    }

    const data = mesas.map((mesa) => {
      const lista = comandasPorMesa.get(Number(mesa.id)) || [];
      lista.sort((a, b) => {
        const p1 = PRIORIDAD_PESO[a.prioridad] || 99;
        const p2 = PRIORIDAD_PESO[b.prioridad] || 99;
        if (p1 !== p2) return p1 - p2;
        return new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime();
      });

      return {
        id: mesa.id,
        numero: mesa.numero,
        nombre: mesa.nombre,
        estado: mesa.estado,
        comandas: lista
      };
    });

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error en getProgramacionCocina:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cargar programacion de cocina.'
    });
  }
};

export const getDetallesComandaOrdenados = async (req, res) => {
  try {
    const comandaId = Number(req.params.comandaId);
    if (!Number.isInteger(comandaId) || comandaId <= 0) {
      return res.status(400).json({ success: false, message: 'Comanda invalida.' });
    }

    const [comandaRows] = await db.query(
      `SELECT
        c.id,
        c.mesa_id,
        c.personal_id,
        c.fecha_hora,
        c.prioridad,
        c.estado_comanda,
        m.nombre AS mesa_nombre,
        p.nombres AS personal_nombres,
        p.apellidos AS personal_apellidos,
        p.url_foto AS personal_url_foto
      FROM comandas c
      INNER JOIN mesas m ON m.id = c.mesa_id
      INNER JOIN personal p ON p.id = c.personal_id
      WHERE c.id = ?
      LIMIT 1`,
      [comandaId]
    );

    if (!comandaRows.length) {
      return res.status(404).json({ success: false, message: 'Comanda no encontrada.' });
    }

    const [detalles] = await db.query(
      `SELECT
        cd.id,
        cd.comanda_id,
        cd.producto_id,
        cd.cantidad,
        cd.observaciones_mesero,
        cd.observaciones_cocina,
        cd.estado_producto,
        p.nombre AS producto_nombre,
        p.url_foto AS producto_url_foto
      FROM comandas_detalle cd
      INNER JOIN productos p ON p.id = cd.producto_id
      WHERE cd.comanda_id = ?
        AND cd.estado_producto = 'Ordenado'
      ORDER BY cd.id ASC`,
      [comandaId]
    );

    return res.json({
      success: true,
      data: {
        comanda: comandaRows[0],
        detalles
      }
    });
  } catch (error) {
    console.error('Error en getDetallesComandaOrdenados:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al cargar detalle de comanda.'
    });
  }
};

export const marcarDetalleComoProcesado = async (req, res) => {
  try {
    const detalleId = Number(req.params.detalleId);
    const personalId = req.user?.id ?? null;
    if (!Number.isInteger(detalleId) || detalleId <= 0) {
      return res.status(400).json({ success: false, message: 'Detalle invalido.' });
    }

    const [destinoRows] = await db.query(
      `SELECT
        cd.id AS detalle_id,
        cd.comanda_id,
        c.personal_id
      FROM comandas_detalle cd
      INNER JOIN comandas c ON c.id = cd.comanda_id
      WHERE cd.id = ?
      LIMIT 1`,
      [detalleId]
    );

    if (!destinoRows.length) {
      return res.status(404).json({
        success: false,
        message: 'No se encontro el detalle de comanda.'
      });
    }

    const destino = destinoRows[0];

    const [result] = await db.query(
      `UPDATE comandas_detalle
       SET estado_producto = 'Procesado'
       WHERE id = ? AND estado_producto = 'Ordenado'`,
      [detalleId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'No se pudo actualizar. El producto ya fue procesado o no existe.'
      });
    }

    await registrarAccion({
      tabla: 'comandas_detalle',
      operacion: 'UPDATE',
      registroId: detalleId,
      personalId,
      detalles: {
        comanda_id: Number(destino.comanda_id),
        estado_producto: 'Procesado'
      }
    });

    const [pendientesRows] = await db.query(
      `SELECT COUNT(*) AS total_pendientes
       FROM comandas_detalle
       WHERE comanda_id = ? AND estado_producto = 'Ordenado'`,
      [Number(destino.comanda_id)]
    );

    const totalPendientes = Number(pendientesRows?.[0]?.total_pendientes || 0);

    const [comandaRows] = await db.query(
      `SELECT c.id, c.mesa_id, c.personal_id, m.nombre AS nombre_mesa
       FROM comandas c
       LEFT JOIN mesas m ON m.id = c.mesa_id
       WHERE c.id = ?
       LIMIT 1`,
      [Number(destino.comanda_id)]
    );

    const comanda = comandaRows?.[0] || {};
    const destinoPersonalId = Number(comanda.personal_id || destino.personal_id || 0);
    const platoProcesadoPayload = {
      detalle_id: Number(destino.detalle_id),
      comanda_id: Number(destino.comanda_id),
      id_comanda: Number(destino.comanda_id),
      mesa_id: Number(comanda.mesa_id || 0),
      id_mesa: Number(comanda.mesa_id || 0),
      nombre_mesa: comanda.nombre_mesa || null,
      personal_id: destinoPersonalId,
      id_mesero: destinoPersonalId,
      estado_comanda: 'Abierta',
      total_pendientes: totalPendientes
    };

    const io = req?.app?.get?.('socketio');
    if (io && typeof io.to === 'function' && destinoPersonalId > 0) {
      io.to(`user:${destinoPersonalId}`).emit('plato-procesado', platoProcesadoPayload);
    }

    return res.json({
      success: true,
      message: 'Producto marcado como procesado.',
      data: {
        detalle_id: Number(destino.detalle_id),
        comanda_id: Number(destino.comanda_id),
        estado_comanda: 'Abierta',
        total_pendientes: totalPendientes
      }
    });
  } catch (error) {
    console.error('Error en marcarDetalleComoProcesado:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado del producto.'
    });
  }
};
