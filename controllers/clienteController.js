const db = require('../config/db.js');

// --- PERFIL ---
const obtenerPerfil = async (req, res) => {
  const idUsuario = req.user.id_usuario;
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
    const profile = await db.query.get(sql, [idUsuario]);
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar el perfil', message: err.message });
  }
};

const modificarPerfil = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { username, nombre, apellido, email, fecha_nacimiento, dni, telefono, id_genero, id_nacionalidad, calle, numero, codigo_postal, id_localidad } = req.body;
  try {
    await db.pool.query('BEGIN');
    const userSql = `UPDATE usuarios SET username = $1, nombre = $2, apellido = $3, email = $4, fecha_nacimiento = $5, dni = $6, telefono = $7, id_genero = $8, id_nacionalidad = $9 WHERE id_usuario = $10`;
    await db.pool.query(userSql, [username, nombre, apellido, email, fecha_nacimiento, dni, telefono, id_genero, id_nacionalidad, idUsuario]);
    const dirSql = `UPDATE direcciones SET calle = $1, numero = $2, codigo_postal = $3, id_localidad = $4 WHERE id_direccion = (SELECT id_direccion FROM usuarios WHERE id_usuario = $5)`;
    await db.pool.query(dirSql, [calle, numero, codigo_postal, id_localidad, idUsuario]);
    await db.pool.query('COMMIT');
    res.json({ message: 'Perfil y dirección actualizados exitosamente' });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al actualizar el perfil', message: err.message });
  }
};

// --- CANCHAS Y RESERVAS ---
const listarCanchasCliente = async (req, res) => {
  const { idTipoCancha } = req.query;
  try {
    let sql = `SELECT can.id_cancha AS id, can.nombre, tc.tipo_cancha AS categoria, can.precio_hora_reserva AS precio, tc.imagen_url FROM canchas can LEFT JOIN tipos_de_cancha tc ON can.id_tipo_de_cancha = tc.id_tipo_de_cancha`;
    const params = [];
    if (idTipoCancha) { sql += ' WHERE can.id_tipo_de_cancha = $1'; params.push(idTipoCancha); }
    const canchas = await db.query.all(sql, params);
    res.json(canchas);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar canchas', message: err.message });
  }
};

const realizarReserva = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id_cancha, fecha, hora_inicio, hora_fin, id_metodo_de_pago, monto } = req.body;
  try {
    await db.pool.query('BEGIN');
    const cobroRes = await db.pool.query('INSERT INTO cobros (monto, porcentaje_descuento, detalles, id_club, id_usuario, id_estado_cobro, id_metodo_de_pago) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_cobro', [monto, 0, `Reserva para ${fecha}`, 1, idUsuario, 1, id_metodo_de_pago]);
    const idCobro = cobroRes.rows[0].id_cobro;
    const ocupacionRes = await db.pool.query('INSERT INTO ocupaciones_cancha (fecha, hora_inicio, hora_fin, id_tipo_ocupacion, id_cancha) VALUES ($1, $2, $3, $4, $5) RETURNING id_ocupacion_cancha', [fecha, hora_inicio, hora_fin, 1, id_cancha]);
    const idOcupacion = ocupacionRes.rows[0].id_ocupacion_cancha;
    const reservaRes = await db.pool.query('INSERT INTO reservas (id_ocupacion_cancha, id_usuario, id_cancha, id_cobro) VALUES ($1, $2, $3, $4) RETURNING id_reserva', [idOcupacion, idUsuario, id_cancha, idCobro]);
    await db.pool.query('COMMIT');
    res.status(201).json({ message: 'Reserva creada', id_reserva: reservaRes.rows[0].id_reserva });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al procesar reserva', message: err.message });
  }
};

const modificarReserva = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;
  const { fecha, hora_inicio, hora_fin } = req.body;
  try {
    const result = await db.pool.query('UPDATE ocupaciones_cancha SET fecha=$1, hora_inicio=$2, hora_fin=$3 FROM reservas r WHERE ocupaciones_cancha.id_ocupacion_cancha = r.id_ocupacion_cancha AND r.id_reserva=$4 AND r.id_usuario=$5', [fecha, hora_inicio, hora_fin, id, idUsuario]);
    res.json({ message: 'Modificado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const cancelarReserva = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;
  try {
    const reserva = await db.query.get
