require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./config/db.js');

const usuarioRoutes = require('./routes/usuarioRoutes.js');
const clienteRoutes = require('./routes/clienteRoutes.js');
const adminRoutes = require('./routes/adminRoutes.js');
const { authMiddleware, requireRole } = require('./middlewares/auth.js');
const usuarioController = require('./controllers/usuarioController.js');

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

// Catálogo de clases disponibles para inscripción
app.get('/api/clases/disponibles', async (req, res) => {
  try {
    const db = require('./config/db.js');
    const sql = `
      SELECT c.id_clase,
             c.nombre AS nombre_clase,
             c.capacidad_max AS capacidad_maxima,
             COALESCE(u.nombre || ' ' || u.apellido, 'Por asignar') AS profesor,
             (SELECT COUNT(*)::int FROM clientes_clases WHERE id_clase = c.id_clase) AS inscriptos,
             to_char(oc.fecha, 'DD/MM/YYYY') || ' ' || to_char(oc.hora_inicio, 'HH24:MI') || '-' || to_char(oc.hora_fin, 'HH24:MI') AS horarios
      FROM clases c
      LEFT JOIN usuarios u ON c.id_profesional = u.id_usuario
      LEFT JOIN ocupaciones_cancha oc ON c.id_ocupacion_cancha = oc.id_ocupacion_cancha
      ORDER BY c.nombre ASC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clases disponibles', message: err.message });
  }
});

// Catálogo de entrenamientos disponibles para inscripción
app.get('/api/entrenamientos/disponibles', async (req, res) => {
  try {
    const db = require('./config/db.js');
    const sql = `
      SELECT e.id_entrenamiento,
             'Entrenamiento ' || COALESCE(can.nombre, '') AS nombre_entrenamiento,
             e.capacidad_max AS capacidad_maxima,
             COALESCE(u.nombre || ' ' || u.apellido, 'Preparador asignado') AS entrenador,
             (SELECT COUNT(*)::int FROM clientes_entrenamientos WHERE id_entrenamiento = e.id_entrenamiento) AS inscriptos,
             to_char(oc.fecha, 'DD/MM/YYYY') || ' ' || to_char(oc.hora_inicio, 'HH24:MI') || '-' || to_char(oc.hora_fin, 'HH24:MI') AS horarios
      FROM entrenamientos e
      LEFT JOIN canchas can ON e.id_cancha = can.id_cancha
      LEFT JOIN usuarios u ON e.id_profesional = u.id_usuario
      LEFT JOIN ocupaciones_cancha oc ON e.id_ocupacion_cancha = oc.id_ocupacion_cancha
      ORDER BY e.id_entrenamiento ASC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener entrenamientos disponibles', message: err.message });
  }
});

