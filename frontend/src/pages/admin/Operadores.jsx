import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminOperadores() {
  const [operadores, setOperadores] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '', password: '',
    vehiculo_placa: '', vehiculo_tipo: '', capacidad_maxima: 100, zona_id: ''
  });

  const fetch = async () => {
    const [opsR, zonasR] = await Promise.all([
      axios.get('/api/admin/operadores'),
      axios.get('/api/admin/zonas'),
    ]);
    setOperadores(opsR.data);
    setZonas(zonasR.data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const crear = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/auth/register', { ...form, rol: 'operador' });
      setMsg('Operador creado exitosamente');
      setShowModal(false);
      fetch();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al crear operador');
    }
  };

  const toggle = async (userId, activo) => {
    await axios.patch(`/api/admin/users/${userId}/toggle`, { activo: !activo });
    fetch();
  };

  const estadoBadge = (e) => {
    const map = { disponible: 'badge-green', en_ruta: 'badge-yellow', descanso: 'badge-blue', inactivo: 'badge-gray' };
    return map[e] || 'badge-gray';
  };

  if (loading) return <div className="loading">Cargando operadores...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Operadores</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nuevo operador</button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="card">
        <div className="table-wrapper">
          {operadores.length === 0 ? (
            <div className="empty">No hay operadores registrados.</div>
          ) : (
            <table>
              <thead>
                <tr><th>Nombre</th><th>Email</th><th>Vehículo</th><th>Capacidad</th><th>Zona</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {operadores.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 500 }}>{o.users?.nombre} {o.users?.apellido}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{o.users?.email}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{o.vehiculo_placa || '—'} {o.vehiculo_tipo ? `(${o.vehiculo_tipo})` : ''}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{o.capacidad_maxima}</td>
                    <td>{o.zonas?.nombre || '—'}</td>
                    <td><span className={`badge ${estadoBadge(o.estado)}`}>{o.estado}</span></td>
                    <td>
                      <button
                        className={`btn btn-sm ${o.users?.activo ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => toggle(o.user_id, o.users?.activo)}>
                        {o.users?.activo ? 'Desactivar' : 'Activar'}
                      </button>
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
              <span className="modal-title">Nuevo Operador</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={crear}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre</label>
                  <input className="form-input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido</label>
                  <input className="form-input" value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Placa vehículo</label>
                  <input className="form-input" value={form.vehiculo_placa} onChange={e => setForm(f => ({ ...f, vehiculo_placa: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo vehículo</label>
                  <input className="form-input" placeholder="Moto, Camión..." value={form.vehiculo_tipo} onChange={e => setForm(f => ({ ...f, vehiculo_tipo: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Capacidad máxima</label>
                  <input className="form-input" type="number" value={form.capacidad_maxima} onChange={e => setForm(f => ({ ...f, capacidad_maxima: parseInt(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Zona asignada</label>
                  <select className="form-input" value={form.zona_id} onChange={e => setForm(f => ({ ...f, zona_id: e.target.value }))}>
                    <option value="">Sin zona</option>
                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear operador</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
