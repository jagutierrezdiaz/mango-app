export const successResponse = (res, data = null, message = null, status = 200) => {
    return res.status(status).json({
        success: true,
        message,
        data
    });
};

export const errorResponse = (res, message = "Error interno del servidor", status = 500) => {
    return res.status(status).json({
        success: false,
        message
    });
};
