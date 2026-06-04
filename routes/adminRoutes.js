const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController.js');
const { authMiddleware, requireRole } = require('../middlewares/auth.js');

// Las rutas administrativas exigen loguearse con x-user-id de un admin (user_level >= 152)
router.use(authMiddleware);
router.use(requireRole(['admin']));

// Gestión de Clientes
router.get('/clientes', adminController.listarClientes);
router.get('/clientes/:id', adminController.obtenerCliente);
router.put('/clientes/:id', adminController.actualizarCliente);
router.delete('/clientes/:id', adminController.eliminarCliente);

// Personal y Certificaciones
router.post('/profesores', adminController.registrarProfesor);
router.get('/profesores', adminController.listarProfesores);
router.post('/profesores/:id/certificaciones', adminController.registrarCertificacion);

// Canchas y Mantenimiento
router.post('/canchas', adminController.crearCancha);
router.post('/canchas/bloqueo', adminController.bloquearCanchaMantenimiento);

// Gestión de Cobros y Reservas Pendientes
router.get('/reservas/pendientes', adminController.listarReservasPendientes);
router.post('/cobros/:id/confirmar', adminController.confirmarPagoEfectivo);

// Ligas
router.post('/ligas', adminController.crearLiga);

// Reportes agregados
router.get('/reportes/ingresos', adminController.reporteFinanciero);

module.exports = router;
