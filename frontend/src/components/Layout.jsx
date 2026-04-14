import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const navItems = {
  admin: [
    { path: '/admin', label: 'Dashboard', icon: '📊', exact: true },
    { path: '/admin/mapa', label: 'Mapa GPS', icon: '🗺️' },
    { path: '/admin/rutas', label: 'Rutas', icon: '🚚' },
    { path: '/admin/paquetes', label: 'Paquetes', icon: '📦' },
    { path: '/admin/ciclos', label: 'Ciclos', icon: '🔄' },
    { path: '/admin/operadores', label: 'Operadores', icon: '👷' },
    { path: '/admin/clientes', label: 'Clientes', icon: '👥' },
    { path: '/admin/usuarios', label: 'Usuarios', icon: '🔑' },
    { path: '/admin/reporte', label: 'Reportes', icon: '📋' },
    { path: '/admin/settings', label: 'Ajustes', icon: '⚙️' },
  ],
  operador: [
    { path: '/operador', label: 'Mi ruta hoy', icon: '📍', exact: true },
    { path: '/operador/mapa', label: 'Mi mapa', icon: '🗺️' },
    { path: '/operador/historial', label: 'Historial', icon: '📅' },
    { path: '/operador/notificaciones', label: 'Notificaciones', icon: '🔔' },
    { path: '/operador/settings', label: 'Ajustes', icon: '⚙️' },
  ],
  cliente: [
    { path: '/cliente', label: 'Inicio', icon: '🏠', exact: true },
    { path: '/cliente/paquetes', label: 'Mis paquetes', icon: '📦' },
    { path: '/cliente/solicitudes', label: 'Solicitar recogida', icon: '📬' },
    { path: '/cliente/seguimiento', label: 'Seguimiento GPS', icon: '🔍' },
    { path: '/cliente/notificaciones', label: 'Notificaciones', icon: '🔔' },
    { path: '/cliente/settings', label: 'Ajustes', icon: '⚙️' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = navItems[user?.rol] || [];

  const isActive = (item) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  const handleNav = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const currentLabel = items.find(i => isActive(i))?.label || '';

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4fb' }}>

      {/* ── Top navbar ── */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px 0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 300,
        boxShadow: '0 1px 8px rgba(30,64,175,0.07)',
      }}>

        {/* Left: logo + desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1, minWidth: 0 }}>
          {/* Logo */}
          <button
            onClick={() => handleNav(items[0]?.path || '/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 0 0', flexShrink: 0 }}
          >
            <img src="/logo.png" alt="logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <span style={{ fontStyle: 'italic', fontWeight: 800, fontSize: 15, color: '#1e40af', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
              ElUltimoTimbraso
            </span>
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: '#e2e8f0', margin: '0 12px', flexShrink: 0 }} />

          {/* Desktop nav links — hidden on small screens */}
          <nav className="desktop-nav" style={{ display: 'flex', gap: 2, overflow: 'hidden' }}>
            {items.map(item => (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                style={{
                  border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  padding: '6px 11px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                  color: isActive(item) ? '#1d4ed8' : '#475569',
                  background: isActive(item) ? '#eff6ff' : 'transparent',
                  transition: 'all .15s', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right: status + user + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

          {/* Connection status — desktop only */}
          <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: connected ? '#16a34a' : '#94a3b8' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#16a34a' : '#cbd5e1', boxShadow: connected ? '0 0 0 2px rgba(22,163,74,0.2)' : 'none', flexShrink: 0 }} />
            {connected ? 'En línea' : 'Sin conexión'}
          </div>

          {/* User avatar + name — compact on mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: '#f0f4fb', borderRadius: 20, border: '1px solid #e2e8f0' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: localStorage.getItem('avatar_color') || '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {user?.nombre?.[0]?.toUpperCase()}{user?.apellido?.[0]?.toUpperCase()}
            </div>
            <div className="desktop-only">
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2a4a', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                {user?.nombre} {user?.apellido}
              </div>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {user?.rol}
              </div>
            </div>
          </div>

          {/* Logout — desktop */}
          <button
            onClick={logout}
            className="desktop-only"
            style={{
              background: 'none', border: '1px solid #e2e8f0', color: '#64748b',
              padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            Salir
          </button>

          {/* Hamburger — mobile only */}
          <button
            className="mobile-only"
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 18, color: '#475569', fontFamily: 'inherit', lineHeight: 1 }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* ── Mobile drawer menu ── */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: 60, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,43,122,0.55)', backdropFilter: 'blur(4px)',
          zIndex: 250,
        }} onClick={() => setMenuOpen(false)}>
          <div
            style={{
              background: '#fff', width: 280, height: '100%', padding: '16px 0',
              boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
              display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* User info */}
            <div style={{ padding: '12px 20px 16px', borderBottom: '1px solid #e2e8f0', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                  {user?.nombre?.[0]?.toUpperCase()}{user?.apellido?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{user?.nombre} {user?.apellido}</div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.rol}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: connected ? '#16a34a' : '#94a3b8' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#16a34a' : '#cbd5e1' }} />
                {connected ? 'En línea' : 'Sin conexión'}
              </div>
            </div>

            {/* Nav items */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {items.map(item => (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '13px 20px', border: 'none',
                    background: isActive(item) ? '#eff6ff' : 'transparent',
                    color: isActive(item) ? '#1d4ed8' : '#374151',
                    fontSize: 14, fontWeight: isActive(item) ? 700 : 500,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    borderLeft: isActive(item) ? '3px solid #2563eb' : '3px solid transparent',
                    transition: 'all .15s',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            {/* Logout */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0' }}>
              <button
                onClick={() => { logout(); setMenuOpen(false); }}
                style={{ width: '100%', padding: '11px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main style={{ padding: '24px 20px', maxWidth: 1280, margin: '0 auto' }}>
        <Outlet />
      </main>

      {/* ── Responsive styles injected ── */}
      <style>{`
        .desktop-only { display: flex !important; }
        .mobile-only  { display: none !important; }
        .desktop-nav  { display: flex !important; }
        .nav-label    { display: inline !important; }

        @media (max-width: 900px) {
          .nav-label { display: none !important; }
        }
        @media (max-width: 720px) {
          .desktop-nav  { display: none !important; }
          .desktop-only { display: none !important; }
          .mobile-only  { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
