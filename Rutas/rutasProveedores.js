const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const prisma = require('../config.db');
const { encryptSymmetric } = require('../Middlewares/middleware');
const { body, validateRequest } = require('../Middlewares/validator');

// POST /proveedores — Registro de nuevo proveedor
app.post(
  '/proveedores',
  [
    body('primerNombre').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 50 }),
    body('nombreUsuario').trim().notEmpty().withMessage('El nombre de usuario es obligatorio').isLength({ max: 15 }),
    body('correoCorporativo').trim().notEmpty().withMessage('El correo corporativo es obligatorio').isEmail().withMessage('Correo inválido').isLength({ max: 100 }),
    body('rfc').trim().notEmpty().withMessage('El RFC es obligatorio').isLength({ min: 12, max: 13 }).withMessage('El RFC debe tener 12 o 13 caracteres'),
    body('contraseña').notEmpty().withMessage('La contraseña es obligatoria').isLength({ min: 6, max: 100 }),
    body('tipo_servicio').trim().notEmpty().withMessage('El tipo de servicio es obligatorio').isIn(['hoteles', 'restaurantes', 'tours', 'destinos', 'eventos']).withMessage('Tipo de servicio inválido'),
    body('telefono').optional().isString().isLength({ max: 20 }),
    body('genero').optional().trim().isLength({ max: 20 }),
    body('edad').optional().toInt().isInt({ min: 0, max: 120 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { primerNombre, nombreUsuario, correoCorporativo, rfc, contraseña, tipo_servicio, telefono, genero, edad } = req.body;

      // Separar nombre en partes
      const partes = primerNombre.trim().split(/\s+/);
      let nom1 = partes[0];
      let nom2 = partes.length >= 4 ? partes[1] : null;
      let apPat = partes.length >= 2 ? partes[partes.length >= 4 ? 2 : 1] : 'Sin Apellido';
      let apMat = partes.length === 3 ? partes[2] : partes.length >= 4 ? partes.slice(3).join(' ') : null;

      const hashedPassword = await bcrypt.hash(contraseña, 10);
      const rfcNormalizado = rfc.trim().toUpperCase();

      const nuevoProveedor = await prisma.usuario.create({
        data: {
          primerNombre: nom1,
          segundoNombre: nom2,
          apellidoPaterno: apPat,
          apellidoMaterno: apMat,
          nombreUsuario,
          correo: correoCorporativo,
          rfc: rfcNormalizado,
          tipo_servicio,
          contrase_a: hashedPassword,
          telefono: telefono ? encryptSymmetric(telefono) : null,
          genero: genero || null,
          edad: edad || null,
          rol: 'proveedor',
          activo: true,
        },
      });

      res.status(201).json({
        mensaje: 'Cuenta de proveedor creada exitosamente.',
        userId: nuevoProveedor.id_usuario,
      });
    } catch (error) {
      console.error('Error al registrar proveedor:', error);
      if (error.code === 'P2002') {
        const campo = error.meta?.target?.includes('rfc') ? 'RFC'
          : error.meta?.target?.includes('correo') ? 'correo'
          : 'nombre de usuario';
        return res.status(400).json({ error: `Este ${campo} ya está registrado.` });
      }
      res.status(500).json({ error: 'Error al crear la cuenta de proveedor.' });
    }
  }
);

// POST /login-proveedor — Inicio de sesión con correo + RFC + contraseña
app.post(
  '/login-proveedor',
  [
    body('email').trim().notEmpty().withMessage('El correo es obligatorio').isEmail(),
    body('contraseña').notEmpty().withMessage('La contraseña es obligatoria'),
  ],
  validateRequest,
  async (req, res) => {
    const { email, contraseña } = req.body;

    try {
      const proveedor = await prisma.usuario.findFirst({
        where: {
          correo: email,
          rol: 'proveedor',
          activo: true,
        },
      });

      if (!proveedor) {
        return res.status(401).json({ error: 'Credenciales inválidas o cuenta inactiva.' });
      }

      if (!proveedor.contrase_a) {
        return res.status(401).json({ error: 'Credenciales inválidas o cuenta inactiva.' });
      }

      const passwordOk = await bcrypt.compare(contraseña, proveedor.contrase_a);
      if (!passwordOk) {
        return res.status(401).json({ error: 'Credenciales inválidas o cuenta inactiva.' });
      }

      // Generar JWT
      const payload = {
        id_usuario: proveedor.id_usuario,
        nombreUsuario: proveedor.nombreUsuario,
        rol: proveedor.rol,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 3600000,
      });

      res.status(200).json({
        mensaje: 'Login de proveedor exitoso.',
        usuario: {
          id_usuario: proveedor.id_usuario,
          primerNombre: proveedor.primerNombre,
          apellidoPaterno: proveedor.apellidoPaterno,
          nombreUsuario: proveedor.nombreUsuario,
          correo: proveedor.correo,
          rol: proveedor.rol,
        },
      });
    } catch (error) {
      console.error('Error en login de proveedor:', error);
      res.status(500).json({ error: 'Error en la autenticación.' });
    }
  }
);

module.exports = app;
