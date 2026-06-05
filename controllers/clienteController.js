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
    const reserva = await db.query.get('SELECT r.id_ocupacion_cancha, r.id_cobro, oc.fecha, oc.hora_inicio FROM reservas r INNER JOIN ocupaciones_cancha oc ON r.id_ocupacion_cancha = oc.id_ocupacion_cancha WHERE r.id_reserva = $1 AND r.id_usuario = $2', [id, idUsuario]);
    await db.pool.query('BEGIN');
    await db.pool.query('DELETE FROM reservas WHERE id_reserva = $1', [id]);
    await db.pool.query('DELETE FROM ocupaciones_cancha WHERE id_ocupacion_cancha = $1', [reserva.id_ocupacion_cancha]);
    await db.pool.query('UPDATE cobros SET id_estado_cobro = 3 WHERE id_cobro = $1', [reserva.id_cobro]);
    await db.pool.query('COMMIT');
    res.json({ message: 'Cancelado' });
  } catch (err) { await db.pool.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
};

const listarReservasCliente = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  try {
    const rows = await db.query.all('SELECT r.id_reserva, r.fecha_reserva, r.hora_inicio, r.hora_fin, c.nombre AS nombre_cancha, tc.tipo_cancha, r.estado FROM reservas r JOIN canchas c ON r.id_cancha = c.id_cancha JOIN tipos_de_cancha tc ON c.id_tipo_de_cancha = tc.id_tipo_de_cancha WHERE r.id_cliente = $1 ORDER BY r.fecha_reserva DESC', [idUsuario]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- PAGOS Y RECIBOS ---
const listarMisPagos = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  try {
    const rows = await db.query.all('SELECT cob.id_cobro AS id, cob.monto, to_char(cob.fecha, \'DD/MM/YYYY HH24:MI\') AS fecha_pago, ec.estado AS estado, mp.nombre AS metodo FROM cobros cob LEFT JOIN estados_cobro ec ON cob.id_estado_cobro = ec.id_estado_cobro LEFT JOIN metodos_de_pago mp ON cob.id_metodo_de_pago = mp.id_metodo_de_pago WHERE cob.id_usuario = $1 ORDER BY cob.fecha DESC', [idUsuario]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const consultarMiPago = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;
  try {
    const details = await db.query.get('SELECT cob.id_cobro AS id, cob.monto, cob.detalles AS comprobante_info, ec.estado AS estado, mp.nombre AS metodo, can.nombre AS cancha_reservada, to_char(oc.fecha, \'DD/MM/YYYY\') AS fecha_turno, to_char(oc.hora_inicio, \'HH24:MI\') AS hora_inicio FROM cobros cob LEFT JOIN estados_cobro ec ON cob.id_estado_cobro = ec.id_estado_cobro LEFT JOIN metodos_de_pago mp ON cob.id_metodo_de_pago = mp.id_metodo_de_pago LEFT JOIN reservas res ON cob.id_cobro = res.id_cobro LEFT JOIN canchas can ON res.id_cancha = can.id_cancha LEFT JOIN ocupaciones_cancha oc ON res.id_ocupacion_cancha = oc.id_ocupacion_cancha WHERE cob.id_cobro = $1 AND cob.id_usuario = $2', [id, idUsuario]);
    res.json(details);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const listarMisRecibos = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  try {
    const rows = await db.query.all('SELECT r.id_recibos AS id, r.nro_transaccion, to_char(r.fecha, \'DD/MM/YYYY HH24:MI\') AS fecha, c.monto FROM recibos r INNER JOIN cobros c ON r.id_cobro = c.id_cobro WHERE c.id_usuario = $1 ORDER BY r.fecha DESC', [idUsuario]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const consultarMiRecibo = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;
  try {
    const details = await db.query.get('SELECT r.id_recibos AS id, r.nro_transaccion, to_char(r.fecha, \'DD/MM/YYYY HH24:MI\') AS fecha_emision, r.detalles AS detalles_recibo, c.monto, c.detalles AS detalles_cobro FROM recibos r INNER JOIN cobros c ON r.id_cobro = c.id_cobro WHERE r.id_recibos = $1 AND c.id_usuario = $2', [id, idUsuario]);
    res.json(details);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const realizarPago = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;
  try {
    await db.pool.query('BEGIN');
    await db.pool.query('UPDATE cobros SET id_estado_cobro = 2 WHERE id_cobro = $1 AND id_usuario = $2', [id, idUsuario]);
    await db.pool.query('INSERT INTO recibos (nro_transaccion, detalles, id_cobro) VALUES ($1, $2, $3)', [`TRANS_${Date.now()}`, 'Pago realizado', id]);
    await db.pool.query('COMMIT');
    res.status(201).json({ message: 'Pagado' });
  } catch (err) { await db.pool.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
};

// --- INSCRIPCIONES ---
const inscribirClase = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id_clase } = req.body;
  try { await db.query.run('INSERT INTO clientes_clases (id_cliente, id_clase, id_asistencia) VALUES ($1, $2, 2)', [idUsuario, id_clase]); res.status(201).json({ message: 'Inscrito' }); } catch (err) { res.status(500).json({ error: err.message }); }
};

const darBajaClase = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;
  try { await db.pool.query('DELETE FROM clientes_clases WHERE id_clase = $1 AND id_cliente = $2', [id, idUsuario]); res.json({ message: 'Baja exitosa' }); } catch (err) { res.status(500).json({ error: err.message }); }
};

const inscribirEntrenamiento = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id_entrenamiento } = req.body;
  try { await db.query.run('INSERT INTO clientes_entrenamientos (id_cliente, id_entrenamiento, id_asistencia) VALUES ($1, $2, 2)', [idUsuario, id_entrenamiento]); res.status(201).json({ message: 'Inscrito' }); } catch (err) { res.status(500).json({ error: err.message }); }
};

const darBajaEntrenamiento = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;
  try { await db.pool.query('DELETE FROM clientes_entrenamientos WHERE id_entrenamiento = $1 AND id_cliente = $2', [id, idUsuario]); res.json({ message: 'Baja exitosa' }); } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = {
  obtenerPerfil, modificarPerfil, listarCanchasCliente, realizarReserva, modificarReserva, cancelarReserva, listarMisPagos, consultarMiPago, listarMisRecibos, consultarMiRecibo, inscribirClase, darBajaClase, inscribirEntrenamiento, darBajaEntrenamiento, realizarPago
};
