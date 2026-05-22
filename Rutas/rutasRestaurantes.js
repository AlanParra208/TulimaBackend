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

module.exports = app;