const express = require('express');
const cors = require('cors');
const app = express();


app.use(cors()); 
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