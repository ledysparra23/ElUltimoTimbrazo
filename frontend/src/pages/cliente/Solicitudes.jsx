import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ClienteSolicitudes() {
  const [corresponsales, setCorresponsales] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [costoInfo, setCostoInfo] = useState(null);
  const [form, setForm] = useState({
    tipo: 'corresponsal',
    corresponsal_id: '',
    direccion_recogida: '',
    descripcion: '',
    peso_estimado: '1'
  });

  const fetch = async () => {
    const [corrRes, solRes] = await Promise.all([
      axios.get('/api/corresponsales'),
      axios.get('/api/cliente/solicitudes'),
    ]);
    setCorresponsales(corrRes.data);
    setSolicitudes(solRes.data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const costo = form.tipo === 'domicilio' ? 8000 : 5000;

  const enviar = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/cliente/solicitudes', form);
      setMsg({ text: res.data.message, type: 'success' });
      setCostoInfo(res.data.costo_info);
      setShowForm(false);
      setForm({ tipo: 'corresponsal', corresponsal_id: '', direccion_recogida: '', descripcion: '', peso_estimado: '1' });
      fetch();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Error al crear solicitud', type: 'error' });
    }
  };

  const estadoBadge = (e) => {
    const map = {
      pendiente: 'badge-yellow', confirmada: 'badge-blue',
      asignada: 'badge-blue', recogida: 'badge-green',
      en_bodega: 'badge-green', cancelada: 'badge-red'
    };
    return map[e] || 'badge-gray';
  };

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Solicitar recogida</h1>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setCostoInfo(null); }}>
          + Nueva solicitud
        </button>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`}>{msg.text}</div>
      )}
      {costoInfo && (
        <div className="alert alert-info">
          💰 {costoInfo.mensaje}
        </div>
      )}

      {/* Corresponsales disponibles */}
      <div className="card">
        <div className="card-title">📍 Corresponsales disponibles</div>
        {corresponsales.length === 0 ? (
          <div className="empty">No hay corresponsales registrados.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {corresponsales.map(c => (
              <div key={c.id} style={{
                padding: 14, background: 'var(--bg3)', borderRadius: 8,
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>🏪 {c.nombre}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>{c.direccion}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>📞 {c.telefono}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>🕐 {c.horario}</div>
                <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                  Entrega aquí: $5.000 COP
                </div>
                <button className="btn btn-sm btn-primary" style={{ marginTop: 8, width: '100%' }}
                  onClick={() => {
                    setForm(f => ({ ...f, tipo: 'corresponsal', corresponsal_id: c.id }));
                    setShowForm(true);
                    setCostoInfo(null);
                  }}>
                  Usar este corresponsal
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mis solicitudes */}
      <div className="card">
        <div className="card-title">Mis solicitudes de recogida</div>
        {solicitudes.length === 0 ? (
          <div className="empty">No tienes solicitudes creadas.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Tipo</th><th>Descripción</th><th>Costo</th><th>Estado</th><th>Fecha</th></tr>
              </thead>
              <tbody>
                {solicitudes.map(s => (
                  <tr key={s.id}>
                    <td>
                      <span className={`badge ${s.tipo === 'domicilio' ? 'badge-blue' : 'badge-orange'}`}>
                        {s.tipo === 'domicilio' ? '🏠 Domicilio' : '🏪 Corresponsal'}
                      </span>
                      {s.corresponsal_nombre && (
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{s.corresponsal_nombre}</div>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>{s.descripcion}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                      ${parseInt(s.costo).toLocaleString('es-CO')}
                    </td>
                    <td><span className={`badge ${estadoBadge(s.estado)}`}>{s.estado}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text2)' }}>
                      {new Date(s.creado_en).toLocaleDateString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nueva solicitud */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Nueva solicitud de recogida</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>

            <form onSubmit={enviar}>
              <div className="form-group">
                <label className="form-label">¿Cómo quieres entregar tu paquete?</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button"
                    className={`btn ${form.tipo === 'corresponsal' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => set('tipo', 'corresponsal')}>
                    🏪 Corresponsal<br />
                    <small style={{ fontWeight: 400 }}>$5.000 COP</small>
                  </button>
                  <button type="button"
                    className={`btn ${form.tipo === 'domicilio' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => set('tipo', 'domicilio')}>
                    🏠 Recogida a domicilio<br />
                    <small style={{ fontWeight: 400 }}>$8.000 COP</small>
                  </button>
                </div>
              </div>

              {form.tipo === 'corresponsal' && (
                <div className="form-group">
                  <label className="form-label">Corresponsal *</label>
                  <select className="form-input" value={form.corresponsal_id}
                    onChange={e => set('corresponsal_id', e.target.value)} required>
                    <option value="">Seleccionar corresponsal</option>
                    {corresponsales.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} — {c.direccion} ({c.horario})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.tipo === 'domicilio' && (
                <div className="form-group">
                  <label className="form-label">Dirección de recogida *</label>
                  <input className="form-input" value={form.direccion_recogida}
                    onChange={e => set('direccion_recogida', e.target.value)}
                    placeholder="Calle 60 # 5-23, Barrio El Jardín" required />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Descripción del paquete *</label>
                <input className="form-input" value={form.descripcion}
                  onChange={e => set('descripcion', e.target.value)}
                  placeholder="Ej: Ropa, libros, documentos..." required />
              </div>

              <div className="form-group">
                <label className="form-label">Peso estimado (kg)</label>
                <input className="form-input" type="number" step="0.1" value={form.peso_estimado}
                  onChange={e => set('peso_estimado', e.target.value)} />
              </div>

              <div style={{
                padding: 12, background: 'var(--bg3)', borderRadius: 6,
                marginBottom: 16, fontSize: 13
              }}>
                💰 <strong>Costo del servicio: ${costo.toLocaleString('es-CO')} COP</strong>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                  {form.tipo === 'domicilio'
                    ? 'Un operador pasará a recoger el paquete en tu dirección.'
                    : 'Debes llevar el paquete al corresponsal seleccionado.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Confirmar solicitud</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
