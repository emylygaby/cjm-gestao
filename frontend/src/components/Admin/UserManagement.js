import React, { useEffect, useState } from 'react';
import { adminUserService } from '../../services/api';
import './UserManagement.css';

const initialForm = {
  username: '',
  full_name: '',
  password: '',
  is_staff: false,
  is_active: true,
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await adminUserService.getUsers();
      const list = Array.isArray(response.data) ? response.data : response.data.results || [];
      setUsers(list);
    } catch (err) {
      setError('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setEditingUserId(null);
    setFormData(initialForm);
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEdit = (user) => {
    setEditingUserId(user.id);
    setFormData({
      username: user.username || '',
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      password: '',
      is_staff: Boolean(user.is_staff),
      is_active: Boolean(user.is_active),
    });
  };

  const handleDelete = async (userId, username) => {
    const confirmDelete = window.confirm(`Deseja excluir o usuário ${username}?`);
    if (!confirmDelete) {
      return;
    }

    try {
      await adminUserService.deleteUser(userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Não foi possível excluir o usuário.';
      setError(detail);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const fullName = formData.full_name.trim();
    const [firstName, ...rest] = fullName.split(/\s+/);
    const lastName = rest.join(' ');

    const payload = {
      username: formData.username,
      first_name: firstName || '',
      last_name: lastName || '',
      is_staff: formData.is_staff,
      is_active: formData.is_active,
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      if (editingUserId) {
        await adminUserService.updateUser(editingUserId, payload);
      } else {
        await adminUserService.createUser({ ...payload, password: formData.password });
      }

      await loadUsers();
      resetForm();
    } catch (err) {
      const apiErrors = err?.response?.data;

      if (typeof apiErrors === 'object' && apiErrors !== null) {
        const firstKey = Object.keys(apiErrors)[0];
        const firstError = apiErrors[firstKey];
        const message = Array.isArray(firstError) ? firstError[0] : firstError;
        setError(String(message));
      } else {
        setError('Não foi possível salvar o usuário.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-users-page">
      <div className="admin-users-header">
        <h1>Painel de Administrador</h1>
        <p>Gerencie usuários, acessos e status de cadastro.</p>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-grid">
        <section className="admin-card">
          <h2>{editingUserId ? 'Editar usuário' : 'Novo usuário'}</h2>
          <form onSubmit={handleSubmit} className="admin-user-form">
            <label>
              Usuário
              <input
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                maxLength={11}
                required
              />
            </label>

            <label>
              Nome completo
              <input
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                required
              />
            </label>

            <label>
              {editingUserId ? 'Nova senha (opcional)' : 'Senha'}
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!editingUserId}
              />
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_staff"
                checked={formData.is_staff}
                onChange={handleInputChange}
              />
              Acesso ao painel admin
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
              />
              Usuário ativo
            </label>

            <div className="form-actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : editingUserId ? 'Salvar alterações' : 'Criar usuário'}
              </button>

              {editingUserId && (
                <button type="button" onClick={resetForm} className="secondary-button">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-card">
          <h2>Usuários cadastrados</h2>

          {loading ? (
            <p>Carregando usuários...</p>
          ) : (
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Nome</th>
                    <th>Admin</th>
                    <th>Ativo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || '-'}</td>
                      <td>{user.is_staff ? 'Sim' : 'Não'}</td>
                      <td>{user.is_active ? 'Sim' : 'Não'}</td>
                      <td className="table-actions">
                        <button onClick={() => handleEdit(user)}>Editar</button>
                        <button
                          onClick={() => handleDelete(user.id, user.username)}
                          className="danger-button"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default UserManagement;
