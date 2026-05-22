const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const {verificarToken} = require('../Middlewares/middleware');

app.use(passport.initialize());

const prisma = require('../config.db');

// Le enseñamos a JavaScript a serializar los BigInt convirtiéndolos a String
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Middleware que verifica el JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token no provisto' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
}

//Configuración de Passport para Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:8000/auth/google/CREAR"
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {
      // 1. Buscar si el usuario ya existe con ese Google ID
      let usuario = await prisma.usuario.findUnique({
        where: { googleId: profile.id }
      });

      if (!usuario) {
        // 2. Si no existe, lo creamos
        usuario = await prisma.usuario.create({
          data: {
            googleId: profile.id,
            // Aquí mapeas los datos que te da Google a tus campos obligatorios
            primerNombre: profile.name.givenName || 'Usuario',
            apellidoPaterno: profile.name.familyName || '',
            nombreUsuario: profile.emails[0].value.split('@')[0], 
            rol: 'user' // o el rol por defecto que manejes
          }
        });
      }
      
      return cb(null, usuario);
    } catch (error) {
      return cb(error, null);
    }
  }
));

// Ruta de autenticación con Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback de Google después de la autenticación
app.get('/auth/google/CREAR', passport.authenticate('google', { failureRedirect: '/login', session: false }), 
function(req, res)  {
    // Si la autenticación es exitosa, generamos un JWT para el usuario
    const userPayload = {
        id_usuario: req.user.id_usuario,
        nombreUsuario: req.user.nombreUsuario,
        rol: req.user.rol
    };
    const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token,{
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Solo en producción
        sameSite: 'strict',
        maxAge: 3600000 // 1 hora
    });

    res.redirect('http://localhost:5173/'); 
}
);

app.get('/auth/me', verificarToken, async (req, res) => {
    try {
        // Buscamos al usuario usando el ID que el middleware guardó en req.usuarioId
        const usuario = await prisma.usuario.findUnique({
            where: { id_usuario: req.usuarioId }
        });

        if (!usuario) {
            return res.status(404).json({ mensaje: "Usuario no encontrado" });
        }

        res.json({
            id_usuario: usuario.id_usuario,
            primerNombre: usuario.primerNombre,
            apellidoPaterno: usuario.apellidoPaterno,
            nombreUsuario: usuario.nombreUsuario,
            rol: usuario.rol
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener el perfil" });
    }
});

// Ruta de autenticación / login
app.post('/login', async (req, res) => {
    const { nombreUsuario, contraseña } = req.body;
    if (!nombreUsuario || !contraseña) {
        return res.status(400).json({ error: 'Nombre de usuario y contraseña son requeridos' });
    }

    try {
        const usuario = await prisma.usuario.findFirst({
            where: {
                nombreUsuario: nombreUsuario,
                contrase_a: contraseña 
            }
        });

        if (!usuario) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const userPayload = {
            id_usuario: usuario.id_usuario,
            nombreUsuario: usuario.nombreUsuario,
            rol: usuario.rol,
        };

        const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token',token,{
            httpOnly: true,
            secure: false,
            maxAge: 3600000
        });
        res.status(201).json({mensaje: "Login exitoso", token});

    } catch (error) {
        console.error('Error al consultar usuario:', error);
        res.status(500).json({ error: 'Error en la autenticación' });
    }
});

app.post('/logout', (req, res) => {
    // Le decimos al navegador que borre la cookie llamada 'token'
    res.clearCookie('token', {
        httpOnly: true,
        secure: false, // O true si ya estás en producción con HTTPS
    });
    
    res.status(200).json({ mensaje: 'Sesión cerrada exitosamente' });
});

// Llevar todos los usuarios (protegido)
app.get('/usuarios', async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany();
        res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error al obtener los usuarios:', error);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});

// Llevar un usuario especifico por id (protegido)
app.get('/usuarios/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const usuario = await prisma.usuario.findUnique({
            where: { id_usuario: userId }
        });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(200).json(usuario);
    } catch (error) {
        console.error('Error al obtener el usuario:', error);
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
});

// Añadir un nuevo usuario (protegido)
app.post('/usuarios', authenticateToken, async (req, res) => {
    try {
        const data = req.body;

        // Prisma inserta los datos pasándole un objeto 'data'
        const nuevoUsuario = await prisma.usuario.create({
            data: {
                id_usuario: data.id_usuario, // Omite esto si tu BD es AUTO_INCREMENT
                primerNombre: data.primerNombre,
                segundoNombre: data.segundoNombre,
                apellidoPaterno: data.apellidoPaterno,
                apellidoMaterno: data.apellidoMaterno,
                contraseña: data.contraseña,
                nombreUsuario: data.nombreUsuario,
                telefono: data.telefono,
                genero: data.genero,
                edad: data.edad,
                rol: data.rol
            }
        });

        res.status(201).json({ 
            message: 'Usuario creado exitosamente', 
            userId: nuevoUsuario.id_usuario 
        });
    } catch (error) {
        console.error('Error al crear el usuario:', error);
        res.status(500).json({ error: 'Error al crear el usuario' });
    }
});

// Modificar un usuario por id (protegido)
app.put('/usuarios/:id', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const data = req.body;

        const usuarioActualizado = await prisma.usuario.update({
            where: { id_usuario: userId },
            data: {
                primerNombre: data.primerNombre,
                segundoNombre: data.segundoNombre,
                apellidoPaterno: data.apellidoPaterno,
                apellidoMaterno: data.apellidoMaterno,
                contraseña: data.contraseña,
                nombreUsuario: data.nombreUsuario,
                telefono: data.telefono,
                genero: data.genero,
                edad: data.edad,
                rol: data.rol
            }
        });

        res.status(200).json({ message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar el usuario:', error);
        // Prisma arroja un error específico si intentas actualizar un ID que no existe
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Usuario no encontrado para actualizar' });
        }
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
});

// Eliminar un usuario por id (protegido)
app.delete('/usuarios/:id', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        await prisma.usuario.delete({
            where: { id_usuario: userId }
        });

        res.status(204).send(); // 204 No Content usualmente no lleva body JSON
    } catch (error) {
        console.error('Error al eliminar el usuario:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Usuario no encontrado para eliminar' });
        }
        res.status(500).json({ error: 'Error al eliminar el usuario' });
    }
});

module.exports = app;