import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Logo from '../../components/Logo';

function VehicleSimMap() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const vehiclesRef = useRef([]);

  const VEHICLE_TYPES = [
    { type: 'car',   emoji: '🚗', speed: 1.8, color: '#1d5bdb' },
    { type: 'moto',  emoji: '🏍️', speed: 2.8, color: '#16a34a' },
    { type: 'truck', emoji: '🚚', speed: 1.1, color: '#d97706' },
    { type: 'van',   emoji: '🚐', speed: 1.5, color: '#7c3aed' },
  ];

  const ROADS = [
    { x1: 0, y1: 20, x2: 100, y2: 20 },
    { x1: 0, y1: 40, x2: 100, y2: 40 },
    { x1: 0, y1: 60, x2: 100, y2: 60 },
    { x1: 0, y1: 80, x2: 100, y2: 80 },
    { x1: 15, y1: 0, x2: 15, y2: 100 },
    { x1: 35, y1: 0, x2: 35, y2: 100 },
    { x1: 55, y1: 0, x2: 55, y2: 100 },
    { x1: 75, y1: 0, x2: 75, y2: 100 },
  ];

  const ROUTES = [
    [{ x: 0, y: 20 }, { x: 15, y: 20 }, { x: 15, y: 40 }, { x: 35, y: 40 }, { x: 35, y: 60 }, { x: 55, y: 60 }, { x: 55, y: 80 }, { x: 100, y: 80 }],
    [{ x: 0, y: 60 }, { x: 35, y: 60 }, { x: 35, y: 20 }, { x: 75, y: 20 }, { x: 75, y: 60 }, { x: 100, y: 60 }],
    [{ x: 15, y: 0 }, { x: 15, y: 40 }, { x: 55, y: 40 }, { x: 55, y: 80 }, { x: 75, y: 80 }, { x: 75, y: 100 }],
    [{ x: 0, y: 40 }, { x: 75, y: 40 }, { x: 75, y: 80 }, { x: 100, y: 80 }],
    [{ x: 35, y: 0 }, { x: 35, y: 20 }, { x: 55, y: 20 }, { x: 55, y: 60 }, { x: 100, y: 60 }],
    [{ x: 0, y: 80 }, { x: 15, y: 80 }, { x: 15, y: 60 }, { x: 55, y: 60 }, { x: 55, y: 40 }, { x: 75, y: 40 }, { x: 75, y: 0 }],
    [{ x: 0, y: 20 }, { x: 55, y: 20 }, { x: 55, y: 40 }, { x: 35, y: 40 }, { x: 35, y: 80 }, { x: 100, y: 80 }],
    [{ x: 75, y: 0 }, { x: 75, y: 40 }, { x: 35, y: 40 }, { x: 35, y: 60 }, { x: 15, y: 60 }, { x: 15, y: 100 }],
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const px = (p) => (p / 100) * canvas.width;
    const py = (p) => (p / 100) * canvas.height;

    vehiclesRef.current = Array.from({ length: 24 }, (_, i) => {
      const vType = VEHICLE_TYPES[i % VEHICLE_TYPES.length];
      const route = ROUTES[i % ROUTES.length];
      const startPct = Math.random();
      const segIdx = Math.floor(startPct * (route.length - 1));
      return {
        ...vType,
        route,
        segIdx: Math.min(segIdx, route.length - 2),
        segProgress: startPct,
        speed: vType.speed * (0.6 + Math.random() * 0.8),
        reverse: i % 2 === 0,
        x: 0, y: 0,
        trail: [],
        delivering: false,
        deliveryTimer: 0,
      };
    });

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Map background
      ctx.fillStyle = '#d6e4f5';
      ctx.fillRect(0, 0, W, H);

      // City blocks
      for (let bx = 0; bx < 5; bx++) {
        for (let by = 0; by < 4; by++) {
          ctx.fillStyle = by % 2 === 0 ? '#c2d5ec' : '#cddcf0';
          ctx.fillRect(px(bx * 20 + 15) + 1, py(by * 20 + 20) + 1, px(19) - 2, py(19) - 2);
        }
      }

      // Road shadows
      ctx.strokeStyle = '#a8c0dc';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ROADS.forEach(r => {
        ctx.beginPath();
        ctx.moveTo(px(r.x1), py(r.y1));
        ctx.lineTo(px(r.x2), py(r.y2));
        ctx.stroke();
      });

      // Road surface
      ctx.strokeStyle = '#b8cde0';
      ctx.lineWidth = 8;
      ROADS.forEach(r => {
        ctx.beginPath();
        ctx.moveTo(px(r.x1), py(r.y1));
        ctx.lineTo(px(r.x2), py(r.y2));
        ctx.stroke();
      });

      // Center dashes
      ctx.strokeStyle = '#e8f0fa';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 8]);
      ROADS.forEach(r => {
        ctx.beginPath();
        ctx.moveTo(px(r.x1), py(r.y1));
        ctx.lineTo(px(r.x2), py(r.y2));
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Intersections
      [[15,20],[15,40],[15,60],[15,80],[35,20],[35,40],[35,60],[35,80],
       [55,20],[55,40],[55,60],[55,80],[75,20],[75,40],[75,60],[75,80]].forEach(([ix,iy]) => {
        ctx.fillStyle = '#9ab8d4';
        ctx.beginPath();
        ctx.arc(px(ix), py(iy), 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update and draw vehicles
      vehiclesRef.current.forEach(v => {
        const route = v.route;
        const len = route.length;
        let si = v.reverse ? (len - 2 - v.segIdx) : v.segIdx;
        si = Math.max(0, Math.min(si, len - 2));
        const p1 = route[si];
        const p2 = route[si + 1];
        if (!p1 || !p2) return;

        const x = px(p1.x + (p2.x - p1.x) * v.segProgress);
        const y = py(p1.y + (p2.y - p1.y) * v.segProgress);
        v.x = x; v.y = y;

        const angle = Math.atan2(py(p2.y) - py(p1.y), px(p2.x) - px(p1.x));

        // Trail
        v.trail.push({ x, y });
        if (v.trail.length > 10) v.trail.shift();

        if (v.trail.length > 2) {
          ctx.beginPath();
          ctx.moveTo(v.trail[0].x, v.trail[0].y);
          v.trail.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.strokeStyle = v.color + '35';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Vehicle body
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.shadowColor = v.color + '50';
        ctx.shadowBlur = 8;
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.roundRect(-12, -9, 24, 18, 5);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        // Emoji
        ctx.save();
        ctx.translate(x, y);
        ctx.font = '13px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(v.emoji, 0, 1);
        ctx.restore();

        // Delivery popup
        if (v.delivering) {
          ctx.save();
          ctx.translate(x, y - 22);
          ctx.fillStyle = 'rgba(22,163,74,0.9)';
          ctx.beginPath();
          ctx.roundRect(-18, -10, 36, 20, 4);
          ctx.fill();
          ctx.font = '10px Inter, sans-serif';
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓ Entregado', 0, 0);
          ctx.restore();
          v.deliveryTimer--;
          if (v.deliveryTimer <= 0) v.delivering = false;
        }

        // Advance
        v.segProgress += v.speed * 0.007;
        if (v.segProgress >= 1) {
          v.segProgress = 0;
          v.segIdx++;
          if (v.segIdx >= route.length - 1) {
            v.segIdx = 0;
            v.reverse = !v.reverse;
            if (Math.random() > 0.65) {
              v.delivering = true;
              v.deliveryTimer = 80;
            }
          }
        }
      });

      // Legend overlay top-left
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(10, 10, 210, 54, 8);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      const cars = vehiclesRef.current.filter(v => v.type === 'car').length;
      const motos = vehiclesRef.current.filter(v => v.type === 'moto').length;
      const trucks = vehiclesRef.current.filter(v => v.type === 'truck').length;
      const vans = vehiclesRef.current.filter(v => v.type === 'van').length;
      ctx.fillStyle = '#1e40af';
      ctx.fillText(`🚗 ${cars} Autos   🏍️ ${motos} Motos`, 18, 29);
      ctx.fillText(`🚚 ${trucks} Camiones   🚐 ${vans} Vans`, 18, 47);

      // Status overlay top-right
      const delivering = vehiclesRef.current.filter(v => v.delivering).length;
      const enRuta = vehiclesRef.current.length - delivering;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(W - 155, 10, 145, 54, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1d5bdb';
      ctx.fillText(`● ${enRuta} en movimiento`, W - 16, 29);
      ctx.fillStyle = '#16a34a';
      ctx.fillText(`📦 ${delivering} entregando`, W - 16, 47);

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <div style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: 'clamp(200px, 40vw, 340px)', display: 'block' }}
      />
      <div style={{
        position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(30,64,175,0.88)', color: '#fff',
        padding: '5px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        whiteSpace: 'nowrap', letterSpacing: '0.3px',
      }}>
        🔴 SIMULACIÓN EN VIVO — ElUltimoTimbraso Fleet
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/admin/operadores'),
      axios.get('/api/admin/clientes'),
      axios.get('/api/ciclos'),
    ]).then(([ops, clts, ciclosRes]) => {
      setStats({
        operadores: ops.data.length,
        clientes: clts.data.length,
        operadoresActivos: ops.data.filter(o => o.estado === 'en_ruta').length,
      });
      setCiclos(ciclosRes.data.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  const estadoBadge = (e) => {
    const map = { planificado: 'badge-blue', en_curso: 'badge-yellow', completado: 'badge-green', cancelado: 'badge-red' };
    return map[e] || 'badge-gray';
  };

  if (loading) return <div className="loading">Cargando dashboard...</div>;

  return (
    <div>
      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 28, position: 'relative', overflow: 'hidden',
      }}>
        {/* Wave overlay */}
        <svg style={{ position: 'absolute', bottom: 0, right: 0, height: '100%', opacity: 0.08 }} viewBox="0 0 400 200" preserveAspectRatio="xMaxYMax slice">
          <path fill="#fff" d="M0,100 C100,60 200,140 300,80 C350,50 380,90 400,70 L400,200 L0,200Z"/>
        </svg>

        {/* Logo */}
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)',
        }}>
          <img src="/logo.png" alt="logo" style={{ width: 76, height: 76, objectFit: 'contain' }} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, color: '#fff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>
            PANEL DE ADMINISTRACIÓN
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: '0 0 6px', fontStyle: 'italic', letterSpacing: '-0.3px' }}>
            ElUltimoTimbraso
          </h1>
          <blockquote style={{ margin: 0, fontStyle: 'italic', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
            "Cuando comieres el trabajo de tus manos, Bienaventurado serás, y te irá bien."
          </blockquote>
        </div>

        {/* Date */}
        <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.75)', fontSize: 13, flexShrink: 0 }}>
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.operadores}</div>
          <div className="stat-label">Operadores</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>{stats?.operadoresActivos}</div>
          <div className="stat-label">En ruta ahora</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#7c3aed' }}>{stats?.clientes}</div>
          <div className="stat-label">Clientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>{ciclos.filter(c => c.estado === 'en_curso').length}</div>
          <div className="stat-label">Ciclos activos</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Simulación de Flota en Tiempo Real</div>
        <VehicleSimMap />
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[['#1d5bdb','Autos'],['#16a34a','Motos'],['#d97706','Camiones'],['#7c3aed','Vans']].map(([c,l]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c, display: 'inline-block' }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <div className="card">
          <div className="card-title">Ciclos recientes</div>
          {ciclos.length === 0 ? (
            <div className="empty">No hay ciclos. <a href="/admin/ciclos">Crear ciclo</a></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Nombre</th><th>Fecha</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {ciclos.map(c => (
                    <tr key={c.id}>
                      <td>{c.nombre}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.fecha}</td>
                      <td><span className={`badge ${estadoBadge(c.estado)}`}>{c.estado}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Accesos rápidos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="/admin/mapa" style={{ display: 'block' }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>🗺️ Mapa GPS en vivo</button>
            </a>
            <a href="/admin/ciclos" style={{ display: 'block' }}>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>🔄 Gestionar ciclos</button>
            </a>
            <a href="/admin/rutas" style={{ display: 'block' }}>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>🚚 Crear ruta</button>
            </a>
            <a href="/admin/reporte" style={{ display: 'block' }}>
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>📋 Ver reportes</button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
