const db = require('../config/db.js');

// GET /cliente/perfil
const obtenerPerfil = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  try {
    // 💡 SOLUCIÓN: Agregados los IDs ocultos que el frontend necesita para no enviar nulls
    const sql = `
      SELECT u.id_usuario, u.id_usuario AS id, u.user_level, u.username, u.nombre, u.apellido, u.email, u.fecha_nacimiento,
             u.dni, u.telefono, u.fecha_registro,
             u.id_genero, g.genero AS genero,
             u.id_nacionalidad, pa.nombre AS nacionalidad,
             d.calle, d.numero, d.codigo_postal,
             d.id_localidad, loc.nombre AS localidad, prov.nombre AS provincia
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
    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el perfil', message: err.message });
  }
};

// PUT /cliente/perfil
const modificarPerfil = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const {
    username, nombre, apellido, email, fecha_nacimiento, dni, telefono, id_genero, id_nacionalidad,
    calle, numero, codigo_postal, id_localidad
  } = req.body;

  try {
    await db.pool.query('BEGIN');

    // 1. Modificar usuario
    const userSql = `
      UPDATE usuarios
      SET username = $1, nombre = $2, apellido = $3, email = $4,
          fecha_nacimiento = $5, dni = $6, telefono = $7, id_genero = $8, id_nacionalidad = $9
      WHERE id_usuario = $10
    `;
    await db.pool.query(userSql, [
      username, nombre, apellido, email,
      fecha_nacimiento, dni, telefono, id_genero, id_nacionalidad,
      idUsuario
    ]);

    // 2. Modificar dirección del usuario
    const dirSql = `
      UPDATE direcciones
      SET calle = $1, numero = $2, codigo_postal = $3, id_localidad = $4
      WHERE id_direccion = (SELECT id_direccion FROM usuarios WHERE id_usuario = $5)
    `;
    await db.pool.query(dirSql, [calle, numero, codigo_postal, id_localidad, idUsuario]);

    await db.pool.query('COMMIT');
    res.json({ message: 'Perfil y dirección actualizados exitosamente' });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al actualizar el perfil', message: err.message });
  }
};

// GET /cliente/canchas (Filtros y listados)
const listarCanchasCliente = async (req, res) => {
  const { idTipoCancha } = req.query;
  try {
    let sql = `
      SELECT can.id_cancha AS id, can.nombre, 
             tc.tipo_cancha AS categoria, can.precio_hora_reserva AS precio, tc.imagen_url 
      FROM canchas can 
      LEFT JOIN tipos_de_cancha tc ON can.id_tipo_de_cancha = tc.id_tipo_de_cancha
    `;
    const params = [];
    if (idTipoCancha) {
      sql += ' WHERE can.id_tipo_de_cancha = $1';
      params.push(idTipoCancha);
    }
    const canchas = await db.query.all(sql, params);
    res.json(canchas);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar canchas para el cliente', message: err.message });
  }
};

// GET /cliente/canchas/:id (Listar canchas según tipo de cancha)
const listarCanchasClientePorTipo = async (req, res) => {
  const { id } = req.params;
  try {
    const sql = `
      SELECT 
        can.id_cancha AS id,
        can.nombre,
        tc.tipo_cancha,
        tc.ancho,
        tc.largo,
        tc.capacidad,
        s.id_superficie AS superficie_id,
        s.tipo_superficie AS superficie_tipo,
        s.descripcion AS superficie_descripcion,
        can.precio_hora_reserva,
        can.tiempo_cancelacion,
        tc.duracion_min,
        tc.duracion_max,
        cl.id_club AS club_id,
        cl.nombre AS club_nombre,
        tc.imagen_url
      FROM canchas can
      LEFT JOIN tipos_de_cancha tc ON can.id_tipo_de_cancha = tc.id_tipo_de_cancha
      LEFT JOIN superficies s ON tc.id_superficie = s.id_superficie
      LEFT JOIN clubes cl ON can.id_club = cl.id_club
      WHERE can.id_tipo_de_cancha = $1
    `;
    const rows = await db.query.all(sql, [id]);
    
    const canchasFormateadas = rows.map(row => ({
      id: row.id,
      nombre: row.nombre,
      tipo_cancha: row.tipo_cancha,
      ancho: row.ancho,
      largo: row.largo,
      capacidad: row.capacidad,
      superficie: {
        id: row.superficie_id,
        tipo: row.superficie_tipo,
        descripcion: row.superficie_descripcion
      },
      precio_hora_reserva: row.precio_hora_reserva,
      tiempo_cancelacion: row.tiempo_cancelacion,
      duracion_min: row.duracion_min,
      duracion_max: row.duracion_max,
      club: {
        id: row.club_id,
        nombre: row.club_nombre
      },
      imagen_url: row.imagen_url
    }));

    res.json(canchasFormateadas);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar canchas por tipo de cancha', message: err.message });
  }
};

// GET /cliente/tipos_canchas
const listarTiposCanchaCliente = async (req, res) => {
  try {
    const sql = `
      SELECT 
        tc.id_tipo_de_cancha AS id,
        tc.tipo_cancha AS tipo,
        tc.duracion_min,
        tc.duracion_max,
        tc.ancho,
        tc.largo,
        tc.capacidad,
        s.tipo_superficie AS superficie,
        s.descripcion AS descripcion_superficie,
        tc.imagen_url
      FROM tipos_de_cancha tc
      LEFT JOIN superficies s ON tc.id_superficie = s.id_superficie
      ORDER BY tc.id_tipo_de_cancha ASC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar las categorías de canchas', message: err.message });
  }
};

// Helpers de conversión de tiempo para disponibilidad
const timeToMinutes = (t) => {
  if (!t) return 0;
  const parts = t.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

const minutesToTime = (min) => {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

// GET /cliente/canchas/:id/disponibilidad (Consultar disponibilidad y ocupación de cancha específica por fecha)
const consultarDisponibilidadCanchaEspecifica = async (req, res) => {
  const { id } = req.params;
  const { fecha } = req.query;

  if (!fecha) {
    return res.status(400).json({ error: 'Se requiere el parámetro "fecha" en formato YYYY-MM-DD' });
  }

  try {
    // 1. Obtener día de la semana de la fecha (en español)
    const dateObj = new Date(`${fecha}T00:00:00`);
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaSemana = daysOfWeek[dateObj.getDay()];

    // 2. Obtener la cancha física
    const queryCancha = `
      SELECT c.id_cancha, c.nombre, c.id_tipo_de_cancha, 
             COALESCE(tc.duracion_max, 60) AS duracion_turno,
             tc.tipo_cancha AS categoria
      FROM canchas c
      INNER JOIN tipos_de_cancha tc ON c.id_tipo_de_cancha = tc.id_tipo_de_cancha
      WHERE c.id_cancha = $1
    `;
    const cancha = await db.query.get(queryCancha, [id]);
    if (!cancha) {
      return res.status(404).json({ error: 'Cancha no encontrada' });
    }

    // 3. Obtener todas las ocupaciones para la fecha en esta cancha con detalles descriptivos
    const sqlOcupaciones = `
      SELECT 
        oc.id_ocupacion_cancha,
        to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio, 
        to_char(oc.hora_fin, 'HH24:MI') AS hora_fin, 
        oc.id_tipo_ocupacion,
        toc.tipo_ocupacion AS tipo,
        COALESCE(
          u_res.nombre || ' ' || u_res.apellido,
          clase.nombre,
          'Entrenamiento',
          de.motivo,
          toc.tipo_ocupacion
        ) AS detalle
      FROM ocupaciones_cancha oc
      LEFT JOIN tipos_de_ocupaciones toc ON oc.id_tipo_ocupacion = toc.id_tipo_ocupacion
      LEFT JOIN reservas r ON oc.id_ocupacion_cancha = r.id_ocupacion_cancha
      LEFT JOIN usuarios u_res ON r.id_usuario = u_res.id_usuario
      LEFT JOIN clases clase ON oc.id_ocupacion_cancha = clase.id_ocupacion_cancha
      LEFT JOIN entrenamientos ent ON oc.id_ocupacion_cancha = ent.id_ocupacion_cancha
      LEFT JOIN disponibilidad_excepciones de ON (oc.id_cancha = de.id_cancha AND oc.fecha = de.dia AND oc.hora_inicio = de.hora_inicio)
      WHERE oc.id_cancha = $1 AND oc.fecha = $2
      ORDER BY oc.hora_inicio ASC
    `;
    const ocupaciones = await db.query.all(sqlOcupaciones, [id, fecha]);

    // 4. Obtener la disponibilidad de atención cargada para el día de la semana
    const queryDisp = `
      SELECT to_char(hora_inicio, 'HH24:MI') AS hora_inicio, 
             to_char(hora_fin, 'HH24:MI') AS hora_fin
      FROM disponibilidad
      WHERE dia_semana = $1 AND id_cancha = $2
    `;
    const dispCancha = await db.query.get(queryDisp, [diaSemana, id]);
    const horaApertura = dispCancha ? dispCancha.hora_inicio : "08:00";
    const horaCierre = dispCancha ? dispCancha.hora_fin : "22:00";

    const startMin = timeToMinutes(horaApertura);
    const endMin = timeToMinutes(horaCierre);
    const step = cancha.duracion_turno;

    const franjas = [];
    for (let time = startMin; time + step <= endMin; time += step) {
      const slotStart = time;
      const slotEnd = time + step;

      const strInicio = minutesToTime(slotStart);
      const strFin = minutesToTime(slotEnd);

      let estado = 'DISPONIBLE';
      let detalleOcupacion = null;

      const overlap = ocupaciones.find(oc => {
        const ocStart = timeToMinutes(oc.hora_inicio);
        const ocEnd = timeToMinutes(oc.hora_fin);
        return ocStart < slotEnd && ocEnd > slotStart;
      });

      if (overlap) {
        if (parseInt(overlap.id_tipo_ocupacion) === 6) {
          estado = 'MANTENIMIENTO';
        } else {
          estado = 'RESERVADO';
        }
        detalleOcupacion = {
          id_ocupacion: overlap.id_ocupacion_cancha,
          tipo: overlap.tipo,
          detalle: overlap.detalle
        };
      }

      franjas.push({
        horaInicio: strInicio,
        horaFin: strFin,
        estado,
        ocupacion: detalleOcupacion
      });
    }

    res.json({
      id_cancha: cancha.id_cancha,
      nombreCancha: cancha.nombre,
      categoria: cancha.categoria,
      fecha,
      diaSemana,
      horaApertura,
      horaCierre,
      franjasHorarias: franjas,
      ocupacionesDetalladas: ocupaciones.map(oc => ({
        id_ocupacion: oc.id_ocupacion_cancha,
        hora_inicio: oc.hora_inicio,
        hora_fin: oc.hora_fin,
        tipo: oc.tipo,
        detalle: oc.detalle
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar disponibilidad y ocupaciones de la cancha', message: err.message });
  }
};

// GET /cliente/canchas/:id/ocupaciones (Consultar ocupaciones de cancha específica por fecha)
const consultarOcupacionesCanchaEspecifica = async (req, res) => {
  const { id } = req.params;
  const { fecha } = req.query;

  if (!fecha) {
    return res.status(400).json({ error: 'Se requiere el parámetro "fecha" en formato YYYY-MM-DD' });
  }

  try {
    const sqlOcupaciones = `
      SELECT 
        oc.id_ocupacion_cancha AS id_ocupacion,
        to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio, 
        to_char(oc.hora_fin, 'HH24:MI') AS hora_fin, 
        oc.id_tipo_ocupacion,
        toc.tipo_ocupacion AS tipo,
        COALESCE(
          u_res.nombre || ' ' || u_res.apellido,
          clase.nombre,
          'Entrenamiento',
          de.motivo,
          toc.tipo_ocupacion
        ) AS detalle
      FROM ocupaciones_cancha oc
      LEFT JOIN tipos_de_ocupaciones toc ON oc.id_tipo_ocupacion = toc.id_tipo_ocupacion
      LEFT JOIN reservas r ON oc.id_ocupacion_cancha = r.id_ocupacion_cancha
      LEFT JOIN usuarios u_res ON r.id_usuario = u_res.id_usuario
      LEFT JOIN clases clase ON oc.id_ocupacion_cancha = clase.id_ocupacion_cancha
      LEFT JOIN entrenamientos ent ON oc.id_ocupacion_cancha = ent.id_ocupacion_cancha
      LEFT JOIN disponibilidad_excepciones de ON (oc.id_cancha = de.id_cancha AND oc.fecha = de.dia AND oc.hora_inicio = de.hora_inicio)
      WHERE oc.id_cancha = $1 AND oc.fecha = $2
      ORDER BY oc.hora_inicio ASC
    `;
    const ocupaciones = await db.query.all(sqlOcupaciones, [id, fecha]);

    res.json(ocupaciones.map(oc => ({
      id_ocupacion: oc.id_ocupacion,
      hora_inicio: oc.hora_inicio,
      hora_fin: oc.hora_fin,
      tipo: oc.tipo,
      detalle: oc.detalle
    })));
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar ocupaciones de la cancha', message: err.message });
  }
};

// POST /cliente/reservas
const realizarReserva = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id_cancha, fecha, hora_inicio, hora_fin, id_metodo_de_pago, monto } = req.body;

  if (!id_cancha || !fecha || !hora_inicio || !hora_fin || !id_metodo_de_pago || !monto) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para realizar la reserva' });
  }

  try {
    await db.pool.query('BEGIN');

    // 1. Crear el registro en cobros (id_estado_cobro = 1 -> 'Pendiente')
    const cobroSql = `
      INSERT INTO cobros (monto, porcentaje_descuento, detalles, id_club, id_usuario, id_estado_cobro, id_metodo_de_pago)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_cobro
    `;
    const cobroRes = await db.pool.query(cobroSql, [
      monto,
      0, // Sin descuento por defecto
      `Reserva de cancha para la fecha ${fecha} de ${hora_inicio} a ${hora_fin}`,
      1, // id_club = 1 por defecto
      idUsuario,
      1, // id_estado_cobro = 1 ('Pendiente')
      id_metodo_de_pago
    ]);
    const idCobro = cobroRes.rows[0].id_cobro;

    // 2. Crear ocupación de cancha (id_tipo_ocupacion = 1 -> 'Reserva')
    const ocupacionSql = `
      INSERT INTO ocupaciones_cancha (fecha, hora_inicio, hora_fin, id_tipo_ocupacion, id_cancha)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_ocupacion_cancha
    `;
    const ocupacionRes = await db.pool.query(ocupacionSql, [
      fecha,
      hora_inicio,
      hora_fin,
      1, // id_tipo_ocupacion = 1 ('Reserva')
      id_cancha
    ]);
    const idOcupacion = ocupacionRes.rows[0].id_ocupacion_cancha;

    // 3. Crear la reserva final
    const reservaSql = `
      INSERT INTO reservas (id_ocupacion_cancha, id_usuario, id_cancha, id_cobro)
      VALUES ($1, $2, $3, $4)
      RETURNING id_reserva
    `;
    const reservaRes = await db.pool.query(reservaSql, [idOcupacion, idUsuario, id_cancha, idCobro]);
    const idReserva = reservaRes.rows[0].id_reserva;

    await db.pool.query('COMMIT');
    res.status(201).json({
      message: 'Reserva creada exitosamente (Estado PENDIENTE de pago)',
      id_reserva: idReserva,
      id_ocupacion_cancha: idOcupacion,
      id_cobro: idCobro
    });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al procesar la reserva', message: err.message });
  }
};

// GET /cliente/cobros (Historial de Pagos)
const listarMisPagos = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  try {
    const sql = `
      SELECT cob.id_cobro AS id, cob.monto, 
             to_char(cob.fecha, 'DD/MM/YYYY HH24:MI') AS fecha_pago, 
             ec.estado AS estado, 
             mp.nombre AS metodo 
      FROM cobros cob 
      LEFT JOIN estados_cobro ec ON cob.id_estado_cobro = ec.id_estado_cobro 
      LEFT JOIN metodos_de_pago mp ON cob.id_metodo_de_pago = mp.id_metodo_de_pago 
      WHERE cob.id_usuario = $1 
      ORDER BY cob.fecha DESC
    `;
    const rows = await db.query.all(sql, [idUsuario]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar cobros', message: err.message });
  }
};


const listarReservasCliente = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  try {
    const sql = `
      SELECT r.id_reserva, 
             to_char(oc.fecha, 'YYYY-MM-DD') AS fecha,
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio,
             to_char(oc.hora_fin, 'HH24:MI') AS hora_fin, 
             c.nombre AS cancha_nombre, 
             tc.tipo_cancha, 
             CASE 
               WHEN ec.estado = 'Pagado' THEN 'Confirmada'
               WHEN ec.estado = 'Pendiente' THEN 'Pendiente'
               WHEN ec.estado = 'Cancelado' THEN 'Cancelada'
               ELSE COALESCE(ec.estado, 'Pendiente')
             END AS estado
      FROM reservas r
      JOIN canchas c ON r.id_cancha = c.id_cancha
      JOIN tipos_de_cancha tc ON c.id_tipo_de_cancha = tc.id_tipo_de_cancha
      JOIN ocupaciones_cancha oc ON r.id_ocupacion_cancha = oc.id_ocupacion_cancha
      LEFT JOIN cobros cob ON r.id_cobro = cob.id_cobro
      LEFT JOIN estados_cobro ec ON cob.id_estado_cobro = ec.id_estado_cobro
      WHERE r.id_usuario = $1
      ORDER BY oc.fecha DESC, oc.hora_inicio DESC
    `;
    const rows = await db.query.all(sql, [idUsuario]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar reservas', message: err.message });
  }
};

const listarClasesCliente = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  try {
    const sql = `
      SELECT cc.id_cliente_clase AS id_inscripcion,
             c.id_clase,
             c.nombre AS nombre_clase,
             c.capacidad_max AS capacidad_maxima,
             COALESCE(u.nombre || ' ' || u.apellido, 'Por asignar') AS profesor
      FROM clientes_clases cc
      JOIN clases c ON cc.id_clase = c.id_clase
      LEFT JOIN usuarios u ON c.id_profesional = u.id_usuario
      WHERE cc.id_cliente = $1 AND (u.user_level = 'profesor' OR c.id_profesional IS NULL)
      ORDER BY c.nombre ASC
    `;
    const rows = await db.query.all(sql, [idUsuario]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar clases del cliente', message: err.message });
  }
};

const listarEntrenamientosCliente = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  try {
    const sql = `
      SELECT ce.id_cliente_capacitacion AS id_inscripcion,
             e.id_entrenamiento,
             'Entrenamiento ' || COALESCE(can.nombre, '') AS nombre_entrenamiento,
             e.capacidad_max AS capacidad_maxima,
             COALESCE(u.nombre || ' ' || u.apellido, 'Preparador asignado') AS entrenador
      FROM clientes_entrenamientos ce
      JOIN entrenamientos e ON ce.id_entrenamiento = e.id_entrenamiento
      LEFT JOIN canchas can ON e.id_cancha = can.id_cancha
      LEFT JOIN usuarios u ON e.id_profesional = u.id_usuario
      WHERE ce.id_cliente = $1 AND (u.user_level = 'entrenador' OR e.id_profesional IS NULL)
      ORDER BY e.id_entrenamiento ASC
    `;
    const rows = await db.query.all(sql, [idUsuario]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al listar entrenamientos del cliente', message: err.message });
  }
};

const listarClasesDisponibles = async (req, res) => {
  try {
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
      WHERE u.user_level = 'profesor' OR c.id_profesional IS NULL
      ORDER BY c.nombre ASC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clases disponibles', message: err.message });
  }
};

const listarEntrenamientosDisponibles = async (req, res) => {
  try {
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
      WHERE u.user_level = 'entrenador' OR e.id_profesional IS NULL
      ORDER BY e.id_entrenamiento ASC
    `;
    const rows = await db.query.all(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener entrenamientos disponibles', message: err.message });
  }
};

// PUT /cliente/reservas/:id (Modificar Horario)
const modificarReserva = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;
  const { fecha, hora_inicio, hora_fin } = req.body;

  try {
    const updateSql = `
      UPDATE ocupaciones_cancha oc
      SET fecha = $1, hora_inicio = $2, hora_fin = $3
      FROM reservas r
      WHERE oc.id_ocupacion_cancha = r.id_ocupacion_cancha
        AND r.id_reserva = $4 AND r.id_usuario = $5
      RETURNING oc.id_ocupacion_cancha
    `;
    const result = await db.pool.query(updateSql, [fecha, hora_inicio, hora_fin, id, idUsuario]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada o no pertenece al usuario' });
    }

    res.json({ message: 'Horario de reserva modificado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al modificar la reserva', message: err.message });
  }
};

// DELETE /cliente/reservas/:id
const cancelarReserva = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;

  try {
    // 1. Obtener la reserva, ocupación y cobro asociado
    const queryRes = `
      SELECT r.id_ocupacion_cancha, r.id_cobro, oc.fecha, oc.hora_inicio 
      FROM reservas r
      INNER JOIN ocupaciones_cancha oc ON r.id_ocupacion_cancha = oc.id_ocupacion_cancha
      WHERE r.id_reserva = $1 AND r.id_usuario = $2
    `;
    const reserva = await db.query.get(queryRes, [id, idUsuario]);

    if (!reserva) {
      return res.status(404).json({ error: 'Reserva no encontrada o no pertenece al usuario' });
    }

    // Regla de Negocio: Verificar si falta más o menos de 6 horas
    const now = new Date();
    const fechaString = reserva.fecha instanceof Date 
      ? reserva.fecha.toISOString().split('T')[0] 
      : String(reserva.fecha).split('T')[0];
    const [year, month, day] = fechaString.split('-');
    const [hours, minutes] = reserva.hora_inicio.split(':');
    const reservaTime = new Date(year, month - 1, day, hours, minutes);
    const diffHours = (reservaTime - now) / (1000 * 60 * 60);

    await db.pool.query('BEGIN');

    // 2. Eliminar la reserva y la ocupación de cancha de una vez (Transacción manual segura en PostgreSQL)
    await db.pool.query('DELETE FROM reservas WHERE id_reserva = $1', [id]);
    await db.pool.query('DELETE FROM ocupaciones_cancha WHERE id_ocupacion_cancha = $1', [reserva.id_ocupacion_cancha]);

    if (diffHours > 6) {
      // Reembolso completo / Cobro cancelado (id_estado_cobro = 3 -> 'Cancelado')
      await db.pool.query('UPDATE cobros SET id_estado_cobro = 3, detalles = detalles || \' (Cancelado con Reembolso)\' WHERE id_cobro = $1', [reserva.id_cobro]);
      res.json({ message: 'Reserva cancelada con éxito. Reembolso aprobado (más de 6 horas de antelación).' });
    } else {
      // Penalización / Se mantiene el cobro como cancelado con penalización
      await db.pool.query('UPDATE cobros SET id_estado_cobro = 3, detalles = detalles || \' (Cancelado con Penalización - Sin Reembolso)\' WHERE id_cobro = $1', [reserva.id_cobro]);
      res.json({ message: 'Reserva cancelada. Se aplica penalización/cobro sin reembolso por cancelar con menos de 6 horas de antelación.' });
    }

    await db.pool.query('COMMIT');
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al cancelar la reserva', message: err.message });
  }
};



// GET /cliente/cobros/:id
const consultarMiPago = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;
  try {
    const sql = `
      SELECT cob.id_cobro AS id, cob.monto, 
             to_char(cob.fecha, 'DD/MM/YYYY HH24:MI') AS fecha_pago, 
             cob.detalles AS comprobante_info, 
             ec.estado AS estado, 
             mp.nombre AS metodo, 
             can.nombre AS cancha_reservada, 
             to_char(oc.fecha, 'DD/MM/YYYY') AS fecha_turno, 
             to_char(oc.hora_inicio, 'HH24:MI') AS hora_inicio 
      FROM cobros cob 
      LEFT JOIN estados_cobro ec ON cob.id_estado_cobro = ec.id_estado_cobro 
      LEFT JOIN metodos_de_pago mp ON cob.id_metodo_de_pago = mp.id_metodo_de_pago 
      LEFT JOIN reservas res ON cob.id_cobro = res.id_cobro 
      LEFT JOIN canchas can ON res.id_cancha = can.id_cancha 
      LEFT JOIN ocupaciones_cancha oc ON res.id_ocupacion_cancha = oc.id_ocupacion_cancha 
      WHERE cob.id_cobro = $1 AND cob.id_usuario = $2
    `;
    const details = await db.query.get(sql, [id, idUsuario]);
    if (!details) {
      return res.status(404).json({ error: 'Detalle de cobro no encontrado' });
    }
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar detalle del cobro', message: err.message });
  }
};

// GET /cliente/recibos
const listarMisRecibos = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  try {
    const sql = `
      SELECT r.id_recibos AS id, r.nro_transaccion, 
             to_char(r.fecha, 'DD/MM/YYYY HH24:MI') AS fecha, 
             c.monto 
      FROM recibos r 
      INNER JOIN cobros c ON r.id_cobro = c.id_cobro 
      WHERE c.id_usuario = $1 
      ORDER BY r.fecha DESC
    `;
    const rows = await db.query.all(sql, [idUsuario]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar recibos', message: err.message });
  }
};

// GET /cliente/recibos/:id (Consultar Recibo para PDF)
const consultarMiRecibo = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;
  try {
    const sql = `
      SELECT r.id_recibos AS id, r.nro_transaccion, 
             to_char(r.fecha, 'DD/MM/YYYY HH24:MI') AS fecha_emision, 
             r.detalles AS detalles_recibo, 
             c.monto, 
             c.detalles AS detalles_cobro 
      FROM recibos r 
      INNER JOIN cobros c ON r.id_cobro = c.id_cobro 
      WHERE r.id_recibos = $1 AND c.id_usuario = $2
    `;
    const details = await db.query.get(sql, [id, idUsuario]);
    if (!details) {
      return res.status(404).json({ error: 'Recibo no encontrado' });
    }
    res.json(details);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar el recibo', message: err.message });
  }
};

// POST /cliente/clases/inscripcion
const inscribirClase = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id_clase } = req.body;
  try {
    const sql = `
      INSERT INTO clientes_clases (id_cliente, id_clase, id_asistencia)
      VALUES ($1, $2, 2) -- id_asistencia = 2 ('Ausente' hasta que asista)
      RETURNING id_cliente_clase
    `;
    const result = await db.query.run(sql, [idUsuario, id_clase]);
    res.status(201).json({ message: 'Inscripción a clase registrada con éxito', id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Error al inscribirse a la clase', message: err.message });
  }
};

// DELETE /cliente/clases/inscripcion/:id (Darse de baja)
const darBajaClase = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;
  try {
    const sql = `
      DELETE FROM clientes_clases 
      WHERE id_cliente_clase = $1 AND id_cliente = $2
    `;
    const result = await db.pool.query(sql, [id, idUsuario]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Inscripción no encontrada' });
    }
    res.json({ message: 'Baja de la clase procesada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar la baja de la clase', message: err.message });
  }
};

// POST /cliente/entrenamientos/inscripcion
const inscribirEntrenamiento = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id_entrenamiento } = req.body;
  try {
    const sql = `
      INSERT INTO clientes_entrenamientos (id_cliente, id_entrenamiento, id_asistencia)
      VALUES ($1, $2, 2)
      RETURNING id_cliente_capacitacion
    `;
    const result = await db.query.run(sql, [idUsuario, id_entrenamiento]);
    res.status(201).json({ message: 'Inscrito al entrenamiento con éxito', id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Error al inscribirse al entrenamiento', message: err.message });
  }
};

// DELETE /cliente/entrenamientos/inscripcion/:id (Darse de baja)
const darBajaEntrenamiento = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;
  try {
    const sql = `
      DELETE FROM clientes_entrenamientos 
      WHERE id_cliente_capacitacion = $1 AND id_cliente = $2
    `;
    const result = await db.pool.query(sql, [id, idUsuario]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Inscripción no encontrada' });
    }
    res.json({ message: 'Baja del entrenamiento procesada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al procesar la baja del entrenamiento', message: err.message });
  }
};

// POST /cliente/cobros/:id/pagar (Realizar pago)
const realizarPago = async (req, res) => {
  const idUsuario = req.user.id_usuario;
  const { id } = req.params;
  const { nro_transaccion, detalles } = req.body;

  try {
    // Verificar que el cobro le pertenece al cliente y está pendiente
    const cobro = await db.query.get('SELECT * FROM cobros WHERE id_cobro = $1 AND id_usuario = $2', [id, idUsuario]);
    if (!cobro) {
      return res.status(404).json({ error: 'Cobro no encontrado o no pertenece al usuario' });
    }

    if (cobro.id_estado_cobro === 2) {
      return res.status(400).json({ error: 'Este cobro ya fue pagado previamente' });
    }

    await db.pool.query('BEGIN');

    // 1. Actualizar el estado del cobro a "Pagado" (id_estado_cobro = 2)
    await db.pool.query('UPDATE cobros SET id_estado_cobro = 2 WHERE id_cobro = $1', [id]);

    // 2. Crear el recibo
    const reciboSql = `
      INSERT INTO recibos (nro_transaccion, detalles, id_cobro)
      VALUES ($1, $2, $3)
      RETURNING id_recibos
    `;
    const reciboRes = await db.pool.query(reciboSql, [
      nro_transaccion || `TRANS_${Date.now()}`,
      detalles || 'Pago de servicio a través de plataforma web',
      id
    ]);

    await db.pool.query('COMMIT');

    res.status(201).json({
      message: 'Pago procesado exitosamente y recibo emitido',
      id_recibo: reciboRes.rows[0].id_recibos
    });
  } catch (err) {
    await db.pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error al procesar el pago', message: err.message });
  }
};

module.exports = {
  obtenerPerfil,
  modificarPerfil,
  listarCanchasCliente,
  listarCanchasClientePorTipo,
  listarTiposCanchaCliente,
  consultarDisponibilidadCanchaEspecifica,
  consultarOcupacionesCanchaEspecifica,
  realizarReserva,
  listarReservasCliente,
  listarClasesCliente,
  listarEntrenamientosCliente,
  listarClasesDisponibles,
  listarEntrenamientosDisponibles,
  modificarReserva,
  cancelarReserva,
  inscribirClase,
  darBajaClase,
  inscribirEntrenamiento,
  darBajaEntrenamiento,
  listarMisPagos,
  consultarMiPago,
  listarMisRecibos,
  consultarMiRecibo,
  realizarPago
};
