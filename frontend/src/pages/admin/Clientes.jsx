import { useState, useEffect } from 'react';
import axios from 'axios';

export function AdminClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/admin/clientes').then(r => setClientes(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Cargando clientes...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
      </div>
      <div className="card">
        <div className="table-wrapper">
          {clientes.length === 0 ? <div className="empty">No hay clientes registrados.</div> : (
            <table>
              <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Dirección</th><th>Zona</th></tr></thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.users?.nombre} {c.users?.apellido}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{c.users?.email}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.telefono || '—'}</td>
                    <td style={{ fontSize: 12 }}>{c.direccion || '—'}</td>
                    <td>{c.zonas?.nombre || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminReporte() {
  const [ciclos, setCiclos] = useState([]);
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/ciclos').then(r => setCiclos(r.data));
  }, []);

  const cargarReporte = async () => {
    if (!selectedCiclo) return;
    setLoading(true);
    try {
      const res = await axios.get(`/rutas/reporte/${selectedCiclo}`);
      setReporte(res.data);
    } catch (err) {
      alert('Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  const pct = (v, t) => t === 0 ? '0%' : `${Math.round((v / t) * 100)}%`;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reporte de Cobertura</h1>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Seleccionar ciclo</label>
            <select className="form-input" value={selectedCiclo} onChange={e => setSelectedCiclo(e.target.value)}>
              <option value="">-- Seleccionar --</option>
              {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre} - {c.fecha}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={cargarReporte} disabled={!selectedCiclo || loading}>
            {loading ? 'Cargando...' : 'Generar reporte'}
          </button>
        </div>
      </div>

      {reporte && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{reporte.total_puntos}</div>
              <div className="stat-label">Total puntos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--green)' }}>{reporte.resumen.visitados}</div>
              <div className="stat-label">Entregados ({pct(reporte.resumen.visitados, reporte.total_puntos)})</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--red)' }}>{reporte.resumen.omitidos}</div>
              <div className="stat-label">Omitidos ({pct(reporte.resumen.omitidos, reporte.total_puntos)})</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--yellow)' }}>{reporte.resumen.pendientes}</div>
              <div className="stat-label">Pendientes</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card">
              <div className="card-title">Por operario</div>
              {reporte.por_operario.map((op, i) => (
                <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>{op.nombre}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-green">✅ {op.visitados}</span>
                    <span className="badge badge-red">⚠️ {op.omitidos}</span>
                    <span className="badge badge-gray">⏳ {op.pendientes}</span>
                  </div>
                  {Object.entries(op.motivos || {}).length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text2)' }}>
                      Motivos: {Object.entries(op.motivos).map(([m, c]) => `${m} (${c})`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
              {reporte.por_operario.length === 0 && <div className="empty">Sin datos</div>}
            </div>

            <div className="card">
              <div className="card-title">Por zona</div>
              {reporte.por_zona.map((z, i) => (
                <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>{z.zona}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-green">✅ {z.visitados}</span>
                    <span className="badge badge-red">⚠️ {z.omitidos}</span>
                    <span className="badge badge-gray">⏳ {z.pendientes}</span>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                      <div style={{
                        width: pct(z.visitados, z.visitados + z.omitidos + z.pendientes),
                        background: 'var(--green)', height: '100%', borderRadius: 4
                      }} />
                    </div>
                  </div>
                </div>
              ))}
              {reporte.por_zona.length === 0 && <div className="empty">Sin datos</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminClientes;
