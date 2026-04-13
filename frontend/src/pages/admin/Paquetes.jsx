import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminPaquetes() {
  const [paquetes, setPaquetes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [tab, setTab] = useState('paquetes');
  const [showModal, setShowModal] = useState(false);
  const [showEstadoModal, setShowEstadoModal] = useState(null);
  const [showAsignarModal, setShowAsignarModal] = useState(null);
  const [showVincularModal, setShowVincularModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [form, setForm] = useState({ cliente_id: '', descripcion: '', peso: '', dimensiones: '' });
  const [estadoForm, setEstadoForm] = useState({ estado: '', foto_evidencia: '', notas: '' });
  const [asignarForm, setAsignarForm] = useState({ operador_id: '', notas_admin: '' });
  const [vincularForm, setVincularForm] = useState({ ruta_id: '', punto_parada_id: '' });
  const [puntosRuta, setPuntosRuta] = useState([]);

  const fetchAll = async () => {
    const [pkRes, clRes, solRes, opRes, rutasPendRes, rutasEncRes] = await Promise.all([
      axios.get('/api/admin/paquetes'),
      axios.get('/api/admin/clientes'),
      axios.get('/api/admin/solicitudes'),
      axios.get('/api/admin/operadores'),
      axios.get('/rutas?estado=pendiente').catch(() => ({ data: [] })),
      axios.get('/rutas?estado=en_curso').catch(() => ({ data: [] })),
    ]);
    setPaquetes(pkRes.data);
    setClientes(clRes.data);
    setSolicitudes(solRes.data);
    setOperadores(opRes.data);
    setRutas([...(rutasPendRes.data || []), ...(rutasEncRes.data || [])]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const showMsg = (text, type) => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const registrar = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/paquetes', form);
      showMsg('Paquete registrado. El cliente recibirá una notificación.', 'success');
      setShowModal(false);
      setForm({ cliente_id: '', descripcion: '', peso: '', dimensiones: '' });
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error', 'error');
    }
  };

  const actualizarEstado = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`/api/admin/paquetes/${showEstadoModal.id}/estado`, estadoForm);
      showMsg('Estado actualizado. Cliente notificado.', 'success');
      setShowEstadoModal(null);
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error', 'error');
    }
  };

  const actualizarSolicitud = async (id, estado) => {
    await axios.patch(`/api/admin/solicitudes/${id}`, { estado });
    fetchAll();
  };

  const asignarSolicitud = async () => {
    if (!asignarForm.operador_id) { showMsg('Selecciona un operador', 'error'); return; }
    try {
      const res = await axios.post(`/api/admin/solicitudes/${showAsignarModal.id}/asignar`, asignarForm);
      showMsg(res.data.message, 'success');
      setShowAsignarModal(null);
      setAsignarForm({ operador_id: '', notas_admin: '' });
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error al asignar', 'error');
    }
  };

  const loadPuntosRuta = async (rutaId) => {
    if (!rutaId) { setPuntosRuta([]); return; }
    try {
      const res = await axios.get(`/rutas/${rutaId}`);
      const puntos = res.data.puntos_parada || [];
      setPuntosRuta(puntos);
      if (puntos.length === 0) {
        showMsg('Esta ruta no tiene puntos de parada. Agrega puntos a la ruta primero.', 'error');
      }
    } catch (err) {
      console.error('Error cargando puntos:', err);
      setPuntosRuta([]);
      showMsg(err.response?.data?.error || 'Error al cargar puntos de la ruta', 'error');
    }
  };

  const vincularARuta = async () => {
    if (!vincularForm.ruta_id || !vincularForm.punto_parada_id) {
      showMsg('Selecciona ruta y punto de parada', 'error'); return;
    }
    try {
      const res = await axios.post(`/api/admin/paquetes/${showVincularModal.id}/vincular-ruta`, {
        punto_parada_id: vincularForm.punto_parada_id,
        ruta_id: vincularForm.ruta_id,
      });
      showMsg(res.data.message, 'success');
      setShowVincularModal(null);
      setVincularForm({ ruta_id: '', punto_parada_id: '' });
      setPuntosRuta([]);
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error al vincular', 'error');
    }
  };

  const estadoBadge = (e) => {
    const map = {
      registrado: 'badge-gray', en_bodega: 'badge-blue',
      asignado_a_ruta: 'badge-blue', en_transito: 'badge-yellow',
      entregado: 'badge-green', no_entregado: 'badge-red',
      reagendado: 'badge-orange', devuelto: 'badge-red',
    };
    return map[e] || 'badge-gray';
  };

  const solBadge = (e) => {
    const map = {
      pendiente: 'badge-yellow', confirmada: 'badge-blue',
      asignada: 'badge-blue', recogida: 'badge-green',
      en_bodega: 'badge-green', cancelada: 'badge-red',
    };
    return map[e] || 'badge-gray';
  };

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Paquetes y Solicitudes</h1>
        {tab === 'paquetes' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Registrar paquete
          </button>
        )}
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`}>{msg.text}</div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#fff', padding: '6px', borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
        {[
          { id: 'paquetes', label: `📦 Paquetes (${paquetes.length})` },
          { id: 'solicitudes', label: `🚚 Solicitudes (${solicitudes.filter(s => s.estado === 'pendiente').length} pendientes)` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all .15s',
            background: tab === t.id ? 'var(--accent)' : 'transparent',
            color: tab === t.id ? '#fff' : 'var(--text2)',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Paquetes tab */}
      {tab === 'paquetes' && (
        <div className="card">
          <div className="table-wrapper">
            {paquetes.length === 0 ? (
              <div className="empty">No hay paquetes registrados.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Código</th><th>Cliente</th><th>Descripción</th>
                    <th>Estado</th><th>Foto</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paquetes.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{p.codigo_seguimiento}</td>
                      <td style={{ fontSize: 12 }}>{p.cliente_nombre} {p.cliente_apellido}</td>
                      <td style={{ fontSize: 12 }}>{p.descripcion}</td>
                      <td><span className={`badge ${estadoBadge(p.estado)}`}>{p.estado.replace(/_/g, ' ')}</span></td>
                      <td>
                        {p.foto_evidencia ? (
                          <img src={p.foto_evidencia} alt="Evidencia"
                            style={{ height: 36, width: 48, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)' }}
                            onClick={() => window.open(p.foto_evidencia, '_blank')} />
                        ) : <span style={{ fontSize: 11, color: 'var(--text2)' }}>—</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button className="btn btn-sm btn-secondary"
                            onClick={() => { setShowEstadoModal(p); setEstadoForm({ estado: p.estado, foto_evidencia: '', notas: '' }); }}>
                            Actualizar
                          </button>
                          {!p.punto_parada_id && (
                            <button className="btn btn-sm btn-primary"
                              onClick={() => { setShowVincularModal(p); setVincularForm({ ruta_id: '', punto_parada_id: '' }); setPuntosRuta([]); }}>
                              🔗 Vincular ruta
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Solicitudes tab */}
      {tab === 'solicitudes' && (
        <div className="card">
          <div className="table-wrapper">
            {solicitudes.length === 0 ? (
              <div className="empty">No hay solicitudes de recogida.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th><th>Tipo</th><th>Descripción</th>
                    <th>Costo</th><th>Estado</th><th>Operador</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontSize: 12 }}>{s.cliente_nombre} {s.cliente_apellido}</td>
                      <td>
                        <span className={`badge ${s.tipo === 'domicilio' ? 'badge-blue' : 'badge-orange'}`}>
                          {s.tipo === 'domicilio' ? '🏠 Domicilio' : '🏪 Corresponsal'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{s.descripcion}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>${parseInt(s.costo).toLocaleString('es-CO')}</td>
                      <td><span className={`badge ${solBadge(s.estado)}`}>{s.estado}</span></td>
                      <td style={{ fontSize: 12, color: s.operador_nombre ? 'var(--text)' : 'var(--text3)' }}>
                        {s.operador_nombre ? `👷 ${s.operador_nombre}` : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {s.estado === 'pendiente' && (
                            <>
                              <button className="btn btn-sm btn-success" onClick={() => actualizarSolicitud(s.id, 'confirmada')}>✓ Confirmar</button>
                              <button className="btn btn-sm btn-danger" onClick={() => actualizarSolicitud(s.id, 'cancelada')}>✗ Cancelar</button>
                            </>
                          )}
                          {(s.estado === 'pendiente' || s.estado === 'confirmada') && (
                            <button className="btn btn-sm btn-primary"
                              onClick={() => { setShowAsignarModal(s); setAsignarForm({ operador_id: s.operador_id || '', notas_admin: '' }); }}>
                              👷 Asignar
                            </button>
                          )}
                          {s.estado === 'confirmada' && (
                            <button className="btn btn-sm btn-secondary" onClick={() => actualizarSolicitud(s.id, 'recogida')}>Recogida</button>
                          )}
                          {s.estado === 'recogida' && (
                            <button className="btn btn-sm btn-success" onClick={() => actualizarSolicitud(s.id, 'en_bodega')}>En bodega</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
                    

      {/* Modal registrar paquete */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Registrar paquete</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
              Al registrar, el cliente recibirá una notificación automática.
            </p>
            <form onSubmit={registrar}>
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <select className="form-input" value={form.cliente_id}
                  onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))} required>
                  <option value="">Seleccionar cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.users?.nombre} {c.users?.apellido} — {c.users?.email}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción *</label>
                <input className="form-input" value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Caja ropa, electrónico, documentos..." required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Peso (kg)</label>
                  <input className="form-input" type="number" step="0.1" value={form.peso}
                    onChange={e => setForm(f => ({ ...f, peso: e.target.value }))} placeholder="1.5" />
                </div>
                <div className="form-group">
                  <label className="form-label">Dimensiones</label>
                  <input className="form-input" value={form.dimensiones}
                    onChange={e => setForm(f => ({ ...f, dimensiones: e.target.value }))} placeholder="30x20x10 cm" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal actualizar estado */}
      {showEstadoModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Actualizar estado del paquete</span>
              <button className="modal-close" onClick={() => setShowEstadoModal(null)}>×</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
              <strong style={{ color: 'var(--text)' }}>{showEstadoModal.codigo_seguimiento}</strong>
              {' — '}{showEstadoModal.descripcion}
            </p>
            <form onSubmit={actualizarEstado}>
              <div className="form-group">
                <label className="form-label">Nuevo estado *</label>
                <select className="form-input" value={estadoForm.estado}
                  onChange={e => setEstadoForm(f => ({ ...f, estado: e.target.value }))} required>
                  <option value="">Seleccionar estado</option>
                  <option value="registrado">Registrado</option>
                  <option value="en_bodega">En bodega</option>
                  <option value="asignado_a_ruta">Asignado a ruta</option>
                  <option value="en_transito">En tránsito</option>
                  <option value="entregado">Entregado</option>
                  <option value="no_entregado">No entregado</option>
                  <option value="reagendado">Reagendado</option>
                  <option value="devuelto">Devuelto</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">📷 Foto de evidencia</label>
                {!estadoForm.foto_evidencia ? (
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                    border: '2px dashed var(--border2)', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', background: 'var(--bg3)', fontSize: 13,
                    color: 'var(--text2)', transition: 'all 0.2s',
                  }}>
                    🖼️ Seleccionar imagen de evidencia
                    <input
                      type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setEstadoForm(f => ({ ...f, foto_evidencia: ev.target.result }));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <img src={estadoForm.foto_evidencia} alt="preview"
                      style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '2px solid var(--green)' }} />
                    <button type="button"
                      onClick={() => setEstadoForm(f => ({ ...f, foto_evidencia: '' }))}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(220,38,38,0.9)', border: 'none', color: '#fff', width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', fontSize: 13 }}>
                      ×
                    </button>
                    <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 3, fontWeight: 600 }}>✅ Imagen cargada</div>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-input" rows={2} value={estadoForm.notas}
                  onChange={e => setEstadoForm(f => ({ ...f, notas: e.target.value }))}
                  style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEstadoModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal asignar solicitud a operador */}
      {showAsignarModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">👷 Asignar solicitud a operador</span>
              <button className="modal-close" onClick={() => setShowAsignarModal(null)}>×</button>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 16, fontSize: 12 }}>
              <strong>{showAsignarModal.cliente_nombre} {showAsignarModal.cliente_apellido}</strong>
              <div style={{ color: 'var(--text2)', marginTop: 2 }}>{showAsignarModal.descripcion}</div>
              <div style={{ marginTop: 4 }}>
                <span className={`badge ${showAsignarModal.tipo === 'domicilio' ? 'badge-blue' : 'badge-orange'}`}>
                  {showAsignarModal.tipo === 'domicilio' ? '🏠 Recogida a domicilio' : '🏪 Entrega en corresponsal'}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Operador *</label>
              <select className="form-input" value={asignarForm.operador_id}
                onChange={e => setAsignarForm(f => ({ ...f, operador_id: e.target.value }))}>
                <option value="">Seleccionar operador disponible</option>
                {operadores.filter(o => o.estado !== 'inactivo').map(o => (
                  <option key={o.id} value={o.id}>
                    {o.users?.nombre} {o.users?.apellido} — {o.vehiculo_placa || 'Sin placa'} ({o.estado})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notas para el operador</label>
              <textarea className="form-input" rows={2} placeholder="Instrucciones especiales, dirección de referencia..."
                value={asignarForm.notas_admin} onChange={e => setAsignarForm(f => ({ ...f, notas_admin: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAsignarModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={asignarSolicitud}>👷 Asignar operador</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal vincular paquete a ruta */}
      {showVincularModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">🔗 Vincular paquete a ruta</span>
              <button className="modal-close" onClick={() => { setShowVincularModal(null); setPuntosRuta([]); setVincularForm({ ruta_id: '', punto_parada_id: '' }); }}>×</button>
            </div>

            {/* Package info */}
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              <strong style={{ fontFamily: 'var(--mono)' }}>{showVincularModal.codigo_seguimiento}</strong>
              <div style={{ color: 'var(--text2)', marginTop: 2 }}>{showVincularModal.descripcion}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text2)' }}>
                Cliente: {showVincularModal.cliente_nombre} {showVincularModal.cliente_apellido}
              </div>
            </div>

            {/* Route selector */}
            <div className="form-group">
              <label className="form-label">Seleccionar ruta *</label>
              {rutas.length === 0 ? (
                <div style={{ padding: '10px 14px', background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e', border: '1px solid #fde68a' }}>
                  ⚠️ No hay rutas pendientes o en curso. Crea una ruta primero desde la sección de <strong>Rutas</strong>.
                </div>
              ) : (
                <select className="form-input" value={vincularForm.ruta_id}
                  onChange={e => {
                    const rid = e.target.value;
                    setVincularForm(f => ({ ...f, ruta_id: rid, punto_parada_id: '' }));
                    setPuntosRuta([]);
                    if (rid) loadPuntosRuta(rid);
                  }}>
                  <option value="">— Seleccionar ruta —</option>
                  {rutas.map(r => (
                    <option key={r.id} value={r.id}>
                      [{r.estado}] {r.ciclos_recoleccion?.nombre || 'Sin ciclo'} —{' '}
                      {r.operadores?.users?.nombre || '?'} {r.operadores?.users?.apellido || ''} ·{' '}
                      {r.zonas?.nombre || 'Sin zona'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Loading indicator */}
            {vincularForm.ruta_id && puntosRuta.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text2)', padding: '8px 0', textAlign: 'center' }}>
                ⏳ Cargando puntos de parada...
              </div>
            )}

            {/* Punto selector — show ALL puntos with their state */}
            {puntosRuta.length > 0 && (
              <div className="form-group">
                <label className="form-label">Punto de parada * <span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 400 }}>({puntosRuta.length} puntos en esta ruta)</span></label>
                <select className="form-input" value={vincularForm.punto_parada_id}
                  onChange={e => setVincularForm(f => ({ ...f, punto_parada_id: e.target.value }))}>
                  <option value="">— Seleccionar punto —</option>
                  {puntosRuta.map(p => (
                    <option key={p.id} value={p.id}>
                      #{(p.orden ?? 0) + 1} — {p.direccion} ({p.tipo}) [{p.estado}]
                    </option>
                  ))}
                </select>
                {puntosRuta.every(p => p.estado !== 'pendiente') && (
                  <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 4 }}>
                    ⚠️ Todos los puntos ya tienen estado. Puedes vincular igual a cualquier punto.
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => { setShowVincularModal(null); setPuntosRuta([]); setVincularForm({ ruta_id: '', punto_parada_id: '' }); }}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={vincularARuta}
                disabled={!vincularForm.ruta_id || !vincularForm.punto_parada_id}>
                🔗 Vincular a ruta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
