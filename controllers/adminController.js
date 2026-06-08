const db = require('../config/db.js');
const {
  parseMatriculaCertificacion,
  crearSolicitudAdmin,
  marcarSolicitud,
  obtenerSolicitudPendiente
} = require('../utils/solicitudesAdmin.js');

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
    calle, numero, codigo_postal, localidad, genero, nacionalidad
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

    // 2. Resolver el id_genero de la tabla generos mediante el string 'genero'
    let idGenero = 1;
    if (genero) {
      const genName = genero.trim();
      const existingGen = await db.query.get(
        'SELECT id_genero FROM generos WHERE LOWER(genero) = LOWER($1)',
        [genName]
      );
      if (existingGen) {
        idGenero = existingGen.id_genero;
      } else {
        const insertGen = await db.pool.query(
          'INSERT INTO generos (genero) VALUES ($1) RETURNING id_genero',
          [genName]
        );
        idGenero = insertGen.rows[0].id_genero;
      }
    }

    // 3. Resolver el id_nacionalidad de la tabla paises mediante el string 'nacionalidad'
    let idNacionalidad = 1;
    if (nacionalidad) {
      const nacName = nacionalidad.trim();
      const existingPais = await db.query.get(
        'SELECT id_pais FROM paises WHERE LOWER(nombre) = LOWER($1)',
        [nacName]
      );
      if (existingPais) {
        idNacionalidad = existingPais.id_pais;
      } else {
        const insertPais = await db.pool.query(
          'INSERT INTO paises (nombre) VALUES ($1) RETURNING id_pais',
          [nacName]
        );
        idNacionalidad = insertPais.rows[0].id_pais;
      }
    }

    // 4. Insertar la dirección
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

    // 5. Insertar/registrar al usuario con el rol elegido
    const userSql = `
      INSERT INTO usuarios (
        username, user_level, nombre, apellido, email, password, 
        fecha_nacimiento, dni, telefono, id_direccion, id_genero, id_nacionalidad, id_club
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1)
      RETURNING id_usuario, username, nombre, apellido, email, user_level
    `;
    const insertResult = await db.query.get(userSql, [
      finalUsername,
      user_level,
      nombre,
      apellido,
      email,
      password || 'Unaj2026@golahora',
      fecha_nacimiento || '1985-01-01',
      dni || `DNI_${Date.now()}`,
      telefono || '-',
      idDireccion,
      idGenero,
      idNacionalidad
    ]);

    await db.pool.query('COMMIT');

    res.status(201).json({
      message: `Usuario registrado exitosamente con rol: ${user_level}`,
      usuario: insertResult
    });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(400).json({ 
        error: 'Datos duplicados', 
        details: 'El username, email o DNI ya se encuentra registrado.' 
      });
    }
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
      username || `prof_${Date.now()}`, nombre, apellido, email, password || 'Unaj2026@golahora',
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
      username || `trainer_${Date.now()}`, nombre, apellido, email, password || 'Unaj2026@golahora',
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
  if (!nombre || !String(nombre).trim()) {
    return res.status(400).json({ error: 'El nombre de la cancha es obligatorio' });
  }
  if (!id_tipo_de_cancha || Number.isNaN(parseInt(id_tipo_de_cancha, 10))) {
    return res.status(400).json({ error: 'Debe seleccionar un tipo de cancha válido' });
  }
  const precio = parseFloat(precio_hora_reserva);
  const tiempo = parseInt(tiempo_cancelacion, 10);
  if (Number.isNaN(precio) || precio < 0) {
    return res.status(400).json({ error: 'El precio por hora debe ser un número válido' });
  }
  if (Number.isNaN(tiempo) || tiempo < 0) {
    return res.status(400).json({ error: 'El tiempo de cancelación debe ser un número válido' });
  }
  try {
    const tipo = await db.query.get('SELECT id_tipo_de_cancha FROM tipos_de_cancha WHERE id_tipo_de_cancha = $1', [id_tipo_de_cancha]);
    if (!tipo) return res.status(400).json({ error: 'El tipo de cancha seleccionado no existe' });

    const sql = `
      INSERT INTO canchas (nombre, tiempo_cancelacion, precio_hora_reserva, id_tipo_de_cancha, id_club)
      VALUES ($1, $2, $3, $4, 1)
      RETURNING id_cancha
    `;
    const result = await db.query.run(sql, [String(nombre).trim(), tiempo, precio, id_tipo_de_cancha]);
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
  const { porcentaje_descuento = 0 } = req.body;
  try {
    const cobro = await db.query.get('SELECT * FROM cobros WHERE id_cobro = $1', [id]);
    if (!cobro) return res.status(404).json({ error: 'Cobro no encontrado' });
    if (parseInt(cobro.id_estado_cobro) !== 1) return res.status(400).json({ error: 'El cobro no está en estado Pendiente' });

    await db.pool.query('BEGIN');

    const montoFinal = parseFloat(cobro.monto) - (parseFloat(cobro.monto) * parseFloat(porcentaje_descuento) / 100);
    await db.pool.query('UPDATE cobros SET id_estado_cobro = 2, monto = $1, porcentaje_descuento = $2 WHERE id_cobro = $3', [montoFinal.toFixed(2), parseFloat(porcentaje_descuento), id]);

    const reciboRes = await db.pool.query(
      `INSERT INTO recibos (nro_transaccion, detalles, id_cobro) VALUES ($1, $2, $3) RETURNING id_recibos`,
      [`EFEC_${Date.now()}`, `Pago en efectivo. Descuento aplicado: ${porcentaje_descuento}%`, id]
    );

    await db.pool.query('COMMIT');
    res.json({ message: 'Pago confirmado y recibo emitido', id_recibo: reciboRes.rows[0].id_recibos });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al confirmar el pago', message: err.message });
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
  if (!tipo_cancha || !String(tipo_cancha).trim()) {
    return res.status(400).json({ error: 'El nombre del tipo de cancha es obligatorio' });
  }
  const anchoNum = parseFloat(ancho);
  const largoNum = parseFloat(largo);
  const capNum = parseInt(capacidad, 10);
  const durMin = parseInt(duracion_min, 10);
  const durMax = parseInt(duracion_max, 10);
  const idSup = parseInt(id_superficie, 10);
  if ([anchoNum, largoNum].some(v => Number.isNaN(v) || v <= 0)) {
    return res.status(400).json({ error: 'Ancho y largo deben ser números positivos' });
  }
  if (Number.isNaN(capNum) || capNum <= 0) {
    return res.status(400).json({ error: 'La capacidad debe ser mayor a 0' });
  }
  if ([durMin, durMax].some(v => Number.isNaN(v) || v <= 0)) {
    return res.status(400).json({ error: 'Las duraciones deben ser números positivos' });
  }
  if (durMin > durMax) {
    return res.status(400).json({ error: 'La duración mínima no puede superar la máxima' });
  }
  if (Number.isNaN(idSup)) {
    return res.status(400).json({ error: 'Debe seleccionar una superficie válida' });
  }
  try {
    const sup = await db.query.get('SELECT id_superficie FROM superficies WHERE id_superficie = $1', [idSup]);
    if (!sup) return res.status(400).json({ error: 'La superficie seleccionada no existe' });

    const sql = `INSERT INTO tipos_de_cancha (tipo_cancha, ancho, largo, capacidad, duracion_min, duracion_max, id_superficie)
                 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id_tipo_de_cancha`;
    const result = await db.query.run(sql, [String(tipo_cancha).trim(), anchoNum, largoNum, capNum, durMin, durMax, idSup]);
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
    const row = await db.query.get(`SELECT can.id_cancha AS id, can.nombre, can.precio_hora_reserva, can.precio_hora_reserva AS precio,
                                    can.tiempo_cancelacion, tc.tipo_cancha, tc.id_tipo_de_cancha,
                                    tc.duracion_min, tc.duracion_max
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
      SELECT r.id_reserva AS id, r.id_cobro, r.id_cancha,
             u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
             u.email AS cliente_email, can.nombre AS cancha,
             tc.duracion_min, tc.duracion_max,
             to_char(oc.fecha, 'YYYY-MM-DD') AS fecha,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin,
             c.monto, mp.nombre AS metodo_pago, ec.estado AS estado_cobro
      FROM reservas r
      INNER JOIN usuarios u ON r.id_usuario = u.id_usuario
      INNER JOIN canchas can ON r.id_cancha = can.id_cancha
      LEFT JOIN tipos_de_cancha tc ON can.id_tipo_de_cancha = tc.id_tipo_de_cancha
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
  if (!fecha || !hora_inicio || !hora_fin) {
    return res.status(400).json({ error: 'Fecha y horario son obligatorios' });
  }
  try {
    const reserva = await db.query.get(
      'SELECT id_ocupacion_cancha, id_cancha FROM reservas WHERE id_reserva = $1',
      [id]
    );
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });

    const hi = hora_inicio.length === 5 ? `${hora_inicio}:00` : hora_inicio;
    const hf = hora_fin.length === 5 ? `${hora_fin}:00` : hora_fin;

    const validacion = await validarTurnoReserva(
      reserva.id_cancha, fecha, hi, hf, reserva.id_ocupacion_cancha
    );
    if (!validacion.ok) return res.status(409).json({ error: validacion.error });

    await db.query.run(
      'UPDATE ocupaciones_cancha SET fecha=$1, hora_inicio=$2, hora_fin=$3 WHERE id_ocupacion_cancha=$4',
      [fecha, hi, hf, reserva.id_ocupacion_cancha]
    );
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
    
    // Eliminar recibos asociados al cobro primero
    await db.pool.query('DELETE FROM recibos WHERE id_cobro = $1', [r.id_cobro]);
    
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
    const claseSql = `INSERT INTO clases (nombre, capacidad_max, id_profesional, id_cancha, id_ocupacion_cancha, id_estado_capacitacion, id_club)
                  VALUES ($1, $2, $3, $4, $5, 1, 1) RETURNING id_clase`;
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
    const entSql = `INSERT INTO entrenamientos (capacidad_max, id_profesional, id_cancha, id_ocupacion_cancha, id_estado_capacitaciones, id_club)
                VALUES ($1, $2, $3, $4, 1, 1) RETURNING id_entrenamiento`;
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
             CASE
               WHEN NOW() < l.fecha_inicio THEN 'Programado'
               WHEN NOW() BETWEEN l.fecha_inicio AND l.fecha_fin THEN 'En curso'
               ELSE 'Finalizado'
             END AS estado
      FROM ligas l
      LEFT JOIN usuarios u ON l.id_usuario_tutor = u.id_usuario
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
            CASE
              WHEN NOW() < l.fecha_inicio THEN 'Programado'
              WHEN NOW() BETWEEN l.fecha_inicio AND l.fecha_fin THEN 'En curso'
              ELSE 'Finalizado'
            END AS estado
      FROM ligas l
      LEFT JOIN usuarios u ON l.id_usuario_tutor = u.id_usuario
      WHERE l.id_liga = $1
    `, [id]);
    if (!liga) return res.status(404).json({ error: 'Liga no encontrada' });
    
    const partidos = await db.query.all(`
      SELECT p.id_partido AS id, 
             e1.nombre AS equipo_local,
             e2.nombre AS equipo_visitante,
             p.goles_local, p.goles_visitante,
             to_char(p.fecha_hora, 'YYYY-MM-DD') AS fecha
      FROM partidos p
      LEFT JOIN equipos e1 ON p.id_equipo_local = e1.id_equipo
      LEFT JOIN equipos e2 ON p.id_equipo_visitante = e2.id_equipo
      WHERE p.id_liga = $1
    `, [id]);

    const equipos = await db.query.all(`
      SELECT e.id_equipo, e.nombre
      FROM participacion_ligas pl
      JOIN equipos e ON pl.id_equipo = e.id_equipo
      WHERE pl.id_liga = $1
    `, [id]);
    
    res.json({ ...liga, partidos, equipos });
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
    await db.pool.query('DELETE FROM participacion_ligas WHERE id_liga = $1', [id]);
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
      'SELECT id_equipo FROM participacion_ligas WHERE id_liga = $1', [id]
    );
    if (inscriptos.length < 2) return res.status(400).json({ error: 'Se necesitan al menos 2 equipos' });

    await db.pool.query('DELETE FROM partidos WHERE id_liga = $1', [id]);

    const equipos = inscriptos.map(i => i.id_equipo);
    const partidos = [];
    for (let i = 0; i < equipos.length; i++) {
      for (let j = i + 1; j < equipos.length; j++) {
        partidos.push([equipos[i], equipos[j], id]);
      }
    }

    for (const p of partidos) {
      await db.pool.query(
        'INSERT INTO partidos (id_equipo_local, id_equipo_visitante, id_liga) VALUES ($1, $2, $3)', p
      );
    }

    res.json({ message: `Fixture generado con ${partidos.length} partidos` });
  } catch (err) {
    res.status(500).json({ error: 'Error al generar fixture', message: err.message });
  }
};

