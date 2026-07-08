import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { IMAGE_FOLDERS } from '../config/imageFolders.js';

const BASE_UPLOADS = process.env.NGINX_UPLOADS_PATH || 'C:/nginx-1.24.0/html/uploads_mango';

/* ================================
   STORAGE DINÁMICO POR MÓDULO
================================ */

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        const modulo = String(req.params.modulo || '').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
        // Mapear el módulo a la carpeta correspondiente en IMAGE_FOLDERS
        const folderName = IMAGE_FOLDERS[modulo] || modulo.toLowerCase();
        const ruta = path.join(BASE_UPLOADS, folderName);

        if (!fs.existsSync(ruta)) {
            fs.mkdirSync(ruta, { recursive: true });
        }

        cb(null, ruta);

    },

    filename: (req, file, cb) => {
        const modulo = String(req.params.modulo || 'archivo').replace(/[^a-zA-Z0-9_-]/g, '');

        const nombre =
            `${modulo}-${Date.now()}${path.extname(file.originalname)}`;

        cb(null, nombre);

    }

});

export const upload = multer({ storage });
