import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { loadGoogleMaps } from '../../utils/googleMapsLoader';
 
const ESTADO_INFO = {
  pendiente:   { badge: 'badge-gray',   label: 'Pendiente',   icon: '⏳' },
  confirmada:  { badge: 'badge-blue',   label: 'Confirmada',  icon: '✅' },
  asignada:    { badge: 'badge-yellow', label: 'Asignada',    icon: '👷' },
  recogida:    { badge: 'badge-purple', label: 'Recogida',    icon: '📦' },
  en_bodega:   { badge: 'badge-blue',   label: 'En bodega',   icon: '🏭' },
  cancelada:   { badge: 'badge-red',    label: 'Cancelada',   icon: '❌' },
};
 
export default function ClienteSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [mapVisible, setMapVisible] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [form, setForm] = useState({
    tipo: 'domicilio',
    direccion_recogida: '',
    lat: '',
    lng: '',
    descripcion: '',
    peso_estimado: '1'
  });
 
  const fetchSolicitudes = async () => {
    const res = await axios.get('/api/cliente/solicitudes');
    setSolicitudes(res.data);
    setLoading(false);
  };
 
  useEffect(() => {
    fetchSolicitudes();
    axios.get('/api/maps/config').then(r => setApiKey(r.data.apiKey || '')).catch(() => {});
  }, []);
 
  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 5000);
  };
 
  const initMap = () => {
    if (!apiKey || !mapRef.current) return;
    const createMap = () => {
      if (!mapRef.current) return;
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 4.4378, lng: -75.2012 }, zoom: 13,
        mapTypeControl: false, streetViewControl: false,
      });
      if (autocompleteRef.current) {
        const ac = new window.google.maps.places.Autocomplete(autocompleteRef.current, {
          componentRestrictions: { country: 'co' },
        });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place.geometry) return;
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          googleMapRef.current.panTo({ lat, lng });
          googleMapRef.current.setZoom(16);
          placeMarker(lat, lng, place.formatted_address);
        });
      }
      googleMapRef.current.addListener('click', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          const dir = status === 'OK' && results[0] ? results[0].formatted_address : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          placeMarker(lat, lng, dir);
        });
      });
    };
    if (window.google?.maps?.places) { createMap(); return; }
    loadGoogleMaps(apiKey).then(() => createMap()).catch(console.error);
  };
 
  const placeMarker = (lat, lng, direccion) => {
    if (!googleMapRef.current) return;
    if (markerRef.current) markerRef.current.setMap(null);
    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng }, map: googleMapRef.current, title: 'Mi ubicación',
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#16a34a', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
    });
    setForm(f => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6), direccion_recogida: direccion }));
  };
 
  useEffect(() => {
    if (mapVisible && showForm) {
      googleMapRef.current = null; // reset so it reinits fresh
      setTimeout(initMap, 300);
    }
  }, [mapVisible, showForm]);
 
  const enviar = async (e) => {
    e.preventDefault();
    if (!form.direccion_recogida) { showMsg('Indica la dirección de recogida', 'error'); return; }
    try {
      const res = await axios.post('/api/cliente/solicitudes', form);
      showMsg(`✅ Solicitud creada. Costo: $${res.data.costo_info?.total?.toLocaleString() || '8.000'}`);
      setShowForm(false);
      setForm({ tipo: 'domicilio', direccion_recogida: '', lat: '', lng: '', descripcion: '', peso_estimado: '1' });
      googleMapRef.current = null;
      fetchSolicitudes();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error al crear solicitud', 'error');
    }
  };
 
  if (loading) return <div className="loading">Cargando solicitudes...</div>;
 
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mis solicitudes de recogida</h1>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setMapVisible(false); }}>
          + Solicitar recogida
        </button>
      </div>
 
      {msg.text && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 16 }}>{msg.text}</div>}
 
      {/* Info banner */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#1d4ed8' }}>
        📦 Solicita la recogida de tu paquete a domicilio. Un operador irá a tu dirección. <strong>Costo: $8.000</strong>
      </div>
 
      {solicitudes.length === 0 ? (
        <div className="card"><div className="empty">No tienes solicitudes aún.</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {solicitudes.map(s => {
            const info = ESTADO_INFO[s.estado] || { badge: 'badge-gray', label: s.estado, icon: '📦' };
            return (
              <div key={s.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                      {info.icon} {s.descripcion}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
                      📍 {s.direccion_recogida || '—'} · {s.peso_estimado}kg
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                      {new Date(s.creado_en).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <span className={`badge ${info.badge}`} style={{ fontSize: 12 }}>{info.label}</span>
                </div>
                {s.notas_admin && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--bg3)', borderRadius: 6, fontSize: 12, color: 'var(--text2)' }}>
                    💬 {s.notas_admin}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
 
      {/* Modal nueva solicitud */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <span className="modal-title">Solicitar recogida a domicilio</span>
              <button className="modal-close" onClick={() => { setShowForm(false); googleMapRef.current = null; }}>×</button>
            </div>
 
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
              💰 Costo del servicio: <strong>$8.000</strong> — Un operador irá a recoger tu paquete.
            </div>
 
            <form onSubmit={enviar}>
              <div className="form-group">
                <label className="form-label">Descripción del paquete *</label>
                <input className="form-input" placeholder="Ej: Caja de ropa, documentos, etc." value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} required />
              </div>
 
              <div className="form-group">
                <label className="form-label">Peso estimado (kg)</label>
                <input className="form-input" type="number" step="0.1" min="0.1" value={form.peso_estimado}
                  onChange={e => setForm(f => ({ ...f, peso_estimado: e.target.value }))} />
              </div>
 
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>Dirección de recogida *</label>
                  {apiKey && (
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setMapVisible(v => !v)}>
                      {mapVisible ? '📝 Manual' : '🗺️ Buscar en mapa'}
                    </button>
                  )}
                </div>
 
                {mapVisible && apiKey ? (
                  <div>
                    <input ref={autocompleteRef} className="form-input" placeholder="Buscar mi dirección..."
                      style={{ marginBottom: 8 }} />
                    <div ref={mapRef} style={{ width: '100%', height: 200, borderRadius: 8, border: '1px solid var(--border)', background: '#dde8f7', marginBottom: 8 }} />
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>
                      💡 Busca tu dirección o haz clic en el mapa para marcar dónde estás
                    </div>
                    {form.direccion_recogida && (
                      <div style={{ fontSize: 12, background: '#f0fdf4', borderRadius: 6, padding: '6px 10px', color: '#16a34a', marginBottom: 4 }}>
                        📍 {form.direccion_recogida}
                      </div>
                    )}
                  </div>
                ) : (
                  <input className="form-input" placeholder="Ej: Carrera 15 # 20-30, Barrio El Bosque"
                    value={form.direccion_recogida} onChange={e => setForm(f => ({ ...f, direccion_recogida: e.target.value }))} required />
                )}
              </div>
 
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); googleMapRef.current = null; }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">📦 Solicitar recogida — $8.000</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}