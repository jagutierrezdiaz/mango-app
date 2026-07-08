import db from '../config/db.js';

export const getAllUnidades = async () => {
    const [rows] = await db.query('SELECT * FROM unidades ORDER BY nombre_unidad ASC');
    return rows;
};

export const createUnidad = async (data) => {
    const query = `INSERT INTO unidades (nombre_unidad, nomenclatura) VALUES (?, ?)`;
    const [result] = await db.query(query, [data.nombre_unidad, data.nomenclatura]);
    return result.insertId;
};

export const updateUnidad = async (id, data) => {
    const query = `UPDATE unidades SET nombre_unidad = ?, nomenclatura = ? WHERE id = ?`;
    const [result] = await db.query(query, [data.nombre_unidad, data.nomenclatura, id]);
    return result;
};

export const deleteUnidad = async (id) => {
    const [result] = await db.query('DELETE FROM unidades WHERE id = ?', [id]);
    return result;
};