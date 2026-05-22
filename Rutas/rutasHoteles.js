const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const prisma = require('../config.db');

app.get('/hoteles', async (req, res)=>{
    try{
        const hoteles = await prisma.hotel.findMany({
            include: {
                municipio: true
            }
        });
        res.status(200).json(hoteles);
   }catch(error){
    console.error('Error al consultar hoteles:', error);
    res.status(500).json({ error: 'Error al obtener hoteles' });
   }
});

app.get('/hoteles/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const hotel = await prisma.hotel.findUnique({
            where: { id: Number(id) },
            include: { municipio: true }
        });
        if (!hotel) return res.status(404).json({ error: 'Hotel no encontrado' });
        res.status(200).json(hotel);
    } catch (error) {
        console.error('Error al consultar el hotel:', error);
        res.status(500).json({ error: 'Error al obtener el hotel' });
    }
});

app.post('/hoteles', async (req, res) => {
    try {
        const nuevoHotel = await prisma.hotel.create({
            data: req.body
        });
        res.status(201).json(nuevoHotel);
    } catch (error) {
        console.error('Error al crear hotel:', error);
        res.status(500).json({ error: 'Error al crear el hotel' });
    }
});

app.put('/hoteles/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const hotelActualizado = await prisma.hotel.update({
            where: { id: Number(id) },
            data: req.body
        });
        res.status(200).json(hotelActualizado);
    } catch (error) {
        console.error('Error al actualizar hotel:', error);
        res.status(500).json({ error: 'Error al actualizar el hotel' });
    }
});

app.delete('/hoteles/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.hotel.delete({
            where: { id: Number(id) }
        });
        res.status(200).json({ message: 'Hotel eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar hotel:', error);
        res.status(500).json({ error: 'Error al eliminar el hotel' });
    }
});

module.exports = app;