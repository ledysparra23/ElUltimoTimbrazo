import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/Logo';

export default function ClienteDashboard() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [paquetes, setPaquetes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/cliente/notificaciones'),
      axios.get('/api/cliente/paquetes')
    ]).then(([nR, pR]) => {
      setNotifs(nR.data);
      setPaquetes(pR.data);
    }).finally(() => setLoading(false));
  }, []);

  const marcarLeida = async (id) => {
    await axios.patch(`/api/cliente/notificaciones/${id}/leida`);
    setNotifs(n => n.map(x => x.id === id ? { ...x, leida: true } : x));
  };

  const estadoBadge = (e) => {
    const map = { entregado: 'badge-green', no_entregado: 'badge-red', en_transito: 'badge-yellow', reagendado: 'badge-orange', registrado: 'badge-gray' };
    return map[e] || 'badge-gray';
  };

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div>
      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 20, position: 'relative', overflow: 'hidden',
      }}>
        <svg style={{ position: 'absolute', bottom: 0, right: 0, height: '100%', opacity: 0.08 }} viewBox="0 0 400 200" preserveAspectRatio="xMaxYMax slice">
          <path fill="#fff" d="M0,100 C100,60 200,140 300,80 C350,50 380,90 400,70 L400,200 L0,200Z"/>
        </svg>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src="/logo.png" alt="logo" style={{ width: 54, height: 54, objectFit: 'contain' }} />
        </div>
        <div style={{ color: '#fff' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', fontStyle: 'italic' }}>
            Hola, {user?.nombre} 👋
          </h1>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} · ElUltimoTimbraso
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-value">{paquetes.length}</div>
          <div className="stat-label">Mis paquetes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>{paquetes.filter(p => p.estado === 'entregado').length}</div>
          <div className="stat-label">Entregados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--red)' }}>{notifs.filter(n => !n.leida).length}</div>
          <div className="stat-label">Notificaciones</div>
        </div>
      </div>

      {/* Notificaciones */}
      {notifs.filter(n => !n.leida).length > 0 && (
        <div className="card">
          <div className="card-title">Notificaciones nuevas</div>
          {notifs.filter(n => !n.leida).map(n => (
            <div key={n.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{n.titulo}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{n.mensaje}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{new Date(n.creado_en).toLocaleString('es-CO')}</div>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={() => marcarLeida(n.id)}>✓ Leída</button>
            </div>
          ))}
        </div>
      )}

      {/* Paquetes recientes */}
      <div className="card">
        <div className="card-title">Paquetes recientes</div>
        {paquetes.length === 0 ? (
          <div className="empty">No tienes paquetes registrados.</div>
        ) : (
          paquetes.slice(0, 5).map(p => (
            <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13, fontFamily: 'var(--mono)' }}>{p.codigo_seguimiento}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{p.descripcion || 'Sin descripción'}</div>
              </div>
              <span className={`badge ${estadoBadge(p.estado)}`}>{p.estado}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