// Endpoint temporal para sembrar la base de datos de prueba
app.get('/api/seed', async (req, res) => {
  try {
    const db = require('./config/db.js');
    await db.pool.query('BEGIN');

    // 1. Asegurar Club
    await db.pool.query(`
      INSERT INTO clubes (id_club, nombre) 
      VALUES (1, 'El buen deporte')
      ON CONFLICT (id_club) DO NOTHING
    `);

    // 2. Asegurar Generos
    await db.pool.query(`
      INSERT INTO generos (id_genero, genero) VALUES 
      (1, 'Masculino'),
      (2, 'Femenino'),
      (3, 'No binario')
      ON CONFLICT (id_genero) DO NOTHING
    `);

    // 3. Asegurar Paises
    await db.pool.query(`
      INSERT INTO paises (id_pais, nombre) VALUES 
      (1, 'Argentina')
      ON CONFLICT (id_pais) DO NOTHING
    `);

    // 4. Asegurar Localidades y Direcciones
    await db.pool.query(`
      INSERT INTO provincias (id_provincia, nombre) VALUES (1, 'Buenos Aires') ON CONFLICT DO NOTHING;
      INSERT INTO ciudades (id_ciudad, nombre, id_provincia) VALUES (1, 'Florencio Varela', 1) ON CONFLICT DO NOTHING;
      INSERT INTO localidades (id_localidad, nombre, id_ciudad) VALUES (1, 'Centro', 1) ON CONFLICT (id_localidad) DO NOTHING;
      INSERT INTO direcciones (id_direccion, calle, numero, codigo_postal, id_localidad) 
      VALUES (1, 'Av. de los Deportes', '1234', '1888', 1)
      ON CONFLICT (id_direccion) DO NOTHING;
    `);

    // 5. Insertar Tipos de Cancha
    await db.pool.query(`
      INSERT INTO tipos_de_cancha (id_tipo_de_cancha, tipo_cancha, duracion_max, precio_hora_reserva, imagen_url) VALUES 
      (1, 'Fútbol 5', 60, 5000, 'https://images.unsplash.com/photo-1517649763962-0c623066013b'),
      (2, 'Fútbol 7', 60, 7000, 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2'),
      (3, 'Fútbol 11', 90, 10000, 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6')
      ON CONFLICT (id_tipo_de_cancha) DO NOTHING
    `);

    // 6. Insertar Canchas físicas
    await db.pool.query(`
      INSERT INTO canchas (id_cancha, nombre, tiempo_cancelacion, precio_hora_reserva, id_tipo_de_cancha, id_club) VALUES 
      (1, 'Cancha Sintética 1', 6, 5000, 1, 1),
      (2, 'Cancha de Césped Natural', 6, 7000, 2, 1),
      (3, 'Estadio Principal F11', 12, 10000, 3, 1)
      ON CONFLICT (id_cancha) DO NOTHING
    `);

    // 7. Insertar Usuarios (Cliente, Profesor, Entrenador)
    await db.pool.query(`
      INSERT INTO usuarios (id_usuario, username, user_level, nombre, apellido, email, password, fecha_nacimiento, dni, telefono, id_direccion, id_genero, id_nacionalidad, id_club) VALUES 
      (10, 'cliente_test', 'cliente', 'Juan', 'Pérez', 'cliente@example.com', '123456', '1995-05-10', '39123456', '1122334455', 1, 1, 1, 1),
      (11, 'profesor_test', 'profesor', 'Carlos', 'Bilardo', 'profesor@example.com', '123456', '1960-03-16', '14123456', '1155667788', 1, 1, 1, 1),
      (12, 'entrenador_test', 'entrenador', 'Lionel', 'Scaloni', 'entrenador@example.com', '123456', '1978-05-16', '26123456', '1188990011', 1, 1, 1, 1)
      ON CONFLICT (id_usuario) DO NOTHING
    `);

    // 8. Ocupaciones para turnos de clases y entrenamientos
    await db.pool.query(`
      -- Ocupación para Clase (Tipo 2 = 'Clase/Entrenamiento')
      INSERT INTO ocupaciones_cancha (id_ocupacion_cancha, fecha, hora_inicio, hora_fin, id_tipo_ocupacion, id_cancha)
      VALUES (101, CURRENT_DATE + 1, '18:00:00', '19:30:00', 2, 1)
      ON CONFLICT (id_ocupacion_cancha) DO NOTHING;

      -- Ocupación para Entrenamiento (Tipo 2 = 'Clase/Entrenamiento')
      INSERT INTO ocupaciones_cancha (id_ocupacion_cancha, fecha, hora_inicio, hora_fin, id_tipo_ocupacion, id_cancha)
      VALUES (102, CURRENT_DATE + 2, '20:00:00', '21:30:00', 2, 2)
      ON CONFLICT (id_ocupacion_cancha) DO NOTHING;

      -- Ocupación para Reserva de Cancha (Tipo 1 = 'Reserva')
      INSERT INTO ocupaciones_cancha (id_ocupacion_cancha, fecha, hora_inicio, hora_fin, id_tipo_ocupacion, id_cancha)
      VALUES (103, CURRENT_DATE + 3, '21:00:00', '22:00:00', 1, 1)
      ON CONFLICT (id_ocupacion_cancha) DO NOTHING;
    `);

    // 9. Crear Clases y Entrenamientos
    await db.pool.query(`
      INSERT INTO clases (id_clase, nombre, capacidad_max, id_profesional, id_cancha, id_ocupacion_cancha)
      VALUES (1, 'Técnica Individual y Pase', 15, 11, 1, 101)
      ON CONFLICT (id_clase) DO NOTHING;

      INSERT INTO entrenamientos (id_entrenamiento, capacidad_max, id_profesional, id_cancha, id_ocupacion_cancha)
      VALUES (1, 10, 12, 2, 102)
      ON CONFLICT (id_entrenamiento) DO NOTHING;
    `);

    // 10. Inscribir Cliente en la Clase y el Entrenamiento
    await db.pool.query(`
      INSERT INTO clientes_clases (id_cliente_clase, id_cliente, id_clase, id_asistencia)
      VALUES (1, 10, 1, 2)
      ON CONFLICT (id_cliente_clase) DO NOTHING;

      INSERT INTO clientes_entrenamientos (id_cliente_capacitacion, id_cliente, id_entrenamiento, id_asistencia)
      VALUES (1, 10, 1, 2)
      ON CONFLICT (id_cliente_capacitacion) DO NOTHING;
    `);

    // 11. Crear cobro para la reserva y asociar Reserva
    await db.pool.query(`
      INSERT INTO cobros (id_cobro, monto, porcentaje_descuento, detalles, id_club, id_usuario, id_estado_cobro, id_metodo_de_pago)
      VALUES (1001, 5000, 0, 'Reserva de Cancha Sintética 1 de prueba', 1, 10, 1, 1)
      ON CONFLICT (id_cobro) DO NOTHING;

      INSERT INTO reservas (id_reserva, id_ocupacion_cancha, id_usuario, id_cancha, id_cobro)
      VALUES (1001, 103, 10, 1, 1001)
      ON CONFLICT (id_reserva) DO NOTHING;
    `);

    await db.pool.query('COMMIT');
    res.json({
      message: 'Base de datos sembrada con éxito',
      usuario_prueba: {
        username: 'cliente_test',
        password: '123456',
        email: 'cliente@example.com',
        detalles: 'Este usuario ahora cuenta con 1 reserva, 1 clase y 1 entrenamiento de prueba asignados.'
      }
    });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al sembrar base de datos', message: err.message });
  }
});

