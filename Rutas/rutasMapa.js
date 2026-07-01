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
        direccion: `${h.numero_Calle} ${h.nombre_Calle}, CP ${h.codigoPostal}`,
        telefono: h.telefono?.toString() ?? null,
        email: h.email,
        descripcion: h.descripcion,
        estrellas: h.estrellas,
        subtipo: h.tipo,
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
        direccion: `${r.numero_Calle} ${r.nombre_Calle}, CP ${r.codigoPostal}`,
        telefono: r.telefono?.toString() ?? null,
        email: r.email,
        horarioAbierto: r.horarioAbierto,
        horarioCerrado: r.horarioCerrado,
        subtipo: r.tipo,
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
        telefono: t.telefono?.toString() ?? null,
        subtipo: t.tipoTour,
        tipoServicio: t.tipoServicio,
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
        direccion: d.nombre_Calle ? `${d.numero_Calle ?? ''} ${d.nombre_Calle}, CP ${d.codifoPostal}`.trim() : null,
        horarioAbierto: d.horarioAbierto,
        horarioCerrado: d.horarioCerrado,
        subtipo: d.tipo,
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
        direccion: `${e.numero_Calle} ${e.nombre_Calle}, CP ${e.codigoPostal}`,
        fechaInicio: e.fechaInicio,
        fechaTermino: e.fechaTermino,
        subtipo: e.tipoEvento,
      })),
    ];

    res.status(200).json(puntos);
  } catch (error) {
    console.error('Error al obtener puntos del mapa:', error);
    res.status(500).json({ error: 'Error al obtener los servicios del mapa' });
  }
});

module.exports = app;