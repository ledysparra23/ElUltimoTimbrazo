import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const LOGO = '/logo.png';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', telefono: '', direccion: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/auth/register', { ...form, rol: 'cliente' });
      const { token } = res.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      navigate('/cliente');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb',
    borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
    background: '#f9fafb', color: '#111', transition: 'border-color .15s',
  };
  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 700, color: '#374151',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f2b7a 0%, #1d4ed8 50%, #3b82f6 100%)',
      display: 'flex',
      alignItems: 'stretch',
    }}>
      {/* Left branding */}
      <div className="auth-split-left" style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 56px', color: '#fff', minWidth: 0, position: 'relative', overflow: 'hidden',
      }}>
        <style>{`
          @keyframes truckDriveR{0%{transform:translateX(-120%)} 35%{transform:translateX(0)} 65%{transform:translateX(0)} 100%{transform:translateX(120%)}}
          @keyframes spinWheelR{from{transform:rotate(0deg)} to{transform:rotate(360deg)}}
          @keyframes neonPulseR{0%,100%{filter:drop-shadow(0 0 6px #38bdf8) drop-shadow(0 0 14px #0ea5e9) drop-shadow(0 0 30px #0284c7)} 50%{filter:drop-shadow(0 0 10px #7dd3fc) drop-shadow(0 0 22px #38bdf8) drop-shadow(0 0 50px #0ea5e9)}}
          @keyframes roadScrollR{from{stroke-dashoffset:0} to{stroke-dashoffset:-60}}
          @keyframes floatDotR{0%{transform:translateY(0);opacity:0} 20%{opacity:0.4} 80%{opacity:0.2} 100%{transform:translateY(-80px);opacity:0}}
          .ts-r{animation:truckDriveR 5s cubic-bezier(0.4,0,0.2,1) infinite}
          .tn-r{animation:neonPulseR 2s ease-in-out infinite}
          .rl-r{animation:roadScrollR 0.6s linear infinite}
          .wl-r{transform-origin:40px 88px;animation:spinWheelR 0.8s linear infinite}
          .wr-r{transform-origin:155px 88px;animation:spinWheelR 0.8s linear infinite}
          @keyframes boxFallR1{0%{transform:translateY(-120px) rotate(0deg);opacity:0} 10%{opacity:1} 100%{transform:translateY(110vh) rotate(360deg);opacity:0.15}}
          @keyframes boxFallR2{0%{transform:translateY(-120px) rotate(0deg);opacity:0} 10%{opacity:0.8} 100%{transform:translateY(110vh) rotate(-270deg);opacity:0.1}}
          @keyframes boxFallR3{0%{transform:translateY(-120px) rotate(45deg);opacity:0} 10%{opacity:0.9} 100%{transform:translateY(110vh) rotate(180deg);opacity:0.1}}
          @keyframes boxGlowR{0%,100%{box-shadow:0 0 6px #38bdf8,0 0 12px #0ea5e9,inset 0 0 8px rgba(56,189,248,0.3)} 50%{box-shadow:0 0 12px #7dd3fc,0 0 24px #38bdf8,0 0 40px #0ea5e9,inset 0 0 14px rgba(56,189,248,0.5)}}
        `}</style>

        {[{x:'15%',y:'18%',d:'3.5s',dd:'0.2s'},{x:'78%',y:'12%',d:'4s',dd:'1.2s'},{x:'30%',y:'70%',d:'5s',dd:'0.7s'},{x:'65%',y:'55%',d:'3s',dd:'1.8s'}].map((dot,i)=>(
          <div key={i} style={{position:'absolute',left:dot.x,top:dot.y,width:4,height:4,borderRadius:'50%',background:'#38bdf8',animation:`floatDotR ${dot.d} ease-in-out infinite ${dot.dd}`,pointerEvents:'none',boxShadow:'0 0 6px #38bdf8,0 0 12px #0ea5e9'}}/>
        ))}

        {/* Falling neon boxes */}
        {[
          {left:'6%',  size:26, delay:'0.3s', dur:'8s',   anim:'boxFallR1'},
          {left:'20%', size:16, delay:'1.8s', dur:'10s',  anim:'boxFallR2'},
          {left:'42%', size:32, delay:'0.6s', dur:'12s',  anim:'boxFallR3'},
          {left:'60%', size:20, delay:'2.5s', dur:'9s',   anim:'boxFallR1'},
          {left:'78%', size:14, delay:'1.1s', dur:'7.5s', anim:'boxFallR2'},
          {left:'88%', size:28, delay:'3.2s', dur:'11s',  anim:'boxFallR3'},
          {left:'33%', size:18, delay:'4.1s', dur:'9.5s', anim:'boxFallR1'},
        ].map((b,i)=>(
          <div key={`box-${i}`} style={{
            position:'absolute', left:b.left, top:'-80px',
            width:b.size, height:b.size,
            border:'2px solid #38bdf8', borderRadius:4,
            background:'rgba(56,189,248,0.07)',
            animation:`${b.anim} ${b.dur} linear infinite ${b.delay}, boxGlowR 2s ease-in-out infinite ${b.delay}`,
            pointerEvents:'none', zIndex:0,
          }}>
            <svg width="100%" height="100%" viewBox="0 0 20 20" style={{position:'absolute',inset:0,opacity:0.5}}>
              <line x1="10" y1="0" x2="10" y2="20" stroke="#38bdf8" strokeWidth="1"/>
              <line x1="0" y1="10" x2="20" y2="10" stroke="#38bdf8" strokeWidth="1"/>
            </svg>
          </div>
        ))}

        <div style={{position:'absolute',bottom:'16%',left:0,right:0,pointerEvents:'none',userSelect:'none'}}>
          <svg width="100%" height="28" viewBox="0 0 500 28" preserveAspectRatio="none" style={{display:'block',marginBottom:-2}}>
            <rect x="0" y="10" width="500" height="18" fill="rgba(255,255,255,0.04)" rx="2"/>
            <line x1="0" y1="19" x2="500" y2="19" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.5" strokeDasharray="30 30" className="rl-r" style={{filter:'drop-shadow(0 0 4px #38bdf8)'}}/>
          </svg>
          <div className="ts-r" style={{position:'relative',height:100}}>
            <svg className="tn-r" width="220" height="100" viewBox="0 0 220 100" style={{position:'absolute',left:'18%',top:0}}>
              <g fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="10" y="20" width="120" height="62" rx="3" fill="rgba(56,189,248,0.06)" style={{filter:'drop-shadow(0 0 5px #38bdf8)'}}/>
                <line x1="70" y1="20" x2="70" y2="82" strokeWidth="1.5" strokeOpacity="0.5"/>
                <line x1="10" y1="51" x2="130" y2="51" strokeWidth="1.5" strokeOpacity="0.4"/>
                <path d="M130 82 L130 35 Q130 20 145 20 L175 20 Q190 20 195 30 L208 55 L208 82 Z" fill="rgba(56,189,248,0.08)" style={{filter:'drop-shadow(0 0 5px #38bdf8)'}}/>
                <path d="M145 22 L148 42 L192 42 L188 22 Z" fill="rgba(56,189,248,0.15)" strokeWidth="1.5"/>
                <ellipse cx="206" cy="65" rx="5" ry="5" fill="#38bdf8" fillOpacity="0.9" style={{filter:'drop-shadow(0 0 8px #38bdf8) drop-shadow(0 0 20px #0ea5e9)'}}/>
                <path d="M211 62 L230 54 M211 65 L232 65 M211 68 L230 76" strokeWidth="1" strokeOpacity="0.4" style={{filter:'blur(1px)'}}/>
                <rect x="8" y="58" width="4" height="12" rx="2" fill="#f87171" fillOpacity="0.8" style={{filter:'drop-shadow(0 0 6px #f87171)'}}/>
                <line x1="10" y1="82" x2="208" y2="82"/>
                <line x1="40" y1="82" x2="40" y2="88" strokeWidth="2"/>
                <line x1="155" y1="82" x2="155" y2="88" strokeWidth="2"/>
                <path d="M140 22 L140 8 L145 8" strokeWidth="2" strokeOpacity="0.7"/>
              </g>
              <g className="wl-r">
                <circle cx="40" cy="88" r="12" fill="rgba(56,189,248,0.08)" stroke="#38bdf8" strokeWidth="2.5" style={{filter:'drop-shadow(0 0 6px #38bdf8)'}}/>
                <circle cx="40" cy="88" r="4" fill="#38bdf8" fillOpacity="0.6"/>
                <line x1="40" y1="76" x2="40" y2="100" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5"/>
                <line x1="28" y1="88" x2="52" y2="88" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5"/>
              </g>
              <g className="wr-r">
                <circle cx="155" cy="88" r="12" fill="rgba(56,189,248,0.08)" stroke="#38bdf8" strokeWidth="2.5" style={{filter:'drop-shadow(0 0 6px #38bdf8)'}}/>
                <circle cx="155" cy="88" r="4" fill="#38bdf8" fillOpacity="0.6"/>
                <line x1="155" y1="76" x2="155" y2="100" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5"/>
                <line x1="143" y1="88" x2="167" y2="88" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5"/>
              </g>
            </svg>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:48,position:'relative',zIndex:1}}>
          <img src={LOGO} alt="logo" style={{width:52,height:52,objectFit:'contain'}} />
          <span style={{fontStyle:'italic',fontWeight:900,fontSize:26,letterSpacing:'-0.5px',color:'#fff'}}>ElUltimoTimbraso</span>
        </div>
        <h1 style={{fontSize:44,fontWeight:900,lineHeight:1.1,margin:'0 0 20px',letterSpacing:'-1px',position:'relative',zIndex:1}}>
          Únete a<br /><span style={{color:'#93c5fd'}}>nuestra red.</span>
        </h1>
        <p style={{fontSize:15,color:'rgba(255,255,255,0.72)',lineHeight:1.7,maxWidth:380,marginBottom:36,position:'relative',zIndex:1}}>
          Crea tu cuenta y empieza a gestionar tus envíos de forma rápida, segura e inteligente.
        </p>
        <blockquote style={{borderLeft:'3px solid rgba(255,255,255,0.35)',paddingLeft:20,fontStyle:'italic',color:'rgba(255,255,255,0.6)',fontSize:14,lineHeight:1.7,margin:0,position:'relative',zIndex:1}}>
          "Cuando comieres el trabajo de tus manos,<br />Bienaventurado serás, y te irá bien."
        </blockquote>
      </div>

      {/* Right: Register form */}
      <div className="auth-split-right" style={{
        width: 460,
        flexShrink: 0,
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 44px',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>
              NUEVA CUENTA
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
              Crear cuenta
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>
              Completa tus datos para registrarte
            </p>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20, borderLeft: '3px solid #dc2626', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nombre</label>
                <input style={inputStyle} value={form.nombre} onChange={e => set('nombre', e.target.value)} required
                  onFocus={e => e.target.style.borderColor='#2563eb'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
              </div>
              <div>
                <label style={labelStyle}>Apellido</label>
                <input style={inputStyle} value={form.apellido} onChange={e => set('apellido', e.target.value)} required
                  onFocus={e => e.target.style.borderColor='#2563eb'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Correo electrónico</label>
              <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} required
                placeholder="tu@correo.com"
                onFocus={e => e.target.style.borderColor='#2563eb'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
            </div>

            <div>
              <label style={labelStyle}>Contraseña</label>
              <input style={inputStyle} type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6}
                placeholder="Mínimo 6 caracteres"
                onFocus={e => e.target.style.borderColor='#2563eb'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input style={inputStyle} value={form.telefono} onChange={e => set('telefono', e.target.value)}
                  placeholder="+57 300..."
                  onFocus={e => e.target.style.borderColor='#2563eb'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
              </div>
              <div>
                <label style={labelStyle}>Ciudad</label>
                <input style={inputStyle} value={form.direccion} onChange={e => set('direccion', e.target.value)}
                  placeholder="Ibagué"
                  onFocus={e => e.target.style.borderColor='#2563eb'} onBlur={e => e.target.style.borderColor='#e5e7eb'} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#93c5fd' : '#2563eb',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', marginTop: 4,
              }}
            >
              {loading ? 'Creando cuenta...' : 'Crear mi cuenta →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#94a3b8' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
