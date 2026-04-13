import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';

const ESTADO_CONFIG = {
  registrado:       { badge: 'badge-gray',   icon: '📋', label: 'Registrado',       desc: 'Tu paquete fue registrado en el sistema.' },
  en_bodega:        { badge: 'badge-blue',   icon: '🏭', label: 'En bodega',         desc: 'Tu paquete está en la bodega de clasificación.' },
  asignado_a_ruta:  { badge: 'badge-blue',   icon: '📌', label: 'Asignado a ruta',   desc: 'Tu paquete fue asignado a un operador.' },
  en_transito:      { badge: 'badge-yellow', icon: '🚚', label: 'En tránsito',       desc: 'Tu paquete está en camino hacia ti.' },
  entregado:        { badge: 'badge-green',  icon: '✅', label: 'Entregado',         desc: 'Tu paquete fue entregado exitosamente.' },
  no_entregado:     { badge: 'badge-red',    icon: '❌', label: 'No entregado',      desc: 'No pudimos entregar tu paquete.' },
  reagendado:       { badge: 'badge-orange', icon: '🔄', label: 'Reagendado',        desc: 'Tu entrega fue reprogramada para otro ciclo.' },
  devuelto:         { badge: 'badge-red',    icon: '↩️', label: 'Devuelto',          desc: 'Tu paquete fue devuelto al remitente.' },
};

const ESTADO_STEPS = ['registrado', 'en_bodega', 'asignado_a_ruta', 'en_transito', 'entregado'];

function EstadoTimeline({ estado }) {
  const currentIdx = ESTADO_STEPS.indexOf(estado);
  const isNegative = estado === 'no_entregado' || estado === 'devuelto' || estado === 'reagendado';

  if (isNegative) {
    const cfg = ESTADO_CONFIG[estado] || {};
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: 'var(--red-light)', borderRadius: 'var(--radius-sm)',
        fontSize: 12, color: 'var(--red)', fontWeight: 600,
      }}>
        <span style={{ fontSize: 16 }}>{cfg.icon}</span>
        {cfg.label} — {cfg.desc}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 8 }}>
      {ESTADO_STEPS.map((step, i) => {
        const cfg = ESTADO_CONFIG[step] || {};
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 13,
                background: done ? (active ? 'var(--accent)' : 'var(--green)') : 'var(--bg3)',
                border: `2px solid ${done ? (active ? 'var(--accent)' : 'var(--green)') : 'var(--border)'}`,
                color: done ? '#fff' : 'var(--text3)',
                fontWeight: 700, transition: 'all 0.3s',
                boxShadow: active ? '0 0 0 3px rgba(29,91,219,0.2)' : 'none',
              }}>
                {done ? (active ? cfg.icon : '✓') : (i + 1)}
              </div>
              <div style={{
                fontSize: 9, marginTop: 3, color: done ? 'var(--text)' : 'var(--text3)',
                fontWeight: active ? 700 : 400, textAlign: 'center', maxWidth: 52,
                lineHeight: 1.2,
              }}>
                {cfg.label}
              </div>
            </div>
            {i < ESTADO_STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 2px', marginBottom: 16,
                background: i < currentIdx ? 'var(--green)' : 'var(--border)',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PaqueteCard({ paquete, onExpand, expanded }) {
  const cfg = ESTADO_CONFIG[paquete.estado] || ESTADO_CONFIG.registrado;

  return (
    <div style={{
      border: `1px solid ${expanded ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      background: 'var(--bg2)',
      marginBottom: 12,
      overflow: 'hidden',
      boxShadow: expanded ? 'var(--shadow-md)' : 'var(--shadow)',
      transition: 'all 0.2s',
    }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: expanded ? 'var(--accent-light)' : 'transparent',
        }}
        onClick={onExpand}
      >
        <div style={{ fontSize: 24 }}>{cfg.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
            {paquete.descripcion || 'Paquete'}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>
            {paquete.codigo_seguimiento}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>
            {new Date(paquete.estado_actualizado_en).toLocaleDateString('es-CO')}
          </span>
        </div>
        <span style={{ color: 'var(--text3)', fontSize: 16 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 14, marginBottom: 14 }}>
            <div style={{
              padding: '10px 12px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)',
              fontSize: 12, color: 'var(--text2)', marginBottom: 12,
            }}>
              {cfg.desc}
              {paquete.motivo_omision && (
                <div style={{ marginTop: 4, color: 'var(--red)', fontWeight: 600 }}>
                  Motivo: {paquete.motivo_omision}
                </div>
              )}
            </div>

            <EstadoTimeline estado={paquete.estado} />
          </div>

          {/* Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginTop: 12 }}>
            {paquete.punto_direccion && (
              <div style={{ gridColumn: '1/-1', padding: '8px 10px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text2)' }}>📍 Dirección: </span>
                <strong>{paquete.punto_direccion}</strong>
              </div>
            )}
            {paquete.op_nombre && (
              <div style={{ padding: '8px 10px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text2)' }}>👷 Operador: </span>
                <strong>{paquete.op_nombre} {paquete.op_apellido}</strong>
              </div>
            )}
            {paquete.visitado_en && (
              <div style={{ padding: '8px 10px', background: 'var(--green-light)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--green)' }}>✅ Entregado: </span>
                <strong style={{ color: 'var(--green)' }}>
                  {new Date(paquete.visitado_en).toLocaleString('es-CO')}
                </strong>
              </div>
            )}
          </div>

          {/* Evidence photo */}
          {paquete.foto_evidencia && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📷 Foto de evidencia
              </div>
              <img
                src={paquete.foto_evidencia}
                alt="Foto de evidencia"
                style={{
                  width: '100%', maxHeight: 220, objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
                onClick={() => window.open(paquete.foto_evidencia, '_blank')}
              />
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                Toca la imagen para ver en pantalla completa
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientePaquetes() {
  const [paquetes, setPaquetes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const { socket } = useSocket();

  const fetchPaquetes = () => {
    axios.get('/api/cliente/paquetes')
      .then(r => setPaquetes(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPaquetes();
    // Real-time updates via socket
    if (socket) {
      socket.on('paquete:actualizado', fetchPaquetes);
      return () => socket.off('paquete:actualizado', fetchPaquetes);
    }
  }, [socket]);

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(fetchPaquetes, 30000);
    return () => clearInterval(iv);
  }, []);

  const enTransito = paquetes.filter(p => p.estado === 'en_transito' || p.estado === 'asignado_a_ruta').length;
  const entregados = paquetes.filter(p => p.estado === 'entregado').length;
  const pendientes = paquetes.filter(p => p.estado === 'registrado' || p.estado === 'en_bodega').length;

  if (loading) return <div className="loading">Cargando paquetes...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mis paquetes</h1>
        <button className="btn btn-secondary btn-sm" onClick={fetchPaquetes}>🔄 Actualizar</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{enTransito}</div>
          <div className="stat-label">En camino</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>{entregados}</div>
          <div className="stat-label">Entregados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pendientes}</div>
          <div className="stat-label">En proceso</div>
        </div>
      </div>

      {paquetes.length === 0 ? (
        <div className="card">
          <div className="empty">No tienes paquetes registrados aún.</div>
        </div>
      ) : (
        <div>
          {enTransito > 0 && (
            <div className="alert alert-info">
              🚚 Tienes {enTransito} paquete{enTransito > 1 ? 's' : ''} en camino hacia ti.
            </div>
          )}
          {paquetes.map(p => (
            <PaqueteCard
              key={p.id}
              paquete={p}
              expanded={expanded === p.id}
              onExpand={() => setExpanded(expanded === p.id ? null : p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
