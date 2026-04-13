import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const AVATAR_COLORS = [
  '#2563eb','#7c3aed','#db2777','#dc2626','#d97706',
  '#16a34a','#0891b2','#1e40af','#4f46e5','#059669',
];

export default function SettingsPage() {
  const { user, loginStep1, loginStep2 } = useAuth();

  // Profile editing
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState(user?.apellido || '');
  const [avatarColor, setAvatarColor] = useState(
    () => localStorage.getItem('avatar_color') || '#2563eb'
  );
  const [savingProfile, setSavingProfile] = useState(false);

  // 2FA
  const [otpEnabled, setOtpEnabled] = useState(
    () => localStorage.getItem('otp_enabled') !== 'false'
  );
  // OTP confirmation flow for toggling 2FA
  const [otpFlow, setOtpFlow] = useState(null); // null | 'activar' | 'desactivar'
  const [otpInputs, setOtpInputs] = useState(['','','','','','']);
  const [password, setPassword] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const otpRefs = useRef([]);

  const [msg, setMsg] = useState({ text: '', type: '' });

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text:'', type:'' }), 5000);
  };

  // Save profile
  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await axios.patch('/api/me/profile', { nombre, apellido, avatar_color: avatarColor });
      localStorage.setItem('avatar_color', avatarColor);
      showMsg('✅ Perfil actualizado correctamente');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error al actualizar perfil', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Start 2FA toggle: send OTP to email first
  const startToggle2FA = async () => {
    const accion = otpEnabled ? 'desactivar' : 'activar';
    setSendingOtp(true);
    setOtpFlow(accion);
    setOtpSent(false);
    setOtpInputs(['','','','','','']);
    setDevOtp('');
    try {
      // Use loginStep1 to trigger OTP send
      const data = await loginStep1(user.email, password);
      setOtpSent(true);
      if (data.devOtp) setDevOtp(data.devOtp);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      showMsg(err.response?.data?.error || 'Contraseña incorrecta', 'error');
      setOtpFlow(null);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpInputs];
    next[idx] = val.slice(-1);
    setOtpInputs(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKey = (idx, e) => {
    if (e.key === 'Backspace' && !otpInputs[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === 'Enter') confirmToggle();
  };

  const confirmToggle = async () => {
    const code = otpInputs.join('');
    if (code.length < 6) { showMsg('Ingresa el código completo de 6 dígitos', 'error'); return; }
    try {
      // Verify OTP via loginStep2 — if valid, apply the 2FA change
      await loginStep2(user.email, code);
      const next = !otpEnabled;
      await axios.patch('/api/me/settings', { otp_enabled: next });
      localStorage.setItem('otp_enabled', String(next));
      setOtpEnabled(next);
      setOtpFlow(null);
      setPassword('');
      setOtpInputs(['','','','','','']);
      showMsg(next
        ? '🔐 Verificación en 2 pasos ACTIVADA. Tu cuenta está más protegida.'
        : '⚠️ Verificación en 2 pasos desactivada.'
      );
    } catch (err) {
      showMsg(err.response?.data?.error || 'Código incorrecto', 'error');
    }
  };

  const initials = `${nombre[0] || user?.nombre?.[0] || '?'}${apellido[0] || user?.apellido?.[0] || ''}`.toUpperCase();

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">⚙️ Configuración de cuenta</h1>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 20 }}>
          {msg.text}
        </div>
      )}

      {/* ── Profile card ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">👤 Mi perfil</div>

        {/* Avatar preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: avatarColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 24, fontWeight: 800, flexShrink: 0,
            boxShadow: `0 4px 16px ${avatarColor}55`,
            transition: 'background .2s, box-shadow .2s',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
              {nombre || user?.nombre} {apellido || user?.apellido}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{user?.email}</div>
            <span className="badge badge-blue" style={{ marginTop: 6, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>
              {user?.rol}
            </span>
          </div>
        </div>

        {/* Color picker */}
        <div className="form-group">
          <label className="form-label">Color del avatar</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {AVATAR_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setAvatarColor(c)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: c,
                  border: avatarColor === c ? '3px solid #0f172a' : '3px solid transparent',
                  cursor: 'pointer', padding: 0,
                  boxShadow: avatarColor === c ? `0 0 0 2px ${c}` : 'none',
                  transition: 'all .15s',
                }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Name fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Nombre</label>
            <input className="form-input" value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Apellido</label>
            <input className="form-input" value={apellido} onChange={e => setApellido(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-primary" disabled={savingProfile} onClick={saveProfile}>
          {savingProfile ? 'Guardando...' : '💾 Guardar cambios'}
        </button>
      </div>

      {/* ── 2FA card ── */}
      <div className="card">
        <div className="card-title">🔒 Seguridad — Verificación en 2 pasos</div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px 0', borderBottom: otpFlow ? '1px solid var(--border)' : 'none' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
              {otpEnabled ? '🔐 Activada' : '🔓 Desactivada'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              {otpEnabled
                ? `Al iniciar sesión, recibirás un código de 6 dígitos en ${user?.email}. Para desactivarla necesitas confirmar con un código.`
                : 'Solo necesitas tu contraseña para acceder. Recomendamos activar 2FA para mayor seguridad de tu cuenta.'}
            </div>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 52, height: 28, borderRadius: 14,
              background: otpEnabled ? '#2563eb' : '#cbd5e1',
              position: 'relative', transition: 'background .25s',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3, left: otpEnabled ? 27 : 3,
                transition: 'left .25s', boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: otpEnabled ? '#2563eb' : '#94a3b8', textTransform: 'uppercase' }}>
              {otpEnabled ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>

        {/* Toggle flow */}
        {!otpFlow ? (
          <div style={{ paddingTop: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Confirma tu contraseña para cambiar este ajuste</label>
              <input
                className="form-input"
                type="password"
                placeholder="Tu contraseña actual"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ maxWidth: 280 }}
              />
            </div>
            <button
              className={`btn ${otpEnabled ? 'btn-danger' : 'btn-success'}`}
              disabled={!password || sendingOtp}
              onClick={startToggle2FA}
            >
              {sendingOtp ? 'Enviando código...' : otpEnabled ? '🔓 Desactivar 2FA' : '🔐 Activar 2FA'}
            </button>
          </div>
        ) : (
          <div style={{ paddingTop: 20 }}>
            <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 8, fontWeight: 600 }}>
              {otpFlow === 'activar' ? '🔐 Activa la verificación en 2 pasos' : '⚠️ Desactiva la verificación en 2 pasos'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Se envió un código a <strong>{user?.email}</strong>. Ingrésalo para confirmar.
            </div>

            {devOtp && (
              <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#713f12', marginBottom: 12, textAlign: 'center' }}>
                🔧 <strong>Dev:</strong> código = <strong style={{ fontFamily: 'monospace', fontSize: 16 }}>{devOtp}</strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {otpInputs.map((d, idx) => (
                <input
                  key={idx}
                  ref={el => otpRefs.current[idx] = el}
                  type="text" inputMode="numeric" maxLength={1}
                  value={d}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKey(idx, e)}
                  style={{
                    width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 800,
                    border: `2px solid ${d ? '#2563eb' : 'var(--border)'}`,
                    borderRadius: 10, outline: 'none',
                    background: d ? '#eff6ff' : 'var(--bg)',
                    color: '#1e40af', fontFamily: 'monospace', transition: 'all .15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => { if (!d) e.target.style.borderColor = 'var(--border)'; }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => { setOtpFlow(null); setPassword(''); setOtpInputs(['','','','','','']); }}>
                Cancelar
              </button>
              <button
                className={`btn ${otpFlow === 'activar' ? 'btn-success' : 'btn-danger'}`}
                disabled={otpInputs.join('').length < 6}
                onClick={confirmToggle}
              >
                {otpFlow === 'activar' ? '✓ Confirmar activación' : '✓ Confirmar desactivación'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
