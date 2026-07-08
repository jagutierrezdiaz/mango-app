import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_DB_POOL_LIMIT = process.env.NODE_ENV === 'production' ? 4 : 10;
const DB_POOL_LIMIT = Number(process.env.DB_POOL_LIMIT || DEFAULT_DB_POOL_LIMIT);

let db;
try {
    db = await mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        charset: 'utf8mb4',
        supportBigNumbers: true,
        bigNumberStrings: true,
        decimalNumbers: true,
        multipleStatements: false,
        waitForConnections: true,
        connectionLimit: DB_POOL_LIMIT,
        queueLimit: 0
    });
    // Probar conexión inmediatamente para detectar errores de config
    const probeConnection = await db.getConnection();
    probeConnection.release();
    console.log(`✅ Conexión a la base de datos establecida (UTF-8). Pool: ${DB_POOL_LIMIT}`);
} catch (err) {
    console.error('❌ Error al conectar a la base de datos:', err.message);
    process.exit(1);
}

export default db;