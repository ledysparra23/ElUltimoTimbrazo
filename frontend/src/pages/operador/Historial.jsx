import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function OperadorHistorial() {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/rutas').then(r => setRutas(r.data)).finally(() => setLoading(false));
  }, []);

  const estadoBadge = (e) => {
    const map = { pendiente: 'badge-gray', en_curso: 'badge-yellow', completada: 'badge-green', cancelada: 'badge-red' };
    return map[e] || 'badge-gray';
  };

  if (loading) return <div className="loading">Cargando historial...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Historial de rutas</h1>
      </div>
      <div className="card">
        <div className="table-wrapper">
          {rutas.length === 0 ? <div className="empty">Sin historial.</div> : (
            <table>
              <thead><tr><th>Ciclo</th><th>Fecha</th><th>Zona</th><th>Estado</th><th>Capacidad</th><th>Acciones</th></tr></thead>
              <tbody>
                {rutas.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.ciclos_recoleccion?.nombre}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{r.ciclos_recoleccion?.fecha}</td>
                    <td>{r.zonas?.nombre || '—'}</td>
                    <td><span className={`badge ${estadoBadge(r.estado)}`}>{r.estado}</span></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{r.capacidad_usada} uds</td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/operador/ruta/${r.id}`)}>Ver</button>
                    </td>
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
