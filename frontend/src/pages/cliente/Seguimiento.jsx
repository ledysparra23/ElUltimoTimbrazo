import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';

export default function ClienteSeguimiento() {
  const { socket } = useSocket();
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markerRef = useRef(null);
  const [operadores, setOperadores] = useState([]);
  const [selectedOp, setSelectedOp] = useState(null);
  const [opUbicacion, setOpUbicacion] = useState(null);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    axios.get('/api/maps/config').then(r => setApiKey(r.data.apiKey));
    axios.get('/api/admin/operadores').then(r => setOperadores(r.data));
  }, []);

  useEffect(() => {
    if (!apiKey || !mapRef.current || googleMapRef.current) return;
    const initMap = () => {
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 4.4378, lng: -75.2012 },
        zoom: 13,
        styles: lightMapStyle,
        mapTypeControl: false,
        streetViewControl: false,
      });
    };
    if (window.google?.maps) initMap();
    else {
      import('../../utils/googleMapsLoader').then(({ loadGoogleMaps }) => {
        loadGoogleMaps(apiKey).then(() => initMap()).catch(console.error);
      });
    }
  }, [apiKey]);

  useEffect(() => {
    if (!socket || !selectedOp) return;
    socket.emit('cliente:seguir_operador', { operadorId: selectedOp });

    const handleUpdate = ({ operadorId, lat, lng }) => {
      if (operadorId !== selectedOp) return;
      setOpUbicacion({ lat, lng });
      if (!googleMapRef.current) return;
      const pos = { lat: parseFloat(lat), lng: parseFloat(lng) };
      if (markerRef.current) {
        markerRef.current.setPosition(pos);
      } else {
        markerRef.current = new window.google.maps.Marker({
          position: pos, map: googleMapRef.current, title: 'Operador',
          icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 6, fillColor: '#1d5bdb', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, rotation: 0 }
        });
      }
      googleMapRef.current.panTo(pos);
    };

    socket.on('operador:ubicacion_update', handleUpdate);
    return () => {
      socket.emit('cliente:dejar_seguir', { operadorId: selectedOp });
      socket.off('operador:ubicacion_update', handleUpdate);
    };
  }, [socket, selectedOp]);

  const opNombre = (op) => `${op.users?.nombre || ''} ${op.users?.apellido || ''}`.trim();
  const activos = operadores.filter(o => o.estado === 'en_ruta');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Seguimiento en vivo</h1>
        {selectedOp && opUbicacion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 3px rgba(22,163,74,0.2)', animation: 'pulse 2s infinite' }} />
            GPS activo en tiempo real
          </div>
        )}
      </div>

      {/* Responsive grid: sidebar left + map right, stacks on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,260px) 1fr', gap: 16 }} className="seguimiento-grid">
        {/* Operadores list */}
        <div>
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title">Operadores en ruta</div>
            {activos.length === 0 ? (
              <div className="empty" style={{ padding: '20px 0', fontSize: 13 }}>
                🚦 No hay operadores en ruta actualmente.
              </div>
            ) : activos.map(o => (
              <div
                key={o.id}
                onClick={() => setSelectedOp(o.id)}
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
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: selectedOp === o.id ? '#1d4ed8' : 'var(--text)' }}>
                    {opNombre(o)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, paddingLeft: 16 }}>
                  {o.vehiculo_placa || 'Sin placa'} · {o.zonas?.nombre || 'Sin zona'}
                </div>
              </div>
            ))}
          </div>

          {selectedOp && opUbicacion && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-title">Coordenadas</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ background: 'var(--bg3)', padding: '6px 10px', borderRadius: 6 }}>
                  Lat: <strong>{parseFloat(opUbicacion.lat).toFixed(6)}</strong>
                </div>
                <div style={{ background: 'var(--bg3)', padding: '6px 10px', borderRadius: 6 }}>
                  Lng: <strong>{parseFloat(opUbicacion.lng).toFixed(6)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div>
          {!apiKey && (
            <div className="alert alert-info" style={{ marginBottom: 12 }}>
              🗺️ Configura <code>GOOGLE_MAPS_API_KEY</code> en el backend para ver el mapa GPS.
            </div>
          )}
          <div
            ref={mapRef}
            style={{
              height: 480, borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: '#dde8f7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {!apiKey && (
              <div style={{ color: 'var(--text2)', fontSize: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🗺️</div>
                Mapa no disponible
              </div>
            )}
          </div>
          {!selectedOp && apiKey && (
            <div className="alert alert-info" style={{ marginTop: 10 }}>
              Selecciona un operador de la lista para ver su ubicación en tiempo real.
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .seguimiento-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

const lightMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#e8f0fb' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a7299' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#b8cde0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c5d8ed' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];
