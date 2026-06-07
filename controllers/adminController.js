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
      WHERE u.user_level = 'cliente'
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

  const rolesValidos = ['administrador', 'profesor', 'entrenador', 'cliente'];
  if (user_level && !rolesValidos.includes(user_level)) {
    return res.status(400).json({ 
      error: 'Rol inválido', 
      details: 'El user_level debe ser uno de: administrador, profesor, entrenador, cliente' 
    });
  }

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

    // 1. Obtener los ids de ocupaciones y cobros asociados a las reservas de este cliente
    const resReservas = await db.pool.query(
      'SELECT id_ocupacion_cancha, id_cobro FROM reservas WHERE id_usuario = $1',
      [id]
    );
    const ocupacionIds = resReservas.rows.map(r => r.id_ocupacion_cancha).filter(Boolean);
    const cobroIdsFromReservas = resReservas.rows.map(r => r.id_cobro).filter(Boolean);

    // 2. Eliminar las reservas
    await db.pool.query('DELETE FROM reservas WHERE id_usuario = $1', [id]);

    // 3. Eliminar las ocupaciones de cancha asociadas a las reservas
    if (ocupacionIds.length > 0) {
      await db.pool.query(
        'DELETE FROM ocupaciones_cancha WHERE id_ocupacion_cancha = ANY($1::int[])',
        [ocupacionIds]
      );
    }

    // 4. Obtener todos los cobros de este usuario (incluyendo los que no están en reservas)
    const resCobros = await db.pool.query(
      'SELECT id_cobro FROM cobros WHERE id_usuario = $1',
      [id]
    );
    const allCobroIds = [...new Set([
      ...resCobros.rows.map(c => c.id_cobro),
      ...cobroIdsFromReservas
    ])].filter(Boolean);

    // 5. Eliminar recibos asociados a esos cobros
    if (allCobroIds.length > 0) {
      await db.pool.query(
        'DELETE FROM recibos WHERE id_cobro = ANY($1::int[])',
        [allCobroIds]
      );
    }

    // 6. Eliminar cobros
    await db.pool.query('DELETE FROM cobros WHERE id_usuario = $1', [id]);

    // 7. Eliminar inscripciones de clases y entrenamientos
    await db.pool.query('DELETE FROM clientes_clases WHERE id_cliente = $1', [id]);
    await db.pool.query('DELETE FROM clientes_entrenamientos WHERE id_cliente = $1', [id]);

    // 8. Eliminar certificaciones si las tuviera
    await db.pool.query('DELETE FROM certificaciones WHERE id_usuario = $1', [id]);

    // 9. Eliminar al usuario
    await db.pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);

    await db.pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar cliente', message: err.message });
  }
};

