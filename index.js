const express = require('express');
const cors = require('cors');
const app = express();
const cookieParser = require('cookie-parser');

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
})); 
app.use(cookieParser());

app.use(express.json()); 
app.use(require('./Rutas/rutasUsuario'));
app.use(require('./Rutas/rutasDestinos'));
app.use(require('./Rutas/rutasHoteles'));
app.use(require('./Rutas/rutasMunicipios'));
app.use(require('./Rutas/rutasRestaurantes'));
app.use(require('./Rutas/rutasTours'));


app.listen(process.env.PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${process.env.PORT}`);
});

module.exports = app;