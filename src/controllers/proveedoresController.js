import db from '../config/db.js';
import { registrarAccion } from '../helpers/auditoria.helper.js';
import { IMAGE_FOLDERS } from '../config/imageFolders.js';

/* LISTAR */
export const getAll = async (req,res)=>{
    try{

        const [rows] = await db.query(`
            SELECT *
            FROM proveedores
            ORDER BY razon_social
        `);

        // Construir URLs completas para los logos
        const baseUrl = `${req.protocol}://${req.get('host')}/uploads/${IMAGE_FOLDERS.PROVEEDORES}/`;
        const data = rows.map(item => ({
            ...item,
            url_logo: item.url_logo ? `${baseUrl}${item.url_logo}` : null
        }));

        res.json({
            success:true,
            data
        });

    }catch(error){
        console.error(error);
        res.status(500).json({
            success:false,
            message:"Error al obtener proveedores"
        });
    }
};


/* OBTENER UNO */
export const getById = async (req,res)=>{

    const { id } = req.params;

    try{

        const [rows] = await db.query(
            `SELECT * FROM proveedores WHERE id=?`,
            [id]
        );

        const item = rows[0];
        if (item && item.url_logo) {
            const baseUrl = `${req.protocol}://${req.get('host')}/uploads/${IMAGE_FOLDERS.PROVEEDORES}/`;
            item.url_logo = `${baseUrl}${item.url_logo}`;
        }

        res.json({
            success:true,
            data: item
        });

    }catch(error){
        console.error(error);
        res.status(500).json({
            success:false,
            message:"Error al obtener proveedor"
        });
    }
};


/* CREAR */
export const create = async (req,res)=>{

    const {
        nit,
        razon_social,
        contacto_nombre,
        telefono,
        correo,
        direccion,
        ciudad,
        regimen_fiscal
    } = req.body;
    const personalId = req.user?.id ?? null;

    // multer pone el archivo en req.file; req.body.url_logo queda vacío
    const url_logo = req.file ? req.file.filename : null;

    try{

        const sql = `
        INSERT INTO proveedores
        (nit, razon_social, contacto_nombre, telefono, correo, direccion, ciudad, regimen_fiscal, url_logo)
        VALUES (?,?,?,?,?,?,?,?,?)
        `;

        const [result] = await db.query(sql,[
            nit,
            razon_social,
            contacto_nombre,
            telefono,
            correo,
            direccion,
            ciudad,
            regimen_fiscal,
            url_logo
        ]);

        await registrarAccion({
            tabla: 'proveedores',
            operacion: 'INSERT',
            registroId: result.insertId,
            personalId,
            detalles: { nit, razon_social, contacto_nombre, telefono, correo, direccion, ciudad, regimen_fiscal, url_logo }
        });

        res.json({
            success:true,
            message:"Proveedor creado correctamente"
        });

    }catch(error){

        console.error(error);

        if(error.code === 'ER_DUP_ENTRY'){
            return res.status(400).json({
                success:false,
                message:"El NIT o la razón social ya existen"
            });
        }

        res.status(500).json({
            success:false,
            message:"Error al crear proveedor"
        });
    }
};


/* ACTUALIZAR */
export const update = async (req,res)=>{

    const { id } = req.params;
    const personalId = req.user?.id ?? null;

    const {
        nit,
        razon_social,
        contacto_nombre,
        telefono,
        correo,
        direccion,
        ciudad,
        regimen_fiscal
    } = req.body;

    // Si se sube nueva imagen usa su filename; si no, conserva la actual en DB
    let url_logo;
    if (req.file) {
        url_logo = req.file.filename;
    } else {
        const [existing] = await db.query('SELECT url_logo FROM proveedores WHERE id=?', [id]);
        url_logo = existing[0]?.url_logo ?? null;
    }

    try{

        const sql = `
        UPDATE proveedores
        SET nit=?,
            razon_social=?,
            contacto_nombre=?,
            telefono=?,
            correo=?,
            direccion=?,
            ciudad=?,
            regimen_fiscal=?,
            url_logo=?
        WHERE id=?
        `;

        await db.query(sql,[
            nit,
            razon_social,
            contacto_nombre,
            telefono,
            correo,
            direccion,
            ciudad,
            regimen_fiscal,
            url_logo,
            id
        ]);

        await registrarAccion({
            tabla: 'proveedores',
            operacion: 'UPDATE',
            registroId: Number(id),
            personalId,
            detalles: { nit, razon_social, contacto_nombre, telefono, correo, direccion, ciudad, regimen_fiscal, url_logo }
        });

        res.json({
            success:true,
            message:"Proveedor actualizado"
        });

    }catch(error){

        console.error(error);

        res.status(500).json({
            success:false,
            message:"Error al actualizar proveedor"
        });

    }

};


/* ELIMINAR */
export const deleteProveedor = async (req,res)=>{

    const { id } = req.params;
    const personalId = req.user?.id ?? null;

    try{

        const [proveedorRows] = await db.query(
            'SELECT * FROM proveedores WHERE id = ? LIMIT 1',
            [Number(id)]
        );
        const proveedorEliminado = proveedorRows[0];

        if (!proveedorEliminado) {
            return res.status(404).json({
                success:false,
                message:"Proveedor no encontrado"
            });
        }

        const [result] = await db.query(
            "DELETE FROM proveedores WHERE id=?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success:false,
                message:"Proveedor no encontrado"
            });
        }

        await registrarAccion({
            tabla: 'proveedores',
            operacion: 'DELETE',
            registroId: Number(id),
            personalId,
            detalles: proveedorEliminado
        });

        res.json({
            success:true,
            message:"Proveedor eliminado"
        });

    }catch(error){

        console.error(error);

        res.status(500).json({
            success:false,
            message:"Error al eliminar proveedor"
        });

    }

};