// POST /admin/usuarios/registrar
const registrarUsuarioPorAdmin = async (req, res) => {
  const { 
    username, user_level, nombre, apellido, email, password, fecha_nacimiento, dni, telefono,
    calle, numero, codigo_postal, localidad
  } = req.body;

  const rolesValidos = ['administrador', 'profesor', 'entrenador', 'cliente'];
  if (!user_level || !rolesValidos.includes(user_level)) {
    return res.status(400).json({ 
      error: 'Rol inválido', 
      details: 'El user_level debe ser uno de: administrador, profesor, entrenador, cliente' 
    });
  }

  const finalUsername = username || (email ? email.split('@')[0] : `user_${Date.now()}`);

  try {
    await db.pool.query('BEGIN');

    // 1. Resolver el id_localidad de la tabla localidades
    let idLocalidad = 1;
    if (localidad) {
      const locName = localidad.trim();
      const existingLoc = await db.query.get(
        'SELECT id_localidad FROM localidades WHERE LOWER(nombre) = LOWER($1)',
        [locName]
      );
      if (existingLoc) {
        idLocalidad = existingLoc.id_localidad;
      } else {
        const insertLoc = await db.pool.query(
          'INSERT INTO localidades (nombre, id_ciudad) VALUES ($1, 1) RETURNING id_localidad',
          [locName]
        );
        idLocalidad = insertLoc.rows[0].id_localidad;
      }
    }

    // 2. Insertar la dirección
    const dirSql = `
      INSERT INTO direcciones (calle, numero, codigo_postal, id_localidad) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id_direccion
    `;
    const dirResult = await db.pool.query(dirSql, [
      calle || 'Calle Ficticia', 
      numero || '123', 
      codigo_postal || '1888', 
      idLocalidad
    ]);
    const idDireccion = dirResult.rows[0].id_direccion;

    // 3. Insertar/registrar al usuario con el rol elegido
    const userSql = `
      INSERT INTO usuarios (
        username, user_level, nombre, apellido, email, password, 
        fecha_nacimiento, dni, telefono, id_direccion, id_genero, id_nacionalidad, id_club
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 1, 1)
      RETURNING id_usuario, username, nombre, apellido, email, user_level
    `;
    const insertResult = await db.query.get(userSql, [
      finalUsername,
      user_level,
      nombre,
      apellido,
      email,
      password || 'temp_pass',
      fecha_nacimiento || '1985-01-01',
      dni || `DNI_${Date.now()}`,
      telefono || '-',
      idDireccion
    ]);

    await db.pool.query('COMMIT');

    res.status(201).json({
      message: `Usuario registrado exitosamente con rol: ${user_level}`,
      usuario: insertResult
    });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al registrar el usuario', message: err.message });
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
      ) VALUES ($1, 'profesor', $2, $3, $4, $5, $6, $7, $8, 1, 1, 1, 1) -- user_level = 'profesor'
      RETURNING id_usuario
    `;
    const result = await db.query.run(sql, [
      username || `prof_${Date.now()}`, nombre, apellido, email, password || 'temp_pass',
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
    const rows = await db.query.all(`SELECT id_usuario AS id, nombre, apellido, email, dni FROM usuarios WHERE user_level = 'profesor'`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar profesores', message: err.message });
  }
};

// POST /admin/entrenadores
const registrarEntrenador = async (req, res) => {
  const { username, nombre, apellido, email, password, fecha_nacimiento, dni, telefono } = req.body;
  try {
    const sql = `
      INSERT INTO usuarios (
        username, user_level, nombre, apellido, email, password, 
        fecha_nacimiento, dni, telefono, id_direccion, id_genero, id_nacionalidad, id_club
      ) VALUES ($1, 'entrenador', $2, $3, $4, $5, $6, $7, $8, 1, 1, 1, 1) -- user_level = 'entrenador'
      RETURNING id_usuario
    `;
    const result = await db.query.run(sql, [
      username || `trainer_${Date.now()}`, nombre, apellido, email, password || 'temp_pass',
      fecha_nacimiento || '1985-01-01', dni, telefono || '-'
    ]);
    res.status(201).json({ message: 'Entrenador registrado', id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar entrenador', message: err.message });
  }
};

// GET /admin/entrenadores
const listarEntrenadores = async (req, res) => {
  try {
    const rows = await db.query.all(`SELECT id_usuario AS id, nombre, apellido, email, dni FROM usuarios WHERE user_level = 'entrenador'`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar entrenadores', message: err.message });
  }
};

// POST /admin/profesores/:id/certificaciones y /admin/entrenadores/:id/certificaciones
const registrarCertificacion = async (req, res) => {
  const { id } = req.params;
  const { tipo_certificacion, matricula, fecha_caducidad, link_archivo } = req.body;
  
  // Si tipo_certificacion es indefinido, deducimos true para profesor (si URL contiene profesores) y false para entrenador
  const tipoFinal = tipo_certificacion !== undefined 
    ? (tipo_certificacion === 'true' || tipo_certificacion === true)
    : (req.originalUrl.includes('profesores') ? true : false);

  try {
    const sql = `
      INSERT INTO certificaciones (tipo_certificacion, matricula, fecha_caducidad, link_archivo, id_usuario)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_certificacion
    `;
    const result = await db.query.run(sql, [tipoFinal, matricula, fecha_caducidad, link_archivo, id]);
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

// GET /admin/canchas/listar
const listarCanchas = async (req, res) => {
  try {
    const sql = `
      SELECT can.id_cancha AS id, can.nombre, 
             can.tiempo_cancelacion, can.precio_hora_reserva AS precio, 
             tc.tipo_cancha AS categoria, tc.id_tipo_de_cancha
      FROM canchas can 
      LEFT JOIN tipos_de_cancha tc ON can.id_tipo_de_cancha = tc.id_tipo_de_cancha
      ORDER BY can.id_cancha ASC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar canchas para el administrador', message: err.message });
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

// GET /admin/reservas/pendientes
const listarReservasPendientes = async (req, res) => {
  try {
    const sql = `
      SELECT r.id_reserva AS id, r.id_reserva, r.id_cancha, r.id_usuario, r.id_cobro,
             u.nombre AS cliente_nombre, u.apellido AS cliente_apellido, u.email AS cliente_email,
             can.nombre AS cancha_nombre,
             to_char(oc.fecha, 'DD/MM/YYYY') AS fecha_turno,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin,
             c.monto, mp.nombre AS metodo_pago,
             to_char(c.fecha, 'DD/MM/YYYY HH24:MI:SS') AS fecha_creacion
      FROM reservas r
      INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
      INNER JOIN canchas can ON r.id_cancha = can.id_cancha
      INNER JOIN ocupaciones_cancha oc ON r.id_ocupacion_cancha = oc.id_ocupacion_cancha
      INNER JOIN cobros c ON r.id_cobro = c.id_cobro
      INNER JOIN metodos_de_pago mp ON c.id_metodo_de_pago = mp.id_metodo_de_pago
      WHERE c.id_estado_cobro = 1 -- 1 = Pendiente
      ORDER BY c.fecha DESC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar reservas pendientes de pago', message: err.message });
  }
};

// POST /admin/cobros/:id/confirmar
const confirmarPagoEfectivo = async (req, res) => {
  const { id } = req.params;
  try {
    const cobro = await db.query.get('SELECT * FROM cobros WHERE id_cobro = $1', [id]);
    if (!cobro) {
      return res.status(404).json({ error: 'Cobro no encontrado' });
    }
    if (parseInt(cobro.id_estado_cobro) !== 1) {
      return res.status(400).json({ error: 'El cobro no está en estado Pendiente' });
    }

    await db.pool.query('BEGIN');

    // 1. Cambiar estado del cobro a "Pagado" (2)
    await db.pool.query('UPDATE cobros SET id_estado_cobro = 2 WHERE id_cobro = $1', [id]);

    // 2. Generar el recibo oficial
    const reciboSql = `
      INSERT INTO recibos (nro_transaccion, detalles, id_cobro)
      VALUES ($1, $2, $3)
      RETURNING id_recibos
    `;
    const reciboRes = await db.pool.query(reciboSql, [
      `EFEC_${Date.now()}`,
      'Pago registrado en efectivo en recepción por el Administrador',
      id
    ]);

    await db.pool.query('COMMIT');

    res.json({
      message: 'Pago en efectivo confirmado y recibo emitido con éxito',
      id_recibo: reciboRes.rows[0].id_recibos
    });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al confirmar el pago en efectivo', message: err.message });
  }
};

// DELETE /admin/canchas/:id
const eliminarCancha = async (req, res) => {
  const { id } = req.params;
  try {
    await db.pool.query('BEGIN');
    
    // 1. Eliminar inscripciones de alumnos a clases asociadas a esta cancha
    await db.pool.query('DELETE FROM clientes_clases WHERE id_clase IN (SELECT id_clase FROM clases WHERE id_cancha = $1)', [id]);
    
    // 2. Eliminar clases asociadas a esta cancha
    await db.pool.query('DELETE FROM clases WHERE id_cancha = $1', [id]);
    
    // 3. Eliminar inscripciones de alumnos a entrenamientos asociados a esta cancha
    await db.pool.query('DELETE FROM clientes_entrenamientos WHERE id_entrenamiento IN (SELECT id_entrenamiento FROM entrenamientos WHERE id_cancha = $1)', [id]);
    
    // 4. Eliminar entrenamientos asociados a esta cancha
    await db.pool.query('DELETE FROM entrenamientos WHERE id_cancha = $1', [id]);
    
    // 5. Eliminar reservas asociadas a esta cancha
    await db.pool.query('DELETE FROM reservas WHERE id_cancha = $1', [id]);
    
    // 6. Eliminar ocupaciones de cancha asociadas a esta cancha
    await db.pool.query('DELETE FROM ocupaciones_cancha WHERE id_cancha = $1', [id]);
    
    // 7. Eliminar excepciones de disponibilidad
    await db.pool.query('DELETE FROM disponibilidad_excepciones WHERE id_cancha = $1', [id]);
    
    // 8. Eliminar la cancha físicamente
    const result = await db.pool.query('DELETE FROM canchas WHERE id_cancha = $1', [id]);
    
    if (result.rowCount === 0) {
      await db.pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }
    
    await db.pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar cancha', message: err.message });
  }
};

const listarAdministradores = async (req, res) => {
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
      WHERE u.user_level = 'administrador'
      ORDER BY u.id_usuario ASC
    `;
    const admins = await db.query.all(sql);
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar administradores', message: err.message });
  }
};

const obtenerProfesor = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await db.query.get(`SELECT id_usuario AS id, nombre, apellido, email, dni, telefono, fecha_nacimiento, user_level FROM usuarios WHERE id_usuario = $1 AND user_level = 'profesor'`, [id]);
    if (!user) return res.status(404).json({ error: 'Profesor no encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener profesor', message: err.message });
  }
};

