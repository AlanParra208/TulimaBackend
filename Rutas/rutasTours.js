const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

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

app.get('/tours/:id', async (req, res) => {
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

app.post('/tours', async (req, res) => {
    try {
        const nuevoTour = await prisma.provedor_tour.create({
            data: req.body
        });
        res.status(201).json(nuevoTour);
    } catch (error) {
        console.error('Error al crear tour:', error);
        res.status(500).json({ error: 'Error al crear el tour' });
    }
});

app.put('/tours/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const tourActualizado = await prisma.provedor_tour.update({
            where: { id: Number(id) },
            data: req.body
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
