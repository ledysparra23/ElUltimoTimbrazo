import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LOGO = '/logo.png';

export default function LoginPage() {
  const { loginStep1, loginStep2, loginDirect, resendOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const redirect = (user) => {
    if (user.rol === 'admin') navigate('/admin');
    else if (user.rol === 'operador') navigate('/operador');
    else navigate('/cliente');
  };

  // Read OTP preference from localStorage (set in Settings page)
  const otpEnabled = localStorage.getItem('otp_enabled') !== 'false';

  const handleStep1 = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!otpEnabled) {
        const user = await loginDirect(email, password);
        redirect(user);
      } else {
        const data = await loginStep1(email, password);
        if (data.requiresOtp) {
          setStep(2);
          setResendTimer(60);
          if (data.devOtp) setDevOtp(data.devOtp);
          setTimeout(() => otpRefs.current[0]?.focus(), 120);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKey = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === 'Enter') handleStep2();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      setTimeout(() => otpRefs.current[5]?.focus(), 50);
    }
  };

  const handleStep2 = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Ingresa los 6 dígitos del código'); return; }
    setError('');
    setLoading(true);
    try {
      const user = await loginStep2(email, code);
      redirect(user);
    } catch (err) {
      setError(err.response?.data?.error || 'Código incorrecto');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      const data = await resendOtp(email);
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      setError('');
      if (data.devOtp) setDevOtp(data.devOtp);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch { setError('Error al reenviar código'); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f2b7a 0%, #1d4ed8 50%, #3b82f6 100%)',
      display: 'flex',
      alignItems: 'stretch',
    }}>
      {/* Left panel — branding with lightning animations */}
      <div className="auth-split-left" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 56px',
        color: '#fff',
        minWidth: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* ── Keyframes ── */}
        <style>{`
          @keyframes truckDrive {
            0%   { transform: translateX(-120%); }
            35%  { transform: translateX(0); }
            65%  { transform: translateX(0); }
            100% { transform: translateX(120%); }
          }
          @keyframes spinWheel {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes neonPulse {
            0%,100% { filter: drop-shadow(0 0 6px #38bdf8) drop-shadow(0 0 14px #0ea5e9) drop-shadow(0 0 30px #0284c7); }
            50%     { filter: drop-shadow(0 0 10px #7dd3fc) drop-shadow(0 0 22px #38bdf8) drop-shadow(0 0 50px #0ea5e9); }
          }
          @keyframes roadScroll {
            from { stroke-dashoffset: 0; }
            to   { stroke-dashoffset: -60; }
          }
          @keyframes speedLine {
            0%   { transform: translateX(0); opacity: 0.6; }
            100% { transform: translateX(-200px); opacity: 0; }
          }
          @keyframes floatDot {
            0%   { transform: translateY(0) translateX(0); opacity: 0; }
            20%  { opacity: 0.4; }
            80%  { opacity: 0.2; }
            100% { transform: translateY(-80px) translateX(20px); opacity: 0; }
          }
          /* Falling neon boxes */
          @keyframes boxFall1 {
            0%   { transform: translateY(-120px) rotate(0deg);   opacity: 0; }
            10%  { opacity: 1; }
            100% { transform: translateY(110vh) rotate(360deg);  opacity: 0.15; }
          }
          @keyframes boxFall2 {
            0%   { transform: translateY(-120px) rotate(0deg);   opacity: 0; }
            10%  { opacity: 0.8; }
            100% { transform: translateY(110vh) rotate(-270deg); opacity: 0.1; }
          }
          @keyframes boxFall3 {
            0%   { transform: translateY(-120px) rotate(45deg);  opacity: 0; }
            10%  { opacity: 0.9; }
            100% { transform: translateY(110vh) rotate(180deg);  opacity: 0.1; }
          }
          @keyframes boxGlow {
            0%,100% { box-shadow: 0 0 6px #38bdf8, 0 0 12px #0ea5e9, inset 0 0 8px rgba(56,189,248,0.3); }
            50%     { box-shadow: 0 0 12px #7dd3fc, 0 0 24px #38bdf8, 0 0 40px #0ea5e9, inset 0 0 14px rgba(56,189,248,0.5); }
          }
          .truck-scene { animation: truckDrive 5s cubic-bezier(0.4,0,0.2,1) infinite; }
          .truck-neon  { animation: neonPulse 2s ease-in-out infinite; }
          .road-line   { animation: roadScroll 0.6s linear infinite; }
          .wheel-l     { transform-origin: 56px 88px; animation: spinWheel 0.8s linear infinite; }
          .wheel-r     { transform-origin: 148px 88px; animation: spinWheel 0.8s linear infinite; }
        `}</style>

        {/* ── Floating background dots ── */}
        {[
          {x:'10%',y:'20%',d:'3s',dd:'0s'},{x:'80%',y:'15%',d:'4s',dd:'1s'},
          {x:'25%',y:'75%',d:'5s',dd:'0.5s'},{x:'70%',y:'60%',d:'3.5s',dd:'2s'},
          {x:'45%',y:'35%',d:'4.5s',dd:'1.5s'},{x:'90%',y:'80%',d:'3s',dd:'0.8s'},
        ].map((dot,i) => (
          <div key={i} style={{
            position:'absolute', left:dot.x, top:dot.y, width:4, height:4,
            borderRadius:'50%', background:'#38bdf8',
            animation:`floatDot ${dot.d} ease-in-out infinite ${dot.dd}`,
            pointerEvents:'none',
            boxShadow:'0 0 6px #38bdf8, 0 0 12px #0ea5e9',
          }}/>
        ))}

        {/* ── Falling neon boxes ── */}
        {[
          { left:'8%',   size:28, delay:'0s',   dur:'7s',  anim:'boxFall1', rot:15  },
          { left:'22%',  size:18, delay:'1.2s', dur:'9s',  anim:'boxFall2', rot:-20 },
          { left:'38%',  size:34, delay:'0.4s', dur:'11s', anim:'boxFall3', rot:30  },
          { left:'55%',  size:22, delay:'2.1s', dur:'8s',  anim:'boxFall1', rot:-10 },
          { left:'72%',  size:14, delay:'0.8s', dur:'10s', anim:'boxFall2', rot:45  },
          { left:'85%',  size:30, delay:'3s',   dur:'7.5s',anim:'boxFall3', rot:-35 },
          { left:'15%',  size:16, delay:'4s',   dur:'12s', anim:'boxFall1', rot:20  },
          { left:'62%',  size:24, delay:'1.7s', dur:'9.5s',anim:'boxFall2', rot:-25 },
          { left:'91%',  size:12, delay:'2.8s', dur:'8.5s',anim:'boxFall3', rot:55  },
        ].map((b, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: b.left,
            top: '-80px',
            width: b.size,
            height: b.size,
            border: '2px solid #38bdf8',
            borderRadius: 4,
            background: 'rgba(56,189,248,0.07)',
            animation: `${b.anim} ${b.dur} linear infinite ${b.delay}, boxGlow 2s ease-in-out infinite ${b.delay}`,
            pointerEvents: 'none',
            zIndex: 0,
          }}>
            {/* Inner cross detail */}
            <svg width="100%" height="100%" viewBox="0 0 20 20" style={{ position:'absolute', inset:0, opacity:0.5 }}>
              <line x1="10" y1="0" x2="10" y2="20" stroke="#38bdf8" strokeWidth="1"/>
              <line x1="0" y1="10" x2="20" y2="10" stroke="#38bdf8" strokeWidth="1"/>
            </svg>
          </div>
        ))}

        {/* ── Truck + Road scene ── */}
        <div style={{
          position:'absolute', bottom:'18%', left:0, right:0,
          pointerEvents:'none', userSelect:'none',
        }}>
          {/* Road */}
          <svg width="100%" height="28" viewBox="0 0 500 28" preserveAspectRatio="none" style={{ display:'block', marginBottom:-2 }}>
            {/* Road surface */}
            <rect x="0" y="10" width="500" height="18" fill="rgba(255,255,255,0.04)" rx="2"/>
            {/* Center dashes */}
            <line x1="0" y1="19" x2="500" y2="19"
              stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.5"
              strokeDasharray="30 30"
              className="road-line"
              style={{ filter:'drop-shadow(0 0 4px #38bdf8)' }}
            />
          </svg>

          {/* Truck container — drives across */}
          <div className="truck-scene" style={{ position:'relative', height:100 }}>
            {/* Speed lines behind truck */}
            {[0,14,28,42].map(y => (
              <div key={y} style={{
                position:'absolute', left:'12%', top: 30+y,
                width:60, height:2, borderRadius:2,
                background:'linear-gradient(90deg, transparent, #38bdf8)',
                opacity:0.4,
                animation:`speedLine 0.5s linear infinite ${y*0.07}s`,
                filter:'blur(1px)',
              }}/>
            ))}

            {/* SVG Truck */}
            <svg
              className="truck-neon"
              width="220" height="100"
              viewBox="0 0 220 100"
              style={{ position:'absolute', left:'18%', top:0 }}
            >
              {/* ── TRUCK BODY ── */}
              <g fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">

                {/* Cargo box */}
                <rect x="10" y="20" width="120" height="62" rx="3"
                  stroke="#38bdf8" strokeWidth="2.5"
                  fill="rgba(56,189,248,0.06)"
                  style={{ filter:'drop-shadow(0 0 5px #38bdf8)' }}
                />
                {/* Cargo box door lines */}
                <line x1="70" y1="20" x2="70" y2="82" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5"/>
                <line x1="10" y1="51" x2="130" y2="51" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.4"/>

                {/* Cab */}
                <path d="M130 82 L130 35 Q130 20 145 20 L175 20 Q190 20 195 30 L208 55 L208 82 Z"
                  fill="rgba(56,189,248,0.08)"
                  style={{ filter:'drop-shadow(0 0 5px #38bdf8)' }}
                />

                {/* Windshield */}
                <path d="M145 22 L148 42 L192 42 L188 22 Z"
                  fill="rgba(56,189,248,0.15)"
                  stroke="#38bdf8" strokeWidth="1.5"
                />

                {/* Headlight */}
                <ellipse cx="206" cy="65" rx="5" ry="5"
                  fill="#38bdf8" fillOpacity="0.9"
                  style={{ filter:'drop-shadow(0 0 8px #38bdf8) drop-shadow(0 0 20px #0ea5e9)' }}
                />
                {/* Headlight beam */}
                <path d="M211 62 L230 54 M211 65 L232 65 M211 68 L230 76"
                  stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4"
                  style={{ filter:'blur(1px)' }}
                />

                {/* Tail light */}
                <rect x="8" y="58" width="4" height="12" rx="2"
                  fill="#f87171" fillOpacity="0.8"
                  style={{ filter:'drop-shadow(0 0 6px #f87171)' }}
                />

                {/* Bottom chassis */}
                <line x1="10" y1="82" x2="208" y2="82" stroke="#38bdf8" strokeWidth="2.5"/>

                {/* Axles */}
                <line x1="40" y1="82" x2="40" y2="88" stroke="#38bdf8" strokeWidth="2"/>
                <line x1="155" y1="82" x2="155" y2="88" stroke="#38bdf8" strokeWidth="2"/>

                {/* Exhaust pipe */}
                <path d="M140 22 L140 8 L145 8" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.7"/>
                {/* Smoke puffs */}
                <circle cx="148" cy="5" r="3" fill="none" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4"/>
                <circle cx="154" cy="2" r="2" fill="none" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.25"/>
              </g>

              {/* ── WHEELS ── */}
              {/* Left wheel */}
              <g className="wheel-l">
                <circle cx="40" cy="88" r="12"
                  fill="rgba(56,189,248,0.08)"
                  stroke="#38bdf8" strokeWidth="2.5"
                  style={{ filter:'drop-shadow(0 0 6px #38bdf8)' }}
                />
                <circle cx="40" cy="88" r="4" fill="#38bdf8" fillOpacity="0.6"/>
                <line x1="40" y1="76" x2="40" y2="100" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5"/>
                <line x1="28" y1="88" x2="52" y2="88" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5"/>
                <line x1="31" y1="79" x2="49" y2="97" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.3"/>
                <line x1="49" y1="79" x2="31" y2="97" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.3"/>
              </g>

              {/* Right wheel */}
              <g className="wheel-r">
                <circle cx="155" cy="88" r="12"
                  fill="rgba(56,189,248,0.08)"
                  stroke="#38bdf8" strokeWidth="2.5"
                  style={{ filter:'drop-shadow(0 0 6px #38bdf8)' }}
                />
                <circle cx="155" cy="88" r="4" fill="#38bdf8" fillOpacity="0.6"/>
                <line x1="155" y1="76" x2="155" y2="100" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5"/>
                <line x1="143" y1="88" x2="167" y2="88" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.5"/>
                <line x1="146" y1="79" x2="164" y2="97" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.3"/>
                <line x1="164" y1="79" x2="146" y2="97" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.3"/>
              </g>
            </svg>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:48, position:'relative', zIndex:1 }}>
          <img src={LOGO} alt="logo" style={{ width:52, height:52, objectFit:'contain' }} />
          <span style={{ fontStyle:'italic', fontWeight:900, fontSize:26, letterSpacing:'-0.5px', color:'#fff' }}>
            ElUltimoTimbraso
          </span>
        </div>

        <h1 style={{ fontSize:52, fontWeight:900, lineHeight:1.1, margin:'0 0 20px', letterSpacing:'-1.5px', position:'relative', zIndex:1 }}>
          Entregas<br /><span style={{ color:'#93c5fd' }}>Inteligentes.</span>
        </h1>
        <p style={{ fontSize:16, color:'rgba(255,255,255,0.72)', lineHeight:1.7, maxWidth:400, marginBottom:40, position:'relative', zIndex:1 }}>
          Gestiona rutas, operadores y envíos en tiempo real desde un solo lugar.
        </p>
        <blockquote style={{
          borderLeft:'3px solid rgba(255,255,255,0.35)',
          paddingLeft:20, fontStyle:'italic',
          color:'rgba(255,255,255,0.6)', fontSize:14, lineHeight:1.7, margin:0,
          position:'relative', zIndex:1,
        }}>
          "Cuando comieres el trabajo de tus manos,<br />
          Bienaventurado serás, y te irá bien."
        </blockquote>
      </div>

      {/* Right panel — form */}
      <div className="auth-split-right" style={{
        width: 440,
        flexShrink: 0,
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 44px',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          {step === 1 ? (
            <>
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>
                  ACCESO AL SISTEMA
                </div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
                  Iniciar sesión
                </h2>
                <p style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>
                  Ingresa tus credenciales para continuar
                </p>
              </div>

              {error && (
                <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20, borderLeft: '3px solid #dc2626', fontWeight: 500 }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="tu@correo.com"
                    style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#f9fafb', color: '#111', transition: 'border-color .15s' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#f9fafb', color: '#111', transition: 'border-color .15s' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '13px', background: loading ? '#93c5fd' : '#2563eb',
                    color: '#fff', border: 'none', borderRadius: 10, fontSize: 15,
                    fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background .15s', letterSpacing: '0.2px',
                    fontFamily: 'inherit',
                  }}
                >
                  {loading ? 'Verificando...' : otpEnabled ? 'Continuar →' : 'Ingresar →'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#94a3b8' }}>
                ¿Sin cuenta?{' '}
                <Link to="/register" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                  Registrarse
                </Link>
              </p>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 24, textAlign: 'center' }}>
                <img src={LOGO} alt="logo" style={{ width: 56, height: 56, objectFit: 'contain', marginBottom: 12 }} />
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                  Verificación en 2 pasos
                </h2>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                  Enviamos un código de 6 dígitos a<br />
                  <strong style={{ color: '#2563eb' }}>{email}</strong>
                </p>
              </div>

              {devOtp && (
                <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#713f12', marginBottom: 16, textAlign: 'center' }}>
                  🔧 <strong>Modo dev —</strong> código: <strong style={{ fontFamily: 'monospace', fontSize: 16, color: '#1d4ed8' }}>{devOtp}</strong>
                </div>
              )}

              {error && (
                <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, borderLeft: '3px solid #dc2626' }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '24px 0' }} onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => otpRefs.current[idx] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKey(idx, e)}
                    style={{
                      width: 48, height: 56, textAlign: 'center', fontSize: 24, fontWeight: 800,
                      border: `2px solid ${digit ? '#2563eb' : '#e5e7eb'}`,
                      borderRadius: 10, outline: 'none',
                      background: digit ? '#eff6ff' : '#f9fafb',
                      color: '#1e40af', fontFamily: 'monospace',
                      transition: 'all .15s', cursor: 'text',
                    }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => { if (!digit) e.target.style.borderColor = '#e5e7eb'; }}
                  />
                ))}
              </div>

              <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>
                ⏱ Válido por 5 minutos
              </div>

              <button
                onClick={handleStep2}
                disabled={loading || otp.join('').length < 6}
                style={{
                  width: '100%', padding: '13px',
                  background: otp.join('').length === 6 ? '#2563eb' : '#e5e7eb',
                  color: otp.join('').length === 6 ? '#fff' : '#94a3b8',
                  border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
                  cursor: otp.join('').length === 6 && !loading ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', transition: 'all .2s',
                }}
              >
                {loading ? 'Verificando...' : 'Confirmar código →'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 18, fontSize: 13 }}>
                <button
                  onClick={handleResend}
                  disabled={resendTimer > 0}
                  style={{ background: 'none', border: 'none', color: resendTimer > 0 ? '#cbd5e1' : '#2563eb', cursor: resendTimer > 0 ? 'default' : 'pointer', fontWeight: 600, fontFamily: 'inherit', fontSize: 13 }}
                >
                  {resendTimer > 0 ? `Reenviar en ${resendTimer}s` : '↺ Reenviar código'}
                </button>
                <span style={{ color: '#e2e8f0' }}>|</span>
                <button
                  onClick={() => { setStep(1); setOtp(['','','','','','']); setError(''); setDevOtp(''); }}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}
                >
                  ← Volver
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
