const db = require('../config/db.js');

// POST /usuario/registro
const registrarUsuario = async (req, res) => {
  const { 
    username, nombre, apellido, email, password, dni, telefono, fecha_nacimiento, genero, nacionalidad,
    calle, numero, codigo_postal, localidad
  } = req.body;

  const finalUsername = username || (email ? email.split('@')[0] : `user_${Date.now()}`);

  if (!nombre || !apellido || !email || !password || !dni || !fecha_nacimiento || !genero || !nacionalidad || !calle || !numero || !codigo_postal || !localidad) {
    return res.status(400).json({ error: 'Faltan campos obligatorios para registrar el usuario (se requieren: nombre, apellido, email, password, dni, fecha_nacimiento, genero, nacionalidad, calle, numero, codigo_postal, localidad)' });
  }

  try {
    await db.pool.query('BEGIN');

    // 1. Resolver el id_localidad de la tabla localidades mediante el string 'localidad'
    let idLocalidad;
    const locName = localidad.trim();
    const existingLoc = await db.query.get(
      'SELECT id_localidad FROM localidades WHERE LOWER(nombre) = LOWER($1)',
      [locName]
    );

    if (existingLoc) {
      idLocalidad = existingLoc.id_localidad;
    } else {
      // Si la localidad no existe en la base de datos, la insertamos asociada a la ciudad de Florencio Varela (id_ciudad = 1)
      const insertLoc = await db.pool.query(
        'INSERT INTO localidades (nombre, id_ciudad) VALUES ($1, 1) RETURNING id_localidad',
        [locName]
      );
      idLocalidad = insertLoc.rows[0].id_localidad;
    }

    // 2. Resolver el id_genero de la tabla generos mediante el string 'genero'
    let idGenero = 1;
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

    // 3. Resolver el id_nacionalidad de la tabla paises mediante el string 'nacionalidad'
    let idNacionalidad = 1;
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

    // 4. Insertar la dirección con el id_localidad obtenido
    const dirSql = `
      INSERT INTO direcciones (calle, numero, codigo_postal, id_localidad) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id_direccion
    `;
    const dirResult = await db.pool.query(dirSql, [calle, numero, codigo_postal, idLocalidad]);
    const idDireccion = dirResult.rows[0].id_direccion;

    // 5. Insertar/registrar al cliente (user_level = 1 para Clientes registrados)
    const userSql = `
      INSERT INTO usuarios (
        username, user_level, nombre, apellido, email, password, 
        fecha_nacimiento, dni, telefono, id_direccion, id_genero, id_nacionalidad, id_club
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id_usuario, username, nombre, apellido, email, id_direccion, user_level
    `;
    const insertResult = await db.query.get(userSql, [
      finalUsername,
      1, // user_level = 1 para Clientes
      nombre,
      apellido,
      email,
      password,
      fecha_nacimiento,
      dni,
      telefono || '-',
      idDireccion,
      idGenero,
      idNacionalidad,
      1 // id_club = 1 (El buen deporte)
    ]);

    const userResult = await db.query.get(`
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
    `, [insertResult.id_usuario]);

    await db.pool.query('COMMIT');

    res.status(201).json({
      message: 'Cliente registrado exitosamente',
      usuario: userResult
    });
  } catch (err) {
    await db.pool.query('ROLLBACK');
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
// Helper: Convert "HH:MM:SS" or "HH:MM" to minutes
const timeToMinutes = (t) => {
  if (!t) return 0;
  const parts = t.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

// Helper: Convert minutes to "HH:MM"
const minutesToTime = (min) => {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

// GET /usuario/canchas/disponibilidad
const consultarDisponibilidad = async (req, res) => {
  const { fecha, idTipoCancha } = req.query;
  if (!fecha) {
    return res.status(400).json({ error: 'Se requiere el parámetro "fecha" en formato YYYY-MM-DD' });
  }

  try {
    // 1. Obtener día de la semana de la fecha (en español)
    const dateObj = new Date(`${fecha}T00:00:00`);
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaSemana = daysOfWeek[dateObj.getDay()];

    // 2. Obtener todas las canchas físicas activas
    let queryCanchas = `
      SELECT c.id_cancha, c.nombre, c.id_tipo_de_cancha, 
             COALESCE(tc.duracion_max, 60) AS duracion_turno,
             tc.tipo_cancha AS categoria
      FROM canchas c
      INNER JOIN tipos_de_cancha tc ON c.id_tipo_de_cancha = tc.id_tipo_de_cancha
    `;
    const paramsCanchas = [];
    if (idTipoCancha) {
      queryCanchas += ` WHERE c.id_tipo_de_cancha = $1`;
      paramsCanchas.push(idTipoCancha);
    }
    const canchas = await db.query.all(queryCanchas, paramsCanchas);

    if (canchas.length === 0) {
      return res.json([]);
    }

    // 3. Obtener todas las ocupaciones para la fecha
    const queryOcupaciones = `
      SELECT id_cancha, 
             to_char(hora_inicio, 'HH24:MI') AS hora_inicio, 
             to_char(hora_fin, 'HH24:MI') AS hora_fin, 
             id_tipo_ocupacion
      FROM ocupaciones_cancha
      WHERE fecha = $1
    `;
    const ocupaciones = await db.query.all(queryOcupaciones, [fecha]);

    // 4. Obtener la disponibilidad de atención cargada para el día de la semana
    const queryDisp = `
      SELECT id_cancha, 
             to_char(hora_inicio, 'HH24:MI') AS hora_inicio, 
             to_char(hora_fin, 'HH24:MI') AS hora_fin
      FROM disponibilidad
      WHERE dia_semana = $1
    `;
    const disponibilidades = await db.query.all(queryDisp, [diaSemana]);

    // 5. Procesar disponibilidad por cada cancha
    const resultado = canchas.map(cancha => {
      // Buscar horario de atención para este día. Si no existe, default 08:00 a 22:00
      const dispCancha = disponibilidades.find(d => parseInt(d.id_cancha) === parseInt(cancha.id_cancha));
      const horaApertura = dispCancha ? dispCancha.hora_inicio : "08:00";
      const horaCierre = dispCancha ? dispCancha.hora_fin : "22:00";

      const startMin = timeToMinutes(horaApertura);
      const endMin = timeToMinutes(horaCierre);
      const step = cancha.duracion_turno;

      // Filtrar ocupaciones de esta cancha
      const ocCancha = ocupaciones.filter(oc => parseInt(oc.id_cancha) === parseInt(cancha.id_cancha));

      const franjas = [];
      for (let time = startMin; time + step <= endMin; time += step) {
        const slotStart = time;
        const slotEnd = time + step;

        const strInicio = minutesToTime(slotStart);
        const strFin = minutesToTime(slotEnd);

        let estado = 'DISPONIBLE';
        const overlap = ocCancha.find(oc => {
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
        }

        franjas.push({
          horaInicio: strInicio,
          horaFin: strFin,
          estado
        });
      }

      return {
        id_cancha: cancha.id_cancha,
        nombreCancha: cancha.nombre,
        fecha,
        franjasHorarias: franjas
      };
    });

    res.json(resultado);
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

// POST /usuario/login
const loginUsuario = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios', details: 'Se requieren username (o email) y password' });
  }

  try {
    // Buscar usuario por username o email
    const querySql = `
      SELECT u.id_usuario, u.id_usuario AS id, u.username, u.user_level, u.nombre, u.apellido, u.email, u.password, u.fecha_nacimiento, u.fecha_registro,
             g.genero AS genero, pa.nombre AS nacionalidad, 
             d.calle, d.numero, d.codigo_postal, loc.nombre AS localidad, prov.nombre AS provincia 
      FROM usuarios u 
      LEFT JOIN generos g ON u.id_genero = g.id_genero 
      LEFT JOIN paises pa ON u.id_nacionalidad = pa.id_pais 
      LEFT JOIN direcciones d ON u.id_direccion = d.id_direccion 
      LEFT JOIN localidades loc ON d.id_localidad = loc.id_localidad 
      LEFT JOIN ciudades c ON loc.id_ciudad = c.id_ciudad 
      LEFT JOIN provincias prov ON c.id_provincia = prov.id_provincia 
      WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1)
    `;
    const user = await db.query.get(querySql, [username.trim()]);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas', details: 'El usuario o correo electrónico no está registrado' });
    }

    // Verificar contraseña plana (en ambiente demo/desarrollo)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas', details: 'La contraseña es incorrecta' });
    }

    // Mapeo de roles basado en user_level (0: Público, >=1: Cliente, >=152: Admin)
    let role = 'usuario';
    if (user.user_level >= 1) role = 'cliente';
    if (user.user_level >= 152) role = 'admin';

    // Eliminar la contraseña de la respuesta por seguridad
    delete user.password;

    res.cookie('x-user-id', user.id_usuario.toString(), { path: '/', maxAge: 86400 * 1000 });
    res.cookie('userId', user.id_usuario.toString(), { path: '/', maxAge: 86400 * 1000 });
    res.cookie('role', role, { path: '/', maxAge: 86400 * 1000 });

    res.json({
      message: 'Inicio de sesión exitoso',
      usuario: {
        ...user,
        role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión', message: err.message });
  }
};

module.exports = {
  registrarUsuario,
  loginUsuario,
  listarCanchas,
  listarTiposCancha,
  consultarDisponibilidad,
  listarClasesPublicas,
  listarEntrenamientosPublicos
};
