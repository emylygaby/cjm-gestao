import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clienteService } from '../../services/api';
import './ClienteList.css';

const ClienteList = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await clienteService.getClientes();
      const clientesData = response.data.results || response.data;
      setClientes(clientesData);
      setError('');
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      setError('Erro ao carregar a lista de clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (clienteId) => {
    navigate(`/clientes/${clienteId}/editar`);
  };

  const handleDelete = async (clienteId) => {
    try {
      await clienteService.deleteCliente(clienteId);
      setClientes(clientes.filter(cliente => cliente.id !== clienteId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      setError('Erro ao deletar cliente');
    }
  };

  const confirmDelete = (cliente) => {
    setDeleteConfirm(cliente);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  if (loading) {
    return (
      <div className="cliente-list-container">
        <div className="loading">Carregando clientes...</div>
      </div>
    );
  }

  return (
    <div className="cliente-list-container">
      <div className="list-header">
        <div className="header-content">
          <h1>Clientes</h1>
          <p>Gerencie todos os seus clientes cadastrados</p>
        </div>
        <Link to="/clientes/novo" className="btn btn-primary">
          Novo Cliente
        </Link>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {clientes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-content">
            <h3>Nenhum cliente cadastrado</h3>
            <p>Comece adicionando seu primeiro cliente</p>
            <Link to="/clientes/novo" className="btn btn-primary">
              Cadastrar Cliente
            </Link>
          </div>
        </div>
      ) : (
        <div className="clientes-grid">
          {clientes.map(cliente => (
            <div key={cliente.id} className="cliente-card">
              <div className="card-header">
                <h3>{cliente.nome}</h3>
                <div className="card-actions">
                  <button
                    onClick={() => handleEdit(cliente.id)}
                    className="btn-icon btn-edit"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => confirmDelete(cliente)}
                    className="btn-icon btn-delete"
                    title="Excluir"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="card-content">
                <div className="info-item">
                  <span className="label">Telefone:</span>
                  <span className="value">{cliente.telefone}</span>
                </div>
                <div className="info-item">
                  <span className="label">Endereço:</span>
                  <span className="value">{cliente.endereco}</span>
                </div>
                <div className="info-item">
                  <span className="label">Orçamentos:</span>
                  <span className="value">
                    {cliente.orcamentos ? cliente.orcamentos.length : 0}
                  </span>
                </div>
              </div>

              <div className="card-footer">
                <Link 
                  to={`/clientes/${cliente.id}`} 
                  className="btn-link"
                >
                  Ver Detalhes
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirmar Exclusão</h3>
            </div>
            <div className="modal-content">
              <p>
                Tem certeza que deseja excluir o cliente <strong>{deleteConfirm.nome}</strong>?
              </p>
              <p className="warning">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="modal-actions">
              <button
                onClick={cancelDelete}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="btn btn-danger"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClienteList;