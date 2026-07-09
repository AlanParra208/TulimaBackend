const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const { body, param, validateRequest } = require('../Middlewares/validator');
const { verificarToken } = require('../Middlewares/middleware'); // <-- FALTABA
const prisma = require('../config.db');

// GET público — para turistas
app.get('/restaurantes', async (req, res) => {
  try {
    const { especialidad } = req.query;
    const restaurantes = await prisma.restaurante.findMany({
      where: {
        activo: true,
        ...(especialidad ? { especialidad: { contains: especialidad } } : {}),
      },
      include: { municipio: true }
    });
    res.status(200).json(restaurantes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener restaurantes' });
  }
});

// GET solo los del proveedor autenticado
app.get('/restaurantes/mios', verificarToken, async (req, res) => {
  try {
    const restaurantes = await prisma.restaurante.findMany({
      where: { id_usuario: req.usuarioId },
      include: { municipio: true }
    });
    res.status(200).json(restaurantes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tus restaurantes' });
  }
});

// GET todos — para admin
app.get('/restaurantes/admin/todos', verificarToken, async (req, res) => {
  try {
    if (req.user?.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso restringido a administradores.' });
    }
    const restaurantes = await prisma.restaurante.findMany({
      include: { municipio: true }
    });
    res.status(200).json(restaurantes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener restaurantes' });
  }
});

// GET por ID
app.get(
  '/restaurantes/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      const restaurante = await prisma.restaurante.findFirst({
        where: { id_restaurante: Number(id), activo: true },
        include: { municipio: true }
      });
      if (!restaurante) return res.status(404).json({ error: 'Restaurante no encontrado' });
      res.status(200).json(restaurante);
    } catch (error) {
      console.error('Error al consultar el restaurante:', error);
      res.status(500).json({ error: 'Error al obtener el restaurante' });
    }
  }
);

// POST — crear restaurante
app.post(
  '/restaurantes',
  verificarToken,
  [
    body('nombre').trim().notEmpty().withMessage('nombre es obligatorio').isLength({ max: 50 }),
    body('numero_Calle').isInt().withMessage('numero_Calle debe ser un número entero'),
    body('nombre_Calle').trim().notEmpty().withMessage('nombre_Calle es obligatorio').isLength({ max: 50 }),
    body('colonia').optional().trim().isLength({ max: 100 }),
    body('codigoPostal').isInt().withMessage('codigoPostal debe ser un número entero'),
    body('id_municipio').isInt().withMessage('id_municipio es obligatorio y debe ser un número entero'),
    body('pueblo').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('pueblo inválido'),
    body('tipo').optional().isString().isLength({ max: 100 }),
    body('telefono').optional({ nullable: true }).isNumeric().withMessage('El teléfono debe ser numérico'),
    body('email').optional().isEmail().withMessage('email no es válido'),
    body('imagen').optional().isString(),
    body('horarioAbierto').optional().isString().isLength({ max: 8 }),
    body('horarioCerrado').optional().isString().isLength({ max: 8 }),
    body('latitud').optional({ nullable: true }).isFloat({ min: -90, max: 90 }).withMessage('latitud inválida'),
    body('longitud').optional({ nullable: true }).isFloat({ min: -180, max: 180 }).withMessage('longitud inválida'),
    body('especialidad').optional().isString().isLength({ max: 100 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const yaTieneRestaurante = await prisma.restaurante.findFirst({ where: { id_usuario: req.usuarioId } });
      if (yaTieneRestaurante) {
        return res.status(400).json({ error: 'Ya tienes un restaurante registrado. Solo puedes tener un negocio por cuenta.' });
      }

      const {
        nombre, tipo, numero_Calle, nombre_Calle, codigoPostal, colonia,
        id_municipio, pueblo, telefono, email,
        imagen, horarioAbierto, horarioCerrado,
        latitud, longitud, especialidad,
      } = req.body;

      const formatearHora = (hora) => hora ? `1970-01-01T${hora.length === 5 ? hora + ':00' : hora}.000Z` : null;

      const nuevoRestaurante = await prisma.restaurante.create({
        data: {
          nombre, tipo, numero_Calle, nombre_Calle, codigoPostal, colonia,
          id_municipio, pueblo,
          telefono: telefono ? BigInt(telefono) : null,
          email,
          id_usuario: req.usuarioId,
          activo: false,
          imagen,
          horarioAbierto: formatearHora(horarioAbierto),
          horarioCerrado: formatearHora(horarioCerrado),
          latitud: latitud ?? null,
          longitud: longitud ?? null,
          especialidad,
        }
      });
      res.status(201).json(nuevoRestaurante);
    } catch (error) {
      console.error('Error al crear restaurante:', error);
      res.status(500).json({ error: 'Error al crear el restaurante' });
    }
  }
);

// PUT — actualizar restaurante
app.put(
  '/restaurantes/:id',
   verificarToken,
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('nombre').optional().trim().isLength({ max: 50 }),
    body('numero_Calle').optional().isInt(),
    body('nombre_Calle').optional().trim().isLength({ max: 50 }),
    body('colonia').optional().trim().isLength({ max: 100 }),
    body('codigoPostal').optional().isInt(),
    body('id_municipio').optional().isInt(),
    body('pueblo').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('pueblo inválido'),
    body('tipo').optional().isString().isLength({ max: 100 }),
    body('telefono').optional({ nullable: true }).isNumeric().withMessage('El teléfono debe ser numérico'),
    body('email').optional().isEmail(),
    body('imagen').optional().isString(),
    body('horarioAbierto').optional().isString().isLength({ max: 8 }),
    body('horarioCerrado').optional().isString().isLength({ max: 8 }),
    body('activo').optional().isBoolean(),
    body('latitud').optional({ nullable: true }).isFloat({ min: -90, max: 90 }).withMessage('latitud inválida'),
    body('longitud').optional({ nullable: true }).isFloat({ min: -180, max: 180 }).withMessage('longitud inválida'),
  ],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      const {
        nombre, tipo, numero_Calle, nombre_Calle, codigoPostal, colonia,
        id_municipio, pueblo, telefono, email,
        imagen, horarioAbierto, horarioCerrado, activo,
        latitud, longitud,
      } = req.body;

      const formatearHora = (hora) => (hora !== undefined) ? (hora ? `1970-01-01T${hora.length === 5 ? hora + ':00' : hora}.000Z` : null) : undefined;

      const dataToUpdate = {
        nombre, tipo, numero_Calle, nombre_Calle, codigoPostal, colonia,
        id_municipio, pueblo, email, imagen, activo,
        horarioAbierto: formatearHora(horarioAbierto),
        horarioCerrado: formatearHora(horarioCerrado),
        latitud, longitud,
      };

      if (telefono !== undefined) {
        dataToUpdate.telefono = telefono ? BigInt(telefono) : null;
      }

      const restauranteActualizado = await prisma.restaurante.update({
        where: { id_restaurante: Number(id) },
        data: dataToUpdate
      });
      res.status(200).json(restauranteActualizado);
    } catch (error) {
      console.error('Error al actualizar restaurante:', error);
      res.status(500).json({ error: 'Error al actualizar el restaurante' });
    }
  }
);

// DELETE — borrado real (libera el cupo de "1 negocio por cuenta")
app.delete(
  '/restaurantes/:id',
   verificarToken,
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.restaurante.delete({
        where: { id_restaurante: Number(id) },
      });
      res.status(200).json({ message: 'Restaurante eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar restaurante:', error);
      res.status(500).json({ error: 'Error al eliminar el restaurante' });
    }
  }
);

module.exports = app;