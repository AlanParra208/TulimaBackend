const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const prisma = require('../config.db');

// Le enseñamos a JavaScript a serializar los BigInt convirtiéndolos a String
BigInt.prototype.toJSON = function () {
  return this.toString();
};

// Middleware que verifica el JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token no provisto' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
}

// Ruta de autenticación / login
app.post('/login', async (req, res) => {
    const { nombreUsuario, contraseña } = req.body;
    if (!nombreUsuario || !contraseña) {
        return res.status(400).json({ error: 'Nombre de usuario y contraseña son requeridos' });
    }

    try {
        const usuario = await prisma.usuario.findFirst({
            where: {
                nombreUsuario: nombreUsuario,
                contraseña: contraseña 
            }
        });

        if (!usuario) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        const userPayload = {
            id: usuario.id_usuario,
            nombreUsuario: usuario.nombreUsuario,
            rol: usuario.rol,
        };

        const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({ token });

    } catch (error) {
        console.error('Error al consultar usuario:', error);
        res.status(500).json({ error: 'Error en la autenticación' });
    }
});

// Llevar todos los usuarios (protegido)
app.get('/usuarios', async (req, res) => {
    try {
        const usuarios = await prisma.usuario.findMany();
        res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error al obtener los usuarios:', error);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});

// Llevar un usuario especifico por id (protegido)
app.get('/usuarios/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const usuario = await prisma.usuario.findUnique({
            where: { id_usuario: userId }
        });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(200).json(usuario);
    } catch (error) {
        console.error('Error al obtener el usuario:', error);
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
});

// Añadir un nuevo usuario (protegido)
app.post('/usuarios', authenticateToken, async (req, res) => {
    try {
        const data = req.body;

        // Prisma inserta los datos pasándole un objeto 'data'
        const nuevoUsuario = await prisma.usuario.create({
            data: {
                id_usuario: data.id_usuario, // Omite esto si tu BD es AUTO_INCREMENT
                primerNombre: data.primerNombre,
                segundoNombre: data.segundoNombre,
                apellidoPaterno: data.apellidoPaterno,
                apellidoMaterno: data.apellidoMaterno,
                contraseña: data.contraseña,
                nombreUsuario: data.nombreUsuario,
                telefono: data.telefono,
                genero: data.genero,
                edad: data.edad,
                rol: data.rol
            }
        });

        res.status(201).json({ 
            message: 'Usuario creado exitosamente', 
            userId: nuevoUsuario.id_usuario 
        });
    } catch (error) {
        console.error('Error al crear el usuario:', error);
        res.status(500).json({ error: 'Error al crear el usuario' });
    }
});

// Modificar un usuario por id (protegido)
app.put('/usuarios/:id', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const data = req.body;

        const usuarioActualizado = await prisma.usuario.update({
            where: { id_usuario: userId },
            data: {
                primerNombre: data.primerNombre,
                segundoNombre: data.segundoNombre,
                apellidoPaterno: data.apellidoPaterno,
                apellidoMaterno: data.apellidoMaterno,
                contraseña: data.contraseña,
                nombreUsuario: data.nombreUsuario,
                telefono: data.telefono,
                genero: data.genero,
                edad: data.edad,
                rol: data.rol
            }
        });

        res.status(200).json({ message: 'Usuario actualizado exitosamente' });
    } catch (error) {
        console.error('Error al actualizar el usuario:', error);
        // Prisma arroja un error específico si intentas actualizar un ID que no existe
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Usuario no encontrado para actualizar' });
        }
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
});

// Eliminar un usuario por id (protegido)
app.delete('/usuarios/:id', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        await prisma.usuario.delete({
            where: { id_usuario: userId }
        });

        res.status(204).send(); // 204 No Content usualmente no lleva body JSON
    } catch (error) {
        console.error('Error al eliminar el usuario:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Usuario no encontrado para eliminar' });
        }
        res.status(500).json({ error: 'Error al eliminar el usuario' });
    }
});

module.exports = app;