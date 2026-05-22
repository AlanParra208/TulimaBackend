const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // Busca la cookie con el nombre que le pusiste (ej. 'token' o 'jwt')
    const token = req.cookies.token; 

    if (!token) {
        return res.status(401).json({ mensaje: "No autorizado, no hay token" });
    }

    try {
        // Verifica el token con tu palabra secreta
        const decodificado = jwt.verify(token, process.env.JWT_SECRET);
        
        // Guardamos el id del usuario en la request para usarlo en el siguiente paso
        // NOTA: Asegúrate de que 'id_usuario' coincide con el nombre que usaste al crear el token
        req.usuarioId = decodificado.id_usuario; 
        
        next(); // Todo está bien, pasa a la siguiente función
    } catch (error) {
        return res.status(401).json({ mensaje: "Token inválido o expirado" });
    }
};

module.exports = { verificarToken };
