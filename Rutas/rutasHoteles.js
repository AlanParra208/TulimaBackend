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
      include: { municipio: true, categoria_relacion: true }
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
      include: { municipio: true, categoria_relacion: true }
    });
    res.status(200).json(hoteles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tus hoteles' });
  }
});

// GET todos — para admin
app.get('/hoteles/admin/todos', async (req, res) => {
  try {
    const hoteles = await prisma.hotel.findMany({
      include: { municipio: true, categoria_relacion: true } // <-- CORREGIDO
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
    body('id_categoria').isInt().withMessage('id_categoria es obligatorio y debe ser un número entero'),
    body('disponibilidad').optional().isInt(),
    body('categoria').optional().isString().isLength({ max: 20 }),
    body('telefono').optional().isString().isLength({ max: 20 }),
    body('email').optional().isEmail().withMessage('email no es válido'),
    body('estadoConvenio').optional().isBoolean(),
    body('imagen').optional().isString(),
    body('descripcion').optional().isString().isLength({ max: 255 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        nombre_hotel, numero_Calle, nombre_Calle, codigoPostal,
        id_municipio, disponibilidad, categoria, telefono, email,
        estadoConvenio, id_categoria, imagen, descripcion,
      } = req.body;

      const nuevoHotel = await prisma.hotel.create({
        data: {
          nombre_hotel, numero_Calle, nombre_Calle, codigoPostal,
          id_municipio, disponibilidad, categoria, telefono, email,
          id_usuario: req.usuarioId,
          estadoConvenio: true,
          id_categoria, imagen, descripcion,
          activo: false,
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
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('nombre_hotel').optional().trim().isLength({ max: 25 }),
    body('numero_Calle').optional().isInt(),
    body('nombre_Calle').optional().trim().isLength({ max: 50 }),
    body('codigoPostal').optional().isInt(),
    body('id_municipio').optional().isInt(),
    body('id_categoria').optional().isInt(),
    body('disponibilidad').optional().isInt(),
    body('categoria').optional().isString().isLength({ max: 20 }),
    body('telefono').optional().isString().isLength({ max: 20 }),
    body('email').optional().isEmail(),
    body('estadoConvenio').optional().isBoolean(),
    body('imagen').optional().isString(),
    body('descripcion').optional().isString().isLength({ max: 255 }),
    body('activo').optional().isBoolean(),
  ],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      const {
        nombre_hotel, numero_Calle, nombre_Calle, codigoPostal,
        id_municipio, disponibilidad, categoria, telefono, email,
        estadoConvenio, id_categoria, imagen, descripcion, activo,
      } = req.body;

      const hotelActualizado = await prisma.hotel.update({
        where: { id_hotel: Number(id) },
        data: {
          nombre_hotel, numero_Calle, nombre_Calle, codigoPostal,
          id_municipio, disponibilidad, categoria, telefono, email,
          estadoConvenio, id_categoria, imagen, descripcion, activo,
        }
      });
      res.status(200).json(hotelActualizado);
    } catch (error) {
      console.error('Error al actualizar hotel:', error);
      res.status(500).json({ error: 'Error al actualizar el hotel' });
    }
  }
);

// DELETE — borrado lógico
app.delete(
  '/hoteles/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.hotel.update({
        where: { id_hotel: Number(id) },
        data: { activo: false }
      });
      res.status(200).json({ message: 'Hotel desactivado correctamente' });
    } catch (error) {
      console.error('Error al desactivar hotel:', error);
      res.status(500).json({ error: 'Error al desactivar el hotel o registro no encontrado' });
    }
  }
);

module.exports = app;