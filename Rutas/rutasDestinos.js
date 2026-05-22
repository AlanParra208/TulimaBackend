const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

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

app.get('/destinos/:id', async (req, res) => {
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

app.post('/destinos', async (req, res) => {
    try {
        const nuevoDestino = await prisma.destino_turistico.create({
            data: req.body
        });
        res.status(201).json(nuevoDestino);
    } catch (error) {
        console.error('Error al crear destino:', error);
        res.status(500).json({ error: 'Error al crear el destino turístico' });
    }
});

app.put('/destinos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const destinoActualizado = await prisma.destino_turistico.update({
            where: { id: Number(id) }, 
            data: req.body
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