const inscribirEnLiga = async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  try {
    await db.pool.query('BEGIN');
    const equipo = await db.pool.query(
      'INSERT INTO equipos (nombre) VALUES ($1) RETURNING id_equipo', [nombre]
    );
    const id_equipo = equipo.rows[0].id_equipo;
    await db.pool.query('INSERT INTO participacion_ligas (id_liga, id_equipo) VALUES ($1, $2)', [id, id_equipo]);
    await db.pool.query('COMMIT');
    res.status(201).json({ message: 'Equipo inscripto en la liga' });
  } catch (err) {
    await db.pool.query('ROLLBACK');
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
             CASE
               WHEN NOW() < t.fecha_inicio THEN 'Programado'
               WHEN NOW() BETWEEN t.fecha_inicio AND t.fecha_fin THEN 'En curso'
               ELSE 'Finalizado'
             END AS estado
      FROM torneos t
      LEFT JOIN usuarios u ON t.id_usuario_tutor = u.id_usuario
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
             CASE
               WHEN NOW() < t.fecha_inicio THEN 'Programado'
               WHEN NOW() BETWEEN t.fecha_inicio AND t.fecha_fin THEN 'En curso'
               ELSE 'Finalizado'
             END AS estado
      FROM torneos t
      LEFT JOIN usuarios u ON t.id_usuario_tutor = u.id_usuario
      WHERE t.id_torneo = $1
    `, [id]);
    if (!torneo) return res.status(404).json({ error: 'Torneo no encontrado' });

    const equipos = await db.query.all(`
      SELECT e.id_equipo, e.nombre
      FROM participacion_torneos pt
      JOIN equipos e ON pt.id_equipo = e.id_equipo
      WHERE pt.id_torneo = $1
    `, [id]);

    res.json({ ...torneo, equipos });
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
    await db.pool.query('DELETE FROM participacion_torneos WHERE id_torneo = $1', [id]);
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
      'SELECT id_equipo FROM participacion_torneos WHERE id_torneo = $1', [id]
    );
    if (inscriptos.length < 2) return res.status(400).json({ error: 'Se necesitan al menos 2 equipos' });

    await db.pool.query('DELETE FROM partidos WHERE id_torneo = $1', [id]);

    const equipos = inscriptos.map(i => i.id_equipo);
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

const eliminarEquipoTorneo = async (req, res) => {
  const { id, id_equipo } = req.params;
  try {
    await db.pool.query('BEGIN');
    await db.pool.query('DELETE FROM participacion_torneos WHERE id_torneo = $1 AND id_equipo = $2', [id, id_equipo]);
    await db.pool.query('DELETE FROM equipos WHERE id_equipo = $1', [id_equipo]);
    await db.pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar equipo', message: err.message });
  }
};

const inscribirEnTorneo = async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  try {
    await db.pool.query('BEGIN');
    const equipo = await db.pool.query(
      'INSERT INTO equipos (nombre) VALUES ($1) RETURNING id_equipo', [nombre]
    );
    const id_equipo = equipo.rows[0].id_equipo;
    await db.pool.query('INSERT INTO participacion_torneos (id_torneo, id_equipo) VALUES ($1, $2)', [id, id_equipo]);
    await db.pool.query('COMMIT');
    res.status(201).json({ message: 'Equipo inscripto en el torneo' });
  } catch (err) {
    await db.pool.query('ROLLBACK');
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

const crearReserva = async (req, res) => {
  const { id_usuario, id_cancha, fecha, hora_inicio, hora_fin, id_metodo_de_pago, monto, confirmar_pago } = req.body;

  if (!id_usuario || !id_cancha || !fecha || !hora_inicio || !hora_fin || !id_metodo_de_pago || monto === undefined || monto === null) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para realizar la reserva' });
  }

  const hi = hora_inicio.length === 5 ? `${hora_inicio}:00` : hora_inicio;
  const hf = hora_fin.length === 5 ? `${hora_fin}:00` : hora_fin;

  try {
    const validacion = await validarTurnoReserva(id_cancha, fecha, hi, hf);
    if (!validacion.ok) return res.status(409).json({ error: validacion.error });

    await db.pool.query('BEGIN');

    const estadoCobro = confirmar_pago ? 2 : 1;
    const cobroSql = `
      INSERT INTO cobros (monto, porcentaje_descuento, detalles, id_club, id_usuario, id_estado_cobro, id_metodo_de_pago)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_cobro
    `;
    const detalleCobro = confirmar_pago
      ? `Reserva confirmada por administrador (${fecha} ${hi}-${hf})`
      : `Reserva de cancha para la fecha ${fecha} de ${hi} a ${hf}`;
    const cobroRes = await db.pool.query(cobroSql, [
      monto, 0, detalleCobro, 1, id_usuario, estadoCobro, id_metodo_de_pago
    ]);
    const idCobro = cobroRes.rows[0].id_cobro;

    const ocupacionSql = `
      INSERT INTO ocupaciones_cancha (fecha, hora_inicio, hora_fin, id_tipo_ocupacion, id_cancha)
      VALUES ($1, $2, $3, 1, $4) RETURNING id_ocupacion_cancha
    `;
    const ocupacionRes = await db.pool.query(ocupacionSql, [fecha, hi, hf, id_cancha]);
    const idOcupacion = ocupacionRes.rows[0].id_ocupacion_cancha;

    const reservaSql = `
      INSERT INTO reservas (id_ocupacion_cancha, id_usuario, id_cancha, id_cobro)
      VALUES ($1, $2, $3, $4) RETURNING id_reserva
    `;
    const reservaRes = await db.pool.query(reservaSql, [idOcupacion, id_usuario, id_cancha, idCobro]);
    const idReserva = reservaRes.rows[0].id_reserva;

    let idRecibo = null;
    if (confirmar_pago) {
      const reciboRes = await db.pool.query(
        `INSERT INTO recibos (nro_transaccion, detalles, id_cobro) VALUES ($1, $2, $3) RETURNING id_recibos`,
        [`ADMIN_${Date.now()}`, 'Pago registrado por administrador al crear la reserva', idCobro]
      );
      idRecibo = reciboRes.rows[0].id_recibos;
    }

    await db.pool.query('COMMIT');
    res.status(201).json({
      message: confirmar_pago ? 'Reserva creada y pago confirmado' : 'Reserva creada exitosamente',
      id_reserva: idReserva,
      id_cobro: idCobro,
      id_recibo: idRecibo,
      estado_cobro: confirmar_pago ? 'Pagado' : 'Pendiente'
    });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al procesar la reserva', message: err.message });
  }
};

// Helper to convert objects to CSV
const convertToCSV = (objArray) => {
  if (objArray.length === 0) return '';
  const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
  const headers = Object.keys(array[0]);
  let str = headers.join(',') + '\r\n';

  for (let i = 0; i < array.length; i++) {
    let line = '';
    for (let index in headers) {
      if (line !== '') line += ',';
      let val = array[i][headers[index]];
      if (val === null || val === undefined) {
        val = '';
      } else {
        val = String(val).replace(/"/g, '""');
        if (val.search(/("|,|\n)/g) >= 0) {
          val = `"${val}"`;
        }
      }
      line += val;
    }
    str += line + '\r\n';
  }
  return str;
};

// Helper to send report data as CSV or JSON
const sendReport = (res, data, filename) => {
  const format = String(res.req.query.format || 'json').toLowerCase();
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
    return res.send(convertToCSV(data));
  }
  res.json(data);
};

// GET /admin/clases/:id/asistencias
const obtenerAsistenciasClase = async (req, res) => {
  const { id } = req.params;
  try {
    const claseSql = `
      SELECT c.id_clase AS id, c.nombre,
             u_prof.nombre || ' ' || u_prof.apellido AS profesor,
             to_char(oc.fecha, 'YYYY-MM-DD') AS fecha,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin
      FROM clases c
      LEFT JOIN usuarios u_prof ON c.id_profesional = u_prof.id_usuario
      LEFT JOIN ocupaciones_cancha oc ON c.id_ocupacion_cancha = oc.id_ocupacion_cancha
      WHERE c.id_clase = $1
    `;
    const clase = await db.query.get(claseSql, [id]);
    if (!clase) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }

    const alumnosSql = `
      SELECT u.id_usuario AS alumno_id, u.nombre, u.apellido, u.dni, u.email, u.telefono,
             COALESCE(a.estado, 'Sin registrar') AS asistencia_estado
      FROM clientes_clases cc
      INNER JOIN usuarios u ON cc.id_cliente = u.id_usuario
      LEFT JOIN asistencias a ON cc.id_asistencia = a.id_asistencia
      WHERE cc.id_clase = $1
      ORDER BY u.apellido ASC, u.nombre ASC
    `;
    const asistencias = await db.query.all(alumnosSql, [id]);

    res.json({ clase, asistencias });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reporte de asistencias de clase', message: err.message });
  }
};

// GET /admin/entrenamientos/:id/asistencias
const obtenerAsistenciasEntrenamiento = async (req, res) => {
  const { id } = req.params;
  try {
    const entSql = `
      SELECT e.id_entrenamiento AS id,
             u_prof.nombre || ' ' || u_prof.apellido AS entrenador,
             to_char(oc.fecha, 'YYYY-MM-DD') AS fecha,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin
      FROM entrenamientos e
      LEFT JOIN usuarios u_prof ON e.id_profesional = u_prof.id_usuario
      LEFT JOIN ocupaciones_cancha oc ON e.id_ocupacion_cancha = oc.id_ocupacion_cancha
      WHERE e.id_entrenamiento = $1
    `;
    const entrenamiento = await db.query.get(entSql, [id]);
    if (!entrenamiento) {
      return res.status(404).json({ error: 'Entrenamiento no encontrado' });
    }

    const alumnosSql = `
      SELECT u.id_usuario AS alumno_id, u.nombre, u.apellido, u.dni, u.email, u.telefono,
             COALESCE(a.estado, 'Sin registrar') AS asistencia_estado
      FROM clientes_entrenamientos ce
      INNER JOIN usuarios u ON ce.id_cliente = u.id_usuario
      LEFT JOIN asistencias a ON ce.id_asistencia = a.id_asistencia
      WHERE ce.id_entrenamiento = $1
      ORDER BY u.apellido ASC, u.nombre ASC
    `;
    const asistencias = await db.query.all(alumnosSql, [id]);

    res.json({ entrenamiento, asistencias });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reporte de asistencias de entrenamiento', message: err.message });
  }
};

// GET /admin/reportes/tipos-cancha
const reporteTiposCancha = async (req, res) => {
  try {
    const sql = `
      SELECT
        tc.id_tipo_de_cancha AS id,
        tc.tipo_cancha,
        tc.ancho,
        tc.largo,
        tc.capacidad,
        tc.duracion_min,
        tc.duracion_max,
        s.tipo_superficie AS superficie,
        COUNT(c.id_cancha)::int AS total_canchas,
        COALESCE(ROUND(AVG(c.precio_hora_reserva)::numeric, 2), 0) AS precio_promedio
      FROM tipos_de_cancha tc
      LEFT JOIN superficies s ON tc.id_superficie = s.id_superficie
      LEFT JOIN canchas c ON c.id_tipo_de_cancha = tc.id_tipo_de_cancha
      GROUP BY
        tc.id_tipo_de_cancha, tc.tipo_cancha,
        tc.ancho, tc.largo, tc.capacidad,
        tc.duracion_min, tc.duracion_max,
        s.tipo_superficie
      ORDER BY tc.id_tipo_de_cancha ASC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte de tipos de cancha', message: err.message });
  }
};

