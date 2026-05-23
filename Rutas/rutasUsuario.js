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
      let usuario = await prisma.usuario.findUnique({
        where: { googleId: profile.id }
      });

      if (usuario && usuario.activo === false) {
          return cb(new Error("Esta cuenta ha sido desactivada"), null);
      }

      if (!usuario) {
        usuario = await prisma.usuario.create({
          data: {
            googleId: profile.id,
            primerNombre: profile.name.givenName || 'Usuario',
            apellidoPaterno: profile.name.familyName || '',
            nombreUsuario: profile.emails[0].value.split('@')[0], 
            rol: 'user',
            activo: true 
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
        const usuario = await prisma.usuario.findFirst({
            where: { 
                id_usuario: req.usuarioId,
                activo: true 
            }
        });

        if (!usuario) {
            return res.status(404).json({ mensaje: "Usuario no encontrado o inactivo" });
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
                contrase_a: contraseña,
                activo: true 
            }
        });

        if (!usuario) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos, o cuenta inactiva' });
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
        const usuarios = await prisma.usuario.findMany({
            where: { activo: true } 
        });
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

        const usuario = await prisma.usuario.findFirst({
            where: { 
                id_usuario: userId,
                activo: true 
            }
        });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado o inactivo' });
        }
        res.status(200).json(usuario);
    } catch (error) {
        console.error('Error al obtener el usuario:', error);
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
});

// Añadir un nuevo usuario (protegido)
app.post('/usuarios', async (req, res) => {
    try {
        const data = req.body;

        if (!data.primerNombre || !data.nombreUsuario || !data.contraseña) {
            return res.status(400).json({ error: 'Nombre, usuario y contraseña son obligatorios' });
        }

        const partesNombre = data.primerNombre.trim().split(/\s+/);
        
        let nom1 = "";
        let nom2 = null;
        let apPat = "";
        let apMat = null;

        if (partesNombre.length === 1) {
            nom1 = partesNombre[0];
            apPat = "Sin Apellido";
        } else if (partesNombre.length === 2) {
            nom1 = partesNombre[0];
            apPat = partesNombre[1];
        } else if (partesNombre.length === 3) {
            nom1 = partesNombre[0];
            apPat = partesNombre[1];
            apMat = partesNombre[2];
        } else if (partesNombre.length >= 4) {
            nom1 = partesNombre[0];
            nom2 = partesNombre[1];
            apPat = partesNombre[2];
            apMat = partesNombre.slice(3).join(" "); 
        }

        const nuevoUsuario = await prisma.usuario.create({
            data: {
                primerNombre: nom1,
                segundoNombre: nom2,
                apellidoPaterno: apPat,
                apellidoMaterno: apMat,
                contrase_a: data.contraseña,
                nombreUsuario: data.nombreUsuario,
                telefono: data.telefono || null,
                genero: data.genero || null,
                edad: data.edad || null,
                rol: 'user'
            }
        });

        res.status(201).json({ 
            message: 'Usuario creado exitosamente', 
            userId: nuevoUsuario.id_usuario 
        });
    } catch (error) {
        console.error('Error al crear el usuario:', error);
        
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Este nombre de usuario ya está en uso' });
        }
        
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

        await prisma.usuario.update({
            where: { id_usuario: userId },
            data: { activo: false }
        });

        res.status(200).json({ message: 'Usuario desactivado exitosamente' }); 
    } catch (error) {
        console.error('Error al desactivar el usuario:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Usuario no encontrado para desactivar' });
        }
        res.status(500).json({ error: 'Error al desactivar el usuario' });
    }
});

module.exports = app;