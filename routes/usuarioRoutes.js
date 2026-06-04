const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController.js');

router.post('/registro', usuarioController.registrarUsuario);
router.post('/login', usuarioController.loginUsuario);
router.get('/canchas', usuarioController.listarCanchas);
router.get('/tipos-cancha', usuarioController.listarTiposCancha);
router.get('/canchas/disponibilidad', usuarioController.consultarDisponibilidad);
router.get('/clases', usuarioController.listarClasesPublicas);
router.get('/entrenamientos', usuarioController.listarEntrenamientosPublicos);

module.exports = router;
