const express = require('express');
const app = express();
const { body, param, validateRequest } = require('../Middlewares/validator');
const { verificarToken } = require('../Middlewares/middleware'); // <-- FALTABA
const prisma = require('../config.db');

// GET público — para turistas
app.get('/eventos', async (req, res) => {
  try {
    const eventos = await prisma.evento.findMany({
      where: { activo: true },
      include: {
        categoria: true,
        destino_turistico: {
          include: { municipio: true }
        }
      }
    });
    res.status(200).json(eventos);
  } catch (error) {
    console.error('Error al consultar eventos:', error);
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
});

// GET solo los del proveedor autenticado
app.get('/eventos/mios', verificarToken, async (req, res) => {
  try {
    const eventos = await prisma.evento.findMany({
      where: { id_usuario: req.usuarioId },
      include: {
        categoria: true,
        destino_turistico: {
          include: { municipio: true }
        }
      }
    });
    res.status(200).json(eventos);
  } catch (error) {
    console.error('Error al consultar eventos del proveedor:', error);
    res.status(500).json({ error: 'Error al obtener tus eventos' });
  }
});

// GET todos — para admin
app.get('/eventos/admin/todos', async (req, res) => {
  try {
    const eventos = await prisma.evento.findMany({
      include: {
        categoria: true,
        destino_turistico: {
          include: { municipio: true }
        }
      }
    });
    res.status(200).json(eventos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
});

// GET por ID
app.get(
  '/eventos/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      const evento = await prisma.evento.findFirst({
        where: { id_evento: Number(id), activo: true },
        include: {
          categoria: true,
          destino_turistico: {
            include: { municipio: true }
          }
        }
      });
      if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
      res.status(200).json(evento);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener el evento' });
    }
  }
);

// POST — crear evento
app.post(
  '/eventos',
  [
    body('nombre_Evento').trim().notEmpty().withMessage('nombre_Evento es obligatorio').isLength({ max: 50 }),
    body('id_destino').isInt().withMessage('id_destino es obligatorio'),
    body('numero_Calle').isInt().withMessage('numero_Calle es obligatorio'),
    body('nombre_Calle').trim().notEmpty().isLength({ max: 50 }),
    body('codigoPostal').isInt().withMessage('codigoPostal es obligatorio'),
    body('id_municipio').isInt().withMessage('id_municipio es obligatorio'),
    body('tipoEvento').optional().isString().isLength({ max: 50 }),
    body('fechaInicio').notEmpty().withMessage('fechaInicio es obligatoria'),
    body('fechaTermino').notEmpty().withMessage('fechaTermino es obligatoria'),
    body('disponibilidad').optional().isString().isLength({ max: 100 }),
    body('id_categoria').isInt().withMessage('id_categoria es obligatorio'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const {
        nombre_Evento, id_destino, numero_Calle, nombre_Calle,
        codigoPostal, id_municipio, tipoEvento, fechaInicio,
        fechaTermino, disponibilidad, id_categoria
      } = req.body;

      const nuevoEvento = await prisma.evento.create({
        data: {
          nombre_Evento,
          id_destino: Number(id_destino),
          numero_Calle: Number(numero_Calle),
          nombre_Calle,
          codigoPostal: Number(codigoPostal),
          id_municipio: Number(id_municipio),
          tipoEvento,
          fechaInicio: new Date(fechaInicio),
          fechaTermino: new Date(fechaTermino),
          disponibilidad,
          id_categoria: Number(id_categoria),
          id_usuario: req.usuarioId, // <-- FALTABA
          activo: false,             // <-- pendiente de aprobación como los demás
        }
      });
      res.status(201).json(nuevoEvento);
    } catch (error) {
      console.error('Error al crear evento:', error);
      res.status(500).json({ error: 'Error al crear el evento' });
    }
  }
);

// PUT — actualizar evento
app.put(
  '/eventos/:id',
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('nombre_Evento').optional().trim().isLength({ max: 50 }),
    body('tipoEvento').optional().isString().isLength({ max: 50 }),
    body('fechaInicio').optional(),
    body('fechaTermino').optional(),
    body('disponibilidad').optional().isString().isLength({ max: 100 }),
    body('activo').optional().isBoolean(),
  ],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      const {
        nombre_Evento, id_destino, numero_Calle, nombre_Calle,
        codigoPostal, id_municipio, tipoEvento, fechaInicio,
        fechaTermino, disponibilidad, id_categoria, activo
      } = req.body;

      const data = {};
      if (nombre_Evento !== undefined) data.nombre_Evento = nombre_Evento;
      if (id_destino !== undefined) data.id_destino = Number(id_destino);
      if (numero_Calle !== undefined) data.numero_Calle = Number(numero_Calle);
      if (nombre_Calle !== undefined) data.nombre_Calle = nombre_Calle;
      if (codigoPostal !== undefined) data.codigoPostal = Number(codigoPostal);
      if (id_municipio !== undefined) data.id_municipio = Number(id_municipio);
      if (tipoEvento !== undefined) data.tipoEvento = tipoEvento;
      if (fechaInicio !== undefined) data.fechaInicio = new Date(fechaInicio);
      if (fechaTermino !== undefined) data.fechaTermino = new Date(fechaTermino);
      if (disponibilidad !== undefined) data.disponibilidad = disponibilidad;
      if (id_categoria !== undefined) data.id_categoria = Number(id_categoria);
      if (activo !== undefined) data.activo = activo;

      const eventoActualizado = await prisma.evento.update({
        where: { id_evento: Number(id) },
        data
      });
      res.status(200).json(eventoActualizado);
    } catch (error) {
      console.error('Error al actualizar evento:', error);
      res.status(500).json({ error: 'Error al actualizar el evento' });
    }
  }
);

// DELETE — borrado lógico
app.delete(
  '/eventos/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      await prisma.evento.update({
        where: { id_evento: Number(id) },
        data: { activo: false }
      });
      res.status(200).json({ message: 'Evento desactivado correctamente' });
    } catch (error) {
      console.error('Error al desactivar evento:', error);
      res.status(500).json({ error: 'Error al desactivar el evento' });
    }
  }
);

module.exports = app;