const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getRutas, getRutaById, crearRuta,
  actualizarEstadoRuta, actualizarPunto,
  reagendarOmitidos, getReporte, guardarEvidenciaFinal
} = require('../controllers/rutasController');

router.get('/', auth(['admin', 'operador']), getRutas);
router.get('/reporte/:cicloId', auth(['admin']), getReporte);
router.get('/:id', auth(['admin', 'operador', 'cliente']), getRutaById);
router.post('/', auth(['admin']), crearRuta);
router.patch('/:id/estado', auth(['admin', 'operador']), actualizarEstadoRuta);
router.patch('/:id/evidencia-final', auth(['operador', 'admin']), guardarEvidenciaFinal);
router.patch('/puntos/:puntoId', auth(['operador', 'admin']), actualizarPunto);
router.post('/reagendar', auth(['admin']), reagendarOmitidos);

module.exports = router;
