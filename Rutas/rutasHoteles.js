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

module.exports = app;