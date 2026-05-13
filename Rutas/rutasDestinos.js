const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const prisma = require('../config.db');

app.get('/destinos', async (req, res)=>{
    try{
        const destinos = await prisma.destino_turistico.findMany();
        res.status(200).json(destinos);
   }catch(error){
    console.error('Error al consultar destinos:', error);
    res.status(500).json({ error: 'Error al obtener destinos' });
   }
});

module.exports = app;
