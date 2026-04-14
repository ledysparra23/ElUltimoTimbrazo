import { useState, useEffect } from 'react';
import axios from 'axios';

const today = () => new Date().toISOString().split('T')[0];

export default function AdminCiclos() {
  const [ciclos, setCiclos] = useState([]);
  const [diasBloqueados, setDiasBloqueados] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dias_bloqueados') || '[]'); } catch { return []; }
  });
  const [showModal, setShowModal] = useState(false);
  const [showCalModal, setShowCalModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', fecha: '' });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [calFecha, setCalFecha] = useState('');

  const fetchCiclos = () => {
    axios.get('/api/ciclos').then(r => setCiclos(r.data)).finally(() => setLoading(false));
  };
  useEffect(fetchCiclos, []);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const crear = async (e) => {
    e.preventDefault();
    if (form.fecha < today()) { showMsg('No puedes crear un ciclo en una fecha pasada', 'error'); return; }
    if (diasBloqueados.includes(form.fecha)) { showMsg('Ese día está bloqueado. No se pueden crear ciclos.', 'error'); return; }
    try {
      await axios.post('/api/ciclos', form);
      showMsg('Ciclo creado exitosamente');
      setShowModal(false);
      setForm({ nombre: '', fecha: '' });
      fetchCiclos();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error al crear', 'error');
    }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await axios.patch(`/api/ciclos/${id}`, { estado });
      fetchCiclos();
    } catch { showMsg('Error al actualizar estado', 'error'); }
  };

  const bloquearDia = () => {
    if (!calFecha) return;
    if (diasBloqueados.includes(calFecha)) { showMsg('Ese día ya está bloqueado', 'error'); return; }
    const nuevos = [...diasBloqueados, calFecha].sort();
    setDiasBloqueados(nuevos);
    localStorage.setItem('dias_bloqueados', JSON.stringify(nuevos));
    setCalFecha('');
    showMsg(`Día ${calFecha} bloqueado`);
  };

  const desbloquearDia = (fecha) => {
    const nuevos = diasBloqueados.filter(d => d !== fecha);
    setDiasBloqueados(nuevos);
    localStorage.setItem('dias_bloqueados', JSON.stringify(nuevos));
    showMsg(`Día ${fecha} desbloqueado`);
  };

  const estadoBadge = (e) => {
    const map = { planificado: 'badge-blue', en_curso: 'badge-yellow', completado: 'badge-green', cancelado: 'badge-red' };
    return map[e] || 'badge-gray';
  };

  if (loading) return <div className="loading">Cargando ciclos...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Ciclos de Recolección</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowCalModal(true)}>
            🚫 Días bloqueados {diasBloqueados.length > 0 && `(${diasBloqueados.length})`}
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nuevo ciclo</button>
        </div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 16 }}>{msg.text}</div>}

      <div className="card">
        <div className="table-wrapper">
          {ciclos.length === 0 ? (
            <div className="empty">No hay ciclos. Crea el primero.</div>
          ) : (
            <table>
              <thead>
                <tr><th>Nombre</th><th>Fecha</th><th>Estado</th><th>Creado por</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {ciclos.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {c.fecha}
                      {diasBloqueados.includes(c.fecha) && (
                        <span className="badge badge-red" style={{ marginLeft: 6, fontSize: 10 }}>🚫 bloqueado</span>
                      )}
                    </td>
                    <td><span className={`badge ${estadoBadge(c.estado)}`}>{c.estado}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{c.users?.nombre} {c.users?.apellido}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.estado === 'planificado' && (
                          <button className="btn btn-sm btn-warning" onClick={() => cambiarEstado(c.id, 'en_curso')}>Iniciar</button>
                        )}
                        {c.estado === 'en_curso' && (
                          <button className="btn btn-sm btn-success" onClick={() => cambiarEstado(c.id, 'completado')}>Completar</button>
                        )}
                        {['planificado', 'en_curso'].includes(c.estado) && (
                          <button className="btn btn-sm btn-danger" onClick={() => cambiarEstado(c.id, 'cancelado')}>Cancelar</button>
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

      {/* Modal nuevo ciclo */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Nuevo Ciclo</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={crear}>
              <div className="form-group">
                <label className="form-label">Nombre del ciclo</label>
                <input className="form-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Ciclo Semana 15" required />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input className="form-input" type="date" value={form.fecha}
                  min={today()}
                  onChange={e => setForm({ ...form, fecha: e.target.value })} required />
                {form.fecha && diasBloqueados.includes(form.fecha) && (
                  <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>
                    ⚠️ Este día está bloqueado. Elige otra fecha.
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear ciclo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal días bloqueados */}
      {showCalModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">🚫 Gestionar días bloqueados</span>
              <button className="modal-close" onClick={() => setShowCalModal(false)}>×</button>
            </div>
            <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              Los días bloqueados no permiten crear ciclos, rutas ni entregas. Úsalos para feriados o días no laborables.
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input className="form-input" type="date" value={calFecha}
                min={today()}
                onChange={e => setCalFecha(e.target.value)}
                style={{ flex: 1 }} />
              <button className="btn btn-danger" onClick={bloquearDia} disabled={!calFecha}>
                🚫 Bloquear
              </button>
            </div>
            {diasBloqueados.length === 0 ? (
              <div className="empty" style={{ padding: '16px 0' }}>No hay días bloqueados.</div>
            ) : (
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {diasBloqueados.map(d => (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>🚫 {d}</span>
                    <button className="btn btn-sm btn-secondary" onClick={() => desbloquearDia(d)}>Desbloquear</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setShowCalModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
