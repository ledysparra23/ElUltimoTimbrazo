const db = require('../config/db');

const getCiclos = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, u.nombre AS creador_nombre, u.apellido AS creador_apellido
      FROM ciclos_recoleccion c
      LEFT JOIN users u ON u.id = c.creado_por
      ORDER BY c.fecha DESC
    `);
    return res.json(result.rows.map(c => ({
      ...c,
      users: { nombre: c.creador_nombre, apellido: c.creador_apellido }
    })));
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener ciclos' });
  }
};

const crearCiclo = async (req, res) => {
  try {
    const { nombre, fecha } = req.body;
    if (!nombre || !fecha) return res.status(400).json({ error: 'nombre y fecha son requeridos' });

    const result = await db.query(
      `INSERT INTO ciclos_recoleccion (nombre, fecha, creado_por) VALUES ($1, $2, $3) RETURNING *`,
      [nombre, fecha, req.user.id]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Error al crear ciclo' });
  }
};

const actualizarCiclo = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    let query = 'UPDATE ciclos_recoleccion SET estado = $1';
    const params = [estado, id];
    if (estado === 'completado') query += ', finalizado_en = NOW()';
    query += ' WHERE id = $2 RETURNING *';

    const result = await db.query(query, params);
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Error al actualizar ciclo' });
  }
};

module.exports = { getCiclos, crearCiclo, actualizarCiclo };
