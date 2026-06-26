const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const { body, param, validateRequest } = require('../Middlewares/validator');
const prisma = require('../config.db');

app.get('/municipios', async (req, res) => {
    try {
        const municipios = await prisma.municipio.findMany();
        res.status(200).json(municipios);
    } catch (error) {
        console.error('Error al consultar municipios:', error);
        res.status(500).json({ error: 'Error al obtener municipios' });
    }
});

app.get(
  '/municipios/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
        const municipio = await prisma.municipio.findUnique({
            where: { id_municipio: Number(id) }  // ✅ corregido
        });
        if (!municipio) return res.status(404).json({ error: 'Municipio no encontrado' });
        res.status(200).json(municipio);
    } catch (error) {
        console.error('Error al consultar el municipio:', error);
        res.status(500).json({ error: 'Error al obtener el municipio' });
    }
});

app.post(
  '/municipios',
  [
    body('nombre').trim().notEmpty().withMessage('nombre es obligatorio').isLength({ max: 25 }),
    body('url_imagen').optional().isString(),
    body('descripcion').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    try {
        const { nombre, url_imagen, descripcion } = req.body;
        const nuevoMunicipio = await prisma.municipio.create({
            data: { nombre, url_imagen, descripcion }
        });
        res.status(201).json(nuevoMunicipio);
    } catch (error) {
        console.error('Error al crear municipio:', error);
        res.status(500).json({ error: 'Error al crear el municipio' });
    }
});

app.put(
  '/municipios/:id',
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('nombre').optional().trim().isLength({ max: 25 }),
    body('url_imagen').optional().isString(),
    body('descripcion').optional().isString(),
  ],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
        const { nombre, url_imagen, descripcion } = req.body;
        const municipioActualizado = await prisma.municipio.update({
            where: { id_municipio: Number(id) },  // ✅ corregido
            data: { nombre, url_imagen, descripcion }
        });
        res.status(200).json(municipioActualizado);
    } catch (error) {
        console.error('Error al actualizar municipio:', error);
        res.status(500).json({ error: 'Error al actualizar el municipio' });
    }
});

app.delete('/municipios/:id',
    [param('id').isInt().withMessage('id debe ser un número entero')],
    validateRequest,
    async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.municipio.delete({
            where: { id_municipio: Number(id) }  // ✅ corregido
        });
        res.status(200).json({ message: 'Municipio eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar municipio:', error);
        res.status(500).json({ error: 'Error al eliminar el municipio' });
    }
});

app.get('/municipios/:id/top-amados', async (req, res) => {
  const { id } = req.params;
  const municipioId = Number(id);

  if (isNaN(municipioId)) {
    return res.status(400).json({ error: 'id debe ser un número entero' });
  }

  try {
    const hoteles = await prisma.hotel.findMany({
      where: { id_municipio: municipioId, activo: true },
      include: { _count: { select: { favoritos: true } } },
    });

    const restaurantes = await prisma.restaurante.findMany({
      where: { id_municipio: municipioId, activo: true },
      include: { _count: { select: { favoritos: true } } },
    });

    const destinos = await prisma.destino_turistico.findMany({
      where: { id_municipio: municipioId, activo: true },
      include: { _count: { select: { favoritos: true } } },
    });

    const tours = await prisma.provedor_tour.findMany({
      where: { id_municipio: municipioId, activo: true },
      include: { _count: { select: { favoritos: true } } },
    });

    const todos = [
      ...hoteles.map(h => ({
        tipo: 'Hotel',
        nombre: h.nombre_hotel,
        imagen: h.imagen,
        corazones: h._count.favoritos,
      })),
      ...restaurantes.map(r => ({
        tipo: 'Restaurante',
        nombre: r.nombre,
        imagen: r.imagen,
        corazones: r._count.favoritos,
      })),
      ...destinos.map(d => ({
        tipo: 'Destino',
        nombre: d.nombre || 'Destino Turístico',
        imagen: d.imagen,
        corazones: d._count.favoritos,
      })),
      ...tours.map(t => ({
        tipo: 'Tour',
        nombre: t.nombre,
        imagen: t.imagen,
        corazones: t._count.favoritos,
      })),
    ];

    const top = todos
      .sort((a, b) => b.corazones - a.corazones)
      .slice(0, 5);

    res.status(200).json(top);
  } catch (error) {
    console.error('Error al obtener top amados:', error);
    res.status(500).json({ error: 'Error al obtener los más amados' });
  }
});

module.exports = app;