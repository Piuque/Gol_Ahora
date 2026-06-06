const { pool } = require('./config/db.js');

async function seed() {
  console.log("=== INICIANDO SIEMBRA DE DATOS DE PRUEBA (SEED) ===");
  try {
    await pool.query('BEGIN');

    // 1. Asegurar Club
    await pool.query(`
      INSERT INTO clubes (id_club, nombre) 
      VALUES (1, 'El buen deporte')
      ON CONFLICT (id_club) DO NOTHING
    `);

    // 2. Asegurar Generos
    await pool.query(`
      INSERT INTO generos (id_genero, genero) VALUES 
      (1, 'Masculino'),
      (2, 'Femenino'),
      (3, 'No binario')
      ON CONFLICT (id_genero) DO NOTHING
    `);

    // 3. Asegurar Paises
    await pool.query(`
      INSERT INTO paises (id_pais, nombre) VALUES 
      (1, 'Argentina')
      ON CONFLICT (id_pais) DO NOTHING
    `);

    // 4. Asegurar Localidades y Direcciones
    await pool.query(`
      INSERT INTO provincias (id_provincia, nombre) VALUES (1, 'Buenos Aires') ON CONFLICT DO NOTHING;
      INSERT INTO ciudades (id_ciudad, nombre, id_provincia) VALUES (1, 'Florencio Varela', 1) ON CONFLICT DO NOTHING;
      INSERT INTO localidades (id_localidad, nombre, id_ciudad) VALUES (1, 'Centro', 1) ON CONFLICT (id_localidad) DO NOTHING;
      INSERT INTO direcciones (id_direccion, calle, numero, codigo_postal, id_localidad) 
      VALUES (1, 'Av. de los Deportes', '1234', '1888', 1)
      ON CONFLICT (id_direccion) DO NOTHING;
    `);

    // 5. Insertar Tipos de Cancha
    await pool.query(`
      INSERT INTO tipos_de_cancha (id_tipo_de_cancha, tipo_cancha, duracion_max, precio_hora_reserva, imagen_url) VALUES 
      (1, 'Fútbol 5', 60, 5000, 'https://images.unsplash.com/photo-1517649763962-0c623066013b'),
      (2, 'Fútbol 7', 60, 7000, 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2'),
      (3, 'Fútbol 11', 90, 10000, 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6')
      ON CONFLICT (id_tipo_de_cancha) DO NOTHING
    `);

    // 6. Insertar Canchas físicas
    await pool.query(`
      INSERT INTO canchas (id_cancha, nombre, tiempo_cancelacion, precio_hora_reserva, id_tipo_de_cancha, id_club) VALUES 
      (1, 'Cancha Sintética 1', 6, 5000, 1, 1),
      (2, 'Cancha de Césped Natural', 6, 7000, 2, 1),
      (3, 'Estadio Principal F11', 12, 10000, 3, 1)
      ON CONFLICT (id_cancha) DO NOTHING
    `);

    // 7. Insertar Usuarios (Cliente, Profesor, Entrenador)
    // Contraseñas en texto plano como maneja tu login
    const usersResult = await pool.query(`
      INSERT INTO usuarios (id_usuario, username, user_level, nombre, apellido, email, password, fecha_nacimiento, dni, telefono, id_direccion, id_genero, id_nacionalidad, id_club) VALUES 
      (10, 'cliente_test', 'cliente', 'Juan', 'Pérez', 'cliente@example.com', '123456', '1995-05-10', '39123456', '1122334455', 1, 1, 1, 1),
      (11, 'profesor_test', 'profesor', 'Carlos', 'Bilardo', 'profesor@example.com', '123456', '1960-03-16', '14123456', '1155667788', 1, 1, 1, 1),
      (12, 'entrenador_test', 'entrenador', 'Lionel', 'Scaloni', 'entrenador@example.com', '123456', '1978-05-16', '26123456', '1188990011', 1, 1, 1, 1)
      ON CONFLICT (id_usuario) DO NOTHING
      RETURNING id_usuario
    `);

    console.log("Usuarios y canchas asegurados.");

    // 8. Ocupaciones para turnos de clases y entrenamientos
    await pool.query(`
      -- Ocupación para Clase (Tipo 2 = 'Clase/Entrenamiento')
      INSERT INTO ocupaciones_cancha (id_ocupacion_cancha, fecha, hora_inicio, hora_fin, id_tipo_ocupacion, id_cancha)
      VALUES (101, CURRENT_DATE + 1, '18:00:00', '19:30:00', 2, 1)
      ON CONFLICT (id_ocupacion_cancha) DO NOTHING;

      -- Ocupación para Entrenamiento (Tipo 2 = 'Clase/Entrenamiento')
      INSERT INTO ocupaciones_cancha (id_ocupacion_cancha, fecha, hora_inicio, hora_fin, id_tipo_ocupacion, id_cancha)
      VALUES (102, CURRENT_DATE + 2, '20:00:00', '21:30:00', 2, 2)
      ON CONFLICT (id_ocupacion_cancha) DO NOTHING;

      -- Ocupación para Reserva de Cancha (Tipo 1 = 'Reserva')
      INSERT INTO ocupaciones_cancha (id_ocupacion_cancha, fecha, hora_inicio, hora_fin, id_tipo_ocupacion, id_cancha)
      VALUES (103, CURRENT_DATE + 3, '21:00:00', '22:00:00', 1, 1)
      ON CONFLICT (id_ocupacion_cancha) DO NOTHING;
    `);

    // 9. Crear Clases y Entrenamientos
    await pool.query(`
      INSERT INTO clases (id_clase, nombre, capacidad_max, id_profesional, id_cancha, id_ocupacion_cancha)
      VALUES (1, 'Técnica Individual y Pase', 15, 11, 1, 101)
      ON CONFLICT (id_clase) DO NOTHING;

      INSERT INTO entrenamientos (id_entrenamiento, capacidad_max, id_profesional, id_cancha, id_ocupacion_cancha)
      VALUES (1, 10, 12, 2, 102)
      ON CONFLICT (id_entrenamiento) DO NOTHING;
    `);

    // 10. Inscribir Cliente en la Clase y el Entrenamiento (id_asistencia 2 = 'Ausente' por defecto)
    await pool.query(`
      INSERT INTO clientes_clases (id_cliente_clase, id_cliente, id_clase, id_asistencia)
      VALUES (1, 10, 1, 2)
      ON CONFLICT (id_cliente_clase) DO NOTHING;

      INSERT INTO clientes_entrenamientos (id_cliente_capacitacion, id_cliente, id_entrenamiento, id_asistencia)
      VALUES (1, 10, 1, 2)
      ON CONFLICT (id_cliente_capacitacion) DO NOTHING;
    `);

    // 11. Crear cobro para la reserva y asociar Reserva
    await pool.query(`
      -- Cobro Pendiente (id_estado_cobro 1 = 'Pendiente', id_metodo_pago 1 = 'Efectivo')
      INSERT INTO cobros (id_cobro, monto, porcentaje_descuento, detalles, id_club, id_usuario, id_estado_cobro, id_metodo_de_pago)
      VALUES (1001, 5000, 0, 'Reserva de Cancha Sintética 1 de prueba', 1, 10, 1, 1)
      ON CONFLICT (id_cobro) DO NOTHING;

      INSERT INTO reservas (id_reserva, id_ocupacion_cancha, id_usuario, id_cancha, id_cobro)
      VALUES (1001, 103, 10, 1, 1001)
      ON CONFLICT (id_reserva) DO NOTHING;
    `);

    await pool.query('COMMIT');
    console.log("=== DATOS DE PRUEBA SEMBRADOS CORRECTAMENTE ===");
    console.log("\nCredenciales del cliente de pruebas:");
    console.log("-> Usuario: cliente_test (o email: cliente@example.com)");
    console.log("-> Contraseña: 123456");
    console.log("Este usuario ya tiene cargada 1 reserva, 1 clase y 1 entrenamiento de prueba.");
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Error al sembrar la base de datos:", err);
  } finally {
    await pool.end();
  }
}

seed();
