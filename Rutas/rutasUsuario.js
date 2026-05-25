const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const {verificarToken, encryptSymmetric, decryptSymmetric, deleteCsrfById} = require('../Middlewares/middleware');
const { body, param, validateRequest } = require('../Middlewares/validator');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const bcrypt = require('bcrypt');

app.use(passport.initialize());


const prisma = require('../config.db');

// Le enseñamos a JavaScript a serializar los BigInt convirtiéndolos a String
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Middleware que verifica el JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    if (!token && req.cookies) {
        token = req.cookies.token;
    }
    if (!token) return res.status(401).json({ error: 'Token no provisto' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
}

const sanitizeUsuario = (usuario) => {
    if (!usuario) return usuario;
    return {
        ...usuario,
        telefono: usuario.telefono ? decryptSymmetric(usuario.telefono) : null
    };
};

const normalizeUserFields = (req, res, next) => {
    req.body = req.body || {};
    req.body.primerNombre = req.body.primerNombre || req.body.nombre || req.body.fullName || req.body.firstName;
    req.body.nombreUsuario = req.body.nombreUsuario || req.body.username || req.body.userName;
    req.body.contraseña = req.body.contraseña || req.body.contrasena || req.body.password;
    req.body.telefono = req.body.telefono || req.body.phone;
    req.body.genero = req.body.genero || req.body.gender;
    req.body.edad = req.body.edad || req.body.age;
    next();
};

//Configuración de Passport para Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://tulima-backend.vercel.app/auth/google/CREAR"
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
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // true en Vercel, false en localhost
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // 'none' permite cookies entre distintos dominios
        maxAge: 3600000
    });

    res.redirect('https://tulima.vercel.app/'); 
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
app.post(
  '/login',
  normalizeUserFields,
  [
    body('nombreUsuario').trim().notEmpty().withMessage('nombreUsuario es obligatorio').isLength({ max: 15 }),
    body('contraseña').notEmpty().withMessage('contraseña es obligatoria').isLength({ min: 6, max: 100 }),
  ],
  validateRequest,
  async (req, res) => {
    const { nombreUsuario, contraseña } = req.body;

    try {
        const usuario = await prisma.usuario.findFirst({
            where: {
                nombreUsuario: nombreUsuario,
                activo: true 
            }
        });

        if (!usuario) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos, o cuenta inactiva' });
        }
        if (!usuario.contrase_a) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos, o cuenta inactiva' });
       }

       const match = await bcrypt.compare(contraseña, usuario.contrase_a);

       if (!match) {
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos, o cuenta inactiva' });
   }

        const userPayload = {
            id_usuario: usuario.id_usuario,
            nombreUsuario: usuario.nombreUsuario,
            rol: usuario.rol,
        };

        if (usuario.mfaEnabled) {
            const tempToken = jwt.sign({ ...userPayload, mfa: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
            return res.status(200).json({ mensaje: 'MFA requerido', mfaRequired: true, tempToken });
        }

        const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true en Vercel, false en localhost
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', // 'none' permite cookies entre distintos dominios
            maxAge: 3600000
        });
        res.status(201).json({
          mensaje: "Login exitoso", 
          token,
          usuario: userPayload
      });

    } catch (error) {
        console.error('Error al consultar usuario:', error);
        res.status(500).json({ error: 'Error en la autenticación' });
    }
});

app.post('/logout', (req, res) => {
  // Invalidar server-side el token CSRF asociado (si existe)
  try {
    const csrfId = req.cookies['csrf-id'];
    if (csrfId) deleteCsrfById(csrfId);
  } catch (e) {
    console.error('Error invalidando csrf-id:', e);
  }

  // Le decimos al navegador que borre las cookies relacionadas
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
  });
  res.clearCookie('csrf-id', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
  });

  res.status(200).json({ mensaje: 'Sesión cerrada exitosamente' });
});

const userCanManage = (req, userId) => {
    return req.user && (req.user.id_usuario === userId || req.user.rol === 'admin');
};

app.get(
  '/usuarios/:id/mfa/setup',
  authenticateToken,
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (!userCanManage(req, userId)) {
        return res.status(403).json({ error: 'No autorizado para configurar MFA de este usuario' });
      }

      const usuario = await prisma.usuario.findFirst({
        where: { id_usuario: userId, activo: true }
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const secret = authenticator.generateSecret();
      const serviceName = 'Tulima';
      const otpauth = authenticator.keyuri(usuario.nombreUsuario, serviceName, secret);
      const qrCode = await qrcode.toDataURL(otpauth);

      await prisma.usuario.update({
        where: { id_usuario: userId },
        data: {
          mfaSecret: secret,
          mfaEnabled: false
        }
      });

      res.status(200).json({ qrCode, otpauth });
    } catch (error) {
      console.error('Error al generar MFA:', error);
      res.status(500).json({ error: 'Error al generar la configuración de MFA' });
    }
  }
);

app.post(
  '/usuarios/:id/mfa/verify',
  authenticateToken,
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('token').trim().notEmpty().withMessage('token es obligatorio').isLength({ min: 6, max: 10 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (!userCanManage(req, userId)) {
        return res.status(403).json({ error: 'No autorizado para verificar MFA de este usuario' });
      }

      const { token } = req.body;

      const usuario = await prisma.usuario.findFirst({
        where: { id_usuario: userId, activo: true }
      });

      if (!usuario || !usuario.mfaSecret) {
        return res.status(400).json({ error: 'MFA no está configurado para este usuario' });
      }

      const isValid = authenticator.check(token, usuario.mfaSecret);
      if (!isValid) {
        return res.status(401).json({ error: 'Código MFA inválido' });
      }

      await prisma.usuario.update({
        where: { id_usuario: userId },
        data: { mfaEnabled: true }
      });

      res.status(200).json({ message: 'MFA activado correctamente' });
    } catch (error) {
      console.error('Error al verificar MFA:', error);
      res.status(500).json({ error: 'Error al verificar MFA' });
    }
  }
);

