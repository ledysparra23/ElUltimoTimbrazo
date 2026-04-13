const jwt = require('jsonwebtoken');
const db = require('../config/db');

const operadoresActivos = new Map();

const setupSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token requerido'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`✅ Socket conectado: ${socket.user.email} (${socket.user.rol})`);

    // Clientes se unen a su sala personal para recibir updates de paquetes
    if (socket.user.rol === 'cliente') {
      socket.join(`cliente:${socket.user.id}`);
    }

    socket.on('operador:iniciar_tracking', async ({ rutaId }) => {
      if (socket.user.rol !== 'operador') return;
      const opRes = await db.query('SELECT id FROM operadores WHERE user_id = $1', [socket.user.id]);
      if (!opRes.rows[0]) return;
      const opId = opRes.rows[0].id;

      operadoresActivos.set(opId, { socketId: socket.id, operadorId: opId, rutaId: rutaId || null, nombre: socket.user.nombre, lat: null, lng: null });
      socket.join(`operador:${opId}`);
      socket.operadorId = opId;

      await db.query(`UPDATE operadores SET estado = 'en_ruta' WHERE id = $1`, [opId]);
      socket.emit('tracking:iniciado', { operadorId: opId });
      io.to('sala:admin').emit('operador:conectado', { operadorId: opId, nombre: socket.user.nombre });
    });

    socket.on('operador:ubicacion', async ({ lat, lng, velocidad }) => {
      if (socket.user.rol !== 'operador' || !socket.operadorId) return;
      const opId = socket.operadorId;
      const info = operadoresActivos.get(opId);
      if (info) { info.lat = lat; info.lng = lng; operadoresActivos.set(opId, info); }

      await db.query(
        `UPDATE operadores SET lat_actual = $1, lng_actual = $2, ultima_ubicacion_en = NOW() WHERE id = $3`,
        [lat, lng, opId]
      );
      await db.query(
        `INSERT INTO ubicaciones_historial (operador_id, ruta_id, lat, lng, velocidad) VALUES ($1, $2, $3, $4, $5)`,
        [opId, info?.rutaId || null, lat, lng, velocidad || null]
      );

      io.to('sala:admin').emit('operador:ubicacion_update', { operadorId: opId, lat, lng, nombre: socket.user.nombre });
      io.to(`siguiendo:${opId}`).emit('operador:ubicacion_update', { operadorId: opId, lat, lng });
    });

    socket.on('admin:unirse', () => {
      if (socket.user.rol !== 'admin') return;
      socket.join('sala:admin');
      socket.emit('operadores:estado_actual', Array.from(operadoresActivos.values()));
    });

    socket.on('cliente:seguir_operador', ({ operadorId }) => {
      socket.join(`siguiendo:${operadorId}`);
      const info = operadoresActivos.get(operadorId);
      if (info?.lat) socket.emit('operador:ubicacion_update', { operadorId, lat: info.lat, lng: info.lng });
    });

    socket.on('cliente:dejar_seguir', ({ operadorId }) => socket.leave(`siguiendo:${operadorId}`));

    socket.on('punto:actualizar', ({ puntoId, estado, motivo, notas }) => {
      io.to('sala:admin').emit('punto:actualizado', { puntoId, estado, motivo, notas, operadorId: socket.operadorId });
    });

    socket.on('disconnect', async () => {
      console.log(`❌ Socket desconectado: ${socket.user.email}`);
      if (socket.operadorId) {
        operadoresActivos.delete(socket.operadorId);
        await db.query(`UPDATE operadores SET estado = 'disponible' WHERE id = $1`, [socket.operadorId]);
        io.to('sala:admin').emit('operador:desconectado', { operadorId: socket.operadorId });
      }
    });
  });
};

const getOperadoresActivos = () => Array.from(operadoresActivos.values());

module.exports = { setupSocket, getOperadoresActivos };
