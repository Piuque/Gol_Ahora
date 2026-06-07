const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController.js');
const { authMiddleware, requireRole } = require('../middlewares/auth.js');
const { registerSchema, validate } = require('../middlewares/userValidator');
const userController = require('../controllers/userController');


// Las rutas administrativas exigen loguearse con x-user-id de un admin (user_level >= 152)
router.use(authMiddleware);
router.use(requireRole(['admin']));

// Info de administrador
const usuarioController = require('../controllers/usuarioController.js');
router.get('/info', usuarioController.obtenerInfoUsuarioLogueado);

// Gestión de Clientes
router.get('/clientes', adminController.listarClientes);
router.get('/clientes/:id', adminController.obtenerCliente);
router.put('/clientes/:id', adminController.actualizarCliente);
router.delete('/clientes/:id', adminController.eliminarCliente);
router.post('/usuarios/registrar', 
    authMiddleware,                 // 1. Primero verifica quién es (¿es admin?)
    requireRole(['admin']),         // 2. Si es admin, ¿tiene permiso?
    validate(registerSchema),       // 3. SI TIENE PERMISO, valida que los datos no tengan basura
    adminController.registrarUsuarioPorAdmin // 4. Finalmente, registra
);

// Personal y Certificaciones (Profesores y Entrenadores)
router.post('/profesores', adminController.registrarProfesor);
router.get('/profesores', adminController.listarProfesores);
router.post('/profesores/:id/certificaciones', adminController.registrarCertificacion);

router.post('/entrenadores', adminController.registrarEntrenador);
router.get('/entrenadores', adminController.listarEntrenadores);
router.post('/entrenadores/:id/certificaciones', adminController.registrarCertificacion);

// Canchas y Mantenimiento
router.post('/canchas/registrar', adminController.crearCancha);
router.get('/canchas/listar', adminController.listarCanchas);
router.delete('/canchas/:id', adminController.eliminarCancha);
router.post('/canchas/bloqueo', adminController.bloquearCanchaMantenimiento);

// Gestión de Cobros y Reservas Pendientes
router.get('/reservas/pendientes', adminController.listarReservasPendientes);
router.post('/cobros/:id/confirmar', adminController.confirmarPagoEfectivo);

// Ligas
router.post('/ligas', adminController.crearLiga);

// Reportes agregados
router.get('/reportes/ingresos', adminController.reporteFinanciero);

//Administradores
router.get('/administradores', adminController.listarAdministradores);
router.get('/profesores/:id', adminController.obtenerProfesor);
router.put('/profesores/:id', adminController.modificarProfesor);
router.delete('/profesores/:id', adminController.eliminarProfesor);
router.get('/entrenadores/:id', adminController.obtenerEntrenador);
router.put('/entrenadores/:id', adminController.modificarEntrenador);
router.delete('/entrenadores/:id', adminController.eliminarEntrenador);

// Tipos de cancha
router.post('/tipos-cancha', adminController.crearTipoCancha);
router.get('/tipos-cancha', adminController.listarTiposCanchas);
router.get('/tipos-cancha/:id', adminController.obtenerTipoCancha);
router.put('/tipos-cancha/:id', adminController.modificarTipoCancha);
router.delete('/tipos-cancha/:id', adminController.eliminarTipoCancha);

// Canchas CRUD completo
router.get('/canchas/:id', adminController.obtenerCancha);
router.put('/canchas/:id', adminController.modificarCancha);

// Reservas admin
router.post('/reservas', adminController.crearReserva);
router.get('/reservas', adminController.listarReservas);
router.put('/reservas/:id', adminController.modificarReserva);
router.delete('/reservas/:id', adminController.eliminarReserva);

// Certificaciones
router.get('/certificaciones/:id_usuario', adminController.listarCertificaciones);
router.put('/certificaciones/:id/validar', adminController.validarCertificacion);

// Clases
router.post('/clases', adminController.crearClase);
router.get('/clases', adminController.listarClases);
router.get('/clases/:id', adminController.obtenerClase);
router.put('/clases/:id', adminController.modificarClase);
router.delete('/clases/:id', adminController.eliminarClase);
router.post('/clases/asignacion-particular', adminController.asignarClaseParticular);
router.post('/clases/:id/asistencia', adminController.registrarAsistenciaClase);

// Entrenamientos
router.post('/entrenamientos', adminController.crearEntrenamiento);
router.get('/entrenamientos', adminController.listarEntrenamientos);
router.get('/entrenamientos/:id', adminController.obtenerEntrenamiento);
router.put('/entrenamientos/:id', adminController.modificarEntrenamiento);
router.delete('/entrenamientos/:id', adminController.eliminarEntrenamiento);
router.post('/entrenamientos/asignacion-particular', adminController.asignarEntrenamientoParticular);
router.post('/entrenamientos/:id/asistencia', adminController.registrarAsistenciaEntrenamiento);

// Ligas
router.get('/ligas', adminController.listarLigas);
router.get('/ligas/:id', adminController.obtenerLiga);
router.put('/ligas/:id', adminController.modificarLiga);
router.delete('/ligas/:id', adminController.eliminarLiga);
router.post('/ligas/:id/fixture', adminController.generarFixture);
router.post('/ligas/:id/inscripciones', adminController.inscribirEnLiga);
router.put('/ligas/:id/partidos/:idPartido/resultado', adminController.registrarResultadoLiga);

// Torneos
router.post('/torneos', adminController.crearTorneo);
router.get('/torneos', adminController.listarTorneos);
router.get('/torneos/:id', adminController.obtenerTorneo);
router.put('/torneos/:id', adminController.modificarTorneo);
router.delete('/torneos/:id', adminController.eliminarTorneo);
router.post('/torneos/:id/cuadro', adminController.generarCuadroTorneo);
router.post('/torneos/:id/inscripciones', adminController.inscribirEnTorneo);
router.put('/torneos/:id/partidos/:idPartido/resultado', adminController.registrarResultadoTorneo);

// Descuentos
router.post('/descuentos', adminController.crearDescuento);
router.get('/descuentos', adminController.listarDescuentos);
router.get('/descuentos/:id', adminController.obtenerDescuento);
router.put('/descuentos/:id', adminController.modificarDescuento);
router.delete('/descuentos/:id', adminController.eliminarDescuento);

// Cobros
router.post('/cobros', adminController.crearCobro);
router.get('/cobros', adminController.listarCobros);
router.get('/cobros/:id', adminController.obtenerCobro);
router.put('/cobros/:id', adminController.modificarCobro);

module.exports = router;