// GET /admin/reportes/canchas
const reporteCanchas = async (req, res) => {
  try {
    const sql = `
      SELECT c.id_cancha, c.nombre, c.tiempo_cancelacion, c.precio_hora_reserva,
             tc.tipo_cancha, tc.capacidad, tc.ancho, tc.largo
      FROM canchas c
      LEFT JOIN tipos_de_cancha tc ON c.id_tipo_de_cancha = tc.id_tipo_de_cancha
      ORDER BY c.id_cancha ASC
    `;
    const rows = await db.query.all(sql);
    sendReport(res, rows, 'reporte_canchas');
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte de canchas', message: err.message });
  }
};

// GET /admin/reportes/reservas
const reporteReservas = async (req, res) => {
  try {
    const sql = `
      SELECT r.id_reserva, can.nombre AS cancha,
             u.nombre AS cliente_nombre, u.apellido AS cliente_apellido, u.email AS cliente_email, u.dni AS cliente_dni,
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
      ORDER BY r.id_reserva ASC
    `;
    const rows = await db.query.all(sql);
    sendReport(res, rows, 'reporte_reservas');
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte de reservas', message: err.message });
  }
};

// GET /admin/reportes/clases
const reporteClases = async (req, res) => {
  try {
    const sql = `
      SELECT c.id_clase, c.nombre, c.capacidad_max,
             (SELECT COUNT(*)::int FROM clientes_clases WHERE id_clase = c.id_clase) AS inscriptos,
             u.nombre || ' ' || u.apellido AS profesor,
             can.nombre AS cancha,
             to_char(oc.fecha, 'YYYY-MM-DD') AS fecha,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin
      FROM clases c
      LEFT JOIN usuarios u ON c.id_profesional = u.id_usuario
      LEFT JOIN canchas can ON c.id_cancha = can.id_cancha
      LEFT JOIN ocupaciones_cancha oc ON c.id_ocupacion_cancha = oc.id_ocupacion_cancha
      ORDER BY c.id_clase ASC
    `;
    const rows = await db.query.all(sql);
    sendReport(res, rows, 'reporte_clases');
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte de clases', message: err.message });
  }
};

