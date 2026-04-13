import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminRutas() {
  const [rutas, setRutas] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showReagendar, setShowReagendar] = useState(false);
  const [selectedRuta, setSelectedRuta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const [form, setForm] = useState({ ciclo_id: '', operador_id: '', zona_id: '', puntos: [] });
  const [nuevoPunto, setNuevoPunto] = useState({ direccion: '', lat: '', lng: '', tipo: 'domicilio', peso_estimado: 1, cliente_id: '' });
  const [reagendarForm, setReagendar] = useState({ ciclo_origen_id: '', nuevo_ciclo_id: '' });

  const fetchAll = async () => {
    try {
      const [rutasR, ciclosR, opsR, cltsR, zonasR] = await Promise.all([
        axios.get('/rutas'),
        axios.get('/api/ciclos'),
        axios.get('/api/admin/operadores'),
        axios.get('/api/admin/clientes'),
        axios.get('/api/admin/zonas'),
      ]);
      setRutas(rutasR.data);
      setCiclos(ciclosR.data);
      setOperadores(opsR.data);
      setClientes(cltsR.data);
      setZonas(zonasR.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const addPunto = () => {
    if (!nuevoPunto.direccion || !nuevoPunto.lat || !nuevoPunto.lng) {
      alert('Dirección, lat y lng son requeridos para el punto');
      return;
    }
    setForm(f => ({ ...f, puntos: [...f.puntos, { ...nuevoPunto, orden: f.puntos.length }] }));
    setNuevoPunto({ direccion: '', lat: '', lng: '', tipo: 'domicilio', peso_estimado: 1, cliente_id: '' });
  };

  const crearRuta = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/rutas', form);
      setMsg({ text: 'Ruta creada exitosamente', type: 'success' });
      setShowModal(false);
      setForm({ ciclo_id: '', operador_id: '', zona_id: '', puntos: [] });
      fetchAll();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Error al crear ruta', type: 'error' });
    }
  };

  const reagendar = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/rutas/reagendar', reagendarForm);
      setMsg({ text: res.data.message, type: 'success' });
      setShowReagendar(false);
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Error', type: 'error' });
    }
  };

  const verDetalle = (ruta) => setSelectedRuta(ruta);

  const estadoBadge = (e) => {
    const map = { pendiente: 'badge-gray', en_curso: 'badge-yellow', completada: 'badge-green', cancelada: 'badge-red' };
    return map[e] || 'badge-gray';
  };

  if (loading) return <div className="loading">Cargando rutas...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestión de Rutas</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowReagendar(true)}>🔄 Reagendar omitidos</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nueva ruta</button>
        </div>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`}>{msg.text}</div>
      )}

      <div className="card">
        <div className="table-wrapper">
          {rutas.length === 0 ? (
            <div className="empty">No hay rutas creadas.</div>
          ) : (
            <table>
              <thead>
                <tr><th>Ciclo</th><th>Operador</th><th>Zona</th><th>Estado</th><th>Capacidad usada</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {rutas.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 12 }}>{r.ciclos_recoleccion?.nombre}<br /><span style={{ color: 'var(--text2)' }}>{r.ciclos_recoleccion?.fecha}</span></td>
                    <td>{r.operadores?.users?.nombre} {r.operadores?.users?.apellido}</td>
                    <td>{r.zonas?.nombre || '—'}</td>
                    <td><span className={`badge ${estadoBadge(r.estado)}`}>{r.estado}</span></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{r.capacidad_usada} uds</td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => verDetalle(r)}>Ver detalle</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal crear ruta */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title">Nueva Ruta</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={crearRuta}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ciclo</label>
                  <select className="form-input" value={form.ciclo_id} onChange={e => setForm({ ...form, ciclo_id: e.target.value })} required>
                    <option value="">Seleccionar ciclo</option>
                    {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre} - {c.fecha}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Operador</label>
                  <select className="form-input" value={form.operador_id} onChange={e => setForm({ ...form, operador_id: e.target.value })} required>
                    <option value="">Seleccionar operador</option>
                    {operadores.map(o => <option key={o.id} value={o.id}>{o.users?.nombre} {o.users?.apellido} (Cap: {o.capacidad_maxima})</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Zona</label>
                <select className="form-input" value={form.zona_id} onChange={e => setForm({ ...form, zona_id: e.target.value })}>
                  <option value="">Sin zona específica</option>
                  {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
              </div>

              <div style={{ marginTop: 16, padding: 12, background: 'var(--bg3)', borderRadius: 6 }}>
                <div className="card-title" style={{ marginBottom: 10 }}>Puntos de parada ({form.puntos.length})</div>
                {form.puntos.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>#{i + 1}</span>
                    <span style={{ flex: 1 }}>{p.direccion}</span>
                    <span className="badge badge-blue">{p.tipo}</span>
                    <span style={{ color: 'var(--text2)' }}>{p.peso_estimado} kg</span>
                    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}
                      onClick={() => setForm(f => ({ ...f, puntos: f.puntos.filter((_, idx) => idx !== i) }))}>×</button>
                  </div>
                ))}
                <div style={{ marginTop: 10 }}>
                  <div className="form-row">
                    <div className="form-group">
                      <input className="form-input" placeholder="Dirección" value={nuevoPunto.direccion}
                        onChange={e => setNuevoPunto(p => ({ ...p, direccion: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <select className="form-input" value={nuevoPunto.cliente_id}
                        onChange={e => setNuevoPunto(p => ({ ...p, cliente_id: e.target.value }))}>
                        <option value="">Sin cliente</option>
                        {clientes.map(c => <option key={c.id} value={c.id}>{c.users?.nombre} {c.users?.apellido}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <input className="form-input" placeholder="Latitud" type="number" step="any" value={nuevoPunto.lat}
                        onChange={e => setNuevoPunto(p => ({ ...p, lat: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <input className="form-input" placeholder="Longitud" type="number" step="any" value={nuevoPunto.lng}
                        onChange={e => setNuevoPunto(p => ({ ...p, lng: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <select className="form-input" value={nuevoPunto.tipo} onChange={e => setNuevoPunto(p => ({ ...p, tipo: e.target.value }))}>
                        <option value="domicilio">Domicilio</option>
                        <option value="correspondencia">Correspondencia</option>
                        <option value="residuo">Residuo</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <input className="form-input" placeholder="Peso (kg)" type="number" step="0.1" value={nuevoPunto.peso_estimado}
                        onChange={e => setNuevoPunto(p => ({ ...p, peso_estimado: parseFloat(e.target.value) }))} />
                    </div>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addPunto}>+ Agregar punto</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear ruta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal reagendar */}
      {showReagendar && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Reagendar puntos omitidos</span>
              <button className="modal-close" onClick={() => setShowReagendar(false)}>×</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Todos los puntos omitidos del ciclo origen serán trasladados al nuevo ciclo.
            </p>
            <form onSubmit={reagendar}>
              <div className="form-group">
                <label className="form-label">Ciclo origen (con puntos omitidos)</label>
                <select className="form-input" value={reagendarForm.ciclo_origen_id}
                  onChange={e => setReagendar(f => ({ ...f, ciclo_origen_id: e.target.value }))} required>
                  <option value="">Seleccionar ciclo</option>
                  {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre} - {c.fecha}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nuevo ciclo destino</label>
                <select className="form-input" value={reagendarForm.nuevo_ciclo_id}
                  onChange={e => setReagendar(f => ({ ...f, nuevo_ciclo_id: e.target.value }))} required>
                  <option value="">Seleccionar ciclo</option>
                  {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre} - {c.fecha}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReagendar(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Reagendar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalle ruta */}
      {selectedRuta && (
        <div className="modal-overlay" onClick={() => setSelectedRuta(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Detalle de Ruta</span>
              <button className="modal-close" onClick={() => setSelectedRuta(null)}>×</button>
            </div>
            <div style={{ fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}><strong>Operador:</strong> {selectedRuta.operadores?.users?.nombre} {selectedRuta.operadores?.users?.apellido}</div>
              <div style={{ marginBottom: 8 }}><strong>Ciclo:</strong> {selectedRuta.ciclos_recoleccion?.nombre}</div>
              <div style={{ marginBottom: 8 }}><strong>Estado:</strong> <span className={`badge ${selectedRuta.estado === 'completada' ? 'badge-green' : 'badge-yellow'}`}>{selectedRuta.estado}</span></div>
              <div style={{ marginBottom: 8 }}><strong>Capacidad usada:</strong> {selectedRuta.capacidad_usada} unidades</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