const modificarProfesor = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, email, telefono } = req.body;
  try {
    await db.query.run(`UPDATE usuarios SET nombre=$1, apellido=$2, email=$3, telefono=$4 WHERE id_usuario=$5`, [nombre, apellido, email, telefono, id]);
    res.json({ message: 'Profesor modificado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar profesor', message: err.message });
  }
};

const eliminarProfesor = async (req, res) => {
  const { id } = req.params;
  try {
    await db.pool.query('BEGIN');
    await db.pool.query('DELETE FROM certificaciones WHERE id_usuario = $1', [id]);
    await db.pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);
    await db.pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar profesor', message: err.message });
  }
};

const obtenerEntrenador = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await db.query.get(`SELECT id_usuario AS id, nombre, apellido, email, dni, telefono, fecha_nacimiento, user_level FROM usuarios WHERE id_usuario = $1 AND user_level = 'entrenador'`, [id]);
    if (!user) return res.status(404).json({ error: 'Entrenador no encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener entrenador', message: err.message });
  }
};

const modificarEntrenador = async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, email, telefono } = req.body;
  try {
    await db.query.run(`UPDATE usuarios SET nombre=$1, apellido=$2, email=$3, telefono=$4 WHERE id_usuario=$5`, [nombre, apellido, email, telefono, id]);
    res.json({ message: 'Entrenador modificado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar entrenador', message: err.message });
  }
};

const eliminarEntrenador = async (req, res) => {
  const { id } = req.params;
  try {
    await db.pool.query('BEGIN');
    await db.pool.query('DELETE FROM certificaciones WHERE id_usuario = $1', [id]);
    await db.pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [id]);
    await db.pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar entrenador', message: err.message });
  }
};


