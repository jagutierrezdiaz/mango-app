import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { IMAGE_FOLDERS, getUploadPath } from './imageFolders.js';

const NGINX_UPLOADS = process.env.NGINX_UPLOADS_PATH || 'C:/nginx-1.24.0/html/uploads_mango';

const storageConfig = (folderKey) => multer.diskStorage({
    destination: (req, file, cb) => {
        const folderName = IMAGE_FOLDERS[folderKey];
        const fullPath = path.join(NGINX_UPLOADS, folderName);
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
        cb(null, fullPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, folderKey.toLowerCase() + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Exportamos los configuradores usando las constantes de imageFolders
export const uploadPersonal = multer({ storage: storageConfig('PERSONAL') });
export const uploadCategorias = multer({ storage: storageConfig('CATEGORIAS') });
export const uploadProductos = multer({ storage: storageConfig('PRODUCTOS') });
export const uploadArticulos = multer({ storage: storageConfig('ARTICULOS') });
export const uploadProveedores = multer({ storage: storageConfig('PROVEEDORES') });
export const uploadGastos = multer({ storage: storageConfig('GASTOS') });
export const uploadBranding = multer({ storage: storageConfig('BRANDING') });