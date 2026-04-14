import { useState, useEffect } from 'react';
import axios from 'axios';
 
export default function AdminUsuarios() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', rol: 'cliente', telefono: '', direccion: '' });
 
  const fetchUsers = () => {
    axios.get('/api/admin/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  };
  useEffect(fetchUsers, []);
 
  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };
 
  const openCreate = () => {
    setEditUser(null);
    setForm({ nombre: '', apellido: '', email: '', password: '', rol: 'cliente', telefono: '', direccion: '' });
    setShowModal(true);
  };
 
  const openEdit = (u) => {
    setEditUser(u);
    setForm({ nombre: u.nombre || '', apellido: u.apellido || '', email: u.email || '', password: '', rol: u.rol || 'cliente', telefono: u.telefono || '', direccion: u.direccion || '' });
    setShowModal(true);
  };
 
  const guardar = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        await axios.patch(`/api/admin/users/${editUser.id}`, form);
        showMsg('Usuario actualizado');
      } else {
        if (!form.password) { showMsg('La contraseña es requerida para usuarios nuevos', 'error'); return; }
        await axios.post('/auth/register', form);
        showMsg('Usuario creado');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error al guardar', 'error');
    }
  };
 
  const toggleActivo = async (id) => {
    try {
      await axios.patch(`/api/admin/users/${id}/toggle`);
      fetchUsers();
    } catch { showMsg('Error al cambiar estado', 'error'); }
  };
 
  const eliminar = async (id) => {
    try {
      await axios.delete(`/api/admin/users/${id}`);
      showMsg('Usuario eliminado');
      setConfirmDelete(null);
      fetchUsers();
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error al eliminar', 'error');
    }
  };
 
  const rolBadge = (r) => {
    const map = { admin: 'badge-purple', operador: 'badge-blue', cliente: 'badge-green' };
    return map[r] || 'badge-gray';
  };
 
  if (loading) return <div className="loading">Cargando usuarios...</div>;
 
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestión de Usuarios</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Nuevo usuario</button>
      </div>
 
      {msg.text && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 16 }}>{msg.text}</div>}
 
      <div className="card">
        <div className="table-wrapper">
          {users.length === 0 ? (
            <div className="empty">No hay usuarios.</div>
          ) : (
            <table>
              <thead>
                <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 500 }}>{u.nombre} {u.apellido}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{u.email}</td>
                    <td><span className={`badge ${rolBadge(u.rol)}`}>{u.rol}</span></td>
                    <td>
                      <span className={`badge ${u.activo ? 'badge-green' : 'badge-red'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)}>✏️ Editar</button>
                        <button className="btn btn-sm" style={{ background: u.activo ? '#f59e0b' : '#16a34a', color: '#fff', border: 'none' }}
                          onClick={() => toggleActivo(u.id)}>
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        {u.rol !== 'admin' && (
                          <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(u)}>🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
 
      {/* Modal crear/editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editUser ? '✏️ Editar usuario' : '+ Nuevo usuario'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={guardar}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Nombre *</label>
                  <input className="form-input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Apellido *</label>
                  <input className="form-input" value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{editUser ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</label>
                  <input className="form-input" type="password" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required={!editUser} placeholder={editUser ? 'Dejar vacío para no cambiar' : ''} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Rol *</label>
                  <select className="form-input" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                    <option value="cliente">Cliente</option>
                    <option value="operador">Operador</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Dirección</label>
                  <input className="form-input" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editUser ? '💾 Guardar cambios' : '+ Crear usuario'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <span className="modal-title">⚠️ Eliminar usuario</span>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
            </div>
            <p style={{ fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
              ¿Estás seguro de eliminar a <strong>{confirmDelete.nombre} {confirmDelete.apellido}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => eliminar(confirmDelete.id)}>🗑️ Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}