// Endpoints específicos para obtener la información de perfil por roles
app.get(['/profesor/info', '/profesor/Info'], authMiddleware, requireRole(['profesor', 'admin']), usuarioController.obtenerInfoUsuarioLogueado);
app.get(['/entrenador/info', '/entrenador/Info'], authMiddleware, requireRole(['entrenador', 'admin']), usuarioController.obtenerInfoUsuarioLogueado);

// Endpoints específicos para obtener las clases y alumnos asignados a un profesor
app.get('/profesor/clases', authMiddleware, requireRole(['profesor', 'admin']), async (req, res) => {
  const idProfesor = req.user.id_usuario;
  try {
    const db = require('./config/db.js');
    const sql = `
      SELECT c.id_clase, c.nombre, c.capacidad_max,
             can.nombre AS cancha_nombre, tc.tipo_cancha AS nivel,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin,
             to_char(oc.fecha, 'YYYY-MM-DD') AS fecha_turno,
             (SELECT COUNT(*)::int FROM clientes_clases WHERE id_clase = c.id_clase) AS inscriptos
      FROM clases c
      LEFT JOIN canchas can ON c.id_cancha = can.id_cancha
      LEFT JOIN tipos_de_cancha tc ON can.id_tipo_de_cancha = tc.id_tipo_de_cancha
      LEFT JOIN ocupaciones_cancha oc ON c.id_ocupacion_cancha = oc.id_ocupacion_cancha
      WHERE c.id_profesional = $1
    `;
    const rows = await db.query.all(sql, [idProfesor]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener las clases del profesor', message: err.message });
  }
});

app.get('/profesor/clases/:id/alumnos', authMiddleware, requireRole(['profesor', 'admin']), async (req, res) => {
  const idClase = req.params.id;
  try {
    const db = require('./config/db.js');
    const sql = `
      SELECT u.id_usuario, u.nombre, u.apellido, u.dni, u.telefono,
             COALESCE(a.estado, 'Activo') AS asistencia
      FROM clientes_clases cc
      INNER JOIN usuarios u ON cc.id_cliente = u.id_usuario
      LEFT JOIN asistencias a ON cc.id_asistencia = a.id_asistencia
      WHERE cc.id_clase = $1
    `;
    const rows = await db.query.all(sql, [idClase]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener alumnos de la clase', message: err.message });
  }
});

app.delete('/profesor/clases/:id_clase/alumnos/:id_alumno', authMiddleware, requireRole(['profesor', 'admin']), async (req, res) => {
  const { id_clase, id_alumno } = req.params;
  try {
    const db = require('./config/db.js');
    const sql = `
      DELETE FROM clientes_clases
      WHERE id_clase = $1 AND id_cliente = $2
    `;
    const result = await db.pool.query(sql, [id_clase, id_alumno]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Inscripción no encontrada' });
    }
    res.json({ message: 'Alumno desvinculado de la clase exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al dar de baja al alumno', message: err.message });
  }
});

// Endpoints específicos para obtener los entrenamientos y alumnos asignados a un entrenador
app.get('/entrenador/entrenamientos', authMiddleware, requireRole(['entrenador', 'admin']), async (req, res) => {
  const idEntrenador = req.user.id_usuario;
  try {
    const db = require('./config/db.js');
    const sql = `
      SELECT e.id_entrenamiento, 'Entrenamiento' || ' ' || COALESCE(can.nombre, '') AS nombre, e.capacidad_max,
             can.nombre AS cancha_nombre, tc.tipo_cancha AS nivel,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin,
             to_char(oc.fecha, 'YYYY-MM-DD') AS fecha_turno,
             (SELECT COUNT(*)::int FROM clientes_entrenamientos WHERE id_entrenamiento = e.id_entrenamiento) AS inscriptos
      FROM entrenamientos e
      LEFT JOIN canchas can ON e.id_cancha = can.id_cancha
      LEFT JOIN tipos_de_cancha tc ON can.id_tipo_de_cancha = tc.id_tipo_de_cancha
      LEFT JOIN ocupaciones_cancha oc ON e.id_ocupacion_cancha = oc.id_ocupacion_cancha
      WHERE e.id_profesional = $1
    `;
    const rows = await db.query.all(sql, [idEntrenador]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los entrenamientos', message: err.message });
  }
});

app.get('/entrenador/entrenamientos/:id/alumnos', authMiddleware, requireRole(['entrenador', 'admin']), async (req, res) => {
  const idEntrenamiento = req.params.id;
  try {
    const db = require('./config/db.js');
    const sql = `
      SELECT u.id_usuario, u.nombre, u.apellido, u.dni, u.telefono,
             COALESCE(a.estado, 'Activo') AS asistencia
      FROM clientes_entrenamientos ce
      INNER JOIN usuarios u ON ce.id_cliente = u.id_usuario
      LEFT JOIN asistencias a ON ce.id_asistencia = a.id_asistencia
      WHERE ce.id_entrenamiento = $1
    `;
    const rows = await db.query.all(sql, [idEntrenamiento]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener alumnos del entrenamiento', message: err.message });
  }
});

app.delete('/entrenador/entrenamientos/:id_entrenamiento/alumnos/:id_alumno', authMiddleware, requireRole(['entrenador', 'admin']), async (req, res) => {
  const { id_entrenamiento, id_alumno } = req.params;
  try {
    const db = require('./config/db.js');
    const sql = `
      DELETE FROM clientes_entrenamientos
      WHERE id_entrenamiento = $1 AND id_cliente = $2
    `;
    const result = await db.pool.query(sql, [id_entrenamiento, id_alumno]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Inscripción no encontrada' });
    }
    res.json({ message: 'Alumno desvinculado del entrenamiento exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al dar de baja al alumno', message: err.message });
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
const staticOptions = {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
};
app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/app', express.static(path.join(__dirname, 'public'), staticOptions));

// Rutas amigables para el login / acceder del frontend
app.get(['/acceder', '/Acceder', '/login'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/acceder.html'));
});

// Rutas amigables para la navegación del panel administrativo
app.get(['/admin/RegistrarCancha', '/admin/RegistrarCancha.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/RegistrarCancha.html'));
});

app.get(['/admin/RegistrarCliente', '/admin/RegistrarCliente.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/RegistrarCliente.html'));
});

app.get(['/admin/ConsultaClientes', '/admin/ConsultaClientes.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/ConsultaClientes.html'));
});

app.get(['/admin/RegistrarTipoDeCancha', '/admin/RegistrarTipoDeCancha.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/RegistrarTipoDeCancha.html'));
});

// Rutas amigables para los paneles de profesores y entrenadores
app.get(['/profesor', '/Profesor', '/pages/interfazProfesor.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/interfazProfesor.html'));
});

app.get(['/entrenador', '/Entrenador', '/pages/interfazEntrenador.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/interfazEntrenador.html'));
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
//rutas amigables para listar mis reservas
// Ruta amigable para que el cliente acceda a "mis reservas"
app.get(['/misReservas', '/misReservas.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/misReservas.html'));
});

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
