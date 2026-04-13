import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/shared/Settings';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminRutas from './pages/admin/Rutas';
import AdminCiclos from './pages/admin/Ciclos';
import AdminOperadores from './pages/admin/Operadores';
import AdminClientes from './pages/admin/Clientes';
import AdminMapa from './pages/admin/Mapa';
import { AdminReporte } from './pages/admin/Clientes';
import AdminPaquetes from './pages/admin/Paquetes';

// Operador
import OperadorDashboard from './pages/operador/Dashboard';
import OperadorRuta from './pages/operador/RutaActiva';
import OperadorHistorial from './pages/operador/Historial';
import OperadorMapa from './pages/operador/Mapa';

// Cliente
import ClienteDashboard from './pages/cliente/Dashboard';
import ClientePaquetes from './pages/cliente/Paquetes';
import ClienteSeguimiento from './pages/cliente/Seguimiento';
import ClienteSolicitudes from './pages/cliente/Solicitudes';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/" />;
  return children;
};

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.rol === 'admin') return <Navigate to="/admin" />;
  if (user.rol === 'operador') return <Navigate to="/operador" />;
  return <Navigate to="/cliente" />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<HomeRedirect />} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Layout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="rutas" element={<AdminRutas />} />
        <Route path="ciclos" element={<AdminCiclos />} />
        <Route path="operadores" element={<AdminOperadores />} />
        <Route path="clientes" element={<AdminClientes />} />
        <Route path="mapa" element={<AdminMapa />} />
        <Route path="reporte" element={<AdminReporte />} />
        <Route path="paquetes" element={<AdminPaquetes />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Operador */}
      <Route path="/operador" element={<ProtectedRoute roles={['operador']}><Layout /></ProtectedRoute>}>
        <Route index element={<OperadorDashboard />} />
        <Route path="ruta/:id" element={<OperadorRuta />} />
        <Route path="historial" element={<OperadorHistorial />} />
        <Route path="mapa" element={<OperadorMapa />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Cliente */}
      <Route path="/cliente" element={<ProtectedRoute roles={['cliente']}><Layout /></ProtectedRoute>}>
        <Route index element={<ClienteDashboard />} />
        <Route path="paquetes" element={<ClientePaquetes />} />
        <Route path="seguimiento" element={<ClienteSeguimiento />} />
        <Route path="solicitudes" element={<ClienteSolicitudes />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
