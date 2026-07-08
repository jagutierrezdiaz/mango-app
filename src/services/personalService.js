// src/services/personalService.js
import db from '../config/db.js';

/**
 * Obtiene la lista completa para la interfaz de Gestión de Personal
 * Se incluyen todos los campos reales de la tabla 'personal'
 */
export const getAllPersonal = async () => {
    const [rows] = await db.query(`
        SELECT 
            id, tipo_documento, numero_identificacion, nombres, apellidos, 
            usuario, rol, correo, telefono, direccion, 
            barrio, ciudad, contacto_emergencia_nombre, 
            contacto_emergencia_parentesco, contacto_emergencia_telefono, 
            estado, url_foto, fecha_ingreso, fecha_retiro, fecha_creacion
        FROM personal 
        ORDER BY nombres, apellidos
    `);
    return rows;
};

/**
 * Obtiene un único empleado por su ID
 */
export const getEmployeeById = async (id) => {
    const [rows] = await db.query('SELECT * FROM personal WHERE id = ?', [id]);
    return rows[0]; 
};

/**
 * Crea un nuevo registro de personal
 * El password queda en NULL inicialmente.
 */
export const createNewEmployee = async (data, urlFoto) => {
    const query = `
        INSERT INTO personal (
            tipo_documento, numero_identificacion, nombres, apellidos,
            usuario, password, rol, correo, telefono, direccion,
            barrio, ciudad, contacto_emergencia_nombre,
            contacto_emergencia_parentesco, contacto_emergencia_telefono, 
            estado, url_foto, fecha_ingreso
        ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
        data.tipo_documento, 
        data.numero_identificacion, 
        data.nombres, 
        data.apellidos,
        data.usuario, 
        data.rol, 
        data.correo, 
        data.telefono, 
        data.direccion,
        data.barrio, 
        data.ciudad, 
        data.contacto_emergencia_nombre,
        data.contacto_emergencia_parentesco, 
        data.contacto_emergencia_telefono, 
        data.estado || 'Activo', 
        urlFoto, 
        data.fecha_ingreso || null
    ];

    const [result] = await db.query(query, params);
    return result.insertId;
};

/**
 * Actualiza el estado (Activo/Inactivo) de un empleado
 */
export const updateStatus = async (id, estado) => {
    const [result] = await db.query(
        'UPDATE personal SET estado = ? WHERE id = ?',
        [estado, id]
    );
    return result;
};

/**
 * ACTUALIZAR DATOS DE EMPLEADO
 * CORRECCIÓN: Se eliminaron los campos 'eps' y 'arl' que no existen en la DB.
 */
export const updateEmployee = async (id, data, url_foto) => {
    const { 
        tipo_documento, numero_identificacion, nombres, apellidos, 
        fecha_ingreso, correo, telefono, direccion, ciudad,
        contacto_emergencia_nombre, contacto_emergencia_telefono,
        usuario, rol 
    } = data;

    const query = `
        UPDATE personal SET 
            tipo_documento = ?, 
            numero_identificacion = ?, 
            nombres = ?, 
            apellidos = ?, 
            fecha_ingreso = ?, 
            correo = ?, 
            telefono = ?, 
            direccion = ?, 
            ciudad = ?,
            contacto_emergencia_nombre = ?, 
            contacto_emergencia_telefono = ?,
            usuario = ?, 
            rol = ?, 
            url_foto = ?
        WHERE id = ?
    `;

    const params = [
        tipo_documento, 
        numero_identificacion, 
        nombres, 
        apellidos, 
        fecha_ingreso || null, 
        correo || null, 
        telefono || null, 
        direccion || null, 
        ciudad || 'Sabaneta',
        contacto_emergencia_nombre || null, 
        contacto_emergencia_telefono || null,
        usuario || null, 
        rol || 'Administrador', 
        url_foto,
        id
    ];

    const [result] = await db.query(query, params);
    return result;
};

/**
 * ELIMINAR EMPLEADO DE LA BASE DE DATOS
 */
export const deleteEmployee = async (id) => {
    const [result] = await db.query('DELETE FROM personal WHERE id = ?', [id]);
    return result;
};

/**
 * BORRAR CONTRASEÑA (dejar NULL) DE UN EMPLEADO
 */
export const clearEmployeePassword = async (id) => {
    const [result] = await db.query('UPDATE personal SET password = NULL WHERE id = ?', [id]);
    return result;
};