const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const { body, param, validateRequest } = require('../Middlewares/validator');

const prisma = require('../config.db');

app.get('/tours', async (req, res)=>{
    try{
        const tours = await prisma.provedor_tour.findMany({
            include: {
                municipio: true
            }
        });
        res.status(200).json(tours);
   }catch(error){
    console.error('Error al consultar tours:', error);
    res.status(500).json({ error: 'Error al obtener tours' });
   }
});

app.get(
  '/tours/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
        const tour = await prisma.provedor_tour.findUnique({
            where: { id: Number(id) },
            include: { municipio: true }
        });
        if (!tour) return res.status(404).json({ error: 'Tour no encontrado' });
        res.status(200).json(tour);
    } catch (error) {
        console.error('Error al consultar el tour:', error);
        res.status(500).json({ error: 'Error al obtener el tour' });
    }
});

app.post(
  '/tours',
  [
    body('nombre').trim().notEmpty().withMessage('nombre es obligatorio').isLength({ max: 30 }),
    body('id_municipio').isInt().withMessage('id_municipio es obligatorio y debe ser un número entero'),
    body('tipoTour').optional().isString().isLength({ max: 20 }),
    body('telefono').optional().isString().isLength({ max: 20 }),
    body('tipoServicio').optional().isString().isLength({ max: 50 }),
    body('estadoConvenio').optional().isBoolean(),
    body('id_rese_a').optional().isInt(),
    body('imagen').optional().isString(),
    body('calificacion').optional().isString().isLength({ max: 100 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
        const {
          nombre,
          id_municipio,
          tipoTour,
          telefono,
          tipoServicio,
          estadoConvenio,
          id_rese_a,
          imagen,
          calificacion,
        } = req.body;
        const nuevoTour = await prisma.provedor_tour.create({
            data: {
              nombre,
              id_municipio,
              tipoTour,
              telefono,
              tipoServicio,
              estadoConvenio,
              id_rese_a,
              imagen,
              calificacion,
            }
        });
        res.status(201).json(nuevoTour);
    } catch (error) {
        console.error('Error al crear tour:', error);
        res.status(500).json({ error: 'Error al crear el tour' });
    }
});

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
    body('id_rese_a').optional().isInt(),
    body('imagen').optional().isString(),
    body('calificacion').optional().isString().isLength({ max: 100 }),
  ],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
        const {
          nombre,
          id_municipio,
          tipoTour,
          telefono,
          tipoServicio,
          estadoConvenio,
          id_rese_a,
          imagen,
          calificacion,
        } = req.body;
        const tourActualizado = await prisma.provedor_tour.update({
            where: { id: Number(id) },
            data: {
              nombre,
              id_municipio,
              tipoTour,
              telefono,
              tipoServicio,
              estadoConvenio,
              id_rese_a,
              imagen,
              calificacion,
            }
        });
        res.status(200).json(tourActualizado);
    } catch (error) {
        console.error('Error al actualizar tour:', error);
        res.status(500).json({ error: 'Error al actualizar el tour' });
    }
});

app.delete('/tours/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.provedor_tour.delete({
            where: { id: Number(id) }
        });
        res.status(200).json({ message: 'Tour eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar tour:', error);
        res.status(500).json({ error: 'Error al eliminar el tour' });
    }
});

module.exports = app;
