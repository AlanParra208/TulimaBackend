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
    const token = crypto.randomBytes(32).toString('hex');
    const ttlMs = 15 * 60 * 1000; 

    res.cookie('csrf-token-cookie', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: ttlMs
    });

    return res.json({ csrfToken: token });
};

const verifyCsrfToken = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    
    const rutasIgnoradas = [
        '/login', 
        '/login/mfa',
        '/usuarios',
        '/logout',
        '/registro-proveedor'
    ];

    if (rutasIgnoradas.includes(req.path)) {
        return next();
    }

    const tokenFromHeader = req.headers['x-csrf-token'];
    const tokenFromCookie = req.cookies['csrf-token-cookie'];

    if (!tokenFromHeader || !tokenFromCookie) {
        return res.status(403).json({ error: 'Token CSRF inválido o faltante' });
    }

    if (tokenFromHeader !== tokenFromCookie) {
        return res.status(403).json({ error: 'Token CSRF manipulado o no coincidente' });
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