const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const { body, param, validateRequest } = require('../Middlewares/validator');

const prisma = require('../config.db');

app.get('/destinos', async (req, res)=>{
    try{
        const destinos = await prisma.destino_turistico.findMany({
            include: {
                municipio: true
            }
        });
        res.status(200).json(destinos);
   }catch(error){
    console.error('Error al consultar destinos:', error);
    res.status(500).json({ error: 'Error al obtener destinos' });
   }
});

app.get(
  '/destinos/:id',
  [param('id').isInt().withMessage('id debe ser un número entero')],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
        const destino = await prisma.destino_turistico.findUnique({
            where: { id: Number(id) }, 
            include: {
                municipio: true
            }
        });

        if (!destino) {
            return res.status(404).json({ error: 'Destino turístico no encontrado' });
        }

        res.status(200).json(destino);
    } catch (error) {
        console.error('Error al consultar el destino:', error);
        res.status(500).json({ error: 'Error al obtener el destino' });
    }
});

app.post(
  '/destinos',
  [
    body('id_municipio').isInt().withMessage('id_municipio es obligatorio y debe ser un número entero'),
    body('nombre_Calle').trim().notEmpty().withMessage('nombre_Calle es obligatorio').isLength({ max: 50 }),
    body('codifoPostal').isInt().withMessage('codifoPostal debe ser un número entero'),
    body('id_categoria').isInt().withMessage('id_categoria es obligatorio y debe ser un número entero'),
    body('id_rese_a').isInt().withMessage('id_rese_a es obligatorio y debe ser un número entero'),
    body('nombre').optional().isString().isLength({ max: 100 }),
    body('numero_Calle').optional().isInt(),
    body('horarioAbierto').optional().isString().isLength({ max: 8 }),
    body('horarioCerrado').optional().isString().isLength({ max: 8 }),
    body('estadoConvenio').optional().isBoolean(),
    body('imagen').optional().isString(),
    body('calificacion').optional().isString().isLength({ max: 100 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
        const {
          id_municipio,
          nombre,
          numero_Calle,
          nombre_Calle,
          codifoPostal,
          horarioAbierto,
          horarioCerrado,
          estadoConvenio,
          id_rese_a,
          id_categoria,
          imagen,
          calificacion,
        } = req.body;

        const nuevoDestino = await prisma.destino_turistico.create({
            data: {
              id_municipio,
              nombre,
              numero_Calle,
              nombre_Calle,
              codifoPostal,
              horarioAbierto,
              horarioCerrado,
              estadoConvenio,
              id_rese_a,
              id_categoria,
              imagen,
              calificacion,
            }
        });
        res.status(201).json(nuevoDestino);
    } catch (error) {
        console.error('Error al crear destino:', error);
        res.status(500).json({ error: 'Error al crear el destino turístico' });
    }
});

app.put(
  '/destinos/:id',
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('id_municipio').optional().isInt(),
    body('nombre_Calle').optional().trim().isLength({ max: 50 }),
    body('codifoPostal').optional().isInt(),
    body('id_categoria').optional().isInt(),
    body('id_rese_a').optional().isInt(),
    body('nombre').optional().isString().isLength({ max: 100 }),
    body('numero_Calle').optional().isInt(),
    body('horarioAbierto').optional().isString().isLength({ max: 8 }),
    body('horarioCerrado').optional().isString().isLength({ max: 8 }),
    body('estadoConvenio').optional().isBoolean(),
    body('imagen').optional().isString(),
    body('calificacion').optional().isString().isLength({ max: 100 }),
  ],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
        const {
          id_municipio,
          nombre,
          numero_Calle,
          nombre_Calle,
          codifoPostal,
          horarioAbierto,
          horarioCerrado,
          estadoConvenio,
          id_rese_a,
          id_categoria,
          imagen,
          calificacion,
        } = req.body;

        const destinoActualizado = await prisma.destino_turistico.update({
            where: { id: Number(id) }, 
            data: {
              id_municipio,
              nombre,
              numero_Calle,
              nombre_Calle,
              codifoPostal,
              horarioAbierto,
              horarioCerrado,
              estadoConvenio,
              id_rese_a,
              id_categoria,
              imagen,
              calificacion,
            }
        });
        res.status(200).json(destinoActualizado);
    } catch (error) {
        console.error('Error al actualizar destino:', error);
        res.status(500).json({ error: 'Error al actualizar el destino turístico o registro no encontrado' });
    }
});

app.delete('/destinos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.destino_turistico.delete({
            where: { id: Number(id) } 
        });
        res.status(200).json({ message: 'Destino turístico eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar destino:', error);
        res.status(500).json({ error: 'Error al eliminar el destino turístico o registro no encontrado' });
    }
});

module.exports = app;
