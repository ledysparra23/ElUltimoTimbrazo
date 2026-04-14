const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getUsers, getOperadores, getClientes,
  getZonas, crearZona, toggleUser,
  getMisNotificaciones, marcarLeida, marcarTodasLeidas, updateSettings, updateProfile,
  updateUser, deleteUser
} = require('../controllers/usersController');
const { getCiclos, crearCiclo, actualizarCiclo } = require('../controllers/ciclosController');
const { getOperadoresActivos } = require('../socket/socketHandler');
const {
  registrarPaquete, actualizarEstadoPaquete, listarPaquetes, misPaquetes,
  getCorresponsales, crearSolicitudRecogida, misSolicitudes,
  todasSolicitudes, actualizarSolicitud, asignarSolicitudAOperador,
  misSolicitudesAsignadas, responderSolicitud, vincularPaqueteARuta,
  confirmarRecepcion
} = require('../controllers/paquetesController');

// ── Admin: usuarios ───────────────────────────────────────────────────
router.get('/admin/users', auth(['admin']), getUsers);
router.patch('/admin/users/:id/toggle', auth(['admin']), toggleUser);
router.patch('/admin/users/:id', auth(['admin']), updateUser);
router.delete('/admin/users/:id', auth(['admin']), deleteUser);
router.get('/admin/operadores', auth(['admin']), getOperadores);
router.get('/admin/clientes', auth(['admin']), getClientes);
router.get('/admin/zonas', auth(['admin']), getZonas);
router.post('/admin/zonas', auth(['admin']), crearZona);
router.get('/admin/operadores-activos', auth(['admin']), (req, res) => res.json(getOperadoresActivos()));

// ── Ciclos ────────────────────────────────────────────────────────────
router.get('/ciclos', auth(['admin', 'operador']), getCiclos);
router.post('/ciclos', auth(['admin']), crearCiclo);
router.patch('/ciclos/:id', auth(['admin']), actualizarCiclo);

// ── Paquetes (admin) ──────────────────────────────────────────────────
router.get('/admin/paquetes', auth(['admin', 'operador']), listarPaquetes);
router.post('/admin/paquetes', auth(['admin']), registrarPaquete);
router.patch('/admin/paquetes/:id/estado', auth(['admin', 'operador']), actualizarEstadoPaquete);
router.post('/admin/paquetes/:id/vincular-ruta', auth(['admin']), vincularPaqueteARuta);

// ── Solicitudes de recogida (admin) ───────────────────────────────────
router.get('/admin/solicitudes', auth(['admin']), todasSolicitudes);
router.patch('/admin/solicitudes/:id', auth(['admin']), actualizarSolicitud);
router.post('/admin/solicitudes/:id/asignar', auth(['admin']), asignarSolicitudAOperador);

// ── Operador ──────────────────────────────────────────────────────────
router.get('/operador/notificaciones', auth(['operador']), getMisNotificaciones);
router.patch('/operador/notificaciones/todas-leidas', auth(['operador']), marcarTodasLeidas);
router.patch('/operador/notificaciones/:id/leida', auth(['operador']), marcarLeida);
router.get('/operador/solicitudes', auth(['operador']), misSolicitudesAsignadas);
router.post('/operador/solicitudes/:id/responder', auth(['operador']), responderSolicitud);

// ── Cliente ───────────────────────────────────────────────────────────
router.get('/cliente/paquetes', auth(['cliente']), misPaquetes);
router.post('/cliente/paquetes/:id/confirmar', auth(['cliente']), confirmarRecepcion);
router.get('/cliente/notificaciones', auth(['cliente']), getMisNotificaciones);
router.patch('/cliente/notificaciones/todas-leidas', auth(['cliente']), marcarTodasLeidas);
router.patch('/cliente/notificaciones/:id/leida', auth(['cliente']), marcarLeida);
router.get('/cliente/solicitudes', auth(['cliente']), misSolicitudes);
router.post('/cliente/solicitudes', auth(['cliente']), crearSolicitudRecogida);

// ── Corresponsales ────────────────────────────────────────────────────
router.get('/corresponsales', auth(), getCorresponsales);

// ── User settings & profile ───────────────────────────────────────────
router.patch('/me/settings', auth(), updateSettings);
router.patch('/me/profile', auth(), updateProfile);

// ── Google Maps key proxy ─────────────────────────────────────────────
router.get('/maps/config', auth(), (req, res) => {
  res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY || '' });
});

module.exports = router;