const crearTipoCancha = async (req, res) => {
  const { tipo_cancha, ancho, largo, capacidad, duracion_min, duracion_max, id_superficie } = req.body;
  try {
    const sql = `INSERT INTO tipos_de_cancha (tipo_cancha, ancho, largo, capacidad, duracion_min, duracion_max, id_superficie)
                 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id_tipo_de_cancha`;
    const result = await db.query.run(sql, [tipo_cancha, ancho, largo, capacidad, duracion_min, duracion_max, id_superficie || 1]);
    res.status(201).json({ message: 'Tipo de cancha creado', id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear tipo de cancha', message: err.message });
  }
};

const listarTiposCanchas = async (req, res) => {
  try {
    const rows = await db.query.all(`SELECT id_tipo_de_cancha AS id, tipo_cancha, ancho, largo, capacidad, duracion_min, duracion_max FROM tipos_de_cancha ORDER BY id_tipo_de_cancha ASC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar tipos de cancha', message: err.message });
  }
};

const obtenerTipoCancha = async (req, res) => {
  const { id } = req.params;
  try {
    const row = await db.query.get(`SELECT id_tipo_de_cancha AS id, tipo_cancha, ancho, largo, capacidad, duracion_min, duracion_max FROM tipos_de_cancha WHERE id_tipo_de_cancha = $1`, [id]);
    if (!row) return res.status(404).json({ error: 'Tipo de cancha no encontrado' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tipo de cancha', message: err.message });
  }
};

const modificarTipoCancha = async (req, res) => {
  const { id } = req.params;
  const { tipo_cancha, ancho, largo, capacidad, duracion_min, duracion_max } = req.body;
  try {
    await db.query.run(`UPDATE tipos_de_cancha SET tipo_cancha=$1, ancho=$2, largo=$3, capacidad=$4, duracion_min=$5, duracion_max=$6 WHERE id_tipo_de_cancha=$7`,
      [tipo_cancha, ancho, largo, capacidad, duracion_min, duracion_max, id]);
    res.json({ message: 'Tipo de cancha modificado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar tipo de cancha', message: err.message });
  }
};

const eliminarTipoCancha = async (req, res) => {
  const { id } = req.params;
  try {
    await db.pool.query('BEGIN');
    const canchas = await db.query.all('SELECT id_cancha FROM canchas WHERE id_tipo_de_cancha = $1', [id]);
    for (const c of canchas) {
      await db.pool.query('DELETE FROM reservas WHERE id_cancha = $1', [c.id_cancha]);
      await db.pool.query('DELETE FROM ocupaciones_cancha WHERE id_cancha = $1', [c.id_cancha]);
      await db.pool.query('DELETE FROM canchas WHERE id_cancha = $1', [c.id_cancha]);
    }
    await db.pool.query('DELETE FROM tipos_de_cancha WHERE id_tipo_de_cancha = $1', [id]);
    await db.pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar tipo de cancha', message: err.message });
  }
};

const obtenerCancha = async (req, res) => {
  const { id } = req.params;
  try {
    const row = await db.query.get(`SELECT can.id_cancha AS id, can.nombre, can.precio_hora_reserva, can.tiempo_cancelacion, tc.tipo_cancha, tc.id_tipo_de_cancha
                                    FROM canchas can LEFT JOIN tipos_de_cancha tc ON can.id_tipo_de_cancha = tc.id_tipo_de_cancha
                                    WHERE can.id_cancha = $1`, [id]);
    if (!row) return res.status(404).json({ error: 'Cancha no encontrada' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cancha', message: err.message });
  }
};

const modificarCancha = async (req, res) => {
  const { id } = req.params;
  const { nombre, precio_hora_reserva, tiempo_cancelacion } = req.body;
  try {
    await db.query.run(`UPDATE canchas SET nombre=$1, precio_hora_reserva=$2, tiempo_cancelacion=$3 WHERE id_cancha=$4`,
      [nombre, precio_hora_reserva, tiempo_cancelacion, id]);
    res.json({ message: 'Cancha modificada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar cancha', message: err.message });
  }
};

const listarReservas = async (req, res) => {
  try {
    const sql = `
      SELECT r.id_reserva AS id, u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
             u.email AS cliente_email, can.nombre AS cancha,
             to_char(oc.fecha, 'YYYY-MM-DD') AS fecha,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin,
             c.monto, mp.nombre AS metodo_pago, ec.estado AS estado_cobro
      FROM reservas r
      INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
      INNER JOIN canchas can ON r.id_cancha = can.id_cancha
      INNER JOIN ocupaciones_cancha oc ON r.id_ocupacion_cancha = oc.id_ocupacion_cancha
      INNER JOIN cobros c ON r.id_cobro = c.id_cobro
      INNER JOIN metodos_de_pago mp ON c.id_metodo_de_pago = mp.id_metodo_de_pago
      INNER JOIN estados_cobro ec ON c.id_estado_cobro = ec.id_estado_cobro
      ORDER BY oc.fecha DESC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar reservas', message: err.message });
  }
};

const modificarReserva = async (req, res) => {
  const { id } = req.params;
  const { fecha, hora_inicio, hora_fin } = req.body;
  try {
    const reserva = await db.query.get('SELECT id_ocupacion_cancha FROM reservas WHERE id_reserva = $1', [id]);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });
    await db.query.run('UPDATE ocupaciones_cancha SET fecha=$1, hora_inicio=$2, hora_fin=$3 WHERE id_ocupacion_cancha=$4',
      [fecha, hora_inicio, hora_fin, reserva.id_ocupacion_cancha]);
    res.json({ message: 'Reserva modificada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar reserva', message: err.message });
  }
};

const eliminarReserva = async (req, res) => {
  const { id } = req.params;
  try {
    await db.pool.query('BEGIN');
    const r = await db.query.get('SELECT id_ocupacion_cancha, id_cobro FROM reservas WHERE id_reserva = $1', [id]);
    if (!r) { await db.pool.query('ROLLBACK'); return res.status(404).json({ error: 'Reserva no encontrada' }); }
    await db.pool.query('DELETE FROM reservas WHERE id_reserva = $1', [id]);
    await db.pool.query('DELETE FROM ocupaciones_cancha WHERE id_ocupacion_cancha = $1', [r.id_ocupacion_cancha]);
    await db.pool.query('DELETE FROM cobros WHERE id_cobro = $1', [r.id_cobro]);
    await db.pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar reserva', message: err.message });
  }
};

const listarCertificaciones = async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const rows = await db.query.all(`SELECT id_certificacion AS id, matricula, to_char(fecha_caducidad, 'YYYY-MM-DD') AS fecha_caducidad, link_archivo, validada
                                     FROM certificaciones WHERE id_usuario = $1`, [id_usuario]);
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar certificaciones', message: err.message });
  }
};

const validarCertificacion = async (req, res) => {
  const { id } = req.params;
  const { validada } = req.body;
  try {
    await db.query.run('UPDATE certificaciones SET validada=$1 WHERE id_certificacion=$2', [validada, id]);
    res.json({ message: validada ? 'Certificacion validada' : 'Certificacion marcada como pendiente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al validar certificacion', message: err.message });
  }
};

const crearClase = async (req, res) => {
  const { nombre, capacidad_max, id_profesional, id_cancha, fecha, hora_inicio, hora_fin } = req.body;
  try {
    await db.pool.query('BEGIN');
    const ocupacionSql = `INSERT INTO ocupaciones_cancha (fecha, hora_inicio, hora_fin, id_tipo_ocupacion, id_cancha)
                          VALUES ($1, $2, $3, 2, $4) RETURNING id_ocupacion_cancha`;
    const ocupacion = await db.pool.query(ocupacionSql, [fecha, hora_inicio, hora_fin, id_cancha]);
    const id_ocupacion = ocupacion.rows[0].id_ocupacion_cancha;
    const claseSql = `INSERT INTO clases (nombre, capacidad_max, id_profesional, id_cancha, id_ocupacion_cancha)
                      VALUES ($1, $2, $3, $4, $5) RETURNING id_clase`;
    const clase = await db.pool.query(claseSql, [nombre, capacidad_max, id_profesional, id_cancha, id_ocupacion]);
    await db.pool.query('COMMIT');
    res.status(201).json({ message: 'Clase creada correctamente', id: clase.rows[0].id_clase });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear clase', message: err.message });
  }
};

