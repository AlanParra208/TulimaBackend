const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const { body, param, validateRequest } = require('../Middlewares/validator');
const { verificarToken } = require('../Middlewares/middleware'); // <-- FALTABA
const prisma = require('../config.db');

// GET público — para turistas
app.get('/hoteles', async (req, res) => {
  try {
    const hoteles = await prisma.hotel.findMany({
      where: { activo: true },
      include: { municipio: true }
    });
    res.status(200).json(hoteles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener hoteles' });
  }
});

// GET solo los del proveedor autenticado
app.get('/hoteles/mios', verificarToken, async (req, res) => {
  try {
    const hoteles = await prisma.hotel.findMany({
      where: { id_usuario: req.usuarioId },
      include: { municipio: true }
    });
    res.status(200).json(hoteles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tus hoteles' });
  }
});

// GET todos — para admin
app.get('/hoteles/admin/todos', verificarToken, async (req, res) => {
  try {
    if (req.user?.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso restringido a administradores.' });
    }
    const hoteles = await prisma.hotel.findMany({
      include: { municipio: true }
    });
    res.status(200).json(hoteles);
  } catch (error) {
    console.error('Error al obtener todos los hoteles:', error);
    res.status(500).json({ error: 'Error al obtener hoteles' });
  }
});

// GET por ID
app.get(
  '/hoteles/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      const hotel = await prisma.hotel.findFirst({
        where: { id_hotel: Number(id), activo: true },
        include: { municipio: true }
      });
      if (!hotel) return res.status(404).json({ error: 'Hotel no encontrado o inactivo' });
      res.status(200).json(hotel);
    } catch (error) {
      console.error('Error al consultar el hotel:', error);
      res.status(500).json({ error: 'Error al obtener el hotel' });
    }
  }
);

// POST — crear hotel
app.post(
  '/hoteles',
  verificarToken,
  [
    body('nombre_hotel').trim().notEmpty().withMessage('nombre_hotel es obligatorio').isLength({ max: 25 }),
    body('numero_Calle').isInt().withMessage('numero_Calle debe ser un número entero'),
    body('nombre_Calle').trim().notEmpty().withMessage('nombre_Calle es obligatorio').isLength({ max: 50 }),
    body('codigoPostal').isInt().withMessage('codigoPostal debe ser un número entero'),
    body('id_municipio').isInt().withMessage('id_municipio es obligatorio y debe ser un número entero'),
    body('pueblo').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('pueblo inválido'),
    body('tipo').optional().isString().isLength({ max: 20 }),
    body('telefono').optional({ nullable: true }).isNumeric().withMessage('El teléfono debe ser numérico'),
    body('email').optional().isEmail().withMessage('email no es válido'),
    body('imagen').optional().isString(),
    body('descripcion').optional().isString().isLength({ max: 1000 }),
    body('estrellas').optional().isInt({ min: 1, max: 5 }).withMessage('estrellas debe ser un número entre 1 y 5'),
    body('latitud').optional({ nullable: true }).isFloat({ min: -90, max: 90 }).withMessage('latitud inválida'),
    body('longitud').optional({ nullable: true }).isFloat({ min: -180, max: 180 }).withMessage('longitud inválida'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const yaTieneHotel = await prisma.hotel.findFirst({ where: { id_usuario: req.usuarioId } });
      if (yaTieneHotel) {
        return res.status(400).json({ error: 'Ya tienes un hotel registrado. Solo puedes tener un negocio por cuenta.' });
      }

      const {
        nombre_hotel, numero_Calle, nombre_Calle, codigoPostal,
        id_municipio, pueblo, tipo, telefono, email,
        imagen, descripcion, estrellas,
        latitud, longitud,
      } = req.body;

      const nuevoHotel = await prisma.hotel.create({
        data: {
          nombre_hotel, numero_Calle, nombre_Calle, codigoPostal,
          id_municipio, pueblo, tipo,
          telefono: telefono ? BigInt(telefono) : null,
          email,
          id_usuario: req.usuarioId,
          imagen, descripcion, estrellas,
          latitud: latitud ?? null,
          longitud: longitud ?? null,
          activo: true, // Por defecto activo
        }
      });
      res.status(201).json(nuevoHotel);
    } catch (error) {
      console.error('Error al crear hotel:', error);
      res.status(500).json({ error: 'Error al crear el hotel' });
    }
  }
);

// PUT — actualizar hotel
app.put(
  '/hoteles/:id',
   verificarToken,
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('nombre_hotel').optional().trim().isLength({ max: 25 }),
    body('numero_Calle').optional().isInt(),
    body('nombre_Calle').optional().trim().isLength({ max: 50 }),
    body('codigoPostal').optional().isInt(),
    body('id_municipio').optional().isInt(),
    body('pueblo').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('pueblo inválido'),
    body('tipo').optional().isString().isLength({ max: 20 }),
    body('telefono').optional({ nullable: true }).isNumeric().withMessage('El teléfono debe ser numérico'),
    body('email').optional().isEmail(),
    body('imagen').optional().isString(),
    body('descripcion').optional().isString().isLength({ max: 1000 }),
    body('activo').optional().isBoolean(),
    body('estrellas').optional().isInt({ min: 1, max: 5 }).withMessage('estrellas debe ser un número entre 1 y 5'),
    body('latitud').optional({ nullable: true }).isFloat({ min: -90, max: 90 }).withMessage('latitud inválida'),
    body('longitud').optional({ nullable: true }).isFloat({ min: -180, max: 180 }).withMessage('longitud inválida'),
  ],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      const {
        nombre_hotel, numero_Calle, nombre_Calle, codigoPostal,
        id_municipio, pueblo, tipo, telefono, email,
        imagen, descripcion, activo, estrellas,
        latitud, longitud,
      } = req.body;

      const dataToUpdate = {
        nombre_hotel, numero_Calle, nombre_Calle, codigoPostal,
        id_municipio, pueblo, tipo, email, imagen, descripcion, activo, estrellas,
        latitud, longitud,
      };

      if (telefono !== undefined) {
        dataToUpdate.telefono = telefono ? BigInt(telefono) : null;
      }

      const hotelActualizado = await prisma.hotel.update({
        where: { id_hotel: Number(id) },
        data: dataToUpdate
      });
      res.status(200).json(hotelActualizado);
    } catch (error) {
      console.error('Error al actualizar hotel:', error);
      res.status(500).json({ error: 'Error al actualizar el hotel' });
    }
  }
);

// DELETE — borrado real (libera el cupo de "1 negocio por cuenta")
app.delete(
  '/hoteles/:id',
   verificarToken,
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.hotel.delete({
        where: { id_hotel: Number(id) },
      });
      res.status(200).json({ message: 'Hotel eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar hotel:', error);
      res.status(500).json({ error: 'Error al eliminar el hotel o registro no encontrado' });
    }
  }
);

module.exports = app;