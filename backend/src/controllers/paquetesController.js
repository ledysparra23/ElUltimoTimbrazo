const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ── Admin: registrar paquete a nombre de un cliente ──────────────────
const registrarPaquete = async (req, res) => {
  try {
    const {
      cliente_id, cliente_email, descripcion, peso, dimensiones,
      punto_parada_id, tipo_ingreso = 'admin'
    } = req.body;

    if (!descripcion) return res.status(400).json({ error: 'descripcion es requerida' });

    let clienteDbId = cliente_id;
    let clienteUserId = null;

    if (cliente_email && !cliente_id) {
      const userRes = await db.query(
        'SELECT u.id AS user_id, c.id AS cliente_id FROM users u LEFT JOIN clientes c ON c.user_id = u.id WHERE u.email = $1',
        [cliente_email.toLowerCase().trim()]
      );
      if (!userRes.rows[0]) return res.status(404).json({ error: 'No existe un usuario con ese correo' });
      if (!userRes.rows[0].cliente_id) return res.status(404).json({ error: 'El usuario no tiene perfil de cliente' });
      clienteDbId = userRes.rows[0].cliente_id;
      clienteUserId = userRes.rows[0].user_id;
    } else if (cliente_id) {
      const clienteRes = await db.query('SELECT id, user_id FROM clientes WHERE id = $1', [cliente_id]);
      if (!clienteRes.rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
      clienteDbId = clienteRes.rows[0].id;
      clienteUserId = clienteRes.rows[0].user_id;
    } else {
      return res.status(400).json({ error: 'Debes proveer cliente_id o cliente_email' });
    }

    const codigo_seguimiento = 'PKT-' + Date.now().toString(36).toUpperCase();

    const result = await db.query(
      `INSERT INTO paquetes
         (cliente_id, codigo_seguimiento, descripcion, peso, dimensiones,
          punto_parada_id, estado, registrado_por, tipo_ingreso)
       VALUES ($1, $2, $3, $4, $5, $6, 'registrado', $7, $8)
       RETURNING *`,
      [clienteDbId, codigo_seguimiento, descripcion, peso || null,
       dimensiones || null, punto_parada_id || null,
       req.user.id, tipo_ingreso]
    );
    const paquete = result.rows[0];

    // Notificar al cliente
    if (clienteUserId) {
      await db.query(
        `INSERT INTO notificaciones (user_id, tipo, titulo, mensaje, datos_extra)
         VALUES ($1, 'paquete_registrado', '📦 Nuevo paquete registrado', $2, $3)`,
        [
          clienteUserId,
          `Se registró un nuevo paquete: ${descripcion}. Código: ${codigo_seguimiento}`,
          JSON.stringify({ paquete_id: paquete.id, codigo: codigo_seguimiento })
        ]
      );
    }

    return res.status(201).json({ message: 'Paquete registrado', paquete });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al registrar paquete' });
  }
};

// ── Admin/Operador: actualizar estado del paquete manualmente ─────────
const actualizarEstadoPaquete = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, foto_evidencia, notas } = req.body;

    const estadosValidos = [
      'registrado','en_bodega','asignado_a_ruta',
      'en_transito','entregado','no_entregado','reagendado','devuelto'
    ];
    if (!estadosValidos.includes(estado))
      return res.status(400).json({ error: 'Estado inválido' });

    // Construir query dinámica
    let setParts = ['estado = $1', 'estado_actualizado_en = NOW()'];
    const params = [estado];

    if (foto_evidencia) { setParts.push(`foto_evidencia = $${params.length + 1}`); params.push(foto_evidencia); }
    if (notas) { setParts.push(`notas = $${params.length + 1}`); params.push(notas); }
    params.push(id);

    const result = await db.query(
      `UPDATE paquetes SET ${setParts.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Paquete no encontrado' });
    const paquete = result.rows[0];

    // Notificar al cliente
    if (paquete.cliente_id) {
      const clRes = await db.query('SELECT user_id FROM clientes WHERE id = $1', [paquete.cliente_id]);
      if (clRes.rows[0]) {
        const mensajes = {
          entregado: '✅ Tu paquete fue entregado exitosamente.',
          en_transito: '🚚 Tu paquete está en camino.',
          en_bodega: '🏭 Tu paquete llegó a bodega.',
          no_entregado: '⚠️ No pudimos entregar tu paquete.',
          reagendado: '🔄 Tu entrega fue reagendada.',
          devuelto: '↩️ Tu paquete fue devuelto.',
        };
        const msg = mensajes[estado];
        if (msg) {
          await db.query(
            `INSERT INTO notificaciones (user_id, tipo, titulo, mensaje)
             VALUES ($1, $2, $3, $4)`,
            [clRes.rows[0].user_id, `paquete_${estado}`,
             `Actualización de paquete`, `${msg} Código: ${paquete.codigo_seguimiento}`]
          );
        }
      }
    }

    return res.json({ message: 'Estado actualizado', paquete });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al actualizar paquete' });
  }
};

// ── Admin: listar todos los paquetes ─────────────────────────────────
const listarPaquetes = async (req, res) => {
  try {
    const { estado, cliente_id, punto_parada_id } = req.query;
    let conditions = [];
    const params = [];

    if (estado) { conditions.push(`pk.estado = $${params.length+1}`); params.push(estado); }
    if (cliente_id) { conditions.push(`pk.cliente_id = $${params.length+1}`); params.push(cliente_id); }
    if (punto_parada_id) { conditions.push(`pk.punto_parada_id = $${params.length+1}`); params.push(punto_parada_id); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await db.query(`
      SELECT pk.*,
        u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
        pu.direccion AS punto_direccion, pu.estado AS punto_estado,
        ru.nombre AS registrador_nombre
      FROM paquetes pk
      LEFT JOIN clientes c ON c.id = pk.cliente_id
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN puntos_parada pu ON pu.id = pk.punto_parada_id
      LEFT JOIN users ru ON ru.id = pk.registrado_por
      ${where}
      ORDER BY pk.creado_en DESC
    `, params);

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error al listar paquetes' });
  }
};

// ── Cliente: ver sus paquetes (mejorado con notificación real) ────────
const misPaquetes = async (req, res) => {
  try {
    const clRes = await db.query('SELECT id FROM clientes WHERE user_id = $1', [req.user.id]);
    if (!clRes.rows[0]) return res.status(404).json({ error: 'Perfil cliente no encontrado' });

    const result = await db.query(`
      SELECT pk.*,
        pu.direccion AS punto_direccion, pu.estado AS punto_estado,
        pu.visitado_en, pu.motivo_omision,
        u.nombre AS op_nombre, u.apellido AS op_apellido
      FROM paquetes pk
      LEFT JOIN puntos_parada pu ON pu.id = pk.punto_parada_id
      LEFT JOIN rutas r ON r.id = pu.ruta_id
      LEFT JOIN operadores o ON o.id = r.operador_id
      LEFT JOIN users u ON u.id = o.user_id
      WHERE pk.cliente_id = $1
      ORDER BY pk.creado_en DESC
    `, [clRes.rows[0].id]);

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener paquetes' });
  }
};

// ── Corresponsales ────────────────────────────────────────────────────
const getCorresponsales = async (req, res) => {
  try {
    const { ciudad } = req.query;
    let query = 'SELECT * FROM corresponsales WHERE activo = true';
    const params = [];
    if (ciudad) { query += ' AND LOWER(ciudad) LIKE LOWER($1)'; params.push(`%${ciudad}%`); }
    query += ' ORDER BY nombre';
    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener corresponsales' });
  }
};

// ── Cliente: crear solicitud de recogida ─────────────────────────────
const crearSolicitudRecogida = async (req, res) => {
  try {
    const {
      tipo, corresponsal_id, direccion_recogida,
      lat, lng, descripcion, peso_estimado
    } = req.body;

    if (!tipo || !descripcion)
      return res.status(400).json({ error: 'tipo y descripcion son requeridos' });
    if (tipo === 'corresponsal' && !corresponsal_id)
      return res.status(400).json({ error: 'corresponsal_id requerido para tipo corresponsal' });
    if (tipo === 'domicilio' && !direccion_recogida)
      return res.status(400).json({ error: 'direccion_recogida requerida para tipo domicilio' });

    const clRes = await db.query('SELECT id FROM clientes WHERE user_id = $1', [req.user.id]);
    if (!clRes.rows[0]) return res.status(404).json({ error: 'Perfil cliente no encontrado' });

    // Costo: domicilio $8000, corresponsal $5000
    const costo = tipo === 'domicilio' ? 8000 : 5000;

    const result = await db.query(
      `INSERT INTO solicitudes_recogida
         (cliente_id, tipo, corresponsal_id, direccion_recogida, lat, lng,
          descripcion, peso_estimado, costo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [clRes.rows[0].id, tipo, corresponsal_id || null,
       direccion_recogida || null, lat || null, lng || null,
       descripcion, peso_estimado || 1.0, costo]
    );

    return res.status(201).json({
      message: 'Solicitud de recogida creada exitosamente',
      solicitud: result.rows[0],
      costo_info: {
        costo,
        tipo,
        mensaje: tipo === 'domicilio'
          ? `Recogida a domicilio: $${costo.toLocaleString('es-CO')} COP`
          : `Entrega en corresponsal: $${costo.toLocaleString('es-CO')} COP`
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al crear solicitud' });
  }
};

// ── Cliente: ver sus solicitudes de recogida ──────────────────────────
const misSolicitudes = async (req, res) => {
  try {
    const clRes = await db.query('SELECT id FROM clientes WHERE user_id = $1', [req.user.id]);
    if (!clRes.rows[0]) return res.status(404).json({ error: 'Perfil no encontrado' });

    const result = await db.query(`
      SELECT s.*, co.nombre AS corresponsal_nombre, co.direccion AS corresponsal_dir
      FROM solicitudes_recogida s
      LEFT JOIN corresponsales co ON co.id = s.corresponsal_id
      WHERE s.cliente_id = $1
      ORDER BY s.creado_en DESC
    `, [clRes.rows[0].id]);

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

// ── Admin: ver todas las solicitudes ─────────────────────────────────
const todasSolicitudes = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*,
        u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
        co.nombre AS corresponsal_nombre
      FROM solicitudes_recogida s
      LEFT JOIN clientes c ON c.id = s.cliente_id
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN corresponsales co ON co.id = s.corresponsal_id
      ORDER BY s.creado_en DESC
    `);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Error' });
  }
};

// ── Admin: actualizar estado de solicitud ─────────────────────────────
const actualizarSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const result = await db.query(
      `UPDATE solicitudes_recogida SET estado = $1 WHERE id = $2 RETURNING *`,
      [estado, id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Error al actualizar solicitud' });
  }
};

// ── Admin: asignar solicitud de recogida a un operador ────────────────
const asignarSolicitudAOperador = async (req, res) => {
  try {
    const { id } = req.params;
    const { operador_id, notas_admin } = req.body;
    if (!operador_id) return res.status(400).json({ error: 'operador_id es requerido' });

    // Verify solicitud exists
    const solRes = await db.query('SELECT * FROM solicitudes_recogida WHERE id = $1', [id]);
    if (!solRes.rows[0]) return res.status(404).json({ error: 'Solicitud no encontrada' });
    const sol = solRes.rows[0];

    // Verify operador exists
    const opRes = await db.query(
      'SELECT o.id, u.nombre, u.apellido, u.email FROM operadores o JOIN users u ON u.id = o.user_id WHERE o.id = $1',
      [operador_id]
    );
    if (!opRes.rows[0]) return res.status(404).json({ error: 'Operador no encontrado' });
    const op = opRes.rows[0];

    // Update solicitud
    const result = await db.query(
      `UPDATE solicitudes_recogida
       SET estado = 'asignada', operador_id = $1, notas_admin = $2, asignada_en = NOW()
       WHERE id = $3 RETURNING *`,
      [operador_id, notas_admin || null, id]
    );

    // Notify client if they exist
    if (sol.cliente_id) {
      const clRes = await db.query('SELECT user_id FROM clientes WHERE id = $1', [sol.cliente_id]);
      if (clRes.rows[0]) {
        await db.query(
          `INSERT INTO notificaciones (user_id, tipo, titulo, mensaje)
           VALUES ($1, 'solicitud_asignada', '🚚 Recogida asignada', $2)`,
          [clRes.rows[0].user_id,
           `Tu solicitud de recogida fue asignada al operador ${op.nombre} ${op.apellido}. Pronto pasará a recoger tu paquete.`]
        );
      }
    }

    return res.json({
      message: `Solicitud asignada al operador ${op.nombre} ${op.apellido}`,
      solicitud: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al asignar solicitud' });
  }
};

module.exports = {
  registrarPaquete, actualizarEstadoPaquete, listarPaquetes, misPaquetes,
  getCorresponsales, crearSolicitudRecogida, misSolicitudes,
  todasSolicitudes, actualizarSolicitud, asignarSolicitudAOperador,
  misSolicitudesAsignadas, responderSolicitud, vincularPaqueteARuta,
  confirmarRecepcion
};

// ── Admin: vincular paquete existente a una ruta ──────────────────────
async function vincularPaqueteARuta(req, res) {
  try {
    const { id } = req.params; // paquete id
    const { punto_parada_id, ruta_id } = req.body;

    if (!punto_parada_id) return res.status(400).json({ error: 'punto_parada_id es requerido' });

    // Verify punto exists (don't require ruta_id match since it's redundant)
    const puntoRes = await db.query('SELECT * FROM puntos_parada WHERE id = $1', [punto_parada_id]);
    if (!puntoRes.rows[0]) return res.status(404).json({ error: 'Punto de parada no encontrado' });

    // Verify paquete exists
    const paqCheck = await db.query('SELECT id, cliente_id, codigo_seguimiento FROM paquetes WHERE id = $1', [id]);
    if (!paqCheck.rows[0]) return res.status(404).json({ error: 'Paquete no encontrado' });

    // Update paquete — link to punto_parada and set estado asignado_a_ruta
    const result = await db.query(
      `UPDATE paquetes
         SET punto_parada_id = $1, estado = 'asignado_a_ruta', estado_actualizado_en = NOW()
       WHERE id = $2
       RETURNING *`,
      [punto_parada_id, id]
    );

    const paq = result.rows[0];

    // Notify client if they have an account
    if (paq.cliente_id) {
      const clRes = await db.query('SELECT user_id FROM clientes WHERE id = $1', [paq.cliente_id]);
      if (clRes.rows[0]) {
        await db.query(
          `INSERT INTO notificaciones (user_id, tipo, titulo, mensaje)
           VALUES ($1, 'paquete_asignado', '🚚 Tu paquete está en ruta', $2)`,
          [clRes.rows[0].user_id,
           `Tu paquete ${paq.codigo_seguimiento} fue asignado a una ruta de entrega. Pronto llegará a ti.`]
        );
      }
    }

    return res.json({ message: '✅ Paquete vinculado a la ruta correctamente', paquete: result.rows[0] });
  } catch (err) {
    console.error('vincularPaqueteARuta error:', err);
    return res.status(500).json({ error: 'Error al vincular paquete: ' + err.message });
  }
}

// ── Operador: ver solicitudes asignadas ──────────────────────────────
async function misSolicitudesAsignadas(req, res) {
  try {
    const opRes = await db.query('SELECT id FROM operadores WHERE user_id = $1', [req.user.id]);
    if (!opRes.rows[0]) return res.status(404).json({ error: 'Perfil operador no encontrado' });
    const result = await db.query(`
      SELECT s.*, u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
        u.email AS cliente_email, cl.telefono AS cliente_telefono,
        cl.direccion AS cliente_direccion,
        co.nombre AS corresponsal_nombre
      FROM solicitudes_recogida s
      LEFT JOIN clientes cl ON cl.id = s.cliente_id
      LEFT JOIN users u ON u.id = cl.user_id
      LEFT JOIN corresponsales co ON co.id = s.corresponsal_id
      WHERE s.operador_id = $1 ORDER BY s.creado_en DESC
    `, [opRes.rows[0].id]);
    return res.json(result.rows);
  } catch (err) { return res.status(500).json({ error: 'Error' }); }
}

// ── Operador: aceptar o rechazar solicitud ────────────────────────────
async function responderSolicitud(req, res) {
  try {
    const { id } = req.params;
    const { accion, razon } = req.body;
    if (!['aceptar', 'rechazar'].includes(accion))
      return res.status(400).json({ error: 'accion debe ser aceptar o rechazar' });
    const opRes = await db.query('SELECT id FROM operadores WHERE user_id = $1', [req.user.id]);
    if (!opRes.rows[0]) return res.status(404).json({ error: 'Perfil no encontrado' });
    const solRes = await db.query(
      'SELECT * FROM solicitudes_recogida WHERE id = $1 AND operador_id = $2',
      [id, opRes.rows[0].id]
    );
    if (!solRes.rows[0]) return res.status(403).json({ error: 'No autorizado o solicitud no asignada a ti' });
    if (accion === 'aceptar') {
      await db.query("UPDATE solicitudes_recogida SET estado = 'confirmada' WHERE id = $1", [id]);
    } else {
      await db.query(
        "UPDATE solicitudes_recogida SET estado = 'pendiente', operador_id = NULL, notas_admin = CONCAT(COALESCE(notas_admin,''), $1) WHERE id = $2",
        [` | Rechazada: ${razon || 'Sin razón'}`, id]
      );
    }
    const adminRes = await db.query("SELECT id FROM users WHERE rol = 'admin' LIMIT 1");
    if (adminRes.rows[0]) {
      await db.query(
        `INSERT INTO notificaciones (user_id, tipo, titulo, mensaje) VALUES ($1, $2, $3, $4)`,
        [adminRes.rows[0].id, `solicitud_${accion}`,
         accion === 'aceptar' ? '✅ Solicitud aceptada' : '❌ Solicitud rechazada',
         `Operador ${accion === 'aceptar' ? 'aceptó' : 'rechazó'} la solicitud. Razón: ${razon || 'No especificada'}`]
      );
    }
    return res.json({ message: `Solicitud ${accion === 'aceptar' ? 'aceptada' : 'rechazada'} exitosamente` });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Error al responder solicitud' }); }
}

// ── Cliente: confirmar recepción de paquete ───────────────────────────
async function confirmarRecepcion(req, res) {
  try {
    const { id } = req.params;
    // Get cliente_id for this user
    const clRes = await db.query('SELECT id FROM clientes WHERE user_id = $1', [req.user.id]);
    if (!clRes.rows[0]) return res.status(404).json({ error: 'Perfil cliente no encontrado' });

    const paqRes = await db.query(
      `SELECT * FROM paquetes WHERE id = $1 AND cliente_id = $2 AND estado = 'pendiente_confirmacion'`,
      [id, clRes.rows[0].id]
    );
    if (!paqRes.rows[0]) return res.status(404).json({ error: 'Paquete no encontrado o no está esperando confirmación' });

    await db.query(
      `UPDATE paquetes SET estado = 'entregado', estado_actualizado_en = NOW() WHERE id = $1`,
      [id]
    );

    // Notify admin
    const adminRes = await db.query("SELECT id FROM users WHERE rol = 'admin' LIMIT 1");
    if (adminRes.rows[0]) {
      await db.query(
        `INSERT INTO notificaciones (user_id, tipo, titulo, mensaje) VALUES ($1, 'entrega_confirmada', '✅ Entrega confirmada por cliente', $2)`,
        [adminRes.rows[0].id, `El cliente confirmó la recepción del paquete ${paqRes.rows[0].codigo_seguimiento}`]
      );
    }
    return res.json({ message: 'Recepción confirmada. ¡Gracias!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al confirmar recepción' });
  }
}