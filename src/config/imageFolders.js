import path from 'path';

const NGINX_UPLOADS_BASE = process.env.NGINX_UPLOADS_PATH || 'C:/nginx-1.24.0/html/uploads_mango';

export const IMAGE_FOLDERS = {
    PERSONAL: 'img-personal',
    CATEGORIAS: 'img-categorias',
    PRODUCTOS: 'img-fichas-tecnicas', // Renamed from 'productos'
    ARTICULOS: 'img-articulos',
    PROVEEDORES: 'img-proveedores',
    GASTOS: 'img-gastos-comprobantes',
    BRANDING: 'img-branding' // For static logos
};

export const getUploadPath = (folderName) => {
    return path.join(NGINX_UPLOADS_BASE, folderName);
};

export const getUploadUrl = (folderName, fileName) => {
    return `${NGINX_UPLOADS_BASE}/${folderName}/${fileName}`;
};