app.post(
  '/login/mfa',
  [
    body('tempToken').trim().notEmpty().withMessage('tempToken es obligatorio'),
    body('token').trim().notEmpty().withMessage('token es obligatorio').isLength({ min: 6, max: 10 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { tempToken, token } = req.body;
      let payload;

      try {
        payload = jwt.verify(tempToken, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: 'Token temporal inválido o expirado' });
      }

      if (!payload || !payload.mfa) {
        return res.status(401).json({ error: 'Token temporal no válido' });
      }

      const usuario = await prisma.usuario.findFirst({
        where: { id_usuario: payload.id_usuario, activo: true }
      });

      if (!usuario || !usuario.mfaEnabled || !usuario.mfaSecret) {
        return res.status(401).json({ error: 'MFA no configurado o inválido' });
      }

      const validCode = authenticator.check(token, usuario.mfaSecret);
      if (!validCode) {
        return res.status(401).json({ error: 'Código MFA inválido' });
      }

      const userPayload = {
        id_usuario: usuario.id_usuario,
        nombreUsuario: usuario.nombreUsuario,
        rol: usuario.rol
      };
      const tokenFinal = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.cookie('token', tokenFinal, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', 
        maxAge: 3600000
      });

      res.status(201).json({
        mensaje: "Login MFA exitoso", 
        token: tokenFinal,
        usuario: userPayload 
    });
    } catch (error) {
      console.error('Error en login MFA:', error);
      res.status(500).json({ error: 'Error durante la autenticación MFA' });
    }
  }
);

// Llevar todos los usuarios (protegido)
app.get('/usuarios', authenticateToken, async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            where: { activo: true } 
        });
        res.status(200).json(usuarios.map(sanitizeUsuario));
    } catch (error) {
        console.error('Error al obtener los usuarios:', error);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});



// Llevar un usuario especifico por id (protegido)
app.get(
  '/usuarios/:id',
  authenticateToken,
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
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
        res.status(200).json(sanitizeUsuario(usuario));
    } catch (error) {
        console.error('Error al obtener el usuario:', error);
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
});

// Añadir un nuevo usuario (protegido)
app.post(
  '/usuarios',
  normalizeUserFields,
  [
    body('primerNombre').trim().notEmpty().withMessage('primerNombre es obligatorio').isLength({ max: 50 }),
    body('nombreUsuario').trim().notEmpty().withMessage('nombreUsuario es obligatorio').isLength({ max: 15 }),
    body('contraseña').notEmpty().withMessage('contraseña es obligatoria').isLength({ min: 6, max: 100 }),
    body('telefono').optional().customSanitizer(value => value !== undefined && value !== null ? String(value) : value).isLength({ max: 20 }).withMessage('telefono debe ser texto corto'),
    body('genero').optional().trim().isLength({ max: 20 }).withMessage('genero debe tener máximo 20 caracteres'),
    body('edad').optional().toInt().isInt({ min: 0, max: 120 }).withMessage('edad debe ser un número válido'),
  ],
  validateRequest,
  async (req, res) => {
    try {
        const data = req.body;

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

        const saltRounds = 10; // 10 iteraciones es el estándar seguro y rápido
        const hashedPassword = await bcrypt.hash(data.contraseña, saltRounds);

        const nuevoUsuario = await prisma.usuario.create({
            data: {
                primerNombre: nom1,
                segundoNombre: nom2,
                apellidoPaterno: apPat,
                apellidoMaterno: apMat,
                contrase_a: hashedPassword,
                nombreUsuario: data.nombreUsuario,
                telefono: data.telefono ? encryptSymmetric(data.telefono) : null,
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
app.put(
  '/usuarios/:id',
  authenticateToken,
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('primerNombre').optional().trim().isLength({ max: 50 }),
    body('segundoNombre').optional().trim().isLength({ max: 50 }),
    body('apellidoPaterno').optional().trim().isLength({ max: 50 }),
    body('apellidoMaterno').optional().trim().isLength({ max: 50 }),
    body('nombreUsuario').optional().trim().isLength({ max: 15 }),
    body('telefono').optional().isString().isLength({ max: 20 }),
    body('genero').optional().trim().isLength({ max: 20 }),
    body('edad').optional().isInt({ min: 0, max: 120 }),
    body('rol').optional().isIn(['user', 'admin']).withMessage('rol inválido'),
    body('contraseña').optional().isLength({ min: 6, max: 100 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const data = req.body;

        let updateData = {
            primerNombre: data.primerNombre,
            segundoNombre: data.segundoNombre,
            apellidoPaterno: data.apellidoPaterno,
            apellidoMaterno: data.apellidoMaterno,
            nombreUsuario: data.nombreUsuario,
            telefono: data.telefono ? encryptSymmetric(data.telefono) : undefined,
            genero: data.genero,
            edad: data.edad,
            rol: data.rol
        };

        // Si el payload incluye una nueva contraseña, la encriptamos. Si no, no actualizamos ese campo.
        if (data.contraseña) {
            const saltRounds = 10;
            updateData.contrase_a = await bcrypt.hash(data.contraseña, saltRounds);
        }

        const usuarioActualizado = await prisma.usuario.update({
            where: { id_usuario: userId },
            data: updateData
        });

        res.status(200).json({ message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar el usuario:', error);
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