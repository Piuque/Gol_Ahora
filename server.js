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
app.use('/usuario', usuarioRoutes);
app.use('/cliente', clienteRoutes);
app.use('/admin', adminRoutes);

// Soportar prefijo /api que utiliza el frontend de forma transparente
app.use('/api/usuario', usuarioRoutes);
app.use('/api/cliente', clienteRoutes);
app.use('/api/admin', adminRoutes);

// Endpoints auxiliares para autocompletado del registro
app.get('/api/paises', async (req, res) => {
  try {
    const db = require('./config/db.js');
    const rows = await db.query.all('SELECT nombre FROM paises ORDER BY nombre ASC');
    res.json(rows.map(r => r.nombre));
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar países', message: err.message });
  }
});

app.get('/api/generos', async (req, res) => {
  try {
    const db = require('./config/db.js');
    const rows = await db.query.all('SELECT genero FROM generos ORDER BY genero ASC');
    res.json(rows.map(r => r.genero));
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar géneros', message: err.message });
  }
});

// Servir la especificación OpenAPI y la interfaz Swagger UI como archivos estáticos
// Se configura control de caché estricto para openapi.yaml para evitar errores de renderizado por archivos cacheados
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('openapi.yaml') || filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Servir archivos estáticos del frontend desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));
app.use('/app', express.static(path.join(__dirname, 'public')));

// Rutas amigables para el login / acceder del frontend
app.get(['/acceder', '/Acceder', '/login'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/acceder.html'));
});

// Rutas amigables para la navegación del panel administrativo
app.get('/admin/RegistrarCancha', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/registrarCancha.html'));
});

app.get('/admin/RegistrarCliente', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/registro.html'));
});

// Endpoint de fallback para Swagger UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Manejo centralizado de errores
app.use((err, req, res, next) => {
  console.error('Error no controlado en la aplicación:', err.message);
  res.status(500).json({ error: 'Error interno del servidor', message: err.message });
});

// Función para limpiar reservas pendientes de pago en efectivo expiradas (más de 5 minutos)
const cleanupExpiredReservations = async () => {
  try {
    const db = require('./config/db.js');
    
    // Buscar reservas en efectivo (id_metodo_de_pago = 1) pendientes (id_estado_cobro = 1) expiradas
    const sqlGetExpired = `
      SELECT r.id_reserva, r.id_ocupacion_cancha, r.id_cobro
      FROM reservas r
      INNER JOIN cobros c ON r.id_cobro = c.id_cobro
      WHERE c.id_estado_cobro = 1
        AND c.id_metodo_de_pago = 1
        AND c.fecha < NOW() - INTERVAL '5 minutes'
    `;
    const expired = await db.query.all(sqlGetExpired);
    
    if (expired.length > 0) {
      console.log(`[Limpieza] Se encontraron ${expired.length} reservas en efectivo vencidas. Cancelando...`);
      
      for (const res of expired) {
        await db.pool.query('BEGIN');
        
        // Eliminar reserva
        await db.pool.query('DELETE FROM reservas WHERE id_reserva = $1', [res.id_reserva]);
        
        // Eliminar ocupación de la cancha para liberar el turno
        await db.pool.query('DELETE FROM ocupaciones_cancha WHERE id_ocupacion_cancha = $1', [res.id_ocupacion_cancha]);
        
        // Cambiar cobro a Cancelado (estado 3)
        await db.pool.query(`
          UPDATE cobros 
          SET id_estado_cobro = 3, 
              detalles = detalles || ' (Cancelado automáticamente por falta de pago tras 5 minutos)' 
          WHERE id_cobro = $1
        `, [res.id_cobro]);
        
        await db.pool.query('COMMIT');
      }
      console.log(`[Limpieza] ${expired.length} reservas vencidas canceladas y turnos liberados.`);
    }
  } catch (err) {
    console.error('[Limpieza] Error al limpiar reservas vencidas:', err.message);
  }
};

// Inicializar base de datos y levantar el servidor
const startServer = async () => {
  await initDatabase();
  
  // Ejecutar limpieza cada 60 segundos
  setInterval(cleanupExpiredReservations, 60000);
  // Ejecutar limpieza inicial
  cleanupExpiredReservations();

  app.listen(PORT, () => {
    console.log(`=============================================================`);
    console.log(`🚀 Servidor de Gol Ahora corriendo en http://localhost:${PORT}`);
    console.log(`📂 Abre http://localhost:${PORT} para explorar la consola Swagger UI`);
    console.log(`=============================================================`);
  });
};

startServer();
