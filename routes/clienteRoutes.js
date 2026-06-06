const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController.js');
const { authMiddleware, requireRole } = require('../middlewares/auth.js');

// Todo el enrutamiento de cliente requiere que esté logueado como cliente o administrador
router.use(authMiddleware);
router.use(requireRole(['cliente', 'admin']));

// Perfil
const usuarioController = require('../controllers/usuarioController.js');
router.get('/info', usuarioController.obtenerInfoUsuarioLogueado);
router.get('/perfil', clienteController.obtenerPerfil);
router.put('/perfil', clienteController.modificarPerfil);

// Canchas y Reservas
router.get('/canchas', clienteController.listarCanchasCliente);
router.post('/reservas', clienteController.realizarReserva);
router.get('/reservas', clienteController.listarReservasCliente);
router.put('/reservas/:id', clienteController.modificarReserva);
router.delete('/reservas/{id}', clienteController.cancelarReserva);
router.delete('/reservas/:id', clienteController.cancelarReserva);

// Clases
router.post('/clases/inscripcion', clienteController.inscribirClase);
router.delete('/clases/inscripcion/:id', clienteController.darBajaClase);

// Entrenamientos
router.post('/entrenamientos/inscripcion', clienteController.inscribirEntrenamiento);
router.delete('/entrenamientos/inscripcion/:id', clienteController.darBajaEntrenamiento);

// Finanzas y Cobros propios
router.get('/cobros', clienteController.listarMisPagos);
router.get('/cobros/:id', clienteController.consultarMiPago);
router.get('/recibos', clienteController.listarMisRecibos);
router.get('/recibos/:id', clienteController.consultarMiRecibo);

// Realizar pago de un cobro específico
router.post('/cobros/:id/pagar', clienteController.realizarPago);

module.exports = router;
