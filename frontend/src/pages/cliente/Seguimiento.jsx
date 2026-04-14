import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { loadGoogleMaps } from '../../utils/googleMapsLoader';

const lightMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#e8f0fb' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a7299' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#b8cde0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c5d8ed' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

export default function ClienteSeguimiento() {
  const { socket } = useSocket();
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markerRef = useRef(null);
  const [operadores, setOperadores] = useState([]);
  const [selectedOp, setSelectedOp] = useState(null);
  const [opUbicacion, setOpUbicacion] = useState(null);
  const [ultimaUbicacion, setUltimaUbicacion] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    axios.get('/api/maps/config').then(r => setApiKey(r.data.apiKey || '')).catch(() => {});
    axios.get('/api/admin/operadores').then(r => setOperadores(r.data)).catch(() => {});
  }, []);

  // Init map
  useEffect(() => {
    if (!apiKey || !mapRef.current || googleMapRef.current) return;
    loadGoogleMaps(apiKey).then(() => {
      if (!mapRef.current || googleMapRef.current) return;
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 4.4378, lng: -75.2012 }, zoom: 13,
        styles: lightMapStyle, mapTypeControl: false, streetViewControl: false,
      });
      setMapReady(true);
    }).catch(console.error);
  }, [apiKey]);

  // When selecting operador, load last known location from DB
  useEffect(() => {
    if (!selectedOp) return;
    const op = operadores.find(o => o.id === selectedOp);
    if (op?.lat_actual && op?.lng_actual) {
      const lat = parseFloat(op.lat_actual);
      const lng = parseFloat(op.lng_actual);
      setUltimaUbicacion({ lat, lng });
      updateMarker(lat, lng, false);
    }
  }, [selectedOp, operadores]);

  // Socket subscription
  useEffect(() => {
    if (!socket || !selectedOp) return;
    socket.emit('cliente:seguir_operador', { operadorId: selectedOp });
    socket.emit('cliente:pedir_ubicacion', { operadorId: selectedOp });
    console.log('Siguiendo operador:', selectedOp);

    const handleUpdate = ({ operadorId, lat, lng }) => {
      if (operadorId !== selectedOp) return;
      console.log('Ubicacion recibida:', lat, lng);
      const latN = parseFloat(lat);
      const lngN = parseFloat(lng);
      setOpUbicacion({ lat: latN, lng: lngN });
      setUltimaUbicacion({ lat: latN, lng: lngN });
      updateMarker(latN, lngN, true);
    };

    socket.on('operador:ubicacion_update', handleUpdate);
    return () => {
      socket.emit('cliente:dejar_seguir', { operadorId: selectedOp });
      socket.off('operador:ubicacion_update', handleUpdate);
    };
  }, [socket, selectedOp]);

  const updateMarker = (lat, lng, live) => {
    if (!googleMapRef.current) return;
    const pos = { lat, lng };
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
    } else {
      markerRef.current = new window.google.maps.Marker({
        position: pos, map: googleMapRef.current, title: 'Operador',
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 7, fillColor: live ? '#16a34a' : '#f59e0b',
          fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, rotation: 0,
        },
      });
    }
    // Update icon color based on live/last-known
    markerRef.current.setIcon({
      path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 7, fillColor: live ? '#16a34a' : '#f59e0b',
      fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, rotation: 0,
    });
    googleMapRef.current.panTo(pos);
    if (!live) googleMapRef.current.setZoom(15);
  };

  const opNombre = (op) => `${op.users?.nombre || ''} ${op.users?.apellido || ''}`.trim();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Seguimiento en vivo</h1>
        {selectedOp && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
            color: opUbicacion ? '#16a34a' : ultimaUbicacion ? '#f59e0b' : '#94a3b8' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%',
              background: opUbicacion ? '#16a34a' : ultimaUbicacion ? '#f59e0b' : '#94a3b8',
              boxShadow: opUbicacion ? '0 0 0 3px rgba(22,163,74,0.2)' : 'none' }} />
            {opUbicacion ? 'GPS en tiempo real' : ultimaUbicacion ? 'Última ubicación conocida' : 'Sin ubicación disponible'}
          </div>
        )}
      </div>

      {!apiKey && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          🗺️ Configura GOOGLE_MAPS_API_KEY para ver el mapa.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,260px) 1fr', gap: 16 }} className="seguimiento-grid">
        <style>{`@media(max-width:700px){.seguimiento-grid{grid-template-columns:1fr !important;}}`}</style>

        {/* Sidebar */}
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title">Operadores</div>
            {operadores.length === 0 ? (
              <div className="empty" style={{ padding: '16px 0', fontSize: 13 }}>No hay operadores registrados.</div>
            ) : operadores.map(o => (
              <div key={o.id} onClick={() => {
                setSelectedOp(o.id);
                setOpUbicacion(null);
                if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null; }
              }}
                style={{
                  padding: selectedOp === o.id ? '12px 10px' : '12px 0',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: selectedOp === o.id ? '#eff6ff' : 'transparent',
                  borderRadius: selectedOp === o.id ? 8 : 0,
                  borderLeft: selectedOp === o.id ? '3px solid #2563eb' : '3px solid transparent',
                  transition: 'all .15s',
                  marginLeft: selectedOp === o.id ? -14 : 0,
                  paddingLeft: selectedOp === o.id ? 14 : 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: o.estado === 'en_ruta' ? '#16a34a' : '#94a3b8' }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{opNombre(o)}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, paddingLeft: 16 }}>
                  {o.estado === 'en_ruta' ? '🟢 En ruta' : '⚪ Disponible'}
                  {o.lat_actual && <span> · Ubicación registrada</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title" style={{ fontSize: 12, marginBottom: 8 }}>Leyenda</div>
            <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 2 }}>
              <div>🟢 GPS en tiempo real (operador activo)</div>
              <div>🟡 Última ubicación registrada</div>
              <div>⚪ Sin ubicación disponible</div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div>
          <div style={{ position: 'relative', height: 'clamp(280px,50vw,520px)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', background: '#dde8f7' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            {!mapReady && apiKey && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#dde8f7', gap: 12 }}>
                <div style={{ width: 36, height: 36, border: '3px solid #b8cde0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 13, color: '#5a7299' }}>Cargando mapa...</div>
              </div>
            )}
            {!selectedOp && mapReady && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(232,240,251,0.85)', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 32 }}>👆</div>
                <div style={{ fontSize: 14, color: '#5a7299', fontWeight: 600 }}>Selecciona un operador para ver su ubicación</div>
              </div>
            )}
          </div>

          {selectedOp && !ultimaUbicacion && (
            <div className="alert alert-info" style={{ marginTop: 10 }}>
              ℹ️ Este operador aún no ha compartido su ubicación. Aparecerá aquí cuando inicie una ruta.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
