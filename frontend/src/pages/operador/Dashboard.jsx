import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

export default function OperadorDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const watchIdRef = useRef(null);

  const [rutas, setRutas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('rutas'); // rutas | solicitudes | notifs
  const [responderModal, setResponderModal] = useState(null);
  const [razonRechazo, setRazonRechazo] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const fetchAll = async () => {
    try {
      const [rutasPend, rutasEnc, sols, nots] = await Promise.all([
        axios.get('/rutas?estado=pendiente'),
        axios.get('/rutas?estado=en_curso'),
        axios.get('/api/operador/solicitudes'),
        axios.get('/api/operador/notificaciones'),
      ]);
      const allRutas = [...rutasEnc.data, ...rutasPend.data];
      setRutas(allRutas);
      setSolicitudes(sols.data);
      setNotifs(nots.data);

      if (rutasEnc.data.length > 0 && socket && !tracking) {
        socket.emit('operador:iniciar_tracking', { rutaId: rutasEnc.data[0].id });
        setTracking(true);
        startGPS();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    return () => {
      if (watchIdRef.current) navigator.geolocation?.clearWatch(watchIdRef.current);
    };
  }, [socket]);

  const startGPS = () => {
    if (!navigator.geolocation || watchIdRef.current) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        socket?.emit('operador:ubicacion', {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          velocidad: pos.coords.speed,
        });
      },
      (err) => console.error('GPS:', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  };

  const iniciarTracking = (rutaId) => {
    if (!socket) return showMsg('Sin conexión socket', 'error');
    socket.emit('operador:iniciar_tracking', { rutaId });
    setTracking(true);
    startGPS();
  };

  const marcarLeida = async (id) => {
    await axios.patch(`/api/operador/notificaciones/${id}/leida`);
    setNotifs(n => n.map(x => x.id === id ? { ...x, leida: true } : x));
  };

  const responder = async (accion) => {
    if (accion === 'rechazar' && !razonRechazo.trim()) {
      showMsg('Debes indicar el motivo del rechazo', 'error'); return;
    }
    try {
      const res = await axios.post(`/api/operador/solicitudes/${responderModal.id}/responder`, {
        accion, razon: razonRechazo,
      });
      showMsg(res.data.message);
      setResponderModal(null);
      setRazonRechazo('');
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error', 'error');
    }
  };

  const estadoBadge = (e) => ({
    pendiente: 'badge-gray', en_curso: 'badge-yellow',
    completada: 'badge-green', cancelada: 'badge-red',
  }[e] || 'badge-gray');

  const solBadge = (e) => ({
    pendiente: 'badge-yellow', confirmada: 'badge-blue',
    asignada: 'badge-blue', recogida: 'badge-green',
    en_bodega: 'badge-green', cancelada: 'badge-red',
  }[e] || 'badge-gray');

  if (loading) return <div className="loading">Cargando...</div>;

  const rutaActiva = rutas.find(r => r.estado === 'en_curso');
  const nuevasNotifs = notifs.filter(n => !n.leida).length;
  const nuevasSols = solicitudes.filter(s => s.estado === 'asignada').length;

  const whatsapp = (tel) => {
    const clean = (tel || '').replace(/\D/g, '');
    return `https://wa.me/${clean.startsWith('57') ? clean : '57' + clean}`;
  };

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg,#1e40af 0%,#2563eb 60%,#3b82f6 100%)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 20, position: 'relative', overflow: 'hidden',
      }}>
        <svg style={{ position: 'absolute', bottom: 0, right: 0, height: '100%', opacity: 0.08 }} viewBox="0 0 400 200" preserveAspectRatio="xMaxYMax slice">
          <path fill="#fff" d="M0,100 C100,60 200,140 300,80 C350,50 380,90 400,70 L400,200 L0,200Z"/>
        </svg>
        <div style={{ width: 66, height: 66, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src="/logo.png" alt="logo" style={{ width: 50, height: 50, objectFit: 'contain' }} />
        </div>
        <div style={{ color: '#fff', flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', fontStyle: 'italic' }}>
            Hola, {user?.nombre} {user?.apellido}
          </h1>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} · Operador de ruta
          </div>
        </div>
        {/* GPS pill */}
        <div style={{
          background: tracking ? 'rgba(22,163,74,0.25)' : 'rgba(255,255,255,0.1)',
          border: `1px solid ${tracking ? '#4ade80' : 'rgba(255,255,255,0.3)'}`,
          borderRadius: 20, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: tracking ? '#4ade80' : 'rgba(255,255,255,0.5)', boxShadow: tracking ? '0 0 0 3px rgba(74,222,128,0.3)' : 'none' }} />
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{tracking ? 'GPS activo' : 'GPS inactivo'}</span>
        </div>
      </div>

      {msg.text && <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`}>{msg.text}</div>}

      {/* Ruta activa quick bar */}
      {rutaActiva && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10,
          padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>🚚</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>Tienes una ruta en curso</div>
            <div style={{ fontSize: 12, color: '#78350f' }}>{rutaActiva.ciclos_recoleccion?.nombre} · {rutaActiva.zonas?.nombre}</div>
          </div>
          <button className="btn btn-sm" style={{ background: '#d97706', color: '#fff', border: 'none' }}
            onClick={() => navigate(`/operador/ruta/${rutaActiva.id}`)}>
            Continuar →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#fff', padding: 6, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content', flexWrap: 'wrap' }}>
        {[
          { id: 'rutas', label: '🗺️ Mis rutas', count: rutas.length },
          { id: 'solicitudes', label: '📦 Asignaciones', count: nuevasSols, alert: nuevasSols > 0 },
          { id: 'notifs', label: '🔔 Notificaciones', count: nuevasNotifs, alert: nuevasNotifs > 0 },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all .15s',
            background: tab === t.id ? 'var(--accent)' : 'transparent',
            color: tab === t.id ? '#fff' : 'var(--text2)',
            position: 'relative',
          }}>
            {t.label}
            {t.count > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4, width: 16, height: 16,
                borderRadius: '50%', background: t.alert ? '#dc2626' : '#94a3b8',
                color: '#fff', fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: Rutas ── */}
      {tab === 'rutas' && (
        <div>
          {rutas.length === 0 ? (
            <div className="card"><div className="empty">No tienes rutas asignadas hoy.</div></div>
          ) : rutas.map(ruta => (
            <div key={ruta.id} className="card" style={{ borderLeft: `4px solid ${ruta.estado === 'en_curso' ? '#d97706' : 'var(--border)'}`, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {ruta.ciclos_recoleccion?.nombre}
                    <span className={`badge ${estadoBadge(ruta.estado)}`}>{ruta.estado.replace('_',' ')}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>📅 {ruta.ciclos_recoleccion?.fecha}</span>
                    <span>📍 {ruta.zonas?.nombre || 'Sin zona'}</span>
                    <span>📦 {ruta.capacidad_usada} uds</span>
                    <span>🚗 {ruta.operadores?.vehiculo_placa || '—'}</span>
                  </div>
                  {/* Package count summary */}
                  <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
                    <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                      ⏳ {ruta.puntos_pendientes || '?'} pendientes
                    </span>
                    <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                      ✅ {ruta.puntos_visitados || '?'} entregados
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {ruta.estado === 'pendiente' && (
                    <button className="btn btn-success btn-sm"
                      onClick={() => { iniciarTracking(ruta.id); navigate(`/operador/ruta/${ruta.id}`); }}>
                      ▶ Iniciar
                    </button>
                  )}
                  {ruta.estado === 'en_curso' && (
                    <button className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/operador/ruta/${ruta.id}`)}>
                      Gestionar →
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/operador/ruta/${ruta.id}`)}>
                    Ver detalle
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: Solicitudes asignadas ── */}
      {tab === 'solicitudes' && (
        <div>
          {solicitudes.length === 0 ? (
            <div className="card"><div className="empty">No tienes solicitudes asignadas.</div></div>
          ) : solicitudes.map(s => (
            <div key={s.id} className="card" style={{
              borderLeft: `4px solid ${s.estado === 'asignada' ? '#2563eb' : 'var(--border)'}`,
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{s.descripcion}</span>
                    <span className={`badge ${solBadge(s.estado)}`}>{s.estado}</span>
                    <span className={`badge ${s.tipo === 'domicilio' ? 'badge-blue' : 'badge-orange'}`}>
                      {s.tipo === 'domicilio' ? '🏠 Domicilio' : '🏪 Corresponsal'}
                    </span>
                  </div>

                  {/* Client info */}
                  <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      👤 {s.cliente_nombre} {s.cliente_apellido}
                    </div>
                    {s.cliente_direccion && (
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>📍 {s.cliente_direccion}</div>
                    )}
                    {s.cliente_email && (
                      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>✉️ {s.cliente_email}</div>
                    )}
                  </div>

                  {s.notas_admin && (
                    <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 6 }}>
                      📝 Nota del admin: {s.notas_admin}
                    </div>
                  )}

                  {/* Cost */}
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                    💰 ${parseInt(s.costo || 0).toLocaleString('es-CO')} COP ·{' '}
                    {new Date(s.creado_en).toLocaleDateString('es-CO')}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {/* Direct WhatsApp contact */}
                  {s.cliente_telefono && (
                    <a
                      href={whatsapp(s.cliente_telefono)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: 'none' }}
                    >
                      <button className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', border: 'none', width: '100%' }}>
                        💬 WhatsApp
                      </button>
                    </a>
                  )}

                  {s.estado === 'asignada' && (
                    <>
                      <button className="btn btn-success btn-sm"
                        onClick={() => { setResponderModal(s); setRazonRechazo(''); }}>
                        ✓ Responder
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: Notificaciones ── */}
      {tab === 'notifs' && (
        <div>
          {notifs.length === 0 ? (
            <div className="card"><div className="empty">No hay notificaciones.</div></div>
          ) : (
            <div className="card">
              {notifs.map(n => (
                <div key={n.id} style={{
                  padding: '12px 0', borderBottom: '1px solid var(--border)',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  opacity: n.leida ? 0.6 : 1,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                    background: n.leida ? 'var(--border)' : '#2563eb',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{n.titulo}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{n.mensaje}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                      {new Date(n.creado_en).toLocaleString('es-CO')}
                    </div>
                  </div>
                  {!n.leida && (
                    <button className="btn btn-sm btn-secondary" onClick={() => marcarLeida(n.id)}>
                      ✓ Leída
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: responder solicitud */}
      {responderModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">📦 Responder solicitud</span>
              <button className="modal-close" onClick={() => setResponderModal(null)}>×</button>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              <strong>{responderModal.descripcion}</strong>
              <div style={{ color: 'var(--text2)', marginTop: 4, fontSize: 12 }}>
                Cliente: {responderModal.cliente_nombre} {responderModal.cliente_apellido}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Motivo (requerido si rechazas)</label>
              <textarea className="form-input" rows={3} value={razonRechazo}
                onChange={e => setRazonRechazo(e.target.value)}
                placeholder="Indica el motivo si vas a rechazar..."
                style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setResponderModal(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => responder('rechazar')}>✗ Rechazar</button>
              <button className="btn btn-success" onClick={() => responder('aceptar')}>✓ Aceptar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
