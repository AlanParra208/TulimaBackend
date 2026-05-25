const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const { body, param, validateRequest } = require('../Middlewares/validator');

const prisma = require('../config.db');

app.get('/restaurantes', async (req, res)=>{
    try{
        const restaurantes = await prisma.restaurante.findMany({
            where: { activo: true },
            include: {
                municipio: true
            }
        });
        res.status(200).json(restaurantes);
   }catch(error){
    console.error('Error al consultar restaurantes:', error);
    res.status(500).json({ error: 'Error al obtener restaurantes' });
   }
});

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
});

app.post(
  '/restaurantes',
  [
    body('nombre').trim().notEmpty().withMessage('nombre es obligatorio').isLength({ max: 50 }),
    body('numero_Calle').isInt().withMessage('numero_Calle debe ser un número entero'),
    body('nombre_Calle').trim().notEmpty().withMessage('nombre_Calle es obligatorio').isLength({ max: 50 }),
    body('codigoPostal').isInt().withMessage('codigoPostal debe ser un número entero'),
    body('id_municipio').isInt().withMessage('id_municipio es obligatorio y debe ser un número entero'),
    body('id_categoria').isInt().withMessage('id_categoria es obligatorio y debe ser un número entero'),
    body('id_rese_a').isInt().withMessage('id_rese_a es obligatorio y debe ser un número entero'),
    body('tipo').optional().isString().isLength({ max: 100 }),
    body('disponibilidad').optional().isString().isLength({ max: 100 }),
    body('telefono').optional().isString().isLength({ max: 20 }),
    body('email').optional().isEmail().withMessage('email no es válido'),
    body('estadoConvenio').optional().isBoolean(),
    body('imagen').optional().isString(),
    body('calificacion').optional().isString().isLength({ max: 100 }),
    body('horarioAbierto').optional().isString().isLength({ max: 8 }),
    body('horarioCerrado').optional().isString().isLength({ max: 8 }),
  ],
  validateRequest,
  async (req, res) => {
    try {
        const {
          nombre,
          tipo,
          numero_Calle,
          nombre_Calle,
          codigoPostal,
          id_municipio,
          disponibilidad,
          telefono,
          email,
          estadoConvenio,
          id_categoria,
          id_rese_a,
          imagen,
          calificacion,
          horarioAbierto,
          horarioCerrado,
        } = req.body;
        const formatearHora = (hora) => hora ? `1970-01-01T${hora.length === 5 ? hora + ':00' : hora}.000Z` : null;

        const nuevoRestaurante = await prisma.restaurante.create({
            data: {
              nombre,
              tipo,
              numero_Calle,
              nombre_Calle,
              codigoPostal,
              id_municipio,
              disponibilidad,
              telefono,
              email,
              estadoConvenio,
              id_categoria,
              id_rese_a,
              imagen,
              calificacion,
              horarioAbierto: formatearHora(horarioAbierto),
              horarioCerrado: formatearHora(horarioCerrado),
            }
        });
        res.status(201).json(nuevoRestaurante);
    } catch (error) {
        console.error('Error al crear restaurante:', error);
        res.status(500).json({ error: 'Error al crear el restaurante' });
    }
});

app.put(
  '/restaurantes/:id',
  [
    param('id').isInt().withMessage('id debe ser un número entero'),
    body('nombre').optional().trim().isLength({ max: 50 }),
    body('numero_Calle').optional().isInt(),
    body('nombre_Calle').optional().trim().isLength({ max: 50 }),
    body('codigoPostal').optional().isInt(),
    body('id_municipio').optional().isInt(),
    body('id_categoria').optional().isInt(),
    body('id_rese_a').optional().isInt(),
    body('tipo').optional().isString().isLength({ max: 100 }),
    body('disponibilidad').optional().isString().isLength({ max: 100 }),
    body('telefono').optional().isString().isLength({ max: 20 }),
    body('email').optional().isEmail(),
    body('estadoConvenio').optional().isBoolean(),
    body('imagen').optional().isString(),
    body('calificacion').optional().isString().isLength({ max: 100 }),
    body('horarioAbierto').optional().isString().isLength({ max: 8 }),
    body('horarioCerrado').optional().isString().isLength({ max: 8 }),
  ],
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
        const {
          nombre,
          tipo,
          numero_Calle,
          nombre_Calle,
          codigoPostal,
          id_municipio,
          disponibilidad,
          telefono,
          email,
          estadoConvenio,
          id_categoria,
          id_rese_a,
          imagen,
          calificacion,
          horarioAbierto,
          horarioCerrado,
        } = req.body;
        const formatearHora = (hora) => hora ? `1970-01-01T${hora.length === 5 ? hora + ':00' : hora}.000Z` : null;

        const restauranteActualizado = await prisma.restaurante.update({
            where: { id_restaurante: Number(id)},
            data: {
              nombre,
              tipo,
              numero_Calle,
              nombre_Calle,
              codigoPostal,
              id_municipio,
              disponibilidad,
              telefono,
              email,
              estadoConvenio,
              id_categoria,
              id_rese_a,
              imagen,
              calificacion,
              horarioAbierto: formatearHora(horarioAbierto),
              horarioCerrado: formatearHora(horarioCerrado),
            }
        });
        res.status(200).json(restauranteActualizado);
    } catch (error) {
        console.error('Error al actualizar restaurante:', error);
        res.status(500).json({ error: 'Error al actualizar el restaurante' });
    }
});

//borrado logico

app.delete('/restaurantes/:id'
    [param('id').isInt().withMessage('id debe ser un número entero')], 
    validateRequest,
    async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.restaurante.update({
            where: { id_restaurante: Number(id)},
            data: { activo: false }
        });
        res.status(200).json({ message: 'Restaurante desactivado correctamente' });
    } catch (error) {
        console.error('Error al eliminar restaurante:', error);
        res.status(500).json({ error: 'Error al eliminar el restaurante' });
    }
});


module.exports = app;