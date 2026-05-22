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

module.exports = app;
