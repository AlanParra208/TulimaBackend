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
      include: { municipio: true }
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
      include: { municipio: true }
    });
    res.status(200).json(destinos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tus destinos' });
  }
});

// GET todos — para admin
app.get('/destinos/admin/todos', verificarToken, async (req, res) => {
  try {
    if (req.user?.rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso restringido a administradores.' });
    }
    const destinos = await prisma.destino_turistico.findMany({
      include: { municipio: true }
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
  verificarToken,
  [
    body('id_municipio').isInt().withMessage('id_municipio es obligatorio y debe ser un número entero'),
    body('nombre_Calle').trim().notEmpty().withMessage('nombre_Calle es obligatorio').isLength({ max: 50 }),
    body('codifoPostal').isInt().withMessage('codigoPostal debe ser un número entero'),
    body('pueblo').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('pueblo inválido'),
    body('nombre').optional().isString().isLength({ max: 100 }),
    body('numero_Calle').optional().isInt(),
    body('horarioAbierto').optional().isString().isLength({ max: 8 }),
    body('horarioCerrado').optional().isString().isLength({ max: 8 }),
    body('imagen').optional().isString(),
    body('latitud').optional({ nullable: true }).isFloat({ min: -90, max: 90 }).withMessage('latitud inválida'),
    body('longitud').optional({ nullable: true }).isFloat({ min: -180, max: 180 }).withMessage('longitud inválida'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const yaTieneDestino = await prisma.destino_turistico.findFirst({ where: { id_usuario: req.usuarioId } });
      if (yaTieneDestino) {
        return res.status(400).json({ error: 'Ya tienes un destino registrado. Solo puedes tener un negocio por cuenta.' });
      }

      const {
        id_municipio, nombre, numero_Calle, nombre_Calle,
        codifoPostal, pueblo, horarioAbierto, horarioCerrado,
        imagen, latitud, longitud,
      } = req.body;

      const formatearHora = (hora) => hora ? `1970-01-01T${hora.length === 5 ? hora + ':00' : hora}.000Z` : null;

      const nuevoDestino = await prisma.destino_turistico.create({
        data: {
          id_municipio, nombre, numero_Calle, nombre_Calle,
          codifoPostal, pueblo,
          horarioAbierto: formatearHora(horarioAbierto),
          horarioCerrado: formatearHora(horarioCerrado),
          id_usuario: req.usuarioId,
          imagen,
          latitud: latitud ?? null,
          longitud: longitud ?? null,
          activo: true,
        }
      });
      res.status(201).json(nuevoDestino);
    } catch (error) {
      console.error('Error al crear destino:', error);
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'El municipio seleccionado no es válido.' });
      }
      res.status(500).json({ error: 'Error al crear el destino turístico' });
    }
  }
);

// PUT — actualizar destino
app.put(
  '/destinos/:id',
   verificarToken,
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('id_municipio').optional().isInt(),
    body('nombre_Calle').optional().trim().isLength({ max: 50 }),
    body('codifoPostal').optional().isInt(),
    body('nombre').optional().isString().isLength({ max: 100 }),
    body('numero_Calle').optional().isInt(),
    body('pueblo').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('pueblo inválido'),
    body('horarioAbierto').optional().isString().isLength({ max: 8 }),
    body('horarioCerrado').optional().isString().isLength({ max: 8 }),
    body('imagen').optional().isString(),
    body('activo').optional().isBoolean(),
    body('latitud').optional({ nullable: true }).isFloat({ min: -90, max: 90 }).withMessage('latitud inválida'),
    body('longitud').optional({ nullable: true }).isFloat({ min: -180, max: 180 }).withMessage('longitud inválida'),
  ],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      const {
        id_municipio, nombre, numero_Calle, nombre_Calle,
        codifoPostal, pueblo, horarioAbierto, horarioCerrado,
        imagen, activo, latitud, longitud,
      } = req.body;

      const formatearHora = (hora) => (hora !== undefined) ? (hora ? `1970-01-01T${hora.length === 5 ? hora + ':00' : hora}.000Z` : null) : undefined;

      const dataToUpdate = {
        id_municipio, nombre, numero_Calle, nombre_Calle,
        codifoPostal, pueblo,
        horarioAbierto: formatearHora(horarioAbierto),
        horarioCerrado: formatearHora(horarioCerrado),
        imagen, activo,
        latitud, longitud,
      };

      const destinoActualizado = await prisma.destino_turistico.update({
        where: { id_destino: Number(id) },
        data: dataToUpdate
      });
      res.status(200).json(destinoActualizado);
    } catch (error) {
      console.error('Error al actualizar destino:', error);
      if (error.code === 'P2003') {
        return res.status(400).json({ error: 'El municipio seleccionado no es válido.' });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'El destino que intentas actualizar ya no existe.' });
      }
      res.status(500).json({ error: 'Error al actualizar el destino turístico' });
    }
  }
);


app.delete(
  '/destinos/:id',
   verificarToken,
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.destino_turistico.update({
        where: { id_destino: Number(id) },
        data: { activo: false },
      });
      res.status(200).json({ message: 'Destino turístico desactivado correctamente' });
    } catch (error) {
      console.error('Error al desactivar destino:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'El destino no existe.' });
      }
      res.status(500).json({ error: 'Error al desactivar el destino turístico' });
    }
  }
);

module.exports = app;