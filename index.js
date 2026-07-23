const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();
const cookieParser = require('cookie-parser');
const { verifyCsrfToken, generateCsrfToken, sanitizeRequest } = require('./Middlewares/middleware');

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'https://tulima.site/'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

app.use(cors({
  origin: ['https://tulima.site', 'https://www.tulima.site'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));
app.use(cookieParser());

app.use(express.json({ limit: '5mb' }));
app.use(sanitizeRequest);

// Endpoint para obtener el token CSRF
app.get('/api/csrf-token', generateCsrfToken);

// Middleware global para verificar CSRF en rutas POST/PUT/DELETE
app.use(verifyCsrfToken);

app.use(require('./Rutas/rutasUsuario'));
app.use(require('./Rutas/rutasProveedores'));
app.use(require('./Rutas/rutasDestinos'));
app.use(require('./Rutas/rutasHoteles'));
app.use(require('./Rutas/rutasMunicipios'));
app.use(require('./Rutas/rutasRestaurantes'));
app.use(require('./Rutas/rutasTours'));
app.use(require('./Rutas/rutasFavoritos'));
app.use(require('./Rutas/rutasEventos'));
app.use(require('./Rutas/rutasMapa'));

app.listen(process.env.PORT, () => {

});

module.exports = app;