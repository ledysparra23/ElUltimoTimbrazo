const db = require('../config/db');

const getUsers = async (req, res) => {
  try {
    const { rol } = req.query;
    let query = 'SELECT id, nombre, apellido, email, rol, activo, creado_en FROM users';
    const params = [];
    if (rol) { query += ' WHERE rol = $1'; params.push(rol); }
    query += ' ORDER BY creado_en DESC';
    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

const getOperadores = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT o.*, u.nombre, u.apellido, u.email, u.activo, z.nombre AS zona_nombre
      FROM operadores o
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN zonas z ON z.id = o.zona_id
    `);
    return res.json(result.rows.map(o => ({
      ...o,
      users: { nombre: o.nombre, apellido: o.apellido, email: o.email, activo: o.activo },
      zonas: { nombre: o.zona_nombre }
    })));
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener operadores' });
  }
};

const getClientes = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, u.nombre, u.apellido, u.email, z.nombre AS zona_nombre
      FROM clientes c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN zonas z ON z.id = c.zona_id
    `);
    return res.json(result.rows.map(c => ({
      ...c,
      users: { nombre: c.nombre, apellido: c.apellido, email: c.email },
      zonas: { nombre: c.zona_nombre }
    })));
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

const getZonas = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM zonas WHERE activa = true ORDER BY nombre`);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener zonas' });
  }
};

const crearZona = async (req, res) => {
  try {
    const { nombre, descripcion, poligono } = req.body;
    const result = await db.query(
      `INSERT INTO zonas (nombre, descripcion, poligono) VALUES ($1, $2, $3) RETURNING *`,
      [nombre, descripcion || null, poligono ? JSON.stringify(poligono) : null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Error al crear zona' });
  }
};

const toggleUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    const result = await db.query(
      `UPDATE users SET activo = $1 WHERE id = $2 RETURNING id, nombre, activo`,
      [activo, id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

const getMisPaquetes = async (req, res) => {
  try {
    const clRes = await db.query('SELECT id FROM clientes WHERE user_id = $1', [req.user.id]);
    if (!clRes.rows[0]) return res.status(404).json({ error: 'Perfil cliente no encontrado' });

    const result = await db.query(`
      SELECT pk.*,
        p.direccion AS punto_direccion, p.estado AS punto_estado,
        p.visitado_en, p.motivo_omision,
        u.nombre AS op_nombre, u.apellido AS op_apellido
      FROM paquetes pk
      LEFT JOIN puntos_parada p ON p.id = pk.punto_parada_id
      LEFT JOIN rutas r ON r.id = p.ruta_id
      LEFT JOIN operadores o ON o.id = r.operador_id
      LEFT JOIN users u ON u.id = o.user_id
      WHERE pk.cliente_id = $1
      ORDER BY pk.creado_en DESC
    `, [clRes.rows[0].id]);

    return res.json(result.rows.map(p => ({
      ...p,
      puntos_parada: {
        direccion: p.punto_direccion, estado: p.punto_estado,
        visitado_en: p.visitado_en, motivo_omision: p.motivo_omision,
        rutas: { operadores: { users: { nombre: p.op_nombre, apellido: p.op_apellido } } }
      }
    })));
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener paquetes' });
  }
};

const getMisNotificaciones = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM notificaciones WHERE user_id = $1 ORDER BY creado_en DESC LIMIT 50`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

const marcarLeida = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      `UPDATE notificaciones SET leida = true WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    return res.json({ message: 'Notificación marcada como leída' });
  } catch (err) {
    return res.status(500).json({ error: 'Error' });
  }
};

// ── Update user settings (2FA toggle) ──────────────────────────────
const updateSettings = async (req, res) => {
  try {
    const { otp_enabled } = req.body;
    try {
      await db.query('UPDATE users SET otp_enabled = $1 WHERE id = $2', [otp_enabled === true, req.user.id]);
    } catch (e) { /* column may not exist yet */ }
    return res.json({ message: 'Configuración actualizada', otp_enabled });
  } catch (err) {
    return res.status(500).json({ error: 'Error al guardar configuración' });
  }
};

// ── Update user profile (nombre, apellido, avatar_color) ─────────────
const updateProfile = async (req, res) => {
  try {
    const { nombre, apellido, avatar_color } = req.body;
    const updates = [];
    const params = [];
    if (nombre) { updates.push(`nombre = $${params.length + 1}`); params.push(nombre.trim()); }
    if (apellido) { updates.push(`apellido = $${params.length + 1}`); params.push(apellido.trim()); }
    if (avatar_color) {
      try {
        await db.query(`UPDATE users SET avatar_color = $1 WHERE id = $2`, [avatar_color, req.user.id]);
      } catch (e) { /* column may not exist */ }
    }
    if (updates.length > 0) {
      params.push(req.user.id);
      await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }
    const result = await db.query('SELECT id, nombre, apellido, email, rol FROM users WHERE id = $1', [req.user.id]);
    return res.json({ message: 'Perfil actualizado', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

module.exports = { getUsers, getOperadores, getClientes, getZonas, crearZona, toggleUser, getMisPaquetes, getMisNotificaciones, marcarLeida, updateSettings, updateProfile };
