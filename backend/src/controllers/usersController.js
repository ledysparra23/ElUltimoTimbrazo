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
    const { historial } = req.query;
    let query, params;
    if (historial === 'true') {
      // Historial: return ALL notifications (read + unread), last 100
      query = `SELECT * FROM notificaciones WHERE user_id = $1 ORDER BY creado_en DESC LIMIT 100`;
      params = [req.user.id];
    } else {
      // Default: only unread notifications
      query = `SELECT * FROM notificaciones WHERE user_id = $1 AND leida = false ORDER BY creado_en DESC LIMIT 50`;
      params = [req.user.id];
    }
    const result = await db.query(query, params);
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
 
const marcarTodasLeidas = async (req, res) => {
  try {
    await db.query(`UPDATE notificaciones SET leida = true WHERE user_id = $1`, [req.user.id]);
    return res.json({ message: 'Todas las notificaciones marcadas como leídas' });
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
 
 
// ── Admin: update user ────────────────────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, password, rol, telefono, direccion } = req.body;
    const updates = [];
    const params = [];
    if (nombre) { updates.push(`nombre = $${params.length + 1}`); params.push(nombre); }
    if (apellido) { updates.push(`apellido = $${params.length + 1}`); params.push(apellido); }
    if (email) { updates.push(`email = $${params.length + 1}`); params.push(email); }
    if (rol && ['admin', 'operador', 'cliente'].includes(rol)) {
      updates.push(`rol = $${params.length + 1}`); params.push(rol);
    }
    if (password) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${params.length + 1}`); params.push(hash);
    }
    if (updates.length > 0) {
      params.push(id);
      await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }
    // Update profile tables
    if (telefono || direccion) {
      await db.query(`UPDATE clientes SET telefono = COALESCE($1, telefono), direccion = COALESCE($2, direccion) WHERE user_id = $3`,
        [telefono || null, direccion || null, id]);
      await db.query(`UPDATE operadores SET telefono = COALESCE($1, telefono) WHERE user_id = $2`,
        [telefono || null, id]).catch(() => {});
    }
    return res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};
 
// ── Admin: delete user ────────────────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await db.query('SELECT rol FROM users WHERE id = $1', [id]);
    if (!check.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (check.rows[0].rol === 'admin') return res.status(403).json({ error: 'No puedes eliminar un admin' });
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    return res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};
 
module.exports = { getUsers, getOperadores, getClientes, getZonas, crearZona, toggleUser, getMisPaquetes, getMisNotificaciones, marcarLeida, marcarTodasLeidas, updateSettings, updateProfile, updateUser, deleteUser };