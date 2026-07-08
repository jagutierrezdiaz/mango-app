import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { IMAGE_FOLDERS } from '../config/imageFolders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '../../.env');

dotenv.config({ path: ENV_PATH });

const pool = mysql.createPool({
host: process.env.DB_HOST,
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
database: process.env.DB_NAME || 'mango_db',
waitForConnections: true,
connectionLimit: 10,
queueLimit: 0
});

const UNSPLASH_KEY = process.env.UNSPLASH_KEY;

const BASE_UPLOADS = process.env.NGINX_UPLOADS_PATH || 'C:/nginx-1.24.0/html/uploads_mango';
const DIRECTORIO_IMAGENES = path.join(BASE_UPLOADS, IMAGE_FOLDERS.PRODUCTOS);


function obtenerTerminoBusqueda(nombreProducto) {
const nombre = nombreProducto.toUpperCase();

if (nombre.includes('PANDEBONO'))
    return 'colombian cheese bread';

if (nombre.includes('ALMOJABANA') || nombre.includes('ALMOJÁBANA'))
    return 'colombian cheese bread';

if (nombre.includes('BUÑUELO'))
    return 'colombian cheese bread';

if (nombre.includes('CAPUCHINO'))
    return 'cappuccino coffee';

if (nombre.includes('LATTE'))
    return 'cafe latte';

if (nombre.includes('ESPRESSO'))
    return 'espresso coffee';

if (nombre.includes('CAFÉ'))
    return 'coffee';

if (nombre.includes('BROWNIE'))
    return 'brownie dessert';

if (nombre.includes('CHEESECAKE'))
    return 'cheesecake';

if (nombre.includes('MUFFIN'))
    return 'muffin bakery';

if (nombre.includes('CROISSANT'))
    return 'croissant bakery';

if (nombre.includes('TORTA'))
    return 'cake dessert';

return nombreProducto;

}

async function buscarImagenUnsplash(nombreProducto) {
if (!UNSPLASH_KEY) {
    throw new Error(
        `No se encontró UNSPLASH_KEY en ${ENV_PATH}`
    );
}

const terminoBusqueda =
    obtenerTerminoBusqueda(nombreProducto);

const response = await axios.get(
    'https://api.unsplash.com/search/photos',
    {
        params: {
            query: terminoBusqueda,
            per_page: 1,
            orientation: 'squarish'
        },
        headers: {
            Authorization:
                `Client-ID ${UNSPLASH_KEY}`
        }
    }
);

const resultados = response.data.results;

if (!resultados || resultados.length === 0) {
    return null;
}

return resultados[0].urls.regular;

}

async function descargarImagen(urlImagen) {
const nombreArchivo =
    `prod-${Date.now()}.jpg`;

const rutaCompleta =
    path.join(
        DIRECTORIO_IMAGENES,
        nombreArchivo
    );

const response = await axios({
    method: 'GET',
    url: urlImagen,
    responseType: 'stream'
});

const writer =
    fs.createWriteStream(rutaCompleta);

response.data.pipe(writer);

return new Promise((resolve, reject) => {

    writer.on('finish', () => {
        resolve(nombreArchivo);
    });

    writer.on('error', reject);

});

}

async function actualizarProducto(
id,
nombreArchivo
) {
await pool.query(
    `
    UPDATE productos
    SET url_foto = ?
    WHERE id = ?
    `,
    [
        nombreArchivo,
        id
    ]
);

}

export async function generarImagenesProductos() {
const [productos] = await pool.query(
    `
    SELECT
        id,
        nombre
    FROM productos
    WHERE
        (
            url_foto IS NULL
            OR url_foto = ''
        )
        AND estado = 'Activo'
    ORDER BY id
    `
);

console.log(
    `Productos encontrados: ${productos.length}`
);

for (const producto of productos) {

    try {

        console.log(
            `Procesando ID ${producto.id}: ${producto.nombre}`
        );

        const urlImagen =
            await buscarImagenUnsplash(
                producto.nombre
            );

        if (!urlImagen) {

            console.log(
                'No se encontró imagen'
            );

            continue;
        }

        const nombreArchivo =
            await descargarImagen(
                urlImagen
            );

        await actualizarProducto(
            producto.id,
            nombreArchivo
        );

        console.log(
            `Imagen guardada: ${nombreArchivo}`
        );

    }

    catch (error) {

        console.error(
            `Error producto ${producto.id}:`
        );

        if (error.response) {

            console.error(
                'Status:',
                error.response.status
            );

            console.error(
                'Data:',
                error.response.data
            );

        } else {

            console.error(error.message);

        }

    }

}

await pool.end();

console.log(
    'Proceso finalizado correctamente'
);

}

await generarImagenesProductos();