const listarClases = async (req, res) => {
  try {
    const sql = `
      SELECT c.id_clase AS id, c.nombre, c.capacidad_max,
             u.nombre || ' ' || u.apellido AS profesor,
             can.nombre AS cancha,
             to_char(oc.fecha, 'YYYY-MM-DD') AS fecha,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin,
             (SELECT COUNT(*)::int FROM clientes_clases WHERE id_clase = c.id_clase) AS inscriptos
      FROM clases c
      LEFT JOIN usuarios u ON c.id_profesional = u.id_usuario
      LEFT JOIN canchas can ON c.id_cancha = can.id_cancha
      LEFT JOIN ocupaciones_cancha oc ON c.id_ocupacion_cancha = oc.id_ocupacion_cancha
      ORDER BY oc.fecha DESC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar clases', message: err.message });
  }
};

const obtenerClase = async (req, res) => {
  const { id } = req.params;
  try {
    const sql = `
      SELECT c.id_clase AS id, c.nombre, c.capacidad_max,
             u.nombre || ' ' || u.apellido AS profesor, c.id_profesional,
             can.nombre AS cancha, c.id_cancha,
             to_char(oc.fecha, 'YYYY-MM-DD') AS fecha,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin,
             (SELECT COUNT(*)::int FROM clientes_clases WHERE id_clase = c.id_clase) AS inscriptos
      FROM clases c
      LEFT JOIN usuarios u ON c.id_profesional = u.id_usuario
      LEFT JOIN canchas can ON c.id_cancha = can.id_cancha
      LEFT JOIN ocupaciones_cancha oc ON c.id_ocupacion_cancha = oc.id_ocupacion_cancha
      WHERE c.id_clase = $1
    `;
    const row = await db.query.get(sql, [id]);
    if (!row) return res.status(404).json({ error: 'Clase no encontrada' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clase', message: err.message });
  }
};

const modificarClase = async (req, res) => {
  const { id } = req.params;
  const { nombre, capacidad_max, id_profesional } = req.body;
  try {
    await db.query.run(`UPDATE clases SET nombre=$1, capacidad_max=$2, id_profesional=$3 WHERE id_clase=$4`,
      [nombre, capacidad_max, id_profesional, id]);
    res.json({ message: 'Clase modificada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar clase', message: err.message });
  }
};

const eliminarClase = async (req, res) => {
  const { id } = req.params;
  try {
    await db.pool.query('BEGIN');
    const clase = await db.query.get('SELECT id_ocupacion_cancha FROM clases WHERE id_clase = $1', [id]);
    if (!clase) { await db.pool.query('ROLLBACK'); return res.status(404).json({ error: 'Clase no encontrada' }); }
    await db.pool.query('DELETE FROM clientes_clases WHERE id_clase = $1', [id]);
    await db.pool.query('DELETE FROM clases WHERE id_clase = $1', [id]);
    await db.pool.query('DELETE FROM ocupaciones_cancha WHERE id_ocupacion_cancha = $1', [clase.id_ocupacion_cancha]);
    await db.pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar clase', message: err.message });
  }
};

const asignarClaseParticular = async (req, res) => {
  const { id_cliente, id_clase } = req.body;
  try {
    await db.query.run('INSERT INTO clientes_clases (id_cliente, id_clase) VALUES ($1, $2)', [id_cliente, id_clase]);
    res.status(201).json({ message: 'Cliente asignado a la clase correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al asignar cliente a clase', message: err.message });
  }
};

const registrarAsistenciaClase = async (req, res) => {
  const { id } = req.params;
  const { id_cliente, estado } = req.body;
  try {
    const asistencia = await db.query.run(
      `INSERT INTO asistencias (estado) VALUES ($1) RETURNING id_asistencia`, [estado]
    );
    await db.query.run(
      `UPDATE clientes_clases SET id_asistencia = $1 WHERE id_clase = $2 AND id_cliente = $3`,
      [asistencia.id, id, id_cliente]
    );
    res.json({ message: 'Asistencia registrada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar asistencia', message: err.message });
  }
};

const crearEntrenamiento = async (req, res) => {
  const { capacidad_max, id_profesional, id_cancha, fecha, hora_inicio, hora_fin } = req.body;
  try {
    await db.pool.query('BEGIN');
    const ocupacionSql = `INSERT INTO ocupaciones_cancha (fecha, hora_inicio, hora_fin, id_tipo_ocupacion, id_cancha)
                          VALUES ($1, $2, $3, 3, $4) RETURNING id_ocupacion_cancha`;
    const ocupacion = await db.pool.query(ocupacionSql, [fecha, hora_inicio, hora_fin, id_cancha]);
    const id_ocupacion = ocupacion.rows[0].id_ocupacion_cancha;
    const entSql = `INSERT INTO entrenamientos (capacidad_max, id_profesional, id_cancha, id_ocupacion_cancha)
                    VALUES ($1, $2, $3, $4) RETURNING id_entrenamiento`;
    const ent = await db.pool.query(entSql, [capacidad_max, id_profesional, id_cancha, id_ocupacion]);
    await db.pool.query('COMMIT');
    res.status(201).json({ message: 'Entrenamiento creado correctamente', id: ent.rows[0].id_entrenamiento });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al crear entrenamiento', message: err.message });
  }
};

const listarEntrenamientos = async (req, res) => {
  try {
    const sql = `
      SELECT e.id_entrenamiento AS id, e.capacidad_max,
             u.nombre || ' ' || u.apellido AS entrenador,
             can.nombre AS cancha,
             to_char(oc.fecha, 'YYYY-MM-DD') AS fecha,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin,
             (SELECT COUNT(*)::int FROM clientes_entrenamientos WHERE id_entrenamiento = e.id_entrenamiento) AS inscriptos
      FROM entrenamientos e
      LEFT JOIN usuarios u ON e.id_profesional = u.id_usuario
      LEFT JOIN canchas can ON e.id_cancha = can.id_cancha
      LEFT JOIN ocupaciones_cancha oc ON e.id_ocupacion_cancha = oc.id_ocupacion_cancha
      ORDER BY oc.fecha DESC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar entrenamientos', message: err.message });
  }
};

const obtenerEntrenamiento = async (req, res) => {
  const { id } = req.params;
  try {
    const sql = `
      SELECT e.id_entrenamiento AS id, e.capacidad_max,
             u.nombre || ' ' || u.apellido AS entrenador, e.id_profesional,
             can.nombre AS cancha, e.id_cancha,
             to_char(oc.fecha, 'YYYY-MM-DD') AS fecha,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin,
             (SELECT COUNT(*)::int FROM clientes_entrenamientos WHERE id_entrenamiento = e.id_entrenamiento) AS inscriptos
      FROM entrenamientos e
      LEFT JOIN usuarios u ON e.id_profesional = u.id_usuario
      LEFT JOIN canchas can ON e.id_cancha = can.id_cancha
      LEFT JOIN ocupaciones_cancha oc ON e.id_ocupacion_cancha = oc.id_ocupacion_cancha
      WHERE e.id_entrenamiento = $1
    `;
    const row = await db.query.get(sql, [id]);
    if (!row) return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener entrenamiento', message: err.message });
  }
};

