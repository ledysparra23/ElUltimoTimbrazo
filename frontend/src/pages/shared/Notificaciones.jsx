import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function NotificacionesHistorial() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | leidas | no_leidas

  const basePath = user?.rol === 'admin' ? '/api/admin'
    : user?.rol === 'operador' ? '/api/operador'
    : '/api/cliente';

  const fetchHistorial = () => {
    axios.get(`${basePath}/notificaciones?historial=true`)
      .then(r => setNotifs(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHistorial(); }, []);

  const marcarLeida = async (id) => {
    await axios.patch(`${basePath}/notificaciones/${id}/leida`);
    setNotifs(n => n.map(x => x.id === id ? { ...x, leida: true } : x));
  };

  const marcarTodas = async () => {
    await axios.patch(`${basePath}/notificaciones/todas-leidas`);
    setNotifs(n => n.map(x => ({ ...x, leida: true })));
  };

  const filtered = notifs.filter(n => {
    if (filter === 'leidas') return n.leida;
    if (filter === 'no_leidas') return !n.leida;
    return true;
  });

  const noLeidas = notifs.filter(n => !n.leida).length;

  if (loading) return <div className="loading">Cargando notificaciones...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          🔔 Historial de notificaciones
          {noLeidas > 0 && (
            <span style={{ marginLeft: 10, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {noLeidas}
            </span>
          )}
        </h1>
        {noLeidas > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={marcarTodas}>
            ✓ Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'all', label: `Todas (${notifs.length})` },
          { key: 'no_leidas', label: `No leídas (${noLeidas})` },
          { key: 'leidas', label: `Leídas (${notifs.length - noLeidas})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="empty">No hay notificaciones {filter !== 'all' ? 'en esta categoría' : ''}.</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(n => (
            <div key={n.id} style={{
              background: n.leida ? 'var(--bg)' : '#eff6ff',
              border: `1px solid ${n.leida ? 'var(--border)' : '#bfdbfe'}`,
              borderLeft: `4px solid ${n.leida ? 'var(--border)' : '#2563eb'}`,
              borderRadius: 'var(--radius)',
              padding: '12px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>
                {n.titulo?.charAt(0) || '🔔'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: n.leida ? 500 : 700, fontSize: 14, marginBottom: 3, color: n.leida ? 'var(--text)' : '#1e40af' }}>
                  {n.titulo}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{n.mensaje}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                  {new Date(n.creado_en).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {!n.leida && (
                <button className="btn btn-sm btn-secondary" onClick={() => marcarLeida(n.id)}
                  style={{ flexShrink: 0 }}>
                  ✓ Leída
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
