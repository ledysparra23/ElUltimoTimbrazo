import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
 
const today = () => new Date().toISOString().split('T')[0];
 
export default function AdminRutas() {
  const [rutas, setRutas] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showReagendar, setShowReagendar] = useState(false);
  const [selectedRuta, setSelectedRuta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [form, setForm] = useState({ ciclo_id: '', operador_id: '', zona_id: '', puntos: [] });
  const [nuevoPunto, setNuevoPunto] = useState({ direccion: '', lat: '', lng: '', tipo: 'domicilio', peso_estimado: 1, cliente_id: '' });
  const [reagendarForm, setReagendar] = useState({ ciclo_origen_id: '', nuevo_ciclo_id: '' });
  const [apiKey, setApiKey] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [mapVisible, setMapVisible] = useState(false);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteRef = useRef(null);
  const diasBloqueados = JSON.parse(localStorage.getItem('dias_bloqueados') || '[]');
 
  const fetchAll = async () => {
    try {
      const [rutasR, ciclosR, opsR, zonasR, mapsR] = await Promise.all([
        axios.get('/rutas'),
        axios.get('/api/ciclos'),
        axios.get('/api/admin/operadores'),
        axios.get('/api/admin/zonas'),
        axios.get('/api/maps/config').catch(() => ({ data: { apiKey: '' } })),
      ]);
      setRutas(rutasR.data);
      setCiclos(ciclosR.data);
      setOperadores(opsR.data);
      setZonas(zonasR.data);
      setApiKey(mapsR.data.apiKey || '');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchAll(); }, []);
 
  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 5000);
  };
 
  // Check if operador already has an active route
  const operadorOcupado = (opId) => {
    return rutas.some(r => r.operador_id === opId && ['pendiente', 'en_curso'].includes(r.estado));
  };
 
  // Init Google Maps mini-map for punto selection
  const initMiniMap = () => {
    if (!apiKey || !mapRef.current) return;
    // Always create fresh map instance when modal opens
    if (window.google?.maps?.places) {
      createMap();
    } else {
      import('../../utils/googleMapsLoader').then(({ loadGoogleMaps }) => {
        loadGoogleMaps(apiKey).then(() => createMap()).catch(console.error);
      });
    }
  };
 
  const createMap = () => {
    if (!mapRef.current) return;
    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 4.4378, lng: -75.2012 }, zoom: 13,
      mapTypeControl: false, streetViewControl: false,
    });
    // Autocomplete search box
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
        placeMarker({ lat, lng }, place.formatted_address);
      });
    }
    // Click on map to place marker
    googleMapRef.current.addListener('click', (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      placeMarker({ lat, lng });
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setNuevoPunto(p => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6), direccion: results[0].formatted_address }));
        } else {
          setNuevoPunto(p => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
        }
      });
    });
  };
 
  const placeMarker = ({ lat, lng }, direccion) => {
    if (!googleMapRef.current) return;
    if (markerRef.current) markerRef.current.setMap(null);
    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng }, map: googleMapRef.current, title: 'Punto seleccionado',
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#2563eb', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
    });
    if (direccion) setNuevoPunto(p => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6), direccion }));
  };
 
  useEffect(() => {
    if (mapVisible && showModal) {
      googleMapRef.current = null; // reset so it reinits fresh
      setTimeout(initMiniMap, 300);
    }
  }, [mapVisible, showModal]);
 
  const addPunto = () => {
    if (!nuevoPunto.direccion || !nuevoPunto.lat || !nuevoPunto.lng) {
      alert('Selecciona una dirección en el mapa o ingresa lat/lng');
      return;
    }
    setForm(f => ({ ...f, puntos: [...f.puntos, { ...nuevoPunto, orden: f.puntos.length }] }));
    setNuevoPunto({ direccion: '', lat: '', lng: '', tipo: 'domicilio', peso_estimado: 1, cliente_id: '' });
    setSearchInput('');
    if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null; }
  };
 
  const removePunto = (idx) => {
    setForm(f => ({ ...f, puntos: f.puntos.filter((_, i) => i !== idx).map((p, i) => ({ ...p, orden: i })) }));
  };
 
  const crearRuta = async (e) => {
    e.preventDefault();
    // Check ciclo date
    const ciclo = ciclos.find(c => c.id === form.ciclo_id);
    if (ciclo?.fecha && ciclo.fecha < today()) {
      showMsg('El ciclo seleccionado tiene una fecha pasada', 'error'); return;
    }
    if (ciclo?.fecha && diasBloqueados.includes(ciclo.fecha)) {
      showMsg('El ciclo seleccionado cae en un día bloqueado', 'error'); return;
    }
    // Check operador availability
    if (form.operador_id && operadorOcupado(form.operador_id)) {
      showMsg('Este operador ya tiene una ruta activa. Espera a que la termine o elige otro.', 'error'); return;
    }
    try {
      await axios.post('/rutas', form);
      showMsg('Ruta creada exitosamente');
      setShowModal(false);
      setForm({ ciclo_id: '', operador_id: '', zona_id: '', puntos: [] });
      googleMapRef.current = null;
      fetchAll();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error al crear ruta', 'error');
    }
  };
 
  const reagendar = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/rutas/reagendar', reagendarForm);
      showMsg(res.data.message);
      setShowReagendar(false);
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error', 'error');
    }
  };
 
  const estadoBadge = (e) => {
    const map = { pendiente: 'badge-gray', en_curso: 'badge-yellow', completada: 'badge-green', cancelada: 'badge-red' };
    return map[e] || 'badge-gray';
  };
 
  if (loading) return <div className="loading">Cargando rutas...</div>;
 
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Rutas</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowReagendar(true)}>↺ Reagendar omitidos</button>
          <button className="btn btn-primary" onClick={() => { setShowModal(true); setMapVisible(false); }}>+ Nueva ruta</button>
        </div>
      </div>
 
      {msg.text && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 16 }}>{msg.text}</div>}
 
      {/* Rutas list */}
      <div className="card">
        <div className="table-wrapper">
          {rutas.length === 0 ? (
            <div className="empty">No hay rutas creadas.</div>
          ) : (
            <table>
              <thead>
                <tr><th>Ciclo</th><th>Operador</th><th>Zona</th><th>Puntos</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {rutas.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 12 }}>{r.ciclos_recoleccion?.nombre}<br /><span style={{ color: 'var(--text2)' }}>{r.ciclos_recoleccion?.fecha}</span></td>
                    <td style={{ fontWeight: 500 }}>{r.operadores?.users?.nombre} {r.operadores?.users?.apellido}</td>
                    <td style={{ fontSize: 12 }}>{r.zonas?.nombre || '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{r.puntos_parada?.length || 0}</td>
                    <td><span className={`badge ${estadoBadge(r.estado)}`}>{r.estado}</span></td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => setSelectedRuta(r)}>Ver detalle</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
 
      {/* Detalle ruta */}
      {selectedRuta && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <span className="modal-title">Detalle de ruta</span>
              <button className="modal-close" onClick={() => setSelectedRuta(null)}>×</button>
            </div>
            <div style={{ marginBottom: 12, fontSize: 13 }}>
              <strong>Ciclo:</strong> {selectedRuta.ciclos_recoleccion?.nombre} · {selectedRuta.ciclos_recoleccion?.fecha}<br />
              <strong>Operador:</strong> {selectedRuta.operadores?.users?.nombre} {selectedRuta.operadores?.users?.apellido}<br />
              <strong>Zona:</strong> {selectedRuta.zonas?.nombre || '—'}<br />
              <strong>Estado:</strong> <span className={`badge ${estadoBadge(selectedRuta.estado)}`}>{selectedRuta.estado}</span>
            </div>
            <div className="card-title">Puntos de parada ({selectedRuta.puntos_parada?.length || 0})</div>
            {(selectedRuta.puntos_parada || []).map((p, i) => (
              <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <strong>#{i + 1}</strong> — {p.direccion}
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                  {p.tipo} · {p.peso_estimado}kg · <span className={`badge ${p.estado === 'visitado' ? 'badge-green' : p.estado === 'omitido' ? 'badge-red' : 'badge-gray'}`}>{p.estado}</span>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setSelectedRuta(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
 
      {/* Modal nueva ruta */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <span className="modal-title">Nueva Ruta</span>
              <button className="modal-close" onClick={() => { setShowModal(false); googleMapRef.current = null; }}>×</button>
            </div>
            <form onSubmit={crearRuta}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Ciclo *</label>
                  <select className="form-input" value={form.ciclo_id} onChange={e => setForm({ ...form, ciclo_id: e.target.value })} required>
                    <option value="">Seleccionar ciclo...</option>
                    {ciclos.filter(c => ['planificado', 'en_curso'].includes(c.estado) && c.fecha >= today() && !diasBloqueados.includes(c.fecha)).map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} - {c.fecha}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Operador *</label>
                  <select className="form-input" value={form.operador_id} onChange={e => setForm({ ...form, operador_id: e.target.value })} required>
                    <option value="">Seleccionar operador...</option>
                    {operadores.map(o => (
                      <option key={o.id} value={o.id} disabled={operadorOcupado(o.id)}>
                        {o.users?.nombre} {o.users?.apellido}{operadorOcupado(o.id) ? ' — EN RUTA' : ''}
                      </option>
                    ))}
                  </select>
                  {form.operador_id && operadorOcupado(form.operador_id) && (
                    <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 3 }}>⚠️ Operador con ruta activa</div>
                  )}
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Zona</label>
                  <select className="form-input" value={form.zona_id} onChange={e => setForm({ ...form, zona_id: e.target.value })}>
                    <option value="">Sin zona específica</option>
                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                  </select>
                </div>
              </div>
 
              {/* Puntos de parada */}
              <div style={{ margin: '20px 0 10px', fontWeight: 700, fontSize: 14, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                📍 Puntos de parada ({form.puntos.length})
              </div>
 
              {form.puntos.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{p.direccion}</div>
                    <div style={{ color: 'var(--text2)' }}>{p.lat}, {p.lng} · {p.tipo} · {p.peso_estimado}kg</div>
                  </div>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => removePunto(i)}>✕</button>
                </div>
              ))}
 
              {/* Agregar punto */}
              <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 14, marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Agregar punto</div>
                  {apiKey && (
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setMapVisible(v => !v)}>
                      {mapVisible ? '📝 Modo manual' : '🗺️ Buscar en mapa'}
                    </button>
                  )}
                </div>
 
                {mapVisible && apiKey ? (
                  <div>
                    <input ref={autocompleteRef} className="form-input" placeholder="Buscar dirección..." value={searchInput}
                      onChange={e => setSearchInput(e.target.value)} style={{ marginBottom: 8 }} />
                    <div ref={mapRef} style={{ width: '100%', height: 220, borderRadius: 8, border: '1px solid var(--border)', background: '#dde8f7', marginBottom: 8 }} />
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>
                      💡 Haz clic en el mapa o busca una dirección para seleccionar el punto
                    </div>
                    {nuevoPunto.lat && (
                      <div style={{ fontSize: 12, background: '#eff6ff', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
                        📍 <strong>{nuevoPunto.direccion || 'Punto seleccionado'}</strong><br />
                        <span style={{ color: 'var(--text2)' }}>{nuevoPunto.lat}, {nuevoPunto.lng}</span>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <select className="form-input" value={nuevoPunto.tipo} onChange={e => setNuevoPunto(p => ({ ...p, tipo: e.target.value }))}>
                        <option value="domicilio">Domicilio</option>
                        <option value="correspondencia">Correspondencia</option>
                        <option value="residuo">Residuo</option>
                        <option value="otro">Otro</option>
                      </select>
                      <input className="form-input" placeholder="Peso (kg)" type="number" step="0.1" value={nuevoPunto.peso_estimado}
                        onChange={e => setNuevoPunto(p => ({ ...p, peso_estimado: e.target.value }))} />
                      <button type="button" className="btn btn-primary" onClick={addPunto} disabled={!nuevoPunto.lat}>
                        + Agregar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input className="form-input" placeholder="Dirección" value={nuevoPunto.direccion}
                      onChange={e => setNuevoPunto(p => ({ ...p, direccion: e.target.value }))} style={{ marginBottom: 8 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8 }}>
                      <input className="form-input" placeholder="Latitud" type="number" step="any" value={nuevoPunto.lat}
                        onChange={e => setNuevoPunto(p => ({ ...p, lat: e.target.value }))} />
                      <input className="form-input" placeholder="Longitud" type="number" step="any" value={nuevoPunto.lng}
                        onChange={e => setNuevoPunto(p => ({ ...p, lng: e.target.value }))} />
                      <select className="form-input" value={nuevoPunto.tipo} onChange={e => setNuevoPunto(p => ({ ...p, tipo: e.target.value }))}>
                        <option value="domicilio">Domicilio</option>
                        <option value="correspondencia">Correspondencia</option>
                        <option value="otro">Otro</option>
                      </select>
                      <input className="form-input" placeholder="Peso kg" type="number" step="0.1" value={nuevoPunto.peso_estimado}
                        onChange={e => setNuevoPunto(p => ({ ...p, peso_estimado: e.target.value }))} />
                      <button type="button" className="btn btn-primary" onClick={addPunto}>+ Add</button>
                    </div>
                  </div>
                )}
              </div>
 
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); googleMapRef.current = null; }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={form.puntos.length === 0}>
                  Crear ruta ({form.puntos.length} puntos)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
 
      {/* Modal reagendar */}
      {showReagendar && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">↺ Reagendar puntos omitidos</span>
              <button className="modal-close" onClick={() => setShowReagendar(false)}>×</button>
            </div>
            <form onSubmit={reagendar}>
              <div className="form-group">
                <label className="form-label">Ciclo origen (con puntos omitidos)</label>
                <select className="form-input" value={reagendarForm.ciclo_origen_id}
                  onChange={e => setReagendar(f => ({ ...f, ciclo_origen_id: e.target.value }))} required>
                  <option value="">Seleccionar...</option>
                  {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre} - {c.fecha}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ciclo destino (siguiente ciclo activo)</label>
                <select className="form-input" value={reagendarForm.nuevo_ciclo_id}
                  onChange={e => setReagendar(f => ({ ...f, nuevo_ciclo_id: e.target.value }))} required>
                  <option value="">Seleccionar...</option>
                  {ciclos.filter(c => ['planificado', 'en_curso'].includes(c.estado) && c.fecha >= today()).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} - {c.fecha}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReagendar(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">↺ Reagendar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}