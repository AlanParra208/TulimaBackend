const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

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

app.get('/municipios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const municipio = await prisma.municipio.findUnique({
            where: { id: Number(id) }
        });
        if (!municipio) return res.status(404).json({ error: 'Municipio no encontrado' });
        res.status(200).json(municipio);
    } catch (error) {
        console.error('Error al consultar el municipio:', error);
        res.status(500).json({ error: 'Error al obtener el municipio' });
    }
});

app.post('/municipios', async (req, res) => {
    try {
        const nuevoMunicipio = await prisma.municipio.create({
            data: req.body
        });
        res.status(201).json(nuevoMunicipio);
    } catch (error) {
        console.error('Error al crear municipio:', error);
        res.status(500).json({ error: 'Error al crear el municipio' });
    }
});

app.put('/municipios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const municipioActualizado = await prisma.municipio.update({
            where: { id: Number(id) },
            data: req.body
        });
        res.status(200).json(municipioActualizado);
    } catch (error) {
        console.error('Error al actualizar municipio:', error);
        res.status(500).json({ error: 'Error al actualizar el municipio' });
    }
});

app.delete('/municipios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.municipio.delete({
            where: { id: Number(id) }
        });
        res.status(200).json({ message: 'Municipio eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar municipio:', error);
        res.status(500).json({ error: 'Error al eliminar el municipio' });
    }
});


module.exports = app;