// GET /admin/reportes/entrenamientos
const reporteEntrenamientos = async (req, res) => {
  try {
    const sql = `
      SELECT e.id_entrenamiento, e.capacidad_max,
             (SELECT COUNT(*)::int FROM clientes_entrenamientos WHERE id_entrenamiento = e.id_entrenamiento) AS inscriptos,
             u.nombre || ' ' || u.apellido AS entrenador,
             can.nombre AS cancha,
             to_char(oc.fecha, 'YYYY-MM-DD') AS fecha,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin
      FROM entrenamientos e
      LEFT JOIN usuarios u ON e.id_profesional = u.id_usuario
      LEFT JOIN canchas can ON e.id_cancha = can.id_cancha
      LEFT JOIN ocupaciones_cancha oc ON e.id_ocupacion_cancha = oc.id_ocupacion_cancha
      ORDER BY e.id_entrenamiento ASC
    `;
    const rows = await db.query.all(sql);
    sendReport(res, rows, 'reporte_entrenamientos');
  } catch (err) {
    res.status(500).json({ error: 'Error al generar reporte de entrenamientos', message: err.message });
  }
};

const eliminarEquipoLiga = async (req, res) => {
  const { id, id_equipo } = req.params;
  try {
    await db.pool.query('BEGIN');
    await db.pool.query('DELETE FROM participacion_ligas WHERE id_liga = $1 AND id_equipo = $2', [id, id_equipo]);
    await db.pool.query('DELETE FROM equipos WHERE id_equipo = $1', [id_equipo]);
    await db.pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al eliminar equipo', message: err.message });
  }
};

// --- Validación de solapamiento para reservas ---
const validarTurnoReserva = async (id_cancha, fecha, hora_inicio, hora_fin, excluirOcupacionId = null) => {
  const ahora = new Date();
  const hoyStr = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  if (fecha < hoyStr) {
    return { ok: false, error: 'No se puede reservar o modificar a una fecha pasada' };
  }
  if (fecha === hoyStr) {
    const [h, m] = String(hora_inicio).substring(0, 5).split(':').map(Number);
    const inicio = new Date();
    inicio.setHours(h, m || 0, 0, 0);
    if (inicio <= ahora) {
      return { ok: false, error: 'No se puede reservar o modificar a un horario que ya pasó' };
    }
  }

  const params = [id_cancha, fecha, hora_inicio, hora_fin];
  let sql = `
    SELECT id_ocupacion_cancha FROM ocupaciones_cancha
    WHERE id_cancha = $1 AND fecha = $2
      AND hora_inicio < $4 AND hora_fin > $3
  `;
  if (excluirOcupacionId) {
    sql += ' AND id_ocupacion_cancha <> $5';
    params.push(excluirOcupacionId);
  }
  const superposicion = await db.query.get(sql, params);
  if (superposicion) {
    return { ok: false, error: 'Ya existe una ocupación en ese horario para esa cancha' };
  }
  return { ok: true };
};

// GET /admin/certificaciones/pendientes
const listarCertificacionesPendientes = async (req, res) => {
  try {
    const rows = await db.query.all(`
      SELECT c.id_certificacion AS id, c.matricula,
             u.nombre || ' ' || u.apellido AS nombre_profesional,
             to_char(c.fecha_caducidad, 'DD/MM/YYYY') AS fecha
      FROM certificaciones c
      INNER JOIN usuarios u ON c.id_usuario = u.id_usuario
      WHERE c.validada = false
      ORDER BY c.id_certificacion DESC
    `);
    res.json(rows.map(r => {
      const parsed = parseMatriculaCertificacion(r.matricula);
      return {
        id: r.id,
        nombre_certificacion: parsed.nombre,
        institucion: parsed.institucion,
        nombre_profesional: r.nombre_profesional,
        fecha: r.fecha
      };
    }));
  } catch (err) {
    res.status(500).json({ error: 'Error al listar certificaciones pendientes', message: err.message });
  }
};

const aprobarCertificacionPendiente = async (req, res) => {
  const { id } = req.params;
  try {
    const cert = await db.query.get('SELECT id_certificacion FROM certificaciones WHERE id_certificacion = $1 AND validada = false', [id]);
    if (!cert) return res.status(404).json({ error: 'Certificación pendiente no encontrada' });
    await db.query.run('UPDATE certificaciones SET validada = true WHERE id_certificacion = $1', [id]);
    res.json({ message: 'Certificación aprobada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al aprobar certificación', message: err.message });
  }
};

