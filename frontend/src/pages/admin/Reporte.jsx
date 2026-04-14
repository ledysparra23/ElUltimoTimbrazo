import { useState, useEffect } from 'react';
import axios from 'axios';

function AdminReporte() {
  const [ciclos, setCiclos] = useState([]);
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/ciclos').then(r => setCiclos(r.data));
  }, []);

  const cargarReporte = async () => {
    if (!selectedCiclo) return;
    setLoading(true);
    try {
      const res = await axios.get(`/rutas/reporte/${selectedCiclo}`);
      setReporte(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  };

  const descargarPDF = () => {
    if (!reporte) return;
    const ciclo = ciclos.find(c => c.id === selectedCiclo);
    const totalPuntos = reporte.rutas?.reduce((a, r) => a + (r.puntos_parada?.length || 0), 0) || 0;
    const totalVisitados = reporte.rutas?.reduce((a, r) => a + (r.puntos_parada?.filter(p => p.estado === 'visitado').length || 0), 0) || 0;
    const totalOmitidos = reporte.rutas?.reduce((a, r) => a + (r.puntos_parada?.filter(p => p.estado === 'omitido').length || 0), 0) || 0;
    const cobertura = totalPuntos > 0 ? Math.round((totalVisitados / totalPuntos) * 100) : 0;

    const rutasRows = (reporte.rutas || []).map(r => {
      const tot = r.puntos_parada?.length || 0;
      const vis = r.puntos_parada?.filter(p => p.estado === 'visitado').length || 0;
      const omi = r.puntos_parada?.filter(p => p.estado === 'omitido').length || 0;
      const pend = r.puntos_parada?.filter(p => p.estado === 'pendiente').length || 0;
      const cob = tot > 0 ? Math.round((vis / tot) * 100) : 0;
      const sc = r.estado === 'completada' ? '#dcfce7;color:#16a34a' : r.estado === 'en_curso' ? '#fef3c7;color:#d97706' : '#dbeafe;color:#2563eb';
      return `<tr>
        <td><strong>${r.operadores?.users?.nombre || '?'} ${r.operadores?.users?.apellido || ''}</strong></td>
        <td style="text-align:center">${tot}</td>
        <td style="text-align:center;color:#16a34a;font-weight:700">${vis}</td>
        <td style="text-align:center;color:#dc2626;font-weight:700">${omi}</td>
        <td style="text-align:center;color:#d97706">${pend}</td>
        <td><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="width:${cob}%;height:100%;background:linear-gradient(90deg,#2563eb,#3b82f6)"></div></div><span style="font-weight:700;color:#1e40af;min-width:36px">${cob}%</span></div></td>
        <td><span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;background:${sc}">${r.estado}</span></td>
      </tr>`;
    }).join('');

    const puntosTablas = (reporte.rutas || []).map(r => {
      const rows = (r.puntos_parada || []).map((p, i) => {
        const sc = p.estado === 'visitado' ? '#dcfce7;color:#16a34a' : p.estado === 'omitido' ? '#fee2e2;color:#dc2626' : '#fef3c7;color:#d97706';
        return `<tr>
          <td style="font-weight:700;color:#2563eb">${i + 1}</td>
          <td>${p.direccion}</td>
          <td>${p.tipo}</td>
          <td>${p.peso_estimado || '—'} kg</td>
          <td><span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;background:${sc}">${p.estado}</span></td>
          <td style="color:#64748b">${p.visitado_en ? new Date(p.visitado_en).toLocaleString('es-CO') : '—'}</td>
        </tr>`;
      }).join('');
      return `<h2>${r.operadores?.users?.nombre || '?'} ${r.operadores?.users?.apellido || ''}</h2>
      <table>
        <thead><tr><th>#</th><th>Dirección</th><th>Tipo</th><th>Peso</th><th>Estado</th><th>Visitado en</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Reporte ${ciclo?.nombre || ''}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a2a4a;font-size:13px}
.header{background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;padding:28px 36px;display:flex;align-items:center;justify-content:space-between}
.logo{width:52px;height:52px;border-radius:50%;background:#fff;padding:4px;object-fit:contain;margin-right:16px}
.title{font-size:22px;font-weight:900;font-style:italic}
.subtitle{font-size:11px;opacity:.8;text-transform:uppercase;letter-spacing:1px}
.body{padding:28px 36px}
.info-box{background:#f0f6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 18px;margin-bottom:24px;display:flex;gap:32px;flex-wrap:wrap}
.info-item label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:3px}
.info-item span{font-size:15px;font-weight:700;color:#1e40af}
.stats{display:flex;gap:14px;margin-bottom:24px}
.stat{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center}
.stat .num{font-size:28px;font-weight:900;color:#1e40af}
.stat .lbl{font-size:11px;color:#64748b;margin-top:3px}
.stat.g .num{color:#16a34a}.stat.r .num{color:#dc2626}.stat.y .num{color:#d97706}
h2{font-size:14px;font-weight:800;color:#1e40af;margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid #bfdbfe}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
th{background:#1e40af;color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
td{padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:12px}
tr:nth-child(even) td{background:#f8fafc}
.footer{padding:16px 36px;background:#f0f6ff;border-top:2px solid #bfdbfe;display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-top:24px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head>
<body>
<div class="header">
  <div style="display:flex;align-items:center">
    <img class="logo" src="${window.location.origin}/logo.png" onerror="this.style.display='none'" alt="Logo">
    <div>
      <div class="title">ElUltimoTimbraso</div>
      <div class="subtitle">Logística Inteligente · Reporte de Ciclo</div>
    </div>
  </div>
  <div style="text-align:right;font-size:12px;opacity:.9">
    <strong style="font-size:15px;display:block">Reporte de Ciclo</strong>
    ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
  </div>
</div>
<div class="body">
  <div class="info-box">
    <div class="info-item"><label>Ciclo</label><span>${ciclo?.nombre || '—'}</span></div>
    <div class="info-item"><label>Fecha</label><span>${ciclo?.fecha || '—'}</span></div>
    <div class="info-item"><label>Estado</label><span>${ciclo?.estado || '—'}</span></div>
    <div class="info-item"><label>Total rutas</label><span>${reporte.rutas?.length || 0}</span></div>
  </div>
  <div class="stats">
    <div class="stat"><div class="num">${reporte.rutas?.length || 0}</div><div class="lbl">Rutas</div></div>
    <div class="stat"><div class="num">${totalPuntos}</div><div class="lbl">Total puntos</div></div>
    <div class="stat g"><div class="num">${totalVisitados}</div><div class="lbl">Visitados</div></div>
    <div class="stat r"><div class="num">${totalOmitidos}</div><div class="lbl">Omitidos</div></div>
    <div class="stat y"><div class="num">${cobertura}%</div><div class="lbl">Cobertura</div></div>
  </div>
  <h2>Resumen por operador</h2>
  <table>
    <thead><tr><th>Operador</th><th>Puntos</th><th>Visitados</th><th>Omitidos</th><th>Pendientes</th><th>Cobertura</th><th>Estado</th></tr></thead>
    <tbody>${rutasRows}</tbody>
  </table>
  ${puntosTablas}
</div>
<div class="footer">
  <div><strong>ElUltimoTimbraso</strong> — Sistema de Gestión Logística<br><em style="color:#94a3b8">"Cuando comieres el trabajo de tus manos, Bienaventurado serás."</em></div>
  <div style="text-align:right">Generado automáticamente<br>${new Date().toLocaleString('es-CO')}</div>
</div>
<script>window.onload=()=>window.print()</script>
</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  const totalPuntos = reporte?.rutas?.reduce((a, r) => a + (r.puntos_parada?.length || 0), 0) || 0;
  const totalVisitados = reporte?.rutas?.reduce((a, r) => a + (r.puntos_parada?.filter(p => p.estado === 'visitado').length || 0), 0) || 0;
  const totalOmitidos = reporte?.rutas?.reduce((a, r) => a + (r.puntos_parada?.filter(p => p.estado === 'omitido').length || 0), 0) || 0;
  const cobertura = totalPuntos > 0 ? Math.round((totalVisitados / totalPuntos) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📊 Reportes</h1>
        {reporte && <button className="btn btn-primary" onClick={descargarPDF}>📄 Descargar PDF</button>}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Seleccionar ciclo</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <select className="form-input" style={{ flex: 1 }} value={selectedCiclo}
            onChange={e => { setSelectedCiclo(e.target.value); setReporte(null); }}>
            <option value="">— Selecciona un ciclo —</option>
            {ciclos.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} · {c.fecha} · {c.estado}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={cargarReporte} disabled={!selectedCiclo || loading}>
            {loading ? 'Cargando...' : '📊 Ver reporte'}
          </button>
        </div>
      </div>

      {reporte && (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 16 }}>
            {[
              { v: reporte.rutas?.length || 0, l: 'Rutas', c: '' },
              { v: totalPuntos, l: 'Total puntos', c: '' },
              { v: totalVisitados, l: 'Visitados', c: 'var(--green)' },
              { v: totalOmitidos, l: 'Omitidos', c: 'var(--red)' },
              { v: `${cobertura}%`, l: 'Cobertura', c: '#2563eb' },
            ].map(s => (
              <div key={s.l} className="stat-card">
                <div className="stat-value" style={s.c ? { color: s.c } : {}}>{s.v}</div>
                <div className="stat-label">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">Detalle por operador</div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Operador</th><th>Puntos</th><th>Visitados</th><th>Omitidos</th><th>Cobertura</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {(reporte.rutas || []).map(r => {
                    const tot = r.puntos_parada?.length || 0;
                    const vis = r.puntos_parada?.filter(p => p.estado === 'visitado').length || 0;
                    const omi = r.puntos_parada?.filter(p => p.estado === 'omitido').length || 0;
                    const cob = tot > 0 ? Math.round((vis / tot) * 100) : 0;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.operadores?.users?.nombre} {r.operadores?.users?.apellido}</td>
                        <td style={{ textAlign: 'center' }}>{tot}</td>
                        <td style={{ textAlign: 'center', color: 'var(--green)', fontWeight: 700 }}>{vis}</td>
                        <td style={{ textAlign: 'center', color: 'var(--red)', fontWeight: 700 }}>{omi}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${cob}%`, height: '100%', background: 'linear-gradient(90deg,#2563eb,#3b82f6)' }} />
                            </div>
                            <span style={{ fontWeight: 700, color: '#2563eb', minWidth: 36 }}>{cob}%</span>
                          </div>
                        </td>
                        <td><span className={`badge ${r.estado === 'completada' ? 'badge-green' : r.estado === 'en_curso' ? 'badge-yellow' : 'badge-gray'}`}>{r.estado}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button className="btn btn-primary" style={{ padding: '12px 32px' }} onClick={descargarPDF}>
              📄 Descargar reporte en PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminReporte;
export { AdminReporte };
