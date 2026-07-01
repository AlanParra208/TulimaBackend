const express = require('express');
const app = express();
const prisma = require('../config.db');

// GET público — todos los negocios activos con coordenadas, para el mapa dinámico
app.get('/mapa/servicios', async (req, res) => {
  try {
    const [hoteles, restaurantes, tours, destinos, eventos] = await Promise.all([
      prisma.hotel.findMany({
        where: { activo: true, latitud: { not: null }, longitud: { not: null } },
        include: { municipio: true }
      }),
      prisma.restaurante.findMany({
        where: { activo: true, latitud: { not: null }, longitud: { not: null } },
        include: { municipio: true }
      }),
      prisma.provedor_tour.findMany({
        where: { activo: true, latitud: { not: null }, longitud: { not: null } },
        include: { municipio: true }
      }),
      prisma.destino_turistico.findMany({
        where: { activo: true, latitud: { not: null }, longitud: { not: null } },
        include: { municipio: true }
      }),
      prisma.evento.findMany({
        where: { activo: true, latitud: { not: null }, longitud: { not: null } },
        include: { destino_turistico: { include: { municipio: true } } }
      }),
    ]);

    const puntos = [
      ...hoteles.map(h => ({
        id: `hotel-${h.id_hotel}`,
        tipo: 'hotel',
        nombre: h.nombre_hotel,
        imagen: h.imagen,
        lat: h.latitud,
        lng: h.longitud,
        id_municipio: h.id_municipio,
        municipio: h.municipio?.nombre,
      })),
      ...restaurantes.map(r => ({
        id: `restaurante-${r.id_restaurante}`,
        tipo: 'restaurante',
        nombre: r.nombre,
        imagen: r.imagen,
        lat: r.latitud,
        lng: r.longitud,
        id_municipio: r.id_municipio,
        municipio: r.municipio?.nombre,
      })),
      ...tours.map(t => ({
        id: `tour-${t.id_provedor}`,
        tipo: 'tour',
        nombre: t.nombre,
        imagen: t.imagen,
        lat: t.latitud,
        lng: t.longitud,
        id_municipio: t.id_municipio,
        municipio: t.municipio?.nombre,
      })),
      ...destinos.map(d => ({
        id: `destino-${d.id_destino}`,
        tipo: 'destino',
        nombre: d.nombre || 'Destino Turístico',
        imagen: d.imagen,
        lat: d.latitud,
        lng: d.longitud,
        id_municipio: d.id_municipio,
        municipio: d.municipio?.nombre,
      })),
      ...eventos.map(e => ({
        id: `evento-${e.id_evento}`,
        tipo: 'evento',
        nombre: e.nombre_Evento,
        imagen: e.imagen,
        lat: e.latitud,
        lng: e.longitud,
        id_municipio: e.id_municipio,
        municipio: e.destino_turistico?.municipio?.nombre,
      })),
    ];

    res.status(200).json(puntos);
  } catch (error) {
    console.error('Error al obtener puntos del mapa:', error);
    res.status(500).json({ error: 'Error al obtener los servicios del mapa' });
  }
});

module.exports = app;