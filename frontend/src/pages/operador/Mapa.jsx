import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';

export default function OperadorMapa() {
  const { socket } = useSocket();
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const myMarkerRef = useRef(null);
  const markersRef = useRef([]);
  const [apiKey, setApiKey] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [myPos, setMyPos] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // all | recoger | entregar | bodega

  useEffect(() => {
    Promise.all([
      axios.get('/api/maps/config'),
      axios.get('/api/operador/solicitudes'),
      axios.get('/rutas?estado=en_curso'),
      axios.get('/rutas?estado=pendiente'),
    ]).then(([mapsRes, solRes, rutasEnc, rutasPend]) => {
      setApiKey(mapsRes.data.apiKey || '');
      setSolicitudes(solRes.data.filter(s => ['confirmada', 'asignada'].includes(s.estado)));
      setRutas([...rutasEnc.data, ...rutasPend.data]);
    }).finally(() => setLoading(false));
  }, []);

  // Init Google Map
  useEffect(() => {
    if (!apiKey || !mapRef.current || googleMapRef.current) return;
    const init = () => {
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 4.4378, lng: -75.2012 },
        zoom: 13,
        styles: lightStyle,
        mapTypeControl: false,
        streetViewControl: false,
      });
      setMapReady(true);
      startGPS();
    };
    if (window.google?.maps) { init(); return; }
    import('../../utils/googleMapsLoader').then(({ loadGoogleMaps }) => {
      loadGoogleMaps(apiKey).then(() => init()).catch(console.error);
    });
  }, [apiKey]);

  // Place markers when map + data ready
  useEffect(() => {
    if (!mapReady || !googleMapRef.current) return;
    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const map = googleMapRef.current;

    // Solicitudes de recogida (casa del cliente)
    solicitudes.forEach(s => {
      if (!s.lat && !s.cliente_lat) return; // skip if no coords
      const lat = parseFloat(s.lat || s.cliente_lat);
      const lng = parseFloat(s.lng || s.cliente_lng);
      if (!lat || !lng) return;
      const marker = new window.google.maps.Marker({
        position: { lat, lng }, map,
        title: `📦 Recoger: ${s.descripcion}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE, scale: 14,
          fillColor: '#f59e0b', fillOpacity: 1,
          strokeColor: '#fff', strokeWeight: 2,
        },
        label: { text: '📦', fontSize: '12px' },
      });
      const infoWindow = new window.google.maps.InfoWindow({
        content: `<div style="font-family:Inter,sans-serif;padding:8px;min-width:180px;">
          <div style="font-weight:700;margin-bottom:4px;">📦 Recoger paquete</div>
          <div style="font-size:13px;color:#374151;">${s.descripcion}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">👤 ${s.cliente_nombre} ${s.cliente_apellido}</div>
          <div style="font-size:12px;color:#64748b;">📍 ${s.cliente_direccion || 'Sin dirección'}</div>
          ${s.cliente_telefono ? `<a href="https://wa.me/57${s.cliente_telefono.replace(/\D/g,'')}" target="_blank" style="display:inline-block;margin-top:8px;background:#16a34a;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;text-decoration:none;">💬 WhatsApp</a>` : ''}
        </div>`,
      });
      marker.addListener('click', () => infoWindow.open(map, marker));
      markersRef.current.push(marker);
    });

    // Puntos de ruta (entregas)
    rutas.forEach(ruta => {
      (ruta.puntos_parada || []).filter(p => p.estado === 'pendiente').forEach(p => {
        if (!p.lat || !p.lng) return;
        const marker = new window.google.maps.Marker({
          position: { lat: parseFloat(p.lat), lng: parseFloat(p.lng) }, map,
          title: `🚚 Entregar: ${p.direccion}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE, scale: 12,
            fillColor: '#2563eb', fillOpacity: 1,
            strokeColor: '#fff', strokeWeight: 2,
          },
        });
        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="font-family:Inter,sans-serif;padding:8px;min-width:160px;">
            <div style="font-weight:700;margin-bottom:4px;">🚚 Punto de entrega</div>
            <div style="font-size:12px;color:#374151;">${p.direccion}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">Peso: ${p.peso_estimado} kg</div>
          </div>`,
        });
        marker.addListener('click', () => infoWindow.open(map, marker));
        markersRef.current.push(marker);
      });
    });
  }, [mapReady, solicitudes, rutas]);

  const startGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMyPos({ lat, lng });
        if (!googleMapRef.current) return;
        const p = { lat, lng };
        if (myMarkerRef.current) {
          myMarkerRef.current.setPosition(p);
        } else {
          myMarkerRef.current = new window.google.maps.Marker({
            position: p, map: googleMapRef.current, title: 'Mi ubicación',
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE, scale: 10,
              fillColor: '#16a34a', fillOpacity: 1,
              strokeColor: '#fff', strokeWeight: 3,
            },
            zIndex: 999,
          });
        }
        socket?.emit('operador:ubicacion', { lat, lng });
      },
      err => console.error('GPS:', err),
      { enableHighAccuracy: true, maximumAge: 8000 }
    );
  };

  const centerOnMe = () => {
    if (myPos && googleMapRef.current) {
      googleMapRef.current.panTo(myPos);
      googleMapRef.current.setZoom(16);
    }
  };

  if (loading) return <div className="loading">Cargando mapa...</div>;

  const totalRecogidas = solicitudes.length;
  const totalEntregas = rutas.reduce((acc, r) => acc + (r.puntos_parada?.filter(p => p.estado === 'pendiente').length || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🗺️ Mi mapa de trabajo</h1>
        <button className="btn btn-secondary btn-sm" onClick={centerOnMe} disabled={!myPos}>
          📍 Centrar en mí
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#f59e0b' }}>{totalRecogidas}</div>
          <div className="stat-label">📦 Por recoger</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#2563eb' }}>{totalEntregas}</div>
          <div className="stat-label">🚚 Por entregar</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#16a34a', fontSize: 16 }}>
            {myPos ? `${myPos.lat.toFixed(4)}, ${myPos.lng.toFixed(4)}` : '—'}
          </div>
          <div className="stat-label">📍 Mi posición</div>
        </div>
      </div>

      {!apiKey ? (
        <div className="alert alert-info">
          🗺️ Configura <code>GOOGLE_MAPS_API_KEY</code> en el backend para activar el mapa GPS.
        </div>
      ) : null}

      {/* Map */}
      <div style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div ref={mapRef} style={{ width: '100%', height: 'clamp(300px, 55vw, 520px)', background: '#dde8f7' }} />

        {/* Legend overlay */}
        <div style={{
          position: 'absolute', bottom: 16, left: 16,
          background: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: '10px 14px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)', fontSize: 12,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: '#1e40af' }}>Leyenda</div>
          {[
            { color: '#f59e0b', label: 'Paquete por recoger' },
            { color: '#2563eb', label: 'Punto de entrega' },
            { color: '#16a34a', label: 'Mi ubicación' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
              <span style={{ color: '#374151' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* List of pending pickups */}
      {totalRecogidas > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">📦 Recogidas pendientes ({totalRecogidas})</div>
          {solicitudes.map(s => (
            <div key={s.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                📦
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.descripcion}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                  👤 {s.cliente_nombre} {s.cliente_apellido}
                  {s.cliente_direccion && ` · 📍 ${s.cliente_direccion}`}
                </div>
              </div>
              {s.cliente_telefono && (
                <a href={`https://wa.me/57${s.cliente_telefono.replace(/\D/g,'')}`} target="_blank" rel="noreferrer">
                  <button className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', border: 'none', flexShrink: 0 }}>
                    💬 WA
                  </button>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const lightStyle = [
  { elementType: 'geometry', stylers: [{ color: '#e8f0fb' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a7299' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#b8cde0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#8ab0cc' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c5d8ed' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];
