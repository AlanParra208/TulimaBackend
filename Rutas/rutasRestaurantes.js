const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const prisma = require('../config.db');

app.get('/restaurantes', async (req, res)=>{
    try{
        const restaurantes = await prisma.restaurante.findMany({
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

app.get('/restaurantes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const restaurante = await prisma.restaurante.findUnique({
            where: { id: Number(id) },
            include: { municipio: true }
        });
        if (!restaurante) return res.status(404).json({ error: 'Restaurante no encontrado' });
        res.status(200).json(restaurante);
    } catch (error) {
        console.error('Error al consultar el restaurante:', error);
        res.status(500).json({ error: 'Error al obtener el restaurante' });
    }
});

app.post('/restaurantes', async (req, res) => {
    try {
        const nuevoRestaurante = await prisma.restaurante.create({
            data: req.body
        });
        res.status(201).json(nuevoRestaurante);
    } catch (error) {
        console.error('Error al crear restaurante:', error);
        res.status(500).json({ error: 'Error al crear el restaurante' });
    }
});

app.put('/restaurantes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const restauranteActualizado = await prisma.restaurante.update({
            where: { id: Number(id) },
            data: req.body
        });
        res.status(200).json(restauranteActualizado);
    } catch (error) {
        console.error('Error al actualizar restaurante:', error);
        res.status(500).json({ error: 'Error al actualizar el restaurante' });
    }
});

app.delete('/restaurantes/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.restaurante.delete({
            where: { id: Number(id) }
        });
        res.status(200).json({ message: 'Restaurante eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar restaurante:', error);
        res.status(500).json({ error: 'Error al eliminar el restaurante' });
    }
});


module.exports = app;