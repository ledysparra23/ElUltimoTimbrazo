import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';
import { loadGoogleMaps } from '../../utils/googleMapsLoader';

export default function AdminMapa() {
  const { socket, connected } = useSocket();
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef({});
  const [operadoresActivos, setOperadoresActivos] = useState([]);
  const [apiKey, setApiKey] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [loadingMap, setLoadingMap] = useState(false);

  useEffect(() => {
    axios.get('/api/maps/config')
      .then(r => setApiKey(r.data.apiKey || ''))
      .catch(() => setApiKey(''));
  }, []);

  useEffect(() => {
    if (!apiKey || googleMapRef.current) return;
    setLoadingMap(true);
    loadGoogleMaps(apiKey)
      .then(() => {
        if (!mapRef.current || googleMapRef.current) return;
        googleMapRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: 4.4378, lng: -75.2012 },
          zoom: 13,
          styles: lightMapStyle,
          mapTypeControl: false,
          streetViewControl: false,
        });
        setMapReady(true);
        setLoadingMap(false);
      })
      .catch(err => {
        setMapError(err.message);
        setLoadingMap(false);
      });
  }, [apiKey]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('admin:unirse');
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const onEstado = (lista) => {
      setOperadoresActivos(lista);
      lista.forEach(op => { if (op.lat) placeMarker(op); });
    };
    const onUbicacion = ({ operadorId, lat, lng, nombre }) => {
      setOperadoresActivos(prev => {
        const found = prev.find(o => o.operadorId === operadorId);
        if (found) return prev.map(o => o.operadorId === operadorId ? { ...o, lat, lng } : o);
        return [...prev, { operadorId, lat, lng, nombre }];
      });
      placeMarker({ operadorId, lat, lng, nombre });
    };
    const onConectado = ({ operadorId, nombre }) =>
      setOperadoresActivos(prev =>
        prev.find(o => o.operadorId === operadorId) ? prev
          : [...prev, { operadorId, nombre, lat: null, lng: null }]
      );
    const onDesconectado = ({ operadorId }) => {
      setOperadoresActivos(prev => prev.filter(o => o.operadorId !== operadorId));
      if (markersRef.current[operadorId]) {
        markersRef.current[operadorId].setMap(null);
        delete markersRef.current[operadorId];
      }
    };
    socket.on('operadores:estado_actual', onEstado);
    socket.on('operador:ubicacion_update', onUbicacion);
    socket.on('operador:conectado', onConectado);
    socket.on('operador:desconectado', onDesconectado);
    return () => {
      socket.off('operadores:estado_actual', onEstado);
      socket.off('operador:ubicacion_update', onUbicacion);
      socket.off('operador:conectado', onConectado);
      socket.off('operador:desconectado', onDesconectado);
    };
  }, [socket]);

  const placeMarker = ({ operadorId, lat, lng, nombre }) => {
    if (!googleMapRef.current || !lat || !lng) return;
    const pos = { lat: parseFloat(lat), lng: parseFloat(lng) };
    if (markersRef.current[operadorId]) {
      markersRef.current[operadorId].setPosition(pos);
    } else {
      const marker = new window.google.maps.Marker({
        position: pos, map: googleMapRef.current, title: nombre || 'Operador',
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 7, fillColor: '#2563eb', fillOpacity: 1,
          strokeColor: '#fff', strokeWeight: 2, rotation: 0,
        },
      });
      const info = new window.google.maps.InfoWindow({
        content: `<div style="font-family:Inter,sans-serif;padding:4px 6px;font-weight:700;color:#1e40af;">🚗 ${nombre || 'Operador'}</div>`,
      });
      marker.addListener('click', () => info.open(googleMapRef.current, marker));
      markersRef.current[operadorId] = marker;
    }
  };

  const centrar = (op) => {
    if (googleMapRef.current && op.lat && op.lng) {
      googleMapRef.current.panTo({ lat: parseFloat(op.lat), lng: parseFloat(op.lng) });
      googleMapRef.current.setZoom(16);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🗺️ Mapa en vivo</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: connected ? '#16a34a' : '#94a3b8' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#16a34a' : '#94a3b8',
            boxShadow: connected ? '0 0 0 3px rgba(22,163,74,0.2)' : 'none',
          }} />
          {connected ? 'Socket conectado' : 'Conectando...'}
        </div>
      </div>

      {apiKey === '' && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ⚠️ <strong>GOOGLE_MAPS_API_KEY</strong> no configurada en <code>backend/.env</code>.
        </div>
      )}
      {mapError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>❌ {mapError}</div>
      )}

      <div className="mapa-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,260px)', gap: 16 }}>
        <style>{`@media(max-width:700px){.mapa-grid{grid-template-columns:1fr !important;}}`}</style>

        <div>
          {/* Wrapper with fixed height — overlay sits on top, map div is bare */}
          <div style={{ position: 'relative', height: 'clamp(280px,50vw,520px)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', background: '#dde8f7' }}>
            {/*
              IMPORTANT: mapRef div must be completely empty — no React children.
              The loading overlay is a sibling div with position:absolute.
            */}
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

            {/* Overlay — only shown while not ready */}
            {(!mapReady || loadingMap) && !mapError && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 5,
                background: '#dde8f7', display: 'flex',
                flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 14,
              }}>
                {apiKey === null && (
                  <div style={{ fontSize: 13, color: '#5a7299' }}>Verificando configuración...</div>
                )}
                {apiKey === '' && (
                  <>
                    <div style={{ fontSize: 40 }}>🗺️</div>
                    <div style={{ fontSize: 13, color: '#5a7299' }}>Agrega GOOGLE_MAPS_API_KEY en backend/.env</div>
                  </>
                )}
                {apiKey && (
                  <>
                    <div style={{
                      width: 40, height: 40, border: '3px solid #b8cde0',
                      borderTopColor: '#2563eb', borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    <div style={{ fontSize: 13, color: '#5a7299' }}>Cargando Google Maps...</div>
                  </>
                )}
              </div>
            )}
          </div>

          {mapReady && operadoresActivos.length === 0 && (
            <div className="alert alert-info" style={{ marginTop: 10 }}>
              ✅ Mapa listo. Ningún operador transmitiendo GPS ahora mismo.
            </div>
          )}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title">
              Operadores activos
              <span style={{ marginLeft: 8, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                {operadoresActivos.length}
              </span>
            </div>
            {operadoresActivos.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text2)', padding: '8px 0' }}>
                Ningún operador en ruta ahora.
              </div>
            ) : operadoresActivos.map(op => (
              <div key={op.operadorId} onClick={() => centrar(op)}
                style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: op.lat ? 'pointer' : 'default' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
                    background: op.lat ? '#16a34a' : '#d97706',
                    boxShadow: op.lat ? '0 0 0 3px rgba(22,163,74,0.2)' : 'none',
                  }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{op.nombre}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3, paddingLeft: 16 }}>
                  {op.lat ? `📍 ${parseFloat(op.lat).toFixed(5)}, ${parseFloat(op.lng).toFixed(5)}` : '⏳ Esperando GPS...'}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">¿Cómo funciona?</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
              <p>1. El operador presiona <strong>"Iniciar ruta"</strong>.</p>
              <p style={{ marginTop: 6 }}>2. El navegador solicita permiso de GPS.</p>
              <p style={{ marginTop: 6 }}>3. La ubicación llega aquí en tiempo real via Socket.io.</p>
              <p style={{ marginTop: 6 }}>4. Clic en un operador para centrarte en él.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const lightMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#e8f0fb' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a7299' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#b8cde0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#8ab0cc' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c5d8ed' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];