const rechazarCertificacionPendiente = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.pool.query('DELETE FROM certificaciones WHERE id_certificacion = $1 AND validada = false', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Certificación pendiente no encontrada' });
    res.json({ message: 'Certificación rechazada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al rechazar certificación', message: err.message });
  }
};

// GET /admin/bajas/pendientes
const listarBajasPendientes = async (req, res) => {
  try {
    const rows = await db.query.all(`
      SELECT s.id_solicitud AS id, s.tipo, s.rol, s.motivo,
             COALESCE(uo.nombre || ' ' || uo.apellido, us.nombre || ' ' || us.apellido) AS nombre,
             to_char(s.fecha_solicitud, 'DD/MM/YYYY') AS fecha
      FROM solicitudes_admin s
      LEFT JOIN usuarios us ON s.id_usuario_solicitante = us.id_usuario
      LEFT JOIN usuarios uo ON s.id_usuario_objetivo = uo.id_usuario
      WHERE s.estado = 'pendiente' AND s.tipo IN ('baja', 'alumno')
      ORDER BY s.fecha_solicitud DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar solicitudes de baja', message: err.message });
  }
};

const procesarBajaAprobada = async (solicitud) => {
  const idUsuario = solicitud.id_usuario_solicitante;
  const rol = (solicitud.rol || '').toLowerCase();

  if (rol === 'cliente' || rol === 'client') {
    await db.pool.query('BEGIN');
    const resReservas = await db.pool.query('SELECT id_ocupacion_cancha, id_cobro FROM reservas WHERE id_usuario = $1', [idUsuario]);
    const ocupacionIds = resReservas.rows.map(r => r.id_ocupacion_cancha).filter(Boolean);
    await db.pool.query('DELETE FROM reservas WHERE id_usuario = $1', [idUsuario]);
    if (ocupacionIds.length) {
      await db.pool.query('DELETE FROM ocupaciones_cancha WHERE id_ocupacion_cancha = ANY($1::int[])', [ocupacionIds]);
    }
    const resCobros = await db.pool.query('SELECT id_cobro FROM cobros WHERE id_usuario = $1', [idUsuario]);
    const cobroIds = resCobros.rows.map(r => r.id_cobro);
    if (cobroIds.length) {
      await db.pool.query('DELETE FROM recibos WHERE id_cobro = ANY($1::int[])', [cobroIds]);
      await db.pool.query('DELETE FROM cobros WHERE id_cobro = ANY($1::int[])', [cobroIds]);
    }
    await db.pool.query('DELETE FROM clientes_clases WHERE id_cliente = $1', [idUsuario]);
    await db.pool.query('DELETE FROM clientes_entrenamientos WHERE id_cliente = $1', [idUsuario]);
    await db.pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [idUsuario]);
    await db.pool.query('COMMIT');
    return;
  }

  if (rol === 'profesor' || rol === 'profesor de educación física') {
    await db.pool.query('BEGIN');
    await db.pool.query('DELETE FROM certificaciones WHERE id_usuario = $1', [idUsuario]);
    await db.pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [idUsuario]);
    await db.pool.query('COMMIT');
    return;
  }

  if (rol === 'entrenador') {
    await db.pool.query('BEGIN');
    await db.pool.query('DELETE FROM certificaciones WHERE id_usuario = $1', [idUsuario]);
    await db.pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [idUsuario]);
    await db.pool.query('COMMIT');
  }
};

const aprobarBajaPendiente = async (req, res) => {
  const { id } = req.params;
  try {
    const solicitud = await obtenerSolicitudPendiente(id);
    if (!solicitud || !['baja', 'alumno'].includes(solicitud.tipo)) {
      return res.status(404).json({ error: 'Solicitud de baja no encontrada' });
    }

    if (solicitud.tipo === 'alumno') {
      if (solicitud.referencia_tipo === 'clase') {
        await db.pool.query(
          'DELETE FROM clientes_clases WHERE id_clase = $1 AND id_cliente = $2',
          [solicitud.id_referencia, solicitud.id_usuario_objetivo]
        );
      } else if (solicitud.referencia_tipo === 'entrenamiento') {
        await db.pool.query(
          'DELETE FROM clientes_entrenamientos WHERE id_entrenamiento = $1 AND id_cliente = $2',
          [solicitud.id_referencia, solicitud.id_usuario_objetivo]
        );
      }
    } else {
      await procesarBajaAprobada(solicitud);
    }

    await marcarSolicitud(id, 'aprobada');
    res.json({ message: 'Solicitud de baja aprobada' });
  } catch (err) {
    await db.pool.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'Error al aprobar solicitud de baja', message: err.message });
  }
};

const rechazarBajaPendiente = async (req, res) => {
  const { id } = req.params;
  try {
    const solicitud = await obtenerSolicitudPendiente(id);
    if (!solicitud || !['baja', 'alumno'].includes(solicitud.tipo)) {
      return res.status(404).json({ error: 'Solicitud de baja no encontrada' });
    }
    await marcarSolicitud(id, 'rechazada');
    res.json({ message: 'Solicitud de baja rechazada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al rechazar solicitud de baja', message: err.message });
  }
};

// GET /admin/horarios/pendientes
const listarHorariosPendientes = async (req, res) => {
  try {
    const rows = await db.query.all(`
      SELECT s.id_solicitud AS id, s.datos, s.motivo,
             u.nombre || ' ' || u.apellido AS nombre_profesional,
             to_char(s.fecha_solicitud, 'DD/MM/YYYY') AS fecha
      FROM solicitudes_admin s
      LEFT JOIN usuarios u ON s.id_usuario_solicitante = u.id_usuario
      WHERE s.estado = 'pendiente' AND s.tipo = 'cambio_horario'
      ORDER BY s.fecha_solicitud DESC
    `);
    res.json(rows.map(r => {
      const d = typeof r.datos === 'string' ? JSON.parse(r.datos) : (r.datos || {});
      return {
        id: r.id,
        actividad: d.actividad || 'Modificación de reserva',
        nombre_profesional: r.nombre_profesional,
        horario_nuevo: d.horario_nuevo || '—',
        fecha: r.fecha
      };
    }));
  } catch (err) {
    res.status(500).json({ error: 'Error al listar cambios de horario pendientes', message: err.message });
  }
};

const aprobarHorarioPendiente = async (req, res) => {
  const { id } = req.params;
  try {
    const solicitud = await obtenerSolicitudPendiente(id);
    if (!solicitud || solicitud.tipo !== 'cambio_horario') {
      return res.status(404).json({ error: 'Solicitud de cambio de horario no encontrada' });
    }
    const datos = typeof solicitud.datos === 'string' ? JSON.parse(solicitud.datos) : (solicitud.datos || {});
    const { id_reserva, fecha, hora_inicio, hora_fin, id_cancha } = datos;

    const reserva = await db.query.get(
      'SELECT id_ocupacion_cancha, id_cancha FROM reservas WHERE id_reserva = $1',
      [id_reserva]
    );
    if (!reserva) return res.status(404).json({ error: 'Reserva asociada no encontrada' });

    const validacion = await validarTurnoReserva(
      id_cancha || reserva.id_cancha,
      fecha,
      hora_inicio,
      hora_fin,
      reserva.id_ocupacion_cancha
    );
    if (!validacion.ok) return res.status(409).json({ error: validacion.error });

    await db.query.run(
      'UPDATE ocupaciones_cancha SET fecha=$1, hora_inicio=$2, hora_fin=$3 WHERE id_ocupacion_cancha=$4',
      [fecha, hora_inicio, hora_fin, reserva.id_ocupacion_cancha]
    );
    await marcarSolicitud(id, 'aprobada');
    res.json({ message: 'Cambio de horario aprobado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al aprobar cambio de horario', message: err.message });
  }
};

const rechazarHorarioPendiente = async (req, res) => {
  const { id } = req.params;
  try {
    const solicitud = await obtenerSolicitudPendiente(id);
    if (!solicitud || solicitud.tipo !== 'cambio_horario') {
      return res.status(404).json({ error: 'Solicitud de cambio de horario no encontrada' });
    }
    await marcarSolicitud(id, 'rechazada');
    res.json({ message: 'Cambio de horario rechazado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al rechazar cambio de horario', message: err.message });
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
  crearReserva,
  obtenerAsistenciasClase,
  obtenerAsistenciasEntrenamiento,
  reporteTiposCancha,
  reporteCanchas,
  reporteReservas,
  reporteClases,
  reporteEntrenamientos,
  eliminarEquipoLiga,
  eliminarEquipoTorneo,
  listarCertificacionesPendientes,
  aprobarCertificacionPendiente,
  rechazarCertificacionPendiente,
  listarBajasPendientes,
  aprobarBajaPendiente,
  rechazarBajaPendiente,
  listarHorariosPendientes,
  aprobarHorarioPendiente,
  rechazarHorarioPendiente
};
