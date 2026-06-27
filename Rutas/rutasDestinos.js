const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const { body, param, validateRequest } = require('../Middlewares/validator');
const { verificarToken } = require('../Middlewares/middleware'); // <-- FALTABA
const prisma = require('../config.db');

// GET público — para turistas
app.get('/destinos', async (req, res) => {
  try {
    const destinos = await prisma.destino_turistico.findMany({
      where: { activo: true },
      include: { municipio: true, categoria: true }
    });
    res.status(200).json(destinos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener destinos' });
  }
});

// GET solo los del proveedor autenticado
app.get('/destinos/mios', verificarToken, async (req, res) => {
  try {
    const destinos = await prisma.destino_turistico.findMany({
      where: { id_usuario: req.usuarioId },
      include: { municipio: true, categoria: true }
    });
    res.status(200).json(destinos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tus destinos' });
  }
});

// GET todos — para admin
app.get('/destinos/admin/todos', async (req, res) => {
  try {
    const destinos = await prisma.destino_turistico.findMany({
      include: { municipio: true, categoria: true }
    });
    res.status(200).json(destinos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener destinos' });
  }
});

// GET por ID
app.get(
  '/destinos/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      const destino = await prisma.destino_turistico.findFirst({
        where: { id_destino: Number(id), activo: true },
        include: { municipio: true }
      });
      if (!destino) return res.status(404).json({ error: 'Destino turístico no encontrado o inactivo' });
      res.status(200).json(destino);
    } catch (error) {
      console.error('Error al consultar el destino:', error);
      res.status(500).json({ error: 'Error al obtener el destino' });
    }
  }
);

// POST — crear destino
app.post(
  '/destinos',
  [
    body('id_municipio').isInt().withMessage('id_municipio es obligatorio y debe ser un número entero'),
    body('nombre_Calle').trim().notEmpty().withMessage('nombre_Calle es obligatorio').isLength({ max: 50 }),
    body('codifoPostal').isInt().withMessage('codigoPostal debe ser un número entero'),
    body('id_categoria').isInt().withMessage('id_categoria es obligatorio y debe ser un número entero'),
    body('nombre').optional().isString().isLength({ max: 100 }),
    body('numero_Calle').optional().isInt(),
    body('horarioAbierto').optional().isString().isLength({ max: 8 }),
    body('horarioCerrado').optional().isString().isLength({ max: 8 }),
    body('estadoConvenio').optional().isBoolean(),
    body('imagen').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        id_municipio, nombre, numero_Calle, nombre_Calle,
        codifoPostal, horarioAbierto, horarioCerrado,
        id_categoria, imagen,
      } = req.body;

      const formatearHora = (hora) => hora ? `1970-01-01T${hora.length === 5 ? hora + ':00' : hora}.000Z` : null;

      const nuevoDestino = await prisma.destino_turistico.create({
        data: {
          id_municipio, nombre, numero_Calle, nombre_Calle,
          codifoPostal,
          horarioAbierto: formatearHora(horarioAbierto),
          horarioCerrado: formatearHora(horarioCerrado),
          id_usuario: req.usuarioId,
          estadoConvenio: true,
          id_categoria, imagen,
          activo: false,
        }
      });
      res.status(201).json(nuevoDestino);
    } catch (error) {
      console.error('Error al crear destino:', error);
      res.status(500).json({ error: 'Error al crear el destino turístico' });
    }
  }
);

// PUT — actualizar destino
app.put(
  '/destinos/:id',
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('id_municipio').optional().isInt(),
    body('nombre_Calle').optional().trim().isLength({ max: 50 }),
    body('codifoPostal').optional().isInt(),
    body('id_categoria').optional().isInt(),
    body('nombre').optional().isString().isLength({ max: 100 }),
    body('numero_Calle').optional().isInt(),
    body('horarioAbierto').optional().isString().isLength({ max: 8 }),
    body('horarioCerrado').optional().isString().isLength({ max: 8 }),
    body('estadoConvenio').optional().isBoolean(),
    body('imagen').optional().isString(),
    body('activo').optional().isBoolean(),
  ],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      const {
        id_municipio, nombre, numero_Calle, nombre_Calle,
        codifoPostal, horarioAbierto, horarioCerrado,
        estadoConvenio, id_categoria, imagen, activo,
      } = req.body;

      const formatearHora = (hora) => hora ? `1970-01-01T${hora.length === 5 ? hora + ':00' : hora}.000Z` : null;

      const destinoActualizado = await prisma.destino_turistico.update({
        where: { id_destino: Number(id) },
        data: {
          id_municipio, nombre, numero_Calle, nombre_Calle,
          codifoPostal,
          horarioAbierto: formatearHora(horarioAbierto),
          horarioCerrado: formatearHora(horarioCerrado),
          estadoConvenio, id_categoria, imagen, activo,
        }
      });
      res.status(200).json(destinoActualizado);
    } catch (error) {
      console.error('Error al actualizar destino:', error);
      res.status(500).json({ error: 'Error al actualizar el destino turístico o registro no encontrado' });
    }
  }
);

// DELETE — borrado lógico
app.delete(
  '/destinos/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.destino_turistico.update({
        where: { id_destino: Number(id) },
        data: { activo: false }
      });
      res.status(200).json({ message: 'Destino turístico eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar destino:', error);
      res.status(500).json({ error: 'Error al eliminar el destino turístico o registro no encontrado' });
    }
  }
);

module.exports = app;