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
const multer = require('multer');
const fs = require('fs');

function parseMatriculaCertificacion(matricula) {
  const texto = (matricula || '').trim();
  const match = texto.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (match) return { nombre: match[1].trim(), institucion: match[2].trim() };
  return { nombre: texto || 'Certificación', institucion: '—' };
}

// Configuración de almacenamiento para certificaciones de profesores/entrenadores
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './public/uploads';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar Middlewares globales
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/css', express.static(path.join(__dirname, 'public/pages/css')));
app.use('/js', express.static(path.join(__dirname, 'public/pages/js')));
app.use('/img', express.static(path.join(__dirname, 'public/pages/img')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Primero las rutas HTML (sin autenticación)
app.get(['/admin', '/Admin'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/InterfazAdministrador.html'));
});
app.get(['/admin/verCanchas', '/admin/VerCanchas'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/verCanchas.html'));
});
app.get(['/admin/ListarTiposCanchas'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/ListarTiposCanchas.html'));
});
app.get(['/admin/ListarReservas'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/ListarReservas.html'));
});
app.get(['/admin/RegistrarReserva'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/RegistrarReserva.html'));
});
app.get(['/admin/RegistrarProfesional'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/RegistrarProfesional.html'));
});
app.get(['/admin/ListarProfesionales'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/ListarProfesionales.html'));
});
app.get(['/admin/ConsultaClientes'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/ConsultaClientes.html'));
});
app.get(['/admin/RegistrarCancha', '/admin/RegistrarCancha.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/RegistrarCancha.html'));
});
app.get(['/admin/RegistrarCliente', '/admin/RegistrarCliente.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/RegistrarCliente.html'));
});
app.get(['/admin/RegistrarTipoDeCancha', '/admin/RegistrarTipoDeCancha.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/RegistrarTipoDeCancha.html'));
});

// Rutas de páginas HTML administrativas (registradas con Regex estrictos sensibles a mayúsculas para evitar colisión de nombres con la API)
app.get(/^\/admin\/Clases$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/Clases.html'));
});
app.get(/^\/admin\/Entrenamientos$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/Entrenamientos.html'));
});
app.get(/^\/admin\/Ligas$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/Ligas.html'));
});
app.get(/^\/admin\/Torneos$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/Torneos.html'));
});
app.get(/^\/admin\/Descuentos$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/Descuentos.html'));
});
app.get(/^\/admin\/Cobros$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/Cobros.html'));
});

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

app.get('/api/generos/con-id', async (req, res) => {
  try {
    const db = require('./config/db.js');
    const rows = await db.query.all('SELECT id_genero, genero FROM generos ORDER BY genero ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar géneros', message: err.message });
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

const listarCompetenciasTutor = async (idUsuario) => {
  const db = require('./config/db.js');
  const ligasSql = `
    SELECT 'Liga' AS categoria, l.id_liga AS id, l.nombre,
           to_char(l.fecha_inicio, 'DD/MM/YYYY') AS fecha_encuentro,
           to_char(l.fecha_fin, 'DD/MM/YYYY') AS fecha_fin,
           CASE
             WHEN NOW() < l.fecha_inicio THEN 'Programado'
             WHEN NOW() BETWEEN l.fecha_inicio AND l.fecha_fin THEN 'En curso'
             ELSE 'Finalizado'
           END AS estado,
           (SELECT COUNT(*)::int FROM participacion_ligas pl WHERE pl.id_liga = l.id_liga) AS participantes
    FROM ligas l
    WHERE l.id_usuario_tutor = $1
    ORDER BY l.fecha_inicio DESC
  `;
  const torneosSql = `
    SELECT 'Torneo' AS categoria, t.id_torneo AS id, t.nombre,
           to_char(t.fecha_inicio, 'DD/MM/YYYY') AS fecha_encuentro,
           to_char(t.fecha_fin, 'DD/MM/YYYY') AS fecha_fin,
           CASE
             WHEN NOW() < t.fecha_inicio THEN 'Programado'
             WHEN NOW() BETWEEN t.fecha_inicio AND t.fecha_fin THEN 'En curso'
             ELSE 'Finalizado'
           END AS estado,
           (SELECT COUNT(*)::int FROM participacion_torneos pt WHERE pt.id_torneo = t.id_torneo) AS participantes
    FROM torneos t
    WHERE t.id_usuario_tutor = $1
    ORDER BY t.fecha_inicio DESC
  `;
  const ligas = await db.query.all(ligasSql, [idUsuario]);
  const torneos = await db.query.all(torneosSql, [idUsuario]);
  return [...ligas, ...torneos];
};

app.get('/entrenador/competencias', authMiddleware, requireRole(['entrenador', 'admin']), async (req, res) => {
  try {
    const rows = await listarCompetenciasTutor(req.user.id_usuario);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar competencias del entrenador', message: err.message });
  }
});

app.get('/entrenador/competencias/:tipo/:id/planilla', authMiddleware, requireRole(['entrenador', 'admin']), async (req, res) => {
  const { tipo, id } = req.params;
  const idUsuario = req.user.id_usuario;
  try {
    const db = require('./config/db.js');
    if (tipo.toLowerCase() === 'liga') {
      const liga = await db.query.get(
        'SELECT id_liga FROM ligas WHERE id_liga = $1 AND id_usuario_tutor = $2',
        [id, idUsuario]
      );
      if (!liga) return res.status(404).json({ error: 'Liga no encontrada o sin permisos' });
      const equipos = await db.query.all(`
        SELECT e.id_equipo, e.nombre
        FROM participacion_ligas pl
        JOIN equipos e ON pl.id_equipo = e.id_equipo
        WHERE pl.id_liga = $1
        ORDER BY e.nombre ASC
      `, [id]);
      return res.json({ equipos });
    }
    const torneo = await db.query.get(
      'SELECT id_torneo FROM torneos WHERE id_torneo = $1 AND id_usuario_tutor = $2',
      [id, idUsuario]
    );
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado o sin permisos' });
    const equipos = await db.query.all(`
      SELECT e.id_equipo, e.nombre
      FROM participacion_torneos pt
      JOIN equipos e ON pt.id_equipo = e.id_equipo
      WHERE pt.id_torneo = $1
      ORDER BY e.nombre ASC
    `, [id]);
    res.json({ equipos });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener planilla', message: err.message });
  }
});

// --- ENDPOINTS DE API ADICIONALES PARA PROFESORES ---
app.get('/profesor/competencias', authMiddleware, requireRole(['profesor', 'admin']), async (req, res) => {
  try {
    const rows = await listarCompetenciasTutor(req.user.id_usuario);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar competencias del profesor', message: err.message });
  }
});

app.get('/profesor/competencias/:tipo/:id/planilla', authMiddleware, requireRole(['profesor', 'admin']), async (req, res) => {
  const { tipo, id } = req.params;
  const idUsuario = req.user.id_usuario;
  try {
    const db = require('./config/db.js');
    if (tipo.toLowerCase() === 'liga') {
      const liga = await db.query.get(
        'SELECT id_liga FROM ligas WHERE id_liga = $1 AND id_usuario_tutor = $2',
        [id, idUsuario]
      );
      if (!liga) return res.status(404).json({ error: 'Liga no encontrada o sin permisos' });
      const equipos = await db.query.all(`
        SELECT e.id_equipo, e.nombre
        FROM participacion_ligas pl
        JOIN equipos e ON pl.id_equipo = e.id_equipo
        WHERE pl.id_liga = $1
        ORDER BY e.nombre ASC
      `, [id]);
      return res.json({ equipos });
    }
    const torneo = await db.query.get(
      'SELECT id_torneo FROM torneos WHERE id_torneo = $1 AND id_usuario_tutor = $2',
      [id, idUsuario]
    );
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado o sin permisos' });
    const equipos = await db.query.all(`
      SELECT e.id_equipo, e.nombre
      FROM participacion_torneos pt
      JOIN equipos e ON pt.id_equipo = e.id_equipo
      WHERE pt.id_torneo = $1
      ORDER BY e.nombre ASC
    `, [id]);
    res.json({ equipos });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener planilla', message: err.message });
  }
});

app.post('/profesor/modificarPerfil', authMiddleware, requireRole(['profesor', 'admin']), async (req, res) => {
  const { telefono, email } = req.body;
  const idUsuario = req.user.id_usuario;
  try {
    const db = require('./config/db.js');
    await db.query.run('UPDATE usuarios SET telefono = $1, email = $2 WHERE id_usuario = $3', [telefono, email, idUsuario]);
    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar perfil', message: err.message });
  }
});

app.get('/profesor/certificaciones', authMiddleware, requireRole(['profesor', 'admin']), async (req, res) => {
  const idUsuario = req.user.id_usuario;
  try {
    const db = require('./config/db.js');
    const sql = `
      SELECT id_certificacion, matricula, to_char(fecha_caducidad, 'YYYY-MM-DD') AS fecha_caducidad, link_archivo, validada 
      FROM certificaciones 
      WHERE id_usuario = $1 AND tipo_certificacion = true
      ORDER BY id_certificacion DESC
    `;
    const rows = await db.query.all(sql, [idUsuario]);
    res.json(rows.map(r => {
      const parsed = parseMatriculaCertificacion(r.matricula);
      return {
        nombre: parsed.nombre,
        institucion: parsed.institucion,
        fecha_emision: r.fecha_caducidad,
        archivo_url: r.link_archivo,
        validada: r.validada
      };
    }));
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener certificaciones', message: err.message });
  }
});

app.post('/profesor/certificaciones/alta', authMiddleware, requireRole(['profesor', 'admin']), upload.single('archivo'), async (req, res) => {
  const { nombre, institucion, fecha_emision } = req.body;
  const idUsuario = req.user.id_usuario;
  const link_archivo = req.file ? `/uploads/${req.file.filename}` : '';
  try {
    const db = require('./config/db.js');
    const sql = `
      INSERT INTO certificaciones (tipo_certificacion, matricula, fecha_caducidad, link_archivo, id_usuario, validada)
      VALUES (true, $1, $2, $3, $4, false)
      RETURNING id_certificacion
    `;
    const matricula = `${nombre} (${institucion})`;
    const result = await db.query.run(sql, [matricula, fecha_emision, link_archivo, idUsuario]);
    res.status(201).json({ message: 'Certificación registrada con éxito', id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar certificación', message: err.message });
  }
});

app.post('/profesor/baja', authMiddleware, requireRole(['profesor', 'admin']), async (req, res) => {
  res.json({ message: 'Solicitud de baja registrada correctamente' });
});

// --- ENDPOINTS DE API ADICIONALES PARA ENTRENADORES ---
app.post('/entrenador/modificarPerfil', authMiddleware, requireRole(['entrenador', 'admin']), async (req, res) => {
  const { telefono, email } = req.body;
  const idUsuario = req.user.id_usuario;
  try {
    const db = require('./config/db.js');
    await db.query.run('UPDATE usuarios SET telefono = $1, email = $2 WHERE id_usuario = $3', [telefono, email, idUsuario]);
    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar perfil', message: err.message });
  }
});

app.get('/entrenador/certificaciones', authMiddleware, requireRole(['entrenador', 'admin']), async (req, res) => {
  const idUsuario = req.user.id_usuario;
  try {
    const db = require('./config/db.js');
    const sql = `
      SELECT id_certificacion, matricula, to_char(fecha_caducidad, 'YYYY-MM-DD') AS fecha_caducidad, link_archivo, validada 
      FROM certificaciones 
      WHERE id_usuario = $1 AND tipo_certificacion = false
      ORDER BY id_certificacion DESC
    `;
    const rows = await db.query.all(sql, [idUsuario]);
    res.json(rows.map(r => {
      const parsed = parseMatriculaCertificacion(r.matricula);
      return {
        nombre: parsed.nombre,
        institucion: parsed.institucion,
        fecha_emision: r.fecha_caducidad,
        archivo_url: r.link_archivo,
        validada: r.validada
      };
    }));
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener certificaciones', message: err.message });
  }
});

app.post('/entrenador/certificaciones/alta', authMiddleware, requireRole(['entrenador', 'admin']), upload.single('archivo'), async (req, res) => {
  const { nombre, institucion, fecha_emision } = req.body;
  const idUsuario = req.user.id_usuario;
  const link_archivo = req.file ? `/uploads/${req.file.filename}` : '';
  try {
    const db = require('./config/db.js');
    const sql = `
      INSERT INTO certificaciones (tipo_certificacion, matricula, fecha_caducidad, link_archivo, id_usuario, validada)
      VALUES (false, $1, $2, $3, $4, false)
      RETURNING id_certificacion
    `;
    const matricula = `${nombre} (${institucion})`;
    const result = await db.query.run(sql, [matricula, fecha_emision, link_archivo, idUsuario]);
    res.status(201).json({ message: 'Certificación registrada con éxito', id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar certificación', message: err.message });
  }
});

app.post('/entrenador/baja', authMiddleware, requireRole(['entrenador', 'admin']), async (req, res) => {
  res.json({ message: 'Solicitud de baja registrada correctamente' });
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

// Función para limpiar reservas pendientes de pago en efectivo expiradas (más de 1 minuto)
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
        AND c.fecha < NOW() - INTERVAL '1 minute'
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
              detalles = detalles || ' (Cancelado automáticamente por falta de pago tras 1 minuto)' 
          WHERE id_cobro = $1
        `, [res.id_cobro]);
        
        await db.pool.query('COMMIT');
      }
      console.log(`[Limpieza] ${expired.length} reservas en efectivo vencidas canceladas y turnos liberados.`);
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
app.get(['/misPagos', '/misPagos.html', '/cliente/misPagos'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/misPagos.html'));
});

// Rutas amigables adicionales del cliente
app.get(['/cliente', '/cliente/dashboard', '/pages/interfazCliente.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/interfazCliente.html'));
});
app.get(['/cliente/tipos-cancha', '/pages/listarTiposCanchaCliente.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/listarTiposCanchaCliente.html'));
});
app.get(['/cliente/canchas', '/pages/listarCanchasCliente.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/listarCanchasCliente.html'));
});
app.get(['/cliente/seleccionarFechaHora', '/pages/seleccionarFechaHora.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/seleccionarFechaHora.html'));
});
app.get(['/cliente/confirmarReserva', '/pages/confirmarReservaCliente.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/confirmarReservaCliente.html'));
});
app.get(['/cliente/misClases', '/pages/misClases.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/misClases.html'));
});
app.get(['/cliente/misEntrenamientos', '/pages/misEntrenamientos.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/misEntrenamientos.html'));
});
app.get(['/registro', '/pages/registro.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/registro.html'));
});

// Rutas amigables adicionales del profesor
app.get(['/profesor/perfil', '/pages/perfilProfesor.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/perfilProfesor.html'));
});
app.get(['/profesor/certificaciones', '/pages/certificacionesProfesor.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/certificacionesProfesor.html'));
});

// Rutas amigables adicionales del entrenador
app.get(['/entrenador/perfil', '/pages/perfilEntrenador.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/perfilEntrenador.html'));
});
app.get(['/entrenador/certificaciones', '/pages/certificacionesEntrenador.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/certificacionesEntrenador.html'));
});
app.get(['/entrenador/gestionEntrenamiento', '/pages/gestionEntrenamiento.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/gestionEntrenamiento.html'));
});
app.get(['/entrenador/gestionLigas', '/pages/gestionLigas.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/gestionLigas.html'));
});
app.get(['/entrenador/gestionLigasTorneos', '/pages/gestionLigasTorneos.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/gestionLigasTorneos.html'));
});

app.get('/api/superficies', async (req, res) => {
  try {
    const db = require('./config/db.js');
    const rows = await db.query.all('SELECT id_superficie, tipo_superficie FROM superficies ORDER BY id_superficie ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar superficies', message: err.message });
  }
});

// Inicializar base de datos y levantar el servidor
const startServer = async () => {
  await initDatabase();
  
  // Ejecutar limpieza cada 60 segundos
  setInterval(cleanupExpiredReservations, 180000);
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