const modificarEntrenamiento = async (req, res) => {
  const { id } = req.params;
  const { capacidad_max, id_profesional } = req.body;
  try {
    await db.query.run(`UPDATE entrenamientos SET capacidad_max=$1, id_profesional=$2 WHERE id_entrenamiento=$3`,
      [capacidad_max, id_profesional, id]);
    res.json({ message: 'Entrenamiento modificado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar entrenamiento', message: err.message });
  }
};

const eliminarEntrenamiento = async (req, res) => {
  const { id } = req.params;
  try {
    await db.pool.query('BEGIN');
    const ent = await db.query.get('SELECT id_ocupacion_cancha FROM entrenamientos WHERE id_entrenamiento = $1', [id]);
    if (!ent) { await db.pool.query('ROLLBACK'); return res.status(404).json({ error: 'Entrenamiento no encontrado' }); }
    await db.pool.query('DELETE FROM clientes_entrenamientos WHERE id_entrenamiento = $1', [id]);
    await db.pool.query('DELETE FROM entrenamientos WHERE id_entrenamiento = $1', [id]);
    await db.pool.query('DELETE FROM ocupaciones_cancha WHERE id_ocupacion_cancha = $1', [ent.id_ocupacion_cancha]);
    await db.pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar entrenamiento', message: err.message });
  }
};

const asignarEntrenamientoParticular = async (req, res) => {
  const { id_cliente, id_entrenamiento } = req.body;
  try {
    await db.query.run('INSERT INTO clientes_entrenamientos (id_cliente, id_entrenamiento) VALUES ($1, $2)', [id_cliente, id_entrenamiento]);
    res.status(201).json({ message: 'Cliente asignado al entrenamiento correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al asignar cliente a entrenamiento', message: err.message });
  }
};

const registrarAsistenciaEntrenamiento = async (req, res) => {
  const { id } = req.params;
  const { id_cliente, estado } = req.body;
  try {
    const asistencia = await db.query.run(
      `INSERT INTO asistencias (estado) VALUES ($1) RETURNING id_asistencia`, [estado]
    );
    await db.query.run(
      `UPDATE clientes_entrenamientos SET id_asistencia = $1 WHERE id_entrenamiento = $2 AND id_cliente = $3`,
      [asistencia.id, id, id_cliente]
    );
    res.json({ message: 'Asistencia registrada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar asistencia', message: err.message });
  }
};

