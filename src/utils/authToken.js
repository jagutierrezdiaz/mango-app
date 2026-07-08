import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'secreto_patio_777';
export const JWT_EXPIRES_IN = '24h';
const TOKEN_RENEW_WINDOW_SECONDS = 30 * 60;

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

export const buildAuthTokenPayload = (user) => ({
    id: user.id,
    usuario: user.usuario,
    rol: user.rol
});

export const signAuthToken = (user) => jwt.sign(
    buildAuthTokenPayload(user),
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
);

export const shouldRenewAuthToken = (decoded) => {
    const expiresAt = Number(decoded?.exp || 0);
    if (!expiresAt) return false;

    const remainingSeconds = expiresAt - Math.floor(Date.now() / 1000);
    return remainingSeconds > 0 && remainingSeconds <= TOKEN_RENEW_WINDOW_SECONDS;
};

export const attachRenewedToken = (res, decoded) => {
    if (!shouldRenewAuthToken(decoded)) {
        return null;
    }

    const renewedToken = signAuthToken(decoded);
    res.setHeader('x-renewed-token', renewedToken);

    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (isPlainObject(body) && !Object.prototype.hasOwnProperty.call(body, 'token')) {
            return originalJson({ ...body, token: renewedToken });
        }

        return originalJson(body);
    };

    return renewedToken;
};