import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminCiclos() {
  const [ciclos, setCiclos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', fecha: '' });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const fetchCiclos = () => {
    axios.get('/api/ciclos').then(r => setCiclos(r.data)).finally(() => setLoading(false));
  };

  useEffect(fetchCiclos, []);

  const crear = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/ciclos', form);
      setMsg('Ciclo creado exitosamente');
      setShowModal(false);
      setForm({ nombre: '', fecha: '' });
      fetchCiclos();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al crear');
    }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await axios.patch(`/api/ciclos/${id}`, { estado });
      fetchCiclos();
    } catch (err) { alert('Error al actualizar estado'); }
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
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nuevo ciclo</button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

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
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.fecha}</td>
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
                <input className="form-input" type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear ciclo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
