const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendOTPEmail, verifyOTP } = require('../services/emailService');

const generateToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// ── REGISTER ──────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol = 'cliente',
      telefono, direccion, lat, lng, zona_id,
      vehiculo_placa, vehiculo_tipo, capacidad_maxima } = req.body;

    if (!nombre || !apellido || !email || !password)
      return res.status(400).json({ error: 'Campos requeridos: nombre, apellido, email, password' });

    const rolesPermitidos = ['cliente', 'operador', 'admin'];
    if (!rolesPermitidos.includes(rol))
      return res.status(400).json({ error: 'Rol inválido' });

    const authHeader = req.headers.authorization;
    if ((rol === 'admin' || rol === 'operador') && !authHeader)
      return res.status(403).json({ error: 'Solo un admin puede registrar operadores o admins' });

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'El email ya está registrado' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const userRes = await db.query(
      `INSERT INTO users (nombre, apellido, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, apellido, email, rol`,
      [nombre, apellido, email, password_hash, rol]
    );
    const newUser = userRes.rows[0];

    if (rol === 'operador') {
      await db.query(
        `INSERT INTO operadores (user_id, zona_id, vehiculo_placa, vehiculo_tipo, capacidad_maxima)
         VALUES ($1, $2, $3, $4, $5)`,
        [newUser.id, zona_id || null, vehiculo_placa || null, vehiculo_tipo || null, capacidad_maxima || 100]
      );
    } else if (rol === 'cliente') {
      await db.query(
        `INSERT INTO clientes (user_id, telefono, direccion, lat, lng, zona_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newUser.id, telefono || null, direccion || null, lat || null, lng || null, zona_id || null]
      );
    }

    const token = generateToken(newUser);
    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: { id: newUser.id, nombre: newUser.nombre, apellido: newUser.apellido, email: newUser.email, rol: newUser.rol }
    });
  } catch (err) {
    console.error('Error en register:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── STEP 1: Validate credentials, send OTP ───────────────────────────
const loginStep1 = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email y password requeridos' });

    const result = await db.query('SELECT * FROM users WHERE email = $1 AND activo = true', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

    // Send OTP
    const otpCode = await sendOTPEmail(email, user.nombre);

    return res.json({
      message: 'Credenciales válidas. Código OTP enviado a tu correo.',
      requiresOtp: true,
      email,
      // Only in dev/test: expose code if no smtp configured
      ...((!process.env.SMTP_USER) && { devOtp: otpCode }),
    });
  } catch (err) {
    console.error('Error en loginStep1:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── STEP 2: Verify OTP, return JWT ───────────────────────────────────
const loginStep2 = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ error: 'Email y código OTP requeridos' });

    const { valid, reason } = verifyOTP(email, otp);
    if (!valid) return res.status(401).json({ error: reason });

    const result = await db.query('SELECT * FROM users WHERE email = $1 AND activo = true', [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    let perfil = null;
    if (user.rol === 'operador') {
      const r = await db.query(
        `SELECT o.*, z.nombre AS zona_nombre FROM operadores o LEFT JOIN zonas z ON z.id = o.zona_id WHERE o.user_id = $1`,
        [user.id]
      );
      perfil = r.rows[0] || null;
    } else if (user.rol === 'cliente') {
      const r = await db.query(
        `SELECT c.*, z.nombre AS zona_nombre FROM clientes c LEFT JOIN zonas z ON z.id = c.zona_id WHERE c.user_id = $1`,
        [user.id]
      );
      perfil = r.rows[0] || null;
    }

    const token = generateToken(user);
    return res.json({
      token,
      user: { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email, rol: user.rol, perfil }
    });
  } catch (err) {
    console.error('Error en loginStep2:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ── RESEND OTP ────────────────────────────────────────────────────────
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const result = await db.query('SELECT nombre FROM users WHERE email = $1 AND activo = true', [email]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });

    const otpCode = await sendOTPEmail(email, result.rows[0].nombre);
    return res.json({
      message: 'Nuevo código enviado a tu correo.',
      ...((!process.env.SMTP_USER) && { devOtp: otpCode }),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error al reenviar OTP' });
  }
};

// ── Keep old login for backward compat (no OTP, used by admin panel creation)
const login = async (req, res) => {
  return loginStep1(req, res);
};

const me = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nombre, apellido, email, rol, creado_en FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    let perfil = null;
    if (user.rol === 'operador') {
      const r = await db.query(
        `SELECT o.*, z.nombre AS zona_nombre FROM operadores o LEFT JOIN zonas z ON z.id = o.zona_id WHERE o.user_id = $1`,
        [user.id]
      );
      perfil = r.rows[0] || null;
    } else if (user.rol === 'cliente') {
      const r = await db.query(
        `SELECT c.*, z.nombre AS zona_nombre FROM clientes c LEFT JOIN zonas z ON z.id = c.zona_id WHERE c.user_id = $1`,
        [user.id]
      );
      perfil = r.rows[0] || null;
    }

    return res.json({ ...user, perfil });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno' });
  }
};

// ── DIRECT LOGIN (OTP desactivado por el usuario) ────────────────────
const loginDirect = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email y password requeridos' });

    const result = await db.query('SELECT * FROM users WHERE email = $1 AND activo = true', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

    let perfil = null;
    if (user.rol === 'operador') {
      const r = await db.query(
        `SELECT o.*, z.nombre AS zona_nombre FROM operadores o LEFT JOIN zonas z ON z.id = o.zona_id WHERE o.user_id = $1`,
        [user.id]
      );
      perfil = r.rows[0] || null;
    } else if (user.rol === 'cliente') {
      const r = await db.query(
        `SELECT c.*, z.nombre AS zona_nombre FROM clientes c LEFT JOIN zonas z ON z.id = c.zona_id WHERE c.user_id = $1`,
        [user.id]
      );
      perfil = r.rows[0] || null;
    }

    const token = generateToken(user);
    return res.json({
      token,
      user: { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email, rol: user.rol, perfil }
    });
  } catch (err) {
    console.error('Error en loginDirect:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { register, login, loginStep1, loginStep2, loginDirect, resendOtp, me };
