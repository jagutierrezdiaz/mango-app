// src/middlewares/errorMiddleware.js

export const errorHandler = (err, req, res, next) => {
    console.error(`\n${'='.repeat(50)}`);
    console.error('❌ ERROR DETECTADO EN: errorHandler (Middleware Global)');
    console.error('MENSAJE:', err?.message);
    if (err?.sql) console.error('SQL FALLIDO:', err.sql);
    if (err?.sqlMessage) console.error('ERROR MYSQL:', err.sqlMessage);
    if (err?.stack) console.error('STACK:', err.stack);
    console.error('='.repeat(50));
    console.error('');
    
    // Si el error no tiene un código de estado, usamos 500 (Error del servidor)
    const statusCode = err.statusCode || 500;
    
    res.status(statusCode).json({
        success: false,
        message: err.message || "Error interno del servidor",
        // Solo enviamos el stack (la línea exacta del error) si no estamos en producción
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
};