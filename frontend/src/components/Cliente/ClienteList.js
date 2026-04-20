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
      await clienteService.softDeleteCliente(clienteId);
      setClientes(clientes.filter(cliente => cliente.id !== clienteId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      setError('Erro ao excluir cliente');
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
        <div className="clientes-table-container">
          <table className="clientes-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF/CNPJ</th>
                <th>Telefone</th>
                <th>Email</th>
                <th>Endereço</th>
                <th className="text-center">Orçamentos</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(cliente => (
                <tr key={cliente.id} className="cliente-row">
                  <td className="cliente-nome">
                    <Link 
                      to={`/clientes/${cliente.id}`} 
                      className="nome-link"
                    >
                      {cliente.nome}
                    </Link>
                  </td>
                  <td>{cliente.cpf_cnpj || '-'}</td>
                  <td>{cliente.telefone}</td>
                  <td className="email-cell">{cliente.email || '-'}</td>
                  <td className="endereco-cell">{cliente.endereco || '-'}</td>
                  <td className="text-center">
                    <span className="badge">
                      {cliente.total_orcamentos || 0}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <div className="action-buttons">
                      <button
                        onClick={() => handleEdit(cliente.id)}
                        className="btn-action btn-edit"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => confirmDelete(cliente)}
                        className="btn-action btn-delete"
                        title="Excluir"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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