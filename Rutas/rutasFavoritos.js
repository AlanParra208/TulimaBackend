const express = require('express');
const app = express();
const { verificarToken } = require('../Middlewares/middleware');
const { body, param, validateRequest } = require('../Middlewares/validator');
const prisma = require('../config.db');

// Middleware para validar el tipo de favorito
const validateFavoritoType = (req, res, next) => {
    const { tipo, id } = req.body;
    const validTypes = ['hotel', 'restaurante', 'destino', 'tour', 'evento'];
    if (!tipo || !validTypes.includes(tipo)) {
        return res.status(400).json({ error: 'El campo "tipo" es inválido. Debe ser uno de: ' + validTypes.join(', ') });
    }
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'El campo "id" es requerido y debe ser un número.' });
    }
    next();
};

// POST /favoritos - Añadir un item a favoritos
app.post(
    '/favoritos',
    verificarToken,
    validateFavoritoType,
    async (req, res) => {
        const id_usuario = req.usuarioId;
        const { tipo, id } = req.body;

        const data = { id_usuario };
        if (tipo === 'hotel') data.id_hotel = parseInt(id);
        if (tipo === 'restaurante') data.id_restaurante = parseInt(id);
        if (tipo === 'destino') data.id_destino = parseInt(id);
        if (tipo === 'tour') data.id_provedor_tour = parseInt(id);
        if (tipo === 'evento') data.id_evento = parseInt(id);

        try {
            const nuevoFavorito = await prisma.favorito.create({ data });
            res.status(201).json({ message: 'Añadido a favoritos exitosamente', favorito: nuevoFavorito });
        } catch (error) {
            if (error.code === 'P2002') {
                return res.status(409).json({ error: 'Este item ya está en tus favoritos.' });
            }
            console.error('Error al añadir a favoritos:', error);
            res.status(500).json({ error: 'No se pudo añadir a favoritos.' });
        }
    }
);

// DELETE /favoritos - Eliminar un item de favoritos
app.delete(
    '/favoritos',
    verificarToken,
    validateFavoritoType,
    async (req, res) => {
        const id_usuario = req.usuarioId;
        const { tipo, id } = req.body;

        const where = { id_usuario };
        if (tipo === 'hotel') where.id_hotel = parseInt(id);
        if (tipo === 'restaurante') where.id_restaurante = parseInt(id);
        if (tipo === 'destino') where.id_destino = parseInt(id);
        if (tipo === 'tour') where.id_provedor_tour = parseInt(id);
        if (tipo === 'evento') where.id_evento = parseInt(id);

        try {
            // Buscamos el favorito para obtener su ID único
            const favorito = await prisma.favorito.findFirst({ where });

            if (!favorito) {
                return res.status(404).json({ error: 'Favorito no encontrado.' });
            }

            await prisma.favorito.delete({
                where: { id_favorito: favorito.id_favorito }
            });

            res.status(200).json({ message: 'Eliminado de favoritos exitosamente.' });
        } catch (error) {
            console.error('Error al eliminar de favoritos:', error);
            res.status(500).json({ error: 'No se pudo eliminar de favoritos.' });
        }
    }
);

// GET /favoritos - Obtener todos los favoritos de un usuario
app.get(
    '/favoritos',
    verificarToken,
    async (req, res) => {
        const id_usuario = req.usuarioId;

        try {
           const favoritos = await prisma.favorito.findMany({
    where: { id_usuario },
    include: {
        hotel: {
            include: { municipio: true }
        },
        restaurante: {
            include: { municipio: true }
        },
        destino_turistico: {
            include: { municipio: true }
        },
        provedor_tour: {
            include: { municipio: true }
        },
        evento: {
            include: { municipio: true }
        },
    }
});
            res.status(200).json(favoritos);
        } catch (error) {
            console.error('Error al obtener los favoritos:', error);
            res.status(500).json({ error: 'No se pudieron obtener los favoritos.' });
        }
    }
);

module.exports = app;
