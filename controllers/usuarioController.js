const db = require('../config/db.js');

// POST /usuario/registro
const registrarUsuario = async (req, res) => {
  const { 
    calle, numero, codigo_postal, id_localidad,
    username, nombre, apellido, email, password, fecha_nacimiento, dni, telefono, id_genero, id_nacionalidad, id_club
  } = req.body;

  if (!calle || !numero || !codigo_postal || !id_localidad || !nombre || !apellido || !email || !dni) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para registrar la dirección y el usuario' });
  }

  try {
    // 1. Insertar la dirección primero
    const dirSql = `
      INSERT INTO direcciones (calle, numero, codigo_postal, id_localidad) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id_direccion
    `;
    const dirResult = await db.query.run(dirSql, [calle, numero, codigo_postal, id_localidad]);
    const idDireccion = dirResult.id;

    // 2. Insertar/registrar al cliente (user_level = 1)
    const userSql = `
      INSERT INTO usuarios (
        username, user_level, nombre, apellido, email, password, 
        fecha_nacimiento, dni, telefono, id_direccion, id_genero, id_nacionalidad, id_club
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id_usuario, username, nombre, apellido, email, id_direccion
    `;
    const userResult = await db.query.get(userSql, [
      username || `user_${Date.now()}`,
      1, // user_level = 1 para Clientes
      nombre,
      apellido,
      email,
      password || 'default_hashed_pass',
      fecha_nacimiento || '1990-01-01',
      dni,
      telefono || '-',
      idDireccion,
      id_genero || 1,
      id_nacionalidad || 1,
      id_club || 1
    ]);

    res.status(201).json({
      message: 'Cliente registrado exitosamente',
      usuario: userResult
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ 
        error: 'Datos duplicados', 
        details: 'El username, email o DNI ya se encuentra registrado en el complejo.' 
      });
    }
    res.status(500).json({ error: 'Error al registrar el cliente en la base de datos', message: err.message });
  }
};

// GET /usuario/canchas
const listarCanchas = async (req, res) => {
  try {
    const sql = `
      SELECT can.id_cancha AS id, can.nombre, 
             tc.tipo_cancha AS categoria, can.precio_hora_reserva AS precio, tc.imagen_url 
      FROM canchas can 
      LEFT JOIN tipos_de_cancha tc ON can.id_tipo_de_cancha = tc.id_tipo_de_cancha
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar las canchas', message: err.message });
  }
};

// GET /usuario/tipos-cancha
const listarTiposCancha = async (req, res) => {
  try {
    const sql = `
      SELECT id_tipo_de_cancha AS id, tipo_cancha AS categoria 
      FROM tipos_de_cancha
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar las categorías de canchas', message: err.message });
  }
};

// GET /usuario/canchas/disponibilidad
const consultarDisponibilidad = async (req, res) => {
  const { fecha, idTipoCancha } = req.query;
  if (!fecha) {
    return res.status(400).json({ error: 'Se requiere el parámetro "fecha" en formato YYYY-MM-DD' });
  }

  try {
    let sql = `
      SELECT oc.id_cancha, oc.hora_inicio, oc.hora_fin, c.nombre AS cancha_nombre, tc.tipo_cancha, oc.id_tipo_ocupacion
      FROM ocupaciones_cancha oc
      INNER JOIN canchas c ON oc.id_cancha = c.id_cancha
      INNER JOIN tipos_de_cancha tc ON c.id_tipo_de_cancha = tc.id_tipo_de_cancha
      WHERE oc.fecha = $1
    `;
    const params = [fecha];
    
    if (idTipoCancha) {
      sql += ` AND c.id_tipo_de_cancha = $2`;
      params.push(idTipoCancha);
    }

    const ocupaciones = await db.query.all(sql, params);
    res.json({
      fecha,
      ocupaciones
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar la disponibilidad', message: err.message });
  }
};

// GET /usuario/clases
const listarClasesPublicas = async (req, res) => {
  try {
    const sql = `
      SELECT c.id_clase AS id, c.nombre, c.capacidad_max,
             u.nombre AS profesor_nombre, u.apellido AS profesor_apellido,
             can.nombre AS cancha_nombre, oc.fecha, oc.hora_inicio, oc.hora_fin
      FROM clases c
      LEFT JOIN usuarios u ON c.id_profesional = u.id_usuario
      LEFT JOIN canchas can ON c.id_cancha = can.id_cancha
      LEFT JOIN ocupaciones_cancha oc ON c.id_ocupacion_cancha = oc.id_ocupacion_cancha
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar las clases públicas', message: err.message });
  }
};

// GET /usuario/entrenamientos
const listarEntrenamientosPublicos = async (req, res) => {
  try {
    const sql = `
      SELECT e.id_entrenamiento AS id, e.capacidad_max,
             u.nombre AS entrenador_nombre, u.apellido AS entrenador_apellido,
             can.nombre AS cancha_nombre, oc.fecha, oc.hora_inicio, oc.hora_fin
      FROM entrenamientos e
      LEFT JOIN usuarios u ON e.id_profesional = u.id_usuario
      LEFT JOIN canchas can ON e.id_cancha = can.id_cancha
      LEFT JOIN ocupaciones_cancha oc ON e.id_ocupacion_cancha = oc.id_ocupacion_cancha
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar los entrenamientos públicos', message: err.message });
  }
};

module.exports = {
  registrarUsuario,
  listarCanchas,
  listarTiposCancha,
  consultarDisponibilidad,
  listarClasesPublicas,
  listarEntrenamientosPublicos
};
