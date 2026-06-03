require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./config/db.js');

const usuarioRoutes = require('./routes/usuarioRoutes.js');
const clienteRoutes = require('./routes/clienteRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar Middlewares globales
app.use(cors());
app.use(express.json());

// Montar Rutas de la API por prefijos de roles
app.use('/api/v1/usuario', usuarioRoutes);
app.use('/api/v1/cliente', clienteRoutes);
app.use('/api/v1/admin', adminRoutes);

// Servir la especificación OpenAPI y la interfaz Swagger UI como archivos estáticos
app.use(express.static(path.join(__dirname)));

// Endpoint de fallback para Swagger UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Manejo centralizado de errores
app.use((err, req, res, next) => {
  console.error('Error no controlado en la aplicación:', err.message);
  res.status(500).json({ error: 'Error interno del servidor', message: err.message });
});

// Inicializar base de datos y levantar el servidor
const startServer = async () => {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`=============================================================`);
    console.log(`🚀 Servidor de Gol Ahora corriendo en http://localhost:${PORT}`);
    console.log(`📂 Abre http://localhost:${PORT} para explorar la consola Swagger UI`);
    console.log(`=============================================================`);
  });
};

startServer();
