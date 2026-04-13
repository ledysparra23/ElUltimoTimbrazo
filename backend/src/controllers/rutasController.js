const db = require('../config/db');

let _io = null;
const setIo = (io) => { _io = io; };

const getRutas = async (req, res) => {
  try {
    const { ciclo_id, estado } = req.query;
    let params = [];
    let conditions = [];
    let idx = 1;

    if (req.user.rol === 'operador') {
      const opRes = await db.query('SELECT id FROM operadores WHERE user_id = $1', [req.user.id]);
      if (!opRes.rows[0]) return res.status(404).json({ error: 'Perfil operador no encontrado' });
      conditions.push(`r.operador_id = $${idx++}`);
      params.push(opRes.rows[0].id);
    }
    if (ciclo_id) { conditions.push(`r.ciclo_id = $${idx++}`); params.push(ciclo_id); }
    if (estado) { conditions.push(`r.estado = $${idx++}`); params.push(estado); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await db.query(`
      SELECT r.*,
        u.nombre AS op_nombre, u.apellido AS op_apellido,
        o.vehiculo_placa, o.estado AS op_estado,
        z.nombre AS zona_nombre,
        c.nombre AS ciclo_nombre, c.fecha AS ciclo_fecha
      FROM rutas r
      LEFT JOIN operadores o ON o.id = r.operador_id
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN zonas z ON z.id = r.zona_id
      LEFT JOIN ciclos_recoleccion c ON c.id = r.ciclo_id
      ${where}
      ORDER BY r.creado_en DESC
    `, params);

    return res.json(result.rows.map(r => ({
      ...r,
      operadores: { users: { nombre: r.op_nombre, apellido: r.op_apellido }, vehiculo_placa: r.vehiculo_placa, estado: r.op_estado },
      zonas: { nombre: r.zona_nombre },
      ciclos_recoleccion: { nombre: r.ciclo_nombre, fecha: r.ciclo_fecha }
    })));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener rutas' });
  }
};

const getRutaById = async (req, res) => {
  try {
    const { id } = req.params;
    const rutaRes = await db.query(`
      SELECT r.*,
        u.nombre AS op_nombre, u.apellido AS op_apellido, u.email AS op_email,
        o.vehiculo_placa, o.lat_actual, o.lng_actual,
        z.nombre AS zona_nombre,
        c.nombre AS ciclo_nombre, c.fecha AS ciclo_fecha, c.estado AS ciclo_estado
      FROM rutas r
      LEFT JOIN operadores o ON o.id = r.operador_id
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN zonas z ON z.id = r.zona_id
      LEFT JOIN ciclos_recoleccion c ON c.id = r.ciclo_id
      WHERE r.id = $1
    `, [id]);

    if (!rutaRes.rows[0]) return res.status(404).json({ error: 'Ruta no encontrada' });
    const ruta = rutaRes.rows[0];

    const puntosRes = await db.query(`
      SELECT p.*,
        cu.nombre AS cliente_nombre, cu.apellido AS cliente_apellido,
        cl.telefono AS cliente_telefono
      FROM puntos_parada p
      LEFT JOIN clientes cl ON cl.id = p.cliente_id
      LEFT JOIN users cu ON cu.id = cl.user_id
      WHERE p.ruta_id = $1
      ORDER BY p.orden ASC
    `, [id]);

    return res.json({
      ...ruta,
      operadores: {
        users: { nombre: ruta.op_nombre, apellido: ruta.op_apellido, email: ruta.op_email },
        vehiculo_placa: ruta.vehiculo_placa, lat_actual: ruta.lat_actual, lng_actual: ruta.lng_actual
      },
      zonas: { nombre: ruta.zona_nombre },
      ciclos_recoleccion: { nombre: ruta.ciclo_nombre, fecha: ruta.ciclo_fecha, estado: ruta.ciclo_estado },
      puntos_parada: puntosRes.rows.map(p => ({
        ...p,
        clientes: p.cliente_nombre ? {
          telefono: p.cliente_telefono,
          users: { nombre: p.cliente_nombre, apellido: p.cliente_apellido }
        } : null
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener ruta' });
  }
};

const crearRuta = async (req, res) => {
  try {
    const { ciclo_id, operador_id, zona_id, puntos } = req.body;
    if (!ciclo_id || !operador_id)
      return res.status(400).json({ error: 'ciclo_id y operador_id son requeridos' });

    const opRes = await db.query('SELECT capacidad_maxima FROM operadores WHERE id = $1', [operador_id]);
    const capacidad_maxima = opRes.rows[0]?.capacidad_maxima || 100;
    const pesoTotal = puntos?.reduce((s, p) => s + (parseFloat(p.peso_estimado) || 1), 0) || 0;

    if (pesoTotal > capacidad_maxima)
      return res.status(400).json({ error: `Capacidad excedida: ${pesoTotal} > ${capacidad_maxima}`, peso_total: pesoTotal, capacidad_maxima });

    const rutaRes = await db.query(
      `INSERT INTO rutas (ciclo_id, operador_id, zona_id, capacidad_usada)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [ciclo_id, operador_id, zona_id || null, pesoTotal]
    );
    const ruta = rutaRes.rows[0];

    if (puntos && puntos.length > 0) {
      for (let i = 0; i < puntos.length; i++) {
        const p = puntos[i];
        await db.query(
          `INSERT INTO puntos_parada (ruta_id, ciclo_id, cliente_id, orden, direccion, lat, lng, descripcion, tipo, peso_estimado)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [ruta.id, ciclo_id, p.cliente_id || null, p.orden ?? i, p.direccion, p.lat, p.lng,
           p.descripcion || null, p.tipo || 'domicilio', p.peso_estimado || 1.0]
        );
      }
    }

    return res.status(201).json({ message: 'Ruta creada exitosamente', ruta });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al crear ruta' });
  }
};

const actualizarEstadoRuta = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const estadosValidos = ['pendiente', 'en_curso', 'completada', 'cancelada'];
    if (!estadosValidos.includes(estado))
      return res.status(400).json({ error: 'Estado inválido' });

    let query = 'UPDATE rutas SET estado = $1';
    const params = [estado, id];
    if (estado === 'en_curso') query += ', iniciada_en = NOW()';
    if (estado === 'completada' || estado === 'cancelada') query += ', finalizada_en = NOW()';
    query += ' WHERE id = $2 RETURNING *';

    const result = await db.query(query, params);
    return res.json({ message: 'Estado actualizado', ruta: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Error al actualizar estado' });
  }
};

const actualizarPunto = async (req, res) => {
  try {
    const { puntoId } = req.params;
    const { estado, motivo_omision, notas, foto_evidencia } = req.body;
    const estadosValidos = ['pendiente', 'visitado', 'omitido'];
    if (!estadosValidos.includes(estado))
      return res.status(400).json({ error: 'Estado inválido' });
    if (estado === 'omitido' && !motivo_omision)
      return res.status(400).json({ error: 'motivo_omision es requerido al omitir un punto' });

    let query = `UPDATE puntos_parada SET estado = $1, notas = $2, foto_evidencia = $3`;
    const params = [estado, notas || null, foto_evidencia || null];
    if (estado === 'visitado') query += ', visitado_en = NOW()';
    if (estado === 'omitido') { query += `, motivo_omision = $${params.length + 1}`; params.push(motivo_omision); }
    query += ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(puntoId);

    const puntoRes = await db.query(query, params);
    const punto = puntoRes.rows[0];

    // Actualizar paquete asociado
    const estadoPaquete = estado === 'visitado' ? 'entregado' : estado === 'omitido' ? 'no_entregado' : 'en_transito';
    await db.query(
      `UPDATE paquetes SET estado = $1, estado_actualizado_en = NOW() WHERE punto_parada_id = $2`,
      [estadoPaquete, puntoId]
    );

    // Notificar al cliente si existe
    if (punto.cliente_id) {
      const clienteRes = await db.query('SELECT user_id FROM clientes WHERE id = $1', [punto.cliente_id]);
      const userId = clienteRes.rows[0]?.user_id;
      if (userId) {
        const mensaje = estado === 'visitado'
          ? 'Tu paquete ha sido entregado exitosamente.'
          : `Tu punto de entrega fue omitido. Motivo: ${motivo_omision}`;
        await db.query(
          `INSERT INTO notificaciones (user_id, tipo, titulo, mensaje) VALUES ($1, $2, $3, $4)`,
          [userId, `punto_${estado}`, estado === 'visitado' ? '✅ Entrega completada' : '⚠️ Punto omitido', mensaje]
        );
        // Emit socket to client in real time
        if (_io) {
          _io.to(`cliente:${userId}`).emit('paquete:actualizado', { puntoId, estado, mensaje });
        }
      }
    }

    return res.json({ message: 'Punto actualizado', punto });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar punto' });
  }
};

const reagendarOmitidos = async (req, res) => {
  try {
    const { ciclo_origen_id, nuevo_ciclo_id } = req.body;
    if (!ciclo_origen_id || !nuevo_ciclo_id)
      return res.status(400).json({ error: 'ciclo_origen_id y nuevo_ciclo_id son requeridos' });

    const omitidosRes = await db.query(
      `SELECT * FROM puntos_parada WHERE ciclo_id = $1 AND estado = 'omitido' AND reagendado = false`,
      [ciclo_origen_id]
    );
    const omitidos = omitidosRes.rows;
    if (!omitidos.length) return res.json({ message: 'No hay puntos omitidos para reagendar', reagendados: 0 });

    for (const p of omitidos) {
      await db.query(
        `INSERT INTO puntos_parada (ruta_id, ciclo_id, cliente_id, orden, direccion, lat, lng, descripcion, tipo, peso_estimado, notas)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [p.ruta_id, nuevo_ciclo_id, p.cliente_id, p.orden, p.direccion, p.lat, p.lng,
         `[REAGENDADO] ${p.descripcion || ''}`, p.tipo, p.peso_estimado,
         `Reagendado desde ciclo ${ciclo_origen_id}. Motivo anterior: ${p.motivo_omision}`]
      );
    }

    const ids = omitidos.map(p => p.id);
    await db.query(
      `UPDATE puntos_parada SET reagendado = true, reagendado_en = NOW() WHERE id = ANY($1::uuid[])`,
      [ids]
    );

    return res.json({ message: `${omitidos.length} puntos reagendados exitosamente`, reagendados: omitidos.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al reagendar puntos' });
  }
};

const getReporte = async (req, res) => {
  try {
    const { cicloId } = req.params;

    const result = await db.query(`
      SELECT
        p.estado, p.motivo_omision, p.tipo,
        r.operador_id,
        u.nombre AS op_nombre, u.apellido AS op_apellido,
        z.nombre AS zona_nombre
      FROM puntos_parada p
      LEFT JOIN rutas r ON r.id = p.ruta_id
      LEFT JOIN operadores o ON o.id = r.operador_id
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN zonas z ON z.id = r.zona_id
      WHERE p.ciclo_id = $1
    `, [cicloId]);

    const puntos = result.rows;
    const porOperario = {};
    const porZona = {};

    for (const p of puntos) {
      const opId = p.operador_id;
      const opNombre = `${p.op_nombre || ''} ${p.op_apellido || ''}`.trim();
      const zona = p.zona_nombre || 'Sin zona';

      if (opId) {
        if (!porOperario[opId]) porOperario[opId] = { nombre: opNombre, visitados: 0, omitidos: 0, pendientes: 0, motivos: {} };
        porOperario[opId][p.estado === 'visitado' ? 'visitados' : p.estado === 'omitido' ? 'omitidos' : 'pendientes']++;
        if (p.estado === 'omitido' && p.motivo_omision)
          porOperario[opId].motivos[p.motivo_omision] = (porOperario[opId].motivos[p.motivo_omision] || 0) + 1;
      }
      if (!porZona[zona]) porZona[zona] = { visitados: 0, omitidos: 0, pendientes: 0 };
      porZona[zona][p.estado === 'visitado' ? 'visitados' : p.estado === 'omitido' ? 'omitidos' : 'pendientes']++;
    }

    return res.json({
      ciclo_id: cicloId,
      total_puntos: puntos.length,
      resumen: {
        visitados: puntos.filter(p => p.estado === 'visitado').length,
        omitidos: puntos.filter(p => p.estado === 'omitido').length,
        pendientes: puntos.filter(p => p.estado === 'pendiente').length
      },
      por_operario: Object.values(porOperario),
      por_zona: Object.entries(porZona).map(([zona, stats]) => ({ zona, ...stats }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al generar reporte' });
  }
};

const guardarEvidenciaFinal = async (req, res) => {
  try {
    const { id } = req.params;
    const { foto_evidencia_final } = req.body;
    if (!foto_evidencia_final)
      return res.status(400).json({ error: 'foto_evidencia_final es requerida' });

    const result = await db.query(
      `UPDATE rutas SET foto_evidencia_final = $1 WHERE id = $2 RETURNING id`,
      [foto_evidencia_final, id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Ruta no encontrada' });
    return res.json({ message: 'Evidencia final guardada' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al guardar evidencia final' });
  }
};

module.exports = { getRutas, getRutaById, crearRuta, actualizarEstadoRuta, actualizarPunto, reagendarOmitidos, getReporte, guardarEvidenciaFinal, setIo };
