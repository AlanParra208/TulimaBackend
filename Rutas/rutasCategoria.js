const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const prisma = require('../config.db');

app.get('/categorias', async (req, res) => {
    try {
        const categorias = await prisma.categoria.findMany();
        res.status(200).json(categorias);
    } catch (error) {
        console.error('Error al consultar categorias:', error);
        res.status(500).json({ error: 'Error al obtener categorias' });
    }
});

module.exports = app;