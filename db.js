const { Pool } = require('pg');
require('dotenv').config();

// Configuración del Pool de PostgreSQL
// Activa SSL automáticamente si la base de datos está en la nube (ej: Render/Neon)
const isLocal = !process.env.DATABASE_URL || 
                process.env.DATABASE_URL.includes('localhost') || 
                process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Error inesperado en el cliente de PostgreSQL:', err.message);
});

// Función auxiliar para retornar Promesas en consultas SQL
const query = {
  all: async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return res.rows;
  },
  get: async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return res.rows[0];
  },
  run: async (sql, params = []) => {
    const res = await pool.query(sql, params);
    // En PostgreSQL, para obtener el ID recién insertado se usa RETURNING en la consulta.
    // Devolvemos el primer campo de la primera fila si existe, que corresponde al ID.
    const generatedId = res.rows[0] ? Object.values(res.rows[0])[0] : null;
    return {
      id: generatedId,
      changes: res.rowCount
    };
  },
  exec: async (sql) => {
    await pool.query(sql);
  }
};

// Inicialización de la base de datos PostgreSQL
const initDatabase = async () => {
  try {
    console.log('Verificando conexión con PostgreSQL...');
    // Probar conexión rápida
    await pool.query('SELECT NOW()');
    console.log('Conectado exitosamente a la base de datos PostgreSQL en la nube.');

    // Verificar si la tabla de usuarios ya existe para no sobreescribir datos
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      );
    `);

    const tableExists = tableCheck.rows[0].exists;

    if (!tableExists) {
      console.log('Estructura de tablas no encontrada. Inicializando base de datos PostgreSQL por primera vez...');

      const initSql = `
        -- Direcciones y relacionados
        CREATE TABLE IF NOT EXISTS paises (
            id_pais SERIAL PRIMARY KEY,
            nombre VARCHAR(55) UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS provincias (
            id_provincia SERIAL PRIMARY KEY,
            nombre VARCHAR(55) NOT NULL,
            id_pais BIGINT NOT NULL,
            FOREIGN KEY (id_pais) REFERENCES paises(id_pais),
            CONSTRAINT u_provincia UNIQUE (nombre, id_pais)
        );

        CREATE TABLE IF NOT EXISTS ciudades (
            id_ciudad SERIAL PRIMARY KEY,
            nombre VARCHAR(55) NOT NULL,
            id_provincia BIGINT NOT NULL,
            FOREIGN KEY (id_provincia) REFERENCES provincias(id_provincia),
            CONSTRAINT u_ciudad UNIQUE (nombre, id_provincia)
        );

        CREATE TABLE IF NOT EXISTS localidades (
            id_localidad SERIAL PRIMARY KEY,
            nombre VARCHAR(70) NOT NULL,
            id_ciudad BIGINT NOT NULL,
            FOREIGN KEY (id_ciudad) REFERENCES ciudades(id_ciudad),
            CONSTRAINT u_localidad UNIQUE (nombre, id_ciudad)
        );

        CREATE TABLE IF NOT EXISTS direcciones (
            id_direccion SERIAL PRIMARY KEY,
            calle VARCHAR(100) NOT NULL,
            numero VARCHAR(100) NOT NULL,
            codigo_postal VARCHAR(8) NOT NULL,
            id_localidad BIGINT NOT NULL,
            FOREIGN KEY (id_localidad) REFERENCES localidades(id_localidad)
        );

        -- Club, reportes y descuentos
        CREATE TABLE IF NOT EXISTS clubes (
            id_club SERIAL PRIMARY KEY,
            nombre VARCHAR(55) UNIQUE NOT NULL,
            CUIT CHAR(13) UNIQUE NOT NULL,
            num_telefonico VARCHAR(15) NOT NULL,
            email VARCHAR(50) UNIQUE NOT NULL,
            id_direccion BIGINT NOT NULL,
            FOREIGN KEY (id_direccion) REFERENCES direcciones(id_direccion)
        );

        CREATE TABLE IF NOT EXISTS descuentos (
            id_descuento SERIAL PRIMARY KEY,
            descripcion TEXT NOT NULL,
            activo BOOLEAN NOT NULL DEFAULT FALSE,
            porcentaje_descuento DECIMAL(5, 2) NOT NULL,
            id_club BIGINT NOT NULL,
            CONSTRAINT chk_porcentaje_descuento CHECK(porcentaje_descuento > 0 AND porcentaje_descuento <= 100),
            FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON UPDATE CASCADE ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reportes (
            id_reporte SERIAL PRIMARY KEY,
            tipo_reporte SMALLINT NOT NULL,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
            detalle TEXT NOT NULL,
            id_club BIGINT NOT NULL,
            CONSTRAINT chk_tipo_reporte CHECK(tipo_reporte <= 3),
            FOREIGN KEY (id_club) REFERENCES clubes(id_club)
        );

        -- Canchas y relacionados
        CREATE TABLE IF NOT EXISTS superficies (
            id_superficie SERIAL PRIMARY KEY,
            tipo_superficie VARCHAR(55) UNIQUE NOT NULL,
            descripcion VARCHAR(200)
        );

        CREATE TABLE IF NOT EXISTS tipos_de_cancha (
            id_tipo_de_cancha SERIAL PRIMARY KEY,
            tipo_cancha VARCHAR(55) NOT NULL,
            duracion_min INT NOT NULL,
            duracion_max INT NOT NULL,
            ancho DECIMAL(5, 2) NOT NULL,
            largo DECIMAL(5, 2) NOT NULL,
            capacidad SMALLINT NOT NULL,
            imagen_url VARCHAR(255),
            id_superficie BIGINT NOT NULL,
            CONSTRAINT chk_capacidad CHECK (capacidad <= 22),
            CONSTRAINT chk_duracion CHECK (duracion_min <= duracion_max AND duracion_min > 0),
            CONSTRAINT chk_ancho CHECK (ancho BETWEEN 10 AND 85 AND ancho < largo),
            CONSTRAINT chk_largo CHECK (largo BETWEEN 22 AND 120 AND ancho < largo),
            FOREIGN KEY (id_superficie) REFERENCES superficies(id_superficie)
        );

        CREATE TABLE IF NOT EXISTS canchas (
            id_cancha SERIAL PRIMARY KEY,
            nombre VARCHAR(80) NOT NULL,
            tiempo_cancelacion INT NOT NULL,
            precio_hora_reserva DECIMAL(10,2) NOT NULL,
            id_tipo_de_cancha BIGINT NOT NULL,
            id_club BIGINT NOT NULL,
            CONSTRAINT chk_tiempo_cancelacion CHECK (tiempo_cancelacion >= 0),
            FOREIGN KEY (id_tipo_de_cancha) REFERENCES tipos_de_cancha(id_tipo_de_cancha),
            FOREIGN KEY (id_club) REFERENCES clubes(id_club)
        );

        -- Reserva, mantenimiento, clase, entrenamiento, liga, torneo
        CREATE TABLE IF NOT EXISTS tipos_de_ocupaciones (
            id_tipo_ocupacion SERIAL PRIMARY KEY,
            tipo_ocupacion VARCHAR(55) UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ocupaciones_cancha (  
            id_ocupacion_cancha SERIAL PRIMARY KEY,
            fecha DATE NOT NULL,
            hora_inicio TIME NOT NULL,
            hora_fin TIME NOT NULL,
            id_tipo_ocupacion BIGINT NOT NULL,
            id_cancha BIGINT NOT NULL,
            FOREIGN KEY (id_tipo_ocupacion) REFERENCES tipos_de_ocupaciones(id_tipo_ocupacion),
            FOREIGN KEY (id_cancha) REFERENCES canchas(id_cancha)
        );

        CREATE TABLE IF NOT EXISTS disponibilidad (
            id_disponibilidad SERIAL PRIMARY KEY,
            dia_semana VARCHAR(15) CHECK (dia_semana IN ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo')) NOT NULL,
            hora_inicio TIME NOT NULL,
            hora_fin TIME NOT NULL,
            id_cancha BIGINT NOT NULL,
            FOREIGN KEY (id_cancha) REFERENCES canchas(id_cancha),
            CONSTRAINT u_disponibilidad UNIQUE (dia_semana, id_cancha)
        ); 

        CREATE TABLE IF NOT EXISTS disponibilidad_excepciones (
            id_disponibilidad SERIAL PRIMARY KEY,
            motivo VARCHAR(100),
            dia DATE NOT NULL,    
            hora_inicio TIME NOT NULL,
            hora_fin TIME NOT NULL,
            id_cancha BIGINT,
            cerrado BOOLEAN GENERATED ALWAYS AS (hora_inicio = hora_fin) STORED,
            CONSTRAINT chk_horario CHECK (hora_inicio <= hora_fin OR hora_inicio = hora_fin),
            FOREIGN KEY (id_cancha) REFERENCES canchas(id_cancha),
            CONSTRAINT u_disponibilidad_excepcion UNIQUE (dia, id_cancha)
        );

        -- Usuarios y relacionados
        CREATE TABLE IF NOT EXISTS generos (
            id_genero SERIAL PRIMARY KEY,
            genero VARCHAR(75) UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS usuarios (
            id_usuario SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            user_level SMALLINT NOT NULL DEFAULT 0,
            fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            nombre VARCHAR(100) NOT NULL,
            apellido VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(150) NOT NULL,
            fecha_nacimiento DATE NOT NULL,
            dni VARCHAR(8) UNIQUE NOT NULL,
            telefono VARCHAR(15) NOT NULL DEFAULT '-',
            id_direccion BIGINT NOT NULL,
            id_direccion_opcional BIGINT,
            id_genero BIGINT NOT NULL,
            id_nacionalidad BIGINT NOT NULL,
            id_club BIGINT NOT NULL,
            FOREIGN KEY (id_direccion) REFERENCES direcciones(id_direccion),
            FOREIGN KEY (id_direccion_opcional) REFERENCES direcciones(id_direccion),
            FOREIGN KEY (id_genero) REFERENCES generos(id_genero),
            FOREIGN KEY (id_nacionalidad) REFERENCES paises(id_pais),
            FOREIGN KEY (id_club) REFERENCES clubes(id_club)
        );

        CREATE TABLE IF NOT EXISTS certificaciones (
            id_certificacion SERIAL PRIMARY KEY,
            tipo_certificacion BOOLEAN NOT NULL,
            matricula VARCHAR(100) NOT NULL,
            fecha_caducidad DATE NOT NULL,
            link_archivo TEXT NOT NULL,
            id_usuario BIGINT NOT NULL,
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        );

        -- Reservas, cobros y recibos
        CREATE TABLE IF NOT EXISTS metodos_de_pago (
            id_metodo_de_pago SERIAL PRIMARY KEY,
            nombre VARCHAR(55) UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS estados_cobro (
            id_estado_cobro SERIAL PRIMARY KEY,
            estado VARCHAR(55) UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cobros (
            id_cobro SERIAL PRIMARY KEY,
            fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            monto DECIMAL(12, 2) NOT NULL,
            porcentaje_descuento DECIMAL(3, 2) CHECK (porcentaje_descuento <= 1),
            detalles TEXT NOT NULL,
            id_club BIGINT NOT NULL,
            id_usuario BIGINT NOT NULL,
            id_estado_cobro BIGINT NOT NULL,
            id_metodo_de_pago BIGINT NOT NULL,
            FOREIGN KEY (id_club) REFERENCES clubes(id_club),
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
            FOREIGN KEY (id_estado_cobro) REFERENCES estados_cobro(id_estado_cobro),
            FOREIGN KEY (id_metodo_de_pago) REFERENCES metodos_de_pago(id_metodo_de_pago)
        );

        CREATE TABLE IF NOT EXISTS recibos (
            id_recibos SERIAL PRIMARY KEY,
            nro_transaccion VARCHAR(70) NOT NULL,
            detalles TEXT NOT NULL,
            fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            id_cobro BIGINT NOT NULL,
            FOREIGN KEY (id_cobro) REFERENCES cobros(id_cobro)
        );

        CREATE TABLE IF NOT EXISTS reservas (
            id_reserva SERIAL PRIMARY KEY,
            id_ocupacion_cancha BIGINT NOT NULL,
            id_usuario BIGINT NOT NULL,
            id_cancha BIGINT NOT NULL,
            id_cobro BIGINT NOT NULL,
            FOREIGN KEY (id_ocupacion_cancha) REFERENCES ocupaciones_cancha(id_ocupacion_cancha),
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
            FOREIGN KEY (id_cancha) REFERENCES canchas(id_cancha),
            FOREIGN KEY (id_cobro) REFERENCES cobros(id_cobro)
        );

        -- Clases y entrenamientos
        CREATE TABLE IF NOT EXISTS estado_capacitaciones (
            id_estado_capacitacion SERIAL PRIMARY KEY,
            estado VARCHAR(55) UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS asistencias (
            id_asistencia SERIAL PRIMARY KEY,
            estado VARCHAR(55) UNIQUE NOT NULL
        );

        -- Reestructuración para clases grupales
        CREATE TABLE IF NOT EXISTS clases (
            id_clase SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            capacidad_max SMALLINT NOT NULL,
            id_profesional BIGINT NOT NULL,
            id_estado_capacitacion BIGINT NOT NULL,
            id_ocupacion_cancha BIGINT NOT NULL,
            id_club BIGINT NOT NULL,
            id_cancha BIGINT NOT NULL,
            id_cobro BIGINT,
            FOREIGN KEY (id_cobro) REFERENCES cobros(id_cobro),
            FOREIGN KEY (id_profesional) REFERENCES usuarios(id_usuario),
            FOREIGN KEY (id_estado_capacitacion) REFERENCES estado_capacitaciones(id_estado_capacitacion),
            FOREIGN KEY (id_ocupacion_cancha) REFERENCES ocupaciones_cancha(id_ocupacion_cancha),
            FOREIGN KEY (id_club) REFERENCES clubes(id_club),
            FOREIGN KEY (id_cancha) REFERENCES canchas(id_cancha)
        );

        CREATE TABLE IF NOT EXISTS clientes_clases (
            id_cliente_clase SERIAL PRIMARY KEY,
            id_cliente BIGINT NOT NULL,
            id_clase BIGINT NOT NULL,
            id_asistencia BIGINT NOT NULL,
            FOREIGN KEY (id_cliente) REFERENCES usuarios(id_usuario),
            FOREIGN KEY (id_clase) REFERENCES clases(id_clase),
            FOREIGN KEY (id_asistencia) REFERENCES asistencias(id_asistencia),
            CONSTRAINT u_cliente_clase UNIQUE (id_cliente, id_clase)
        );

        CREATE TABLE IF NOT EXISTS entrenamientos (
            id_entrenamiento SERIAL PRIMARY KEY,
            capacidad_max SMALLINT NOT NULL,
            id_profesional BIGINT NOT NULL,
            id_estado_capacitaciones BIGINT NOT NULL,
            id_ocupacion_cancha BIGINT NOT NULL,
            id_club BIGINT NOT NULL,
            id_cancha BIGINT NOT NULL,
            id_cobro BIGINT NOT NULL,
            FOREIGN KEY (id_cobro) REFERENCES cobros(id_cobro),
            FOREIGN KEY (id_profesional) REFERENCES usuarios(id_usuario),
            FOREIGN KEY (id_estado_capacitaciones) REFERENCES estado_capacitaciones(id_estado_capacitacion),
            FOREIGN KEY (id_ocupacion_cancha) REFERENCES ocupaciones_cancha(id_ocupacion_cancha),
            FOREIGN KEY (id_club) REFERENCES clubes(id_club),
            FOREIGN KEY (id_cancha) REFERENCES canchas(id_cancha)
        );

        CREATE TABLE IF NOT EXISTS clientes_entrenamientos (
            id_cliente_capacitacion SERIAL PRIMARY KEY,
            id_cliente BIGINT NOT NULL,
            id_entrenamiento BIGINT NOT NULL,
            id_asistencia BIGINT NOT NULL,
            FOREIGN KEY (id_cliente) REFERENCES usuarios(id_usuario),
            FOREIGN KEY (id_entrenamiento) REFERENCES entrenamientos(id_entrenamiento),
            FOREIGN KEY (id_asistencia) REFERENCES asistencias(id_asistencia),
            CONSTRAINT u_cliente_entrenamiento UNIQUE (id_cliente, id_entrenamiento)
        );

        -- Ligas y torneos
        CREATE TABLE IF NOT EXISTS estado_partidos (
            id_estado_partido SERIAL PRIMARY KEY,
            estado VARCHAR(55) UNIQUE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS torneos (
            id_torneo SERIAL PRIMARY KEY,
            nombre VARCHAR(55) NOT NULL,
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE NOT NULL,
            id_usuario_tutor BIGINT NOT NULL,
            id_club BIGINT NOT NULL,
            id_estado BIGINT NOT NULL,
            FOREIGN KEY (id_estado) REFERENCES estado_partidos(id_estado_partido),
            FOREIGN KEY (id_usuario_tutor) REFERENCES usuarios(id_usuario),
            FOREIGN KEY (id_club) REFERENCES clubes(id_club)
        );

        CREATE TABLE IF NOT EXISTS ligas (
            id_liga SERIAL PRIMARY KEY,
            nombre VARCHAR(70) NOT NULL,
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE NOT NULL,
            puntos_empate SMALLINT NOT NULL DEFAULT 1,
            puntos_victoria SMALLINT NOT NULL DEFAULT 3,
            id_usuario_tutor BIGINT NOT NULL,
            id_club BIGINT NOT NULL,
            id_estado BIGINT NOT NULL,
            FOREIGN KEY (id_estado) REFERENCES estado_partidos(id_estado_partido),
            FOREIGN KEY (id_usuario_tutor) REFERENCES usuarios(id_usuario),
            FOREIGN KEY (id_club) REFERENCES clubes(id_club)
        );

        CREATE TABLE IF NOT EXISTS equipos (
            id_equipo SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS participacion_ligas (
            id_participacion_liga SERIAL PRIMARY KEY,
            id_equipo BIGINT NOT NULL,
            id_liga BIGINT NOT NULL,
            FOREIGN KEY (id_equipo) REFERENCES equipos(id_equipo),
            FOREIGN KEY (id_liga) REFERENCES ligas(id_liga),
            CONSTRAINT u_part_liga UNIQUE (id_equipo, id_liga)
        );

        CREATE TABLE IF NOT EXISTS participacion_torneos (
            id_participacion_torneo SERIAL PRIMARY KEY,
            id_equipo BIGINT NOT NULL,
            id_torneo BIGINT NOT NULL,
            FOREIGN KEY (id_equipo) REFERENCES equipos(id_equipo),
            FOREIGN KEY (id_torneo) REFERENCES torneos(id_torneo),
            CONSTRAINT u_part_torneo UNIQUE (id_equipo, id_torneo)
        );

        -- Tabla de partidos para el fixture y resultados
        CREATE TABLE IF NOT EXISTS partidos (
            id_partido SERIAL PRIMARY KEY,
            fecha_hora TIMESTAMP NOT NULL,
            goles_local INTEGER DEFAULT NULL,
            goles_visitante INTEGER DEFAULT NULL,
            id_equipo_local BIGINT NOT NULL,
            id_equipo_visitante BIGINT NOT NULL,
            id_cancha BIGINT NOT NULL,
            id_estado_partido BIGINT NOT NULL,
            id_liga BIGINT,
            id_torneo BIGINT,
            fase_torneo VARCHAR(50) DEFAULT NULL,
            FOREIGN KEY (id_equipo_local) REFERENCES equipos(id_equipo),
            FOREIGN KEY (id_equipo_visitante) REFERENCES equipos(id_equipo),
            FOREIGN KEY (id_cancha) REFERENCES canchas(id_cancha),
            FOREIGN KEY (id_estado_partido) REFERENCES estado_partidos(id_estado_partido),
            FOREIGN KEY (id_liga) REFERENCES ligas(id_liga),
            FOREIGN KEY (id_torneo) REFERENCES torneos(id_torneo)
        );
      `;

      const seedSql = `
        -- Inserción de Datos Semilla
        INSERT INTO paises (nombre) VALUES ('Argentina') ON CONFLICT DO NOTHING;
        INSERT INTO provincias (nombre, id_pais) VALUES ('Buenos Aires', 1) ON CONFLICT DO NOTHING;
        INSERT INTO ciudades (nombre, id_provincia) VALUES ('Florencio Varela', 1) ON CONFLICT DO NOTHING;
        INSERT INTO localidades (nombre, id_ciudad) VALUES ('Florencio Varela', 1) ON CONFLICT DO NOTHING;
        
        INSERT INTO generos (genero) VALUES 
          ('Masculino'), ('Femenino'), ('No binario'), ('Género fluido'), 
          ('Agénero'), ('Hombre trans'), ('Mujer trans'), ('Otro'), ('Prefiero no especificar')
          ON CONFLICT DO NOTHING;
          
        INSERT INTO direcciones (calle, numero, codigo_postal, id_localidad)
        VALUES ('Avenida Calchaquí', '6200', '1888', 1);
        
        INSERT INTO clubes (nombre, cuit, num_telefonico, email, id_direccion)
        VALUES ('El buen deporte', '20-11111111-1', '1155555555', 'mail@golahora.com', 1);
        
        INSERT INTO usuarios (
            username, user_level, nombre, apellido, email, password, 
            fecha_nacimiento, dni, telefono, id_direccion, id_direccion_opcional, 
            id_genero, id_nacionalidad, id_club
        )
        VALUES (
            'user_00000000001', 152, 'Administrador', 'Principal', 'administrador@golahora.com',
            '$2b$08$jaXXwnndaCje1nPEexDiMOFV4.qjDUtF0lgJTYBBiGry0oZ4kVSoG', '2000-01-01',
            '99999999', '01112345678', 1, NULL, 1, 1, 1
        );
        
        INSERT INTO superficies (tipo_superficie, descripcion) VALUES 
          ('Césped natural', 'Suelo de tierra con pasto vivo. Dureza media, amortigua impactos. Uso recomendado en estadios profesionales.'),
          ('Césped sintético (artificial)', 'Base de caucho y arena con fibras plásticas. Dureza media, buen agarre y bajo mantenimiento.'),
          ('Tierra/arcilla', 'Suelo compactado, irregular. Dureza variable. Uso recomendado en torneos barriales y zonas rurales.'),
          ('Arena', 'Suelo blando y suelto. Dureza baja. Uso recomendado en fútbol playa y recreativo.'),
          ('Parquet / madera', 'Superficie dura y lisa. Dureza alta, buen bote de pelota. Uso recomendado en futsal.'),
          ('Cemento / hormigón', 'Piso rígido y áspero. Dureza muy alta, mayor riesgo de lesiones.'),
          ('Caucho sintético', 'Piso elástico y antideslizante. Dureza baja-media, amortigua impactos.')
          ON CONFLICT DO NOTHING;
          
        INSERT INTO tipos_de_ocupaciones (tipo_ocupacion) VALUES 
          ('Reserva'), ('Clase'), ('Entrenamiento'), ('Liga'), ('Torneo'), ('Mantenimiento')
          ON CONFLICT DO NOTHING;

        INSERT INTO metodos_de_pago (nombre) VALUES
          ('Efectivo'), ('Tarjeta de Crédito'), ('Tarjeta de Débito'), ('Transferencia Bancaria'), ('Mercado Pago')
          ON CONFLICT DO NOTHING;

        INSERT INTO estados_cobro (estado) VALUES
          ('Pendiente'), ('Pagado'), ('Cancelado')
          ON CONFLICT DO NOTHING;

        INSERT INTO estado_capacitaciones (estado) VALUES
          ('Activa'), ('Finalizada'), ('Cancelada')
          ON CONFLICT DO NOTHING;

        INSERT INTO asistencias (estado) VALUES
          ('Presente'), ('Ausente'), ('Ausente con aviso')
          ON CONFLICT DO NOTHING;

        INSERT INTO estado_partidos (estado) VALUES
          ('Programado'), ('Jugado'), ('Suspendido'), ('Cancelado')
          ON CONFLICT DO NOTHING;
      `;

      // Ejecutar la creación de la estructura y luego los datos semilla
      await pool.query(initSql);
      console.log('Tablas creadas correctamente en PostgreSQL.');
      await pool.query(seedSql);
      console.log('Datos semilla insertados correctamente en PostgreSQL.');
    } else {
      console.log('La base de datos PostgreSQL ya contiene las tablas, omitiendo inicialización.');
    }
  } catch (err) {
    console.error('Error crítico durante la inicialización de PostgreSQL:', err.message);
    console.error('Por favor, asegúrate de que DATABASE_URL sea correcta y tu base de datos esté activa.');
  }
};

// Inicializar la conexión
initDatabase();

module.exports = {
  pool,
  query
};
