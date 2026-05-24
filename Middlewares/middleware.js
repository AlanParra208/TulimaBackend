const jwt = require('jsonwebtoken');
const crypto = require('crypto');


const csrfStore = new Map();

const verificarToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ mensaje: "No autorizado, no hay token" });
    }

    try {
        const decodificado = jwt.verify(token, process.env.JWT_SECRET);
        req.usuarioId = decodificado.id_usuario;
        req.user = decodificado;
        next();
    } catch (error) {
        return res.status(401).json({ mensaje: "Token inválido o expirado" });
    }
};

const generateCsrfToken = (req, res) => {
    // Crear un id que asocie el token en el servidor. Usamos cookie httpOnly 'csrf-id'
    const csrfId = crypto.randomBytes(16).toString('hex');
    const token = crypto.randomBytes(32).toString('hex');

    // Guardar en store en memoria con TTL
    const ttlMs = 15 * 60 * 1000; // 15 minutos
    const expiresAt = Date.now() + ttlMs;
    csrfStore.set(csrfId, { token, expiresAt });

    // Limpieza simple de expirados
    for (const [key, value] of csrfStore.entries()) {
        if (value.expiresAt < Date.now()) csrfStore.delete(key);
    }

    res.cookie('csrf-id', csrfId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: ttlMs
    });

    return res.json({ csrfToken: token });
};

const verifyCsrfToken = (req, res, next) => {
    // 1. Ignorar peticiones seguras de solo lectura
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    const rutasIgnoradas = [
        '/login', 
        '/login/mfa',
        '/usuarios',
        '/logout'
    ];

    if (rutasIgnoradas.includes(req.path)) {
        return next();
    }

    const tokenFromHeader = req.headers['x-csrf-token'];
    const csrfId = req.cookies['csrf-id'];

    if (!tokenFromHeader || !csrfId) {
        return res.status(403).json({ error: 'Token CSRF inválido o faltante' });
    }

    const record = csrfStore.get(csrfId);
    if (!record) {
        return res.status(403).json({ error: 'Token CSRF expirado o no encontrado' });
    }

    if (record.expiresAt < Date.now()) {
        csrfStore.delete(csrfId);
        return res.status(403).json({ error: 'Token CSRF expirado' });
    }

    if (record.token !== tokenFromHeader) {
        return res.status(403).json({ error: 'Token CSRF inválido' });
    }

    next();
};

const algorithm = 'aes-256-cbc';
const secretKey = crypto.scryptSync(process.env.JWT_SECRET || 'llave_secreta_por_defecto', 'salt', 32);

const encryptSymmetric = (text) => {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(text.toString()), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptSymmetric = (hash) => {
    if (!hash || !hash.includes(':')) return hash;
    try {
        const [ivHex, encryptedHex] = hash.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedText = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
        return decrypted.toString();
    } catch (err) {
        return hash; 
    }
};

const sanitizeString = (value) => {
    if (typeof value !== 'string') return value;
    return value
        .replace(/<\s*script[^>]*>(.*?)<\s*\/\s*script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s*on\w+\s*=\s*['"][^'"]*['"]/gi, '');
};

const sanitizeObject = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return sanitizeString(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const key of Object.keys(obj)) {
            sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
    }
    return obj;
};

const sanitizeRequest = (req, res, next) => {
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    next();
};

const deleteCsrfById = (csrfId) => {
    try {
        return csrfStore.delete(csrfId);
    } catch (e) {
        return false;
    }
};

module.exports = { verificarToken, generateCsrfToken, verifyCsrfToken, encryptSymmetric, decryptSymmetric, sanitizeRequest, deleteCsrfById };