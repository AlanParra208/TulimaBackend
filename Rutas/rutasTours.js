const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const { body, param, validateRequest } = require('../Middlewares/validator');
const { verificarToken } = require('../Middlewares/middleware'); // <-- FALTABA
const prisma = require('../config.db');

// GET público — para turistas
app.get('/tours', async (req, res) => {
  try {
    const tours = await prisma.provedor_tour.findMany({
      where: { activo: true },
      include: { municipio: true }
    });
    res.status(200).json(tours);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tours' });
  }
});

// GET solo los del proveedor autenticado
app.get('/tours/mios', verificarToken, async (req, res) => {
  try {
    const tours = await prisma.provedor_tour.findMany({
      where: { id_usuario: req.usuarioId },
      include: { municipio: true }
    });
    res.status(200).json(tours);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tus tours' });
  }
});

// GET todos — para admin
app.get('/tours/admin/todos', async (req, res) => {
  try {
    const tours = await prisma.provedor_tour.findMany({
      include: { municipio: true }
    });
    res.status(200).json(tours);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tours' });
  }
});

// GET por ID
app.get(
  '/tours/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      const tour = await prisma.provedor_tour.findFirst({
        where: { id_provedor: Number(id), activo: true },
        include: { municipio: true }
      });
      if (!tour) return res.status(404).json({ error: 'Tour no encontrado' });
      res.status(200).json(tour);
    } catch (error) {
      console.error('Error al consultar el tour:', error);
      res.status(500).json({ error: 'Error al obtener el tour' });
    }
  }
);

// POST — crear tour
app.post(
  '/tours',
  verificarToken,
  [
    body('nombre').trim().notEmpty().withMessage('nombre es obligatorio').isLength({ max: 30 }),
    body('id_municipio').isInt().withMessage('id_municipio es obligatorio y debe ser un número entero'),
    body('tipoTour').optional().isString().isLength({ max: 20 }),
    body('telefono').optional().isString().isLength({ max: 20 }),
    body('tipoServicio').optional().isString().isLength({ max: 50 }),
    body('estadoConvenio').optional().isBoolean(),
    body('imagen').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        nombre, id_municipio, tipoTour, telefono, tipoServicio, imagen,
      } = req.body;

      const nuevoTour = await prisma.provedor_tour.create({
        data: {
          nombre, id_municipio, tipoTour, telefono, tipoServicio,
          id_usuario: req.usuarioId,
          estadoConvenio: true,
          imagen,
          activo: false,
        }
      });
      res.status(201).json(nuevoTour);
    } catch (error) {
      console.error('Error al crear tour:', error);
      res.status(500).json({ error: 'Error al crear el tour' });
    }
  }
);

// PUT — actualizar tour
app.put(
  '/tours/:id',
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('nombre').optional().trim().isLength({ max: 30 }),
    body('id_municipio').optional().isInt(),
    body('tipoTour').optional().isString().isLength({ max: 20 }),
    body('telefono').optional().isString().isLength({ max: 20 }),
    body('tipoServicio').optional().isString().isLength({ max: 50 }),
    body('estadoConvenio').optional().isBoolean(),
    body('imagen').optional().isString(),
    body('activo').optional().isBoolean(),
  ],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      const {
        nombre, id_municipio, tipoTour, telefono, tipoServicio,
        estadoConvenio, imagen, activo,
      } = req.body;

      const tourActualizado = await prisma.provedor_tour.update({
        where: { id_provedor: Number(id) },
        data: {
          nombre, id_municipio, tipoTour, telefono, tipoServicio,
          estadoConvenio, imagen, activo,
        }
      });
      res.status(200).json(tourActualizado);
    } catch (error) {
      console.error('Error al actualizar tour:', error);
      res.status(500).json({ error: 'Error al actualizar el tour' });
    }
  }
);

// DELETE — borrado lógico
app.delete(
  '/tours/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')], // <-- FALTABA LA COMA
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.provedor_tour.update({
        where: { id_provedor: Number(id) },
        data: { activo: false }
      });
      res.status(200).json({ message: 'Tour desactivado correctamente' });
    } catch (error) {
      console.error('Error al desactivar tour:', error);
      res.status(500).json({ error: 'Error al desactivar el tour o registro no encontrado' });
    }
  }
);

module.exports = app;