const db = require('../config/db.js');

// GET /admin/clientes (Listar todos los clientes)
const listarClientes = async (req, res) => {
  try {
    const sql = `
      SELECT u.id_usuario, u.id_usuario AS id, u.username, u.user_level, u.nombre, u.apellido, u.email, u.dni, u.telefono, u.fecha_nacimiento, u.fecha_registro,
             g.genero AS genero, pa.nombre AS nacionalidad,
             d.calle, d.numero, d.codigo_postal, loc.nombre AS localidad, prov.nombre AS provincia
      FROM usuarios u
      LEFT JOIN generos g ON u.id_genero = g.id_genero
      LEFT JOIN paises pa ON u.id_nacionalidad = pa.id_pais
      LEFT JOIN direcciones d ON u.id_direccion = d.id_direccion
      LEFT JOIN localidades loc ON d.id_localidad = loc.id_localidad
      LEFT JOIN ciudades c ON loc.id_ciudad = c.id_ciudad
      LEFT JOIN provincias prov ON c.id_provincia = prov.id_provincia
      WHERE u.user_level = 1
      ORDER BY u.id_usuario ASC
    `;
    const clients = await db.query.all(sql);
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar clientes', message: err.message });
  }
};

// GET /admin/clientes/:id
const obtenerCliente = async (req, res) => {
  const { id } = req.params;
  try {
    const sql = `
      SELECT u.id_usuario, u.id_usuario AS id, u.user_level, u.username, u.nombre, u.apellido, u.email, u.fecha_nacimiento, 
             u.dni, u.telefono, u.fecha_registro, g.genero AS genero, pa.nombre AS nacionalidad,
             d.calle, d.numero, d.codigo_postal, loc.nombre AS localidad, prov.nombre AS provincia
      FROM usuarios u
      LEFT JOIN generos g ON u.id_genero = g.id_genero
      LEFT JOIN paises pa ON u.id_nacionalidad = pa.id_pais
      LEFT JOIN direcciones d ON u.id_direccion = d.id_direccion
      LEFT JOIN localidades loc ON d.id_localidad = loc.id_localidad
      LEFT JOIN ciudades c ON loc.id_ciudad = c.id_ciudad
      LEFT JOIN provincias prov ON c.id_provincia = prov.id_provincia
      WHERE u.id_usuario = $1
    `;
    const client = await db.query.get(sql, [id]);
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ficha de cliente', message: err.message });
  }
};

// PUT /admin/clientes/:id
const actualizarCliente = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, email, telefono, user_level } = req.body;
  try {
    const sql = `
      UPDATE usuarios
      SET nombre = $1, apellido = $2, email = $3, telefono = $4, user_level = $5
      WHERE id_usuario = $6
    `;
    await db.query.run(sql, [nombre, apellido, email, telefono, user_level, id]);
    res.json({ message: 'Cliente actualizado correctamente por el Administrador' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el cliente', message: err.message });
  }
};

// DELETE /admin/clientes/:id
const eliminarCliente = async (req, res) => {
  const { id } = req.params;
  try {
    await db.pool.query('BEGIN');
    // Eliminar relaciones secundarias si existen
    await db.pool.query('DELETE FROM clientes_clases WHERE id_cliente = $1', [id]);
    await db.pool.query('DELETE FROM clientes_entrenamientos WHERE id_cliente = $1', [id]);
    await db.pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);
    await db.pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar cliente', message: err.message });
  }
};

// POST /admin/profesores
const registrarProfesor = async (req, res) => {
  const { username, nombre, apellido, email, password, fecha_nacimiento, dni, telefono } = req.body;
  try {
    const sql = `
      INSERT INTO usuarios (
        username, user_level, nombre, apellido, email, password, 
        fecha_nacimiento, dni, telefono, id_direccion, id_genero, id_nacionalidad, id_club
      ) VALUES ($1, 10, $2, $3, $4, $5, $6, $7, $8, 1, 1, 1, 1) -- user_level = 10 (Profesor)
      RETURNING id_usuario
    `;
    const result = await db.query.run(sql, [
      username, nombre, apellido, email, password || 'temp_pass',
      fecha_nacimiento || '1985-01-01', dni, telefono || '-'
    ]);
    res.status(201).json({ message: 'Profesor registrado', id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar profesor', message: err.message });
  }
};

// GET /admin/profesores
const listarProfesores = async (req, res) => {
  try {
    const rows = await db.query.all(`SELECT id_usuario AS id, nombre, apellido, email, dni FROM usuarios WHERE user_level = 10`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar profesores', message: err.message });
  }
};

// POST /admin/profesores/:id/certificaciones
const registrarCertificacion = async (req, res) => {
  const { id } = req.params;
  const { tipo_certificacion, matricula, fecha_caducidad, link_archivo } = req.body;
  try {
    const sql = `
      INSERT INTO certificaciones (tipo_certificacion, matricula, fecha_caducidad, link_archivo, id_usuario)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_certificacion
    `;
    const result = await db.query.run(sql, [tipo_certificacion, matricula, fecha_caducidad, link_archivo, id]);
    res.status(201).json({ message: 'Certificación registrada con éxito', id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar certificación', message: err.message });
  }
};

// POST /admin/canchas (CRUD Canchas)
const crearCancha = async (req, res) => {
  const { nombre, tiempo_cancelacion, precio_hora_reserva, id_tipo_de_cancha } = req.body;
  try {
    const sql = `
      INSERT INTO canchas (nombre, tiempo_cancelacion, precio_hora_reserva, id_tipo_de_cancha, id_club)
      VALUES ($1, $2, $3, $4, 1)
      RETURNING id_cancha
    `;
    const result = await db.query.run(sql, [nombre, tiempo_cancelacion, precio_hora_reserva, id_tipo_de_cancha]);
    res.status(201).json({ message: 'Cancha física creada correctamente', id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear cancha', message: err.message });
  }
};

// POST /admin/canchas/bloqueo (Mantenimiento de canchas)
const bloquearCanchaMantenimiento = async (req, res) => {
  const { id_cancha, fecha, hora_inicio, hora_fin, motivo } = req.body;
  try {
    await db.pool.query('BEGIN');
    // 1. Crear ocupación de tipo Mantenimiento (id_tipo_ocupacion = 6)
    const ocupacionSql = `
      INSERT INTO ocupaciones_cancha (fecha, hora_inicio, hora_fin, id_tipo_ocupacion, id_cancha)
      VALUES ($1, $2, $3, 6, $4)
      RETURNING id_ocupacion_cancha
    `;
    const result = await db.pool.query(ocupacionSql, [fecha, hora_inicio, hora_fin, id_cancha]);
    const idOcupacion = result.rows[0].id_ocupacion_cancha;

    // 2. Opcional: registrar en tabla de excepciones de disponibilidad
    const excepcionSql = `
      INSERT INTO disponibilidad_excepciones (motivo, dia, hora_inicio, hora_fin, id_cancha)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await db.pool.query(excepcionSql, [motivo || 'Mantenimiento preventivo', fecha, hora_inicio, hora_fin, id_cancha]);

    await db.pool.query('COMMIT');
    res.status(201).json({ message: 'Cancha bloqueada por mantenimiento correctamente', id_ocupacion: idOcupacion });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al registrar bloqueo por mantenimiento', message: err.message });
  }
};

// POST /admin/ligas (Gestión de Competencias)
const crearLiga = async (req, res) => {
  const { nombre, fecha_inicio, fecha_fin, id_usuario_tutor } = req.body;
  try {
    const sql = `
      INSERT INTO ligas (nombre, fecha_inicio, fecha_fin, id_usuario_tutor, id_club, id_estado)
      VALUES ($1, $2, $3, $4, 1, 1) -- id_estado = 1 ('Programado')
      RETURNING id_liga
    `;
    const result = await db.query.run(sql, [nombre, fecha_inicio, fecha_fin, id_usuario_tutor]);
    res.status(201).json({ message: 'Liga deportiva creada', id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la liga', message: err.message });
  }
};

// GET /admin/reportes/ingresos (Reporte Estadístico Avanzado)
const reporteFinanciero = async (req, res) => {
  try {
    const sql = `
      SELECT ec.estado, COUNT(cob.id_cobro) AS total_operaciones, SUM(cob.monto) AS ingresos_totales
      FROM cobros cob
      LEFT JOIN estados_cobro ec ON cob.id_estado_cobro = ec.id_estado_cobro
      GROUP BY ec.estado
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al generar el reporte financiero', message: err.message });
  }
};

module.exports = {
  listarClientes,
  obtenerCliente,
  actualizarCliente,
  eliminarCliente,
  registrarProfesor,
  listarProfesores,
  registrarCertificacion,
  crearCancha,
  bloquearCanchaMantenimiento,
  crearLiga,
  reporteFinanciero
};
