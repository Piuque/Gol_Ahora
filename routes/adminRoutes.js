const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController.js');
const { authMiddleware, requireRole } = require('../middlewares/auth.js');

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
router.post('/usuarios/registrar', adminController.registrarUsuarioPorAdmin);

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
router.post('/canchas/bloqueo', adminController.bloquearCanchaMantenimiento);

// Gestión de Cobros y Reservas Pendientes
router.get('/reservas/pendientes', adminController.listarReservasPendientes);
router.post('/cobros/:id/confirmar', adminController.confirmarPagoEfectivo);

// Ligas
router.post('/ligas', adminController.crearLiga);

// Reportes agregados
router.get('/reportes/ingresos', adminController.reporteFinanciero);

module.exports = router;
