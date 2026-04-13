require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const rutasRoutes = require('./routes/rutasRoutes');
const apiRoutes = require('./routes/apiRoutes');
const { setupSocket } = require('./socket/socketHandler');
const { setIo } = require('./controllers/rutasController');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middlewares — aumentar límite para fotos base64
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/auth', authRoutes);
app.use('/rutas', rutasRoutes);
app.use('/api', apiRoutes);

// Socket.io
setupSocket(io);
setIo(io); // pasar io al controlador de rutas para notificaciones en tiempo real

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 ElUltimoTimbraso backend en puerto ${PORT}`);
  console.log(`🔌 Socket.io listo`);
});
