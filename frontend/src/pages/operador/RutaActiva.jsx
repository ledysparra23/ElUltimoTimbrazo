import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';

// ── Photo Capture Component ───────────────────────────────────────────
function FotoEvidencia({ value, onChange, label = 'Foto de evidencia' }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [preview, setPreview] = useState(value || null);

  const processFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setPreview(base64);
      onChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFile = (e) => processFile(e.target.files[0]);

  const clearFoto = () => {
    setPreview(null);
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="form-group">
      <label className="form-label">📷 {label}</label>
      {!preview ? (
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Camera (mobile) */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="btn btn-outline"
            style={{ flex: 1 }}
          >
            📷 Tomar foto
          </button>
          {/* File picker */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            🖼️ Subir imagen
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <img
            src={preview}
            alt="Evidencia"
            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '2px solid var(--green)' }}
          />
          <button
            type="button"
            onClick={clearFoto}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(220,38,38,0.9)', border: 'none',
              color: '#fff', width: 26, height: 26, borderRadius: '50%',
              cursor: 'pointer', fontSize: 14, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
            ✅ Foto capturada
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#e8f0fb' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a7299' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#b8cde0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c5d8ed' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

export default function RutaActiva() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const [ruta, setRuta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState('');
  const [fotoEvidencia, setFotoEvidencia] = useState('');
  const [apiKey, setApiKey] = useState(null);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  // Package state modal
  const [paqueteModal, setPaqueteModal] = useState(null);
  const [nuevoEstadoPaquete, setNuevoEstadoPaquete] = useState('');
  const [fotoPaquete, setFotoPaquete] = useState('');

  // Finalize route evidence modal
  const [finalizarModal, setFinalizarModal] = useState(false);
  const [fotoFinal, setFotoFinal] = useState('');

  const fetchRuta = async () => {
    const res = await axios.get(`/rutas/${id}`);
    setRuta(res.data);
    setLoading(false);
  };

  useEffect(() => { fetchRuta(); }, [id]);
  useEffect(() => {
    axios.get('/api/maps/config').then(r => setApiKey(r.data.apiKey || ''));
  }, []);

  useEffect(() => {
    if (!apiKey || !ruta || !mapRef.current) return;
    const initMap = () => {
      if (googleMapRef.current) return;
      const puntos = ruta.puntos_parada || [];
      const center = puntos.length > 0
        ? { lat: parseFloat(puntos[0].lat), lng: parseFloat(puntos[0].lng) }
        : { lat: 4.4378, lng: -75.2012 };

      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center, zoom: 14, styles: darkMapStyle, mapTypeControl: false,
      });

      const colors = { pendiente: '#d97706', visitado: '#16a34a', omitido: '#dc2626' };
      puntos.forEach((p, i) => {
        new window.google.maps.Marker({
          position: { lat: parseFloat(p.lat), lng: parseFloat(p.lng) },
          map: googleMapRef.current,
          label: { text: String(i + 1), color: '#fff', fontSize: '11px', fontWeight: 'bold' },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE, scale: 13,
            fillColor: colors[p.estado] || '#d97706', fillOpacity: 1,
            strokeColor: '#fff', strokeWeight: 2,
          },
          title: p.direccion,
        });
      });

      if (puntos.length >= 2 && window.google.maps.DirectionsService) {
        const ds = new window.google.maps.DirectionsService();
        const dr = new window.google.maps.DirectionsRenderer({
          map: googleMapRef.current, suppressMarkers: true,
          polylineOptions: { strokeColor: '#1d5bdb', strokeWeight: 4, strokeOpacity: 0.7 },
        });
        const waypoints = puntos.slice(1, -1).map(p => ({
          location: { lat: parseFloat(p.lat), lng: parseFloat(p.lng) }, stopover: true,
        }));
        ds.route({
          origin: { lat: parseFloat(puntos[0].lat), lng: parseFloat(puntos[0].lng) },
          destination: { lat: parseFloat(puntos[puntos.length - 1].lat), lng: parseFloat(puntos[puntos.length - 1].lng) },
          waypoints, travelMode: window.google.maps.TravelMode.DRIVING,
        }, (result, status) => { if (status === 'OK') dr.setDirections(result); });
      }
    };

    if (window.google?.maps) initMap();
    else if (apiKey) {
      import('../../utils/googleMapsLoader').then(({ loadGoogleMaps }) => {
        loadGoogleMaps(apiKey).then(() => initMap()).catch(console.error);
      });
    }
  }, [apiKey, ruta]);

  const showMsg = (text, type) => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const actualizarPunto = async (punto, estado) => {
    if (estado === 'omitido' && !motivo.trim()) {
      showMsg('Debes indicar el motivo de la omisión', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await axios.patch(`/rutas/puntos/${punto.id}`, {
        estado,
        motivo_omision: estado === 'omitido' ? motivo : undefined,
        notas,
        foto_evidencia: fotoEvidencia || undefined,
      });
      socket?.emit('punto:actualizar', { puntoId: punto.id, estado, motivo, notas });
      setActionModal(null);
      setMotivo(''); setNotas(''); setFotoEvidencia('');
      showMsg(`Punto marcado como ${estado}`, 'success');
      fetchRuta();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error al actualizar', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const actualizarPaquete = async () => {
    if (!nuevoEstadoPaquete) { showMsg('Selecciona un estado', 'error'); return; }
    setSubmitting(true);
    try {
      await axios.patch(`/api/admin/paquetes/${paqueteModal.id}/estado`, {
        estado: nuevoEstadoPaquete,
        foto_evidencia: fotoPaquete || undefined,
      });
      setPaqueteModal(null);
      setNuevoEstadoPaquete(''); setFotoPaquete('');
      showMsg('Estado del paquete actualizado', 'success');
      fetchRuta();
    } catch (err) {
      showMsg('Error al actualizar paquete', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const finalizarRuta = async () => {
    setSubmitting(true);
    try {
      // Save final evidence if provided
      if (fotoFinal) {
        await axios.patch(`/rutas/${id}/evidencia-final`, { foto_evidencia_final: fotoFinal });
      }
      await axios.patch(`/rutas/${id}/estado`, { estado: 'completada' });
      navigate('/operador');
    } catch (err) {
      showMsg('Error al finalizar ruta', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const estadoColorPunto = (e) => ({
    pendiente: 'badge-yellow', visitado: 'badge-green', omitido: 'badge-red',
  }[e] || 'badge-gray');

  if (loading) return <div className="loading">Cargando ruta...</div>;
  if (!ruta) return <div className="empty">Ruta no encontrada.</div>;

  const puntos = ruta.puntos_parada || [];
  const visitados = puntos.filter(p => p.estado === 'visitado').length;
  const omitidos = puntos.filter(p => p.estado === 'omitido').length;
  const pendientes = puntos.filter(p => p.estado === 'pendiente').length;
  const progreso = puntos.length > 0 ? Math.round(((visitados + omitidos) / puntos.length) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ruta activa</h1>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>
            {ruta.ciclos_recoleccion?.nombre} · {ruta.ciclos_recoleccion?.fecha}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {ruta.estado === 'pendiente' && (
            <button className="btn btn-success"
              onClick={() => axios.patch(`/rutas/${id}/estado`, { estado: 'en_curso' }).then(fetchRuta)}>
              ▶ Iniciar ruta
            </button>
          )}
          {ruta.estado === 'en_curso' && (
            <button className="btn btn-primary" onClick={() => setFinalizarModal(true)}>
              ✓ Finalizar ruta
            </button>
          )}
        </div>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`}>{msg.text}</div>
      )}

      {/* Progress bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, fontWeight: 600 }}>
          <span style={{ color: 'var(--text2)' }}>Progreso de ruta</span>
          <span style={{ color: 'var(--accent)' }}>{progreso}%</span>
        </div>
        <div style={{ background: 'var(--bg3)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
          <div style={{
            width: `${progreso}%`, height: '100%',
            background: 'linear-gradient(90deg, var(--accent), #60a5fa)',
            borderRadius: 6, transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12 }}>
          <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>⏳ {pendientes} pendientes</span>
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>✅ {visitados} visitados</span>
          <span style={{ color: 'var(--red)', fontWeight: 600 }}>✗ {omitidos} omitidos</span>
        </div>
      </div>

      {/* Map */}
      {apiKey ? (
        <div ref={mapRef} style={{ height: 'clamp(200px, 35vw, 280px)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 20 }} />
      ) : (
        <div style={{ marginBottom: 20 }} />
      )}

      {/* Puntos */}
      <div className="card">
        <div className="card-title">Puntos de parada ({puntos.length})</div>
        {puntos.length === 0 ? (
          <div className="empty">No hay puntos en esta ruta.</div>
        ) : puntos.map((p, i) => (
          <div key={p.id} className={`punto-item ${p.estado}`}>
            <div className="punto-num">{i + 1}</div>
            <div className="punto-info">
              <div className="punto-dir">{p.direccion}</div>
              <div className="punto-meta">
                {p.clientes?.users?.nombre && <span>{p.clientes.users.nombre} · </span>}
                {p.tipo} · {p.peso_estimado} kg
                {p.estado === 'omitido' && p.motivo_omision && (
                  <span style={{ color: 'var(--red)', marginLeft: 6 }}>— {p.motivo_omision}</span>
                )}
                {p.visitado_en && (
                  <span style={{ color: 'var(--green)', marginLeft: 6 }}>
                    ✅ {new Date(p.visitado_en).toLocaleTimeString('es-CO')}
                  </span>
                )}
              </div>
              {p.foto_evidencia && (
                <div style={{ marginTop: 6 }}>
                  <img
                    src={p.foto_evidencia}
                    alt="Evidencia"
                    style={{ height: 60, borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)' }}
                    onClick={() => window.open(p.foto_evidencia, '_blank')}
                  />
                  <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 2 }}>📷 Foto de evidencia</div>
                </div>
              )}
              {p.notas && (
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4, fontStyle: 'italic' }}>
                  📝 {p.notas}
                </div>
              )}
            </div>
            <div className="punto-actions">
              <span className={`badge ${estadoColorPunto(p.estado)}`}>{p.estado}</span>
              {ruta.estado === 'en_curso' && (
                <>
                  {p.estado === 'pendiente' && (
                    <>
                      <button className="btn btn-sm btn-success"
                        onClick={() => { setActionModal({ punto: p, tipo: 'visitar' }); setFotoEvidencia(''); setNotas(''); }}>
                        ✓ Visitar
                      </button>
                      <button className="btn btn-sm btn-danger"
                        onClick={() => { setActionModal({ punto: p, tipo: 'omitir' }); setMotivo(''); setNotas(''); }}>
                        ✗ Omitir
                      </button>
                    </>
                  )}
                  {/* 📦 Update package state — available for ALL points always */}
                  <button className="btn btn-sm btn-secondary"
                    style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                    onClick={async () => {
                      try {
                        const res = await axios.get(`/api/admin/paquetes?punto_parada_id=${p.id}`);
                        const paq = Array.isArray(res.data) ? res.data.find(pk => pk.punto_parada_id === p.id) : null;
                        if (paq) { setPaqueteModal(paq); setNuevoEstadoPaquete(paq.estado); setFotoPaquete(''); }
                        else showMsg('No hay paquete vinculado a este punto.', 'error');
                      } catch { showMsg('Error al buscar paquete', 'error'); }
                    }}>
                    📦 Estado envío
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Modal: visitar / omitir ── */}
      {actionModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">
                {actionModal.tipo === 'visitar' ? '✅ Marcar como visitado' : '⚠️ Marcar como omitido'}
              </span>
              <button className="modal-close" onClick={() => { setActionModal(null); setMotivo(''); setNotas(''); setFotoEvidencia(''); }}>×</button>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)' }}>
              <strong style={{ color: 'var(--text)' }}>📍 {actionModal.punto.direccion}</strong>
              {actionModal.punto.clientes?.users?.nombre && (
                <div style={{ marginTop: 2 }}>👤 {actionModal.punto.clientes.users.nombre}</div>
              )}
            </div>

            {actionModal.tipo === 'omitir' && (
              <div className="form-group">
                <label className="form-label">Motivo de omisión *</label>
                <select className="form-input" value={motivo} onChange={e => setMotivo(e.target.value)}>
                  <option value="">Seleccionar motivo...</option>
                  <option value="Nadie en casa">Nadie en casa</option>
                  <option value="Dirección no encontrada">Dirección no encontrada</option>
                  <option value="Acceso bloqueado">Acceso bloqueado</option>
                  <option value="Cliente rechazó entrega">Cliente rechazó entrega</option>
                  <option value="Vehículo con problemas">Vehículo con problemas</option>
                  <option value="Condición climática adversa">Condición climática adversa</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            )}

            {actionModal.tipo === 'visitar' && (
              <FotoEvidencia
                value={fotoEvidencia}
                onChange={setFotoEvidencia}
                label="Foto de evidencia de entrega"
              />
            )}

            <div className="form-group">
              <label className="form-label">Notas adicionales</label>
              <textarea
                className="form-input"
                rows={2}
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Opcional..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary"
                onClick={() => { setActionModal(null); setMotivo(''); setNotas(''); setFotoEvidencia(''); }}>
                Cancelar
              </button>
              <button
                className={`btn ${actionModal.tipo === 'visitar' ? 'btn-success' : 'btn-danger'}`}
                disabled={submitting}
                onClick={() => actualizarPunto(actionModal.punto, actionModal.tipo === 'visitar' ? 'visitado' : 'omitido')}>
                {submitting ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: estado del paquete ── */}
      {paqueteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">📦 Actualizar estado del paquete</span>
              <button className="modal-close" onClick={() => setPaqueteModal(null)}>×</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14, fontFamily: 'var(--mono)' }}>
              {paqueteModal.codigo_seguimiento}
            </div>

            <div className="form-group">
              <label className="form-label">Estado del paquete *</label>
              <select className="form-input" value={nuevoEstadoPaquete}
                onChange={e => setNuevoEstadoPaquete(e.target.value)}>
                <option value="">Seleccionar estado del envío...</option>
                <option value="en_transito">🚚 Recogido — en tránsito hacia destino</option>
                <option value="entregado">✅ Entregado al cliente</option>
                <option value="no_entregado">❌ No entregado — cliente ausente</option>
                <option value="reagendado">🔄 Reagendado para otro ciclo</option>
                <option value="devuelto">↩️ Devuelto al remitente</option>
              </select>
            </div>

            <FotoEvidencia
              value={fotoPaquete}
              onChange={setFotoPaquete}
              label="Foto de evidencia del paquete"
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setPaqueteModal(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={submitting} onClick={actualizarPaquete}>
                {submitting ? 'Guardando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: finalizar ruta con foto ── */}
      {finalizarModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">✓ Finalizar ruta</span>
              <button className="modal-close" onClick={() => setFinalizarModal(false)}>×</button>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Estás a punto de finalizar esta ruta. Puedes tomar una foto de evidencia final antes de confirmar.
            </div>

            <div style={{
              background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px',
              marginBottom: 16, fontSize: 12,
            }}>
              📊 Resumen: <strong style={{ color: 'var(--green)' }}>{visitados} visitados</strong> ·{' '}
              <strong style={{ color: 'var(--red)' }}>{omitidos} omitidos</strong> ·{' '}
              <strong style={{ color: 'var(--yellow)' }}>{pendientes} pendientes</strong>
            </div>

            <FotoEvidencia
              value={fotoFinal}
              onChange={setFotoFinal}
              label="Foto de cierre de ruta (opcional)"
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setFinalizarModal(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={submitting} onClick={finalizarRuta}>
                {submitting ? 'Finalizando...' : '✓ Confirmar finalización'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