const listarLigas = async (req, res) => {
  try {
    const sql = `
      SELECT l.id_liga AS id, l.nombre, 
             to_char(l.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
             to_char(l.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
             u.nombre || ' ' || u.apellido AS tutor,
             e.estado
      FROM ligas l
      LEFT JOIN usuarios u ON l.id_usuario_tutor = u.id_usuario
      LEFT JOIN estado_partidos e ON l.id_estado = e.id_estado_partido
      ORDER BY l.fecha_inicio DESC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar ligas', message: err.message });
  }
};

const obtenerLiga = async (req, res) => {
  const { id } = req.params;
  try {
    const liga = await db.query.get(`
      SELECT l.id_liga AS id, l.nombre,
             to_char(l.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
             to_char(l.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
             u.nombre || ' ' || u.apellido AS tutor, l.id_usuario_tutor,
             e.estado
      FROM ligas l
      LEFT JOIN usuarios u ON l.id_usuario_tutor = u.id_usuario
      LEFT JOIN estado_partidos e ON l.id_estado = e.id_estado_partido
      WHERE l.id_liga = $1
    `, [id]);
    if (!liga) return res.status(404).json({ error: 'Liga no encontrada' });
    
    const partidos = await db.query.all(`
      SELECT p.id_partido AS id, 
             u1.nombre || ' ' || u1.apellido AS equipo_local,
             u2.nombre || ' ' || u2.apellido AS equipo_visitante,
             p.goles_local, p.goles_visitante,
             to_char(p.fecha, 'YYYY-MM-DD') AS fecha
      FROM partidos p
      LEFT JOIN usuarios u1 ON p.id_equipo_local = u1.id_usuario
      LEFT JOIN usuarios u2 ON p.id_equipo_visitante = u2.id_usuario
      WHERE p.id_liga = $1
    `, [id]);
    
    res.json({ ...liga, partidos });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener liga', message: err.message });
  }
};

const modificarLiga = async (req, res) => {
  const { id } = req.params;
  const { nombre, fecha_inicio, fecha_fin } = req.body;
  try {
    await db.query.run(`UPDATE ligas SET nombre=$1, fecha_inicio=$2, fecha_fin=$3 WHERE id_liga=$4`,
      [nombre, fecha_inicio, fecha_fin, id]);
    res.json({ message: 'Liga modificada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar liga', message: err.message });
  }
};

const eliminarLiga = async (req, res) => {
  const { id } = req.params;
  try {
    await db.pool.query('BEGIN');
    await db.pool.query('DELETE FROM partidos WHERE id_liga = $1', [id]);
    await db.pool.query('DELETE FROM inscripciones_ligas WHERE id_liga = $1', [id]);
    await db.pool.query('DELETE FROM ligas WHERE id_liga = $1', [id]);
    await db.pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar liga', message: err.message });
  }
};

const generarFixture = async (req, res) => {
  const { id } = req.params;
  try {
    const inscriptos = await db.query.all(
      'SELECT id_usuario FROM inscripciones_ligas WHERE id_liga = $1', [id]
    );
    if (inscriptos.length < 2) return res.status(400).json({ error: 'Se necesitan al menos 2 equipos' });

    await db.pool.query('DELETE FROM partidos WHERE id_liga = $1', [id]);

    const equipos = inscriptos.map(i => i.id_usuario);
    const partidos = [];
    for (let i = 0; i < equipos.length; i++) {
      for (let j = i + 1; j < equipos.length; j++) {
        partidos.push([equipos[i], equipos[j], id]);
      }
    }

    for (const p of partidos) {
      await db.pool.query(
        'INSERT INTO partidos (id_equipo_local, id_equipo_visitante, id_liga) VALUES ($1, $2, $3)',
        p
      );
    }

    await db.pool.query('COMMIT');
    res.json({ message: `Fixture generado con ${partidos.length} partidos` });
  } catch (err) {
    res.status(500).json({ error: 'Error al generar fixture', message: err.message });
  }
};

const inscribirEnLiga = async (req, res) => {
  const { id } = req.params;
  const { id_usuario } = req.body;
  try {
    await db.query.run('INSERT INTO inscripciones_ligas (id_liga, id_usuario) VALUES ($1, $2)', [id, id_usuario]);
    res.status(201).json({ message: 'Usuario inscripto en la liga' });
  } catch (err) {
    res.status(500).json({ error: 'Error al inscribir en liga', message: err.message });
  }
};

const registrarResultadoLiga = async (req, res) => {
  const { idPartido } = req.params;
  const { goles_local, goles_visitante } = req.body;
  try {
    await db.query.run(
      'UPDATE partidos SET goles_local=$1, goles_visitante=$2 WHERE id_partido=$3',
      [goles_local, goles_visitante, idPartido]
    );
    res.json({ message: 'Resultado registrado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar resultado', message: err.message });
  }
};

const crearTorneo = async (req, res) => {
  const { nombre, fecha_inicio, fecha_fin, id_usuario_tutor } = req.body;
  try {
    const result = await db.query.run(`
      INSERT INTO torneos (nombre, fecha_inicio, fecha_fin, id_usuario_tutor, id_club, id_estado)
      VALUES ($1, $2, $3, $4, 1, 1) RETURNING id_torneo
    `, [nombre, fecha_inicio, fecha_fin, id_usuario_tutor]);
    res.status(201).json({ message: 'Torneo creado', id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear torneo', message: err.message });
  }
};

const listarTorneos = async (req, res) => {
  try {
    const sql = `
      SELECT t.id_torneo AS id, t.nombre,
             to_char(t.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
             to_char(t.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
             u.nombre || ' ' || u.apellido AS tutor,
             e.estado
      FROM torneos t
      LEFT JOIN usuarios u ON t.id_usuario_tutor = u.id_usuario
      LEFT JOIN estado_partidos e ON t.id_estado = e.id_estado_partido
      ORDER BY t.fecha_inicio DESC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar torneos', message: err.message });
  }
};

const obtenerTorneo = async (req, res) => {
  const { id } = req.params;
  try {
    const torneo = await db.query.get(`
      SELECT t.id_torneo AS id, t.nombre,
             to_char(t.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
             to_char(t.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
             u.nombre || ' ' || u.apellido AS tutor,
             e.estado
      FROM torneos t
      LEFT JOIN usuarios u ON t.id_usuario_tutor = u.id_usuario
      LEFT JOIN estado_partidos e ON t.id_estado = e.id_estado_partido
      WHERE t.id_torneo = $1
    `, [id]);
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' });
    res.json(torneo);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener torneo', message: err.message });
  }
};

const modificarTorneo = async (req, res) => {
  const { id } = req.params;
  const { nombre, fecha_inicio, fecha_fin } = req.body;
  try {
    await db.query.run(`UPDATE torneos SET nombre=$1, fecha_inicio=$2, fecha_fin=$3 WHERE id_torneo=$4`,
      [nombre, fecha_inicio, fecha_fin, id]);
    res.json({ message: 'Torneo modificado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar torneo', message: err.message });
  }
};

const eliminarTorneo = async (req, res) => {
  const { id } = req.params;
  try {
    await db.pool.query('BEGIN');
    await db.pool.query('DELETE FROM partidos WHERE id_torneo = $1', [id]);
    await db.pool.query('DELETE FROM inscripciones_torneos WHERE id_torneo = $1', [id]);
    await db.pool.query('DELETE FROM torneos WHERE id_torneo = $1', [id]);
    await db.pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar torneo', message: err.message });
  }
};

const generarCuadroTorneo = async (req, res) => {
  const { id } = req.params;
  try {
    const inscriptos = await db.query.all(
      'SELECT id_usuario FROM inscripciones_torneos WHERE id_torneo = $1', [id]
    );
    if (inscriptos.length < 2) return res.status(400).json({ error: 'Se necesitan al menos 2 equipos' });

    await db.pool.query('DELETE FROM partidos WHERE id_torneo = $1', [id]);

    const equipos = inscriptos.map(i => i.id_usuario);
    for (let i = 0; i < equipos.length - 1; i += 2) {
      await db.pool.query(
        'INSERT INTO partidos (id_equipo_local, id_equipo_visitante, id_torneo) VALUES ($1, $2, $3)',
        [equipos[i], equipos[i + 1], id]
      );
    }

    res.json({ message: 'Cuadro generado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al generar cuadro', message: err.message });
  }
};

const inscribirEnTorneo = async (req, res) => {
  const { id } = req.params;
  const { id_usuario } = req.body;
  try {
    await db.query.run('INSERT INTO inscripciones_torneos (id_torneo, id_usuario) VALUES ($1, $2)', [id, id_usuario]);
    res.status(201).json({ message: 'Usuario inscripto en el torneo' });
  } catch (err) {
    res.status(500).json({ error: 'Error al inscribir en torneo', message: err.message });
  }
};

const registrarResultadoTorneo = async (req, res) => {
  const { idPartido } = req.params;
  const { goles_local, goles_visitante } = req.body;
  try {
    await db.query.run(
      'UPDATE partidos SET goles_local=$1, goles_visitante=$2 WHERE id_partido=$3',
      [goles_local, goles_visitante, idPartido]
    );
    res.json({ message: 'Resultado registrado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar resultado', message: err.message });
  }
};

const crearDescuento = async (req, res) => {
  const { descripcion, porcentaje_descuento, activo } = req.body;
  try {
    const result = await db.query.run(
      `INSERT INTO descuentos (descripcion, porcentaje_descuento, activo, id_club) VALUES ($1, $2, $3, 1) RETURNING id_descuento`,
      [descripcion, porcentaje_descuento, activo ?? true]
    );
    res.status(201).json({ message: 'Descuento registrado', id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear descuento', message: err.message });
  }
};

const listarDescuentos = async (req, res) => {
  try {
    const rows = await db.query.all(
      `SELECT id_descuento AS id, descripcion, porcentaje_descuento, activo FROM descuentos ORDER BY id_descuento ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar descuentos', message: err.message });
  }
};

const obtenerDescuento = async (req, res) => {
  const { id } = req.params;
  try {
    const row = await db.query.get(
      `SELECT id_descuento AS id, descripcion, porcentaje_descuento, activo FROM descuentos WHERE id_descuento = $1`, [id]
    );
    if (!row) return res.status(404).json({ error: 'Descuento no encontrado' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener descuento', message: err.message });
  }
};

const modificarDescuento = async (req, res) => {
  const { id } = req.params;
  const { descripcion, porcentaje_descuento, activo } = req.body;
  try {
    await db.query.run(
      `UPDATE descuentos SET descripcion=$1, porcentaje_descuento=$2, activo=$3 WHERE id_descuento=$4`,
      [descripcion, porcentaje_descuento, activo, id]
    );
    res.json({ message: 'Descuento modificado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar descuento', message: err.message });
  }
};

const eliminarDescuento = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query.run(`DELETE FROM descuentos WHERE id_descuento = $1`, [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar descuento', message: err.message });
  }
};

const crearCobro = async (req, res) => {
  const { idCliente, monto, detalles, idMetodoPago } = req.body;
  try {
    await db.pool.query('BEGIN');
    const result = await db.pool.query(
      `INSERT INTO cobros (monto, detalles, id_metodo_de_pago, id_estado_cobro, id_usuario, fecha)
       VALUES ($1, $2, $3, 1, $4, NOW()) RETURNING id_cobro`,
      [monto, detalles, idMetodoPago, idCliente]
    );
    await db.pool.query('COMMIT');
    res.status(201).json({ message: 'Cobro registrado correctamente', id: result.rows[0].id_cobro });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al registrar cobro', message: err.message });
  }
};

const listarCobros = async (req, res) => {
  try {
    const sql = `
      SELECT c.id_cobro AS id, c.monto, c.detalles,
             u.nombre || ' ' || u.apellido AS cliente,
             mp.nombre AS metodo_pago,
             ec.estado AS estado_cobro,
             to_char(c.fecha, 'YYYY-MM-DD HH24:MI') AS fecha
      FROM cobros c
      LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
      LEFT JOIN metodos_de_pago mp ON c.id_metodo_de_pago = mp.id_metodo_de_pago
      LEFT JOIN estados_cobro ec ON c.id_estado_cobro = ec.id_estado_cobro
      ORDER BY c.fecha DESC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar cobros', message: err.message });
  }
};

const obtenerCobro = async (req, res) => {
  const { id } = req.params;
  try {
    const sql = `
      SELECT c.id_cobro AS id, c.monto, c.detalles,
             u.nombre || ' ' || u.apellido AS cliente, c.id_usuario,
             mp.nombre AS metodo_pago, c.id_metodo_de_pago,
             ec.estado AS estado_cobro, c.id_estado_cobro,
             to_char(c.fecha, 'YYYY-MM-DD HH24:MI') AS fecha
      FROM cobros c
      LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
      LEFT JOIN metodos_de_pago mp ON c.id_metodo_de_pago = mp.id_metodo_de_pago
      LEFT JOIN estados_cobro ec ON c.id_estado_cobro = ec.id_estado_cobro
      WHERE c.id_cobro = $1
    `;
    const row = await db.query.get(sql, [id]);
    if (!row) return res.status(404).json({ error: 'Cobro no encontrado' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener cobro', message: err.message });
  }
};

const modificarCobro = async (req, res) => {
  const { id } = req.params;
  const { id_estado_cobro } = req.body;
  try {
    await db.query.run(
      `UPDATE cobros SET id_estado_cobro=$1 WHERE id_cobro=$2`,
      [id_estado_cobro, id]
    );
    res.json({ message: 'Cobro modificado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar cobro', message: err.message });
  }
};

module.exports = {
  listarClientes,
  obtenerCliente,
  actualizarCliente,
  eliminarCliente,
  registrarProfesor,
  listarProfesores,
  registrarEntrenador,
  listarEntrenadores,
  registrarCertificacion,
  registrarUsuarioPorAdmin,
  crearCancha,
  bloquearCanchaMantenimiento,
  crearLiga,
  reporteFinanciero,
  listarReservasPendientes,
  confirmarPagoEfectivo,
  listarCanchas,
  eliminarCancha,
  listarAdministradores,
  obtenerProfesor,
  modificarProfesor,
  eliminarProfesor,
  obtenerEntrenador,
  modificarEntrenador,
  eliminarEntrenador,
  crearTipoCancha,
  listarTiposCanchas,
  obtenerTipoCancha,
  modificarTipoCancha,
  eliminarTipoCancha,
  obtenerCancha,
  modificarCancha,
  listarReservas,
  modificarReserva,
  eliminarReserva,
  listarCertificaciones,
  validarCertificacion,
  crearClase,
  listarClases,
  obtenerClase,
  modificarClase,
  eliminarClase,
  asignarClaseParticular,
  registrarAsistenciaClase,
  crearEntrenamiento,
  listarEntrenamientos,
  obtenerEntrenamiento,
  modificarEntrenamiento,
  eliminarEntrenamiento,
  asignarEntrenamientoParticular,
  registrarAsistenciaEntrenamiento,
  listarLigas,
  obtenerLiga,
  modificarLiga,
  eliminarLiga,
  generarFixture,
  inscribirEnLiga,
  registrarResultadoLiga,
  crearTorneo,
  listarTorneos,
  obtenerTorneo,
  modificarTorneo,
  eliminarTorneo,
  generarCuadroTorneo,
  inscribirEnTorneo,
  registrarResultadoTorneo,
  crearDescuento,
  listarDescuentos,
  obtenerDescuento,
  modificarDescuento,
  eliminarDescuento,
  crearCobro,
  listarCobros,
  obtenerCobro,
  modificarCobro,
};
