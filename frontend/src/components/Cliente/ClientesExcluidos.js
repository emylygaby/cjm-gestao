import React, { useState, useEffect } from 'react';
import { clienteService } from '../../services/api';
import './ClienteList.css'; // Reutilizar os estilos

const ClientesExcluidos = () => {
  const [clientesExcluidos, setClientesExcluidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoreConfirm, setRestoreConfirm] = useState(null);

  useEffect(() => {
    fetchClientesExcluidos();
  }, []);

  const fetchClientesExcluidos = async () => {
    try {
      setLoading(true);
      const response = await clienteService.getClientesExcluidos();
      setClientesExcluidos(response.data);
      setError('');
    } catch (error) {
      console.error('Erro ao carregar clientes excluídos:', error);
      setError('Erro ao carregar a lista de clientes excluídos');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (clienteId) => {
    try {
      await clienteService.restoreCliente(clienteId);
      setClientesExcluidos(clientesExcluidos.filter(cliente => cliente.id !== clienteId));
      setRestoreConfirm(null);
    } catch (error) {
      console.error('Erro ao restaurar cliente:', error);
      setError('Erro ao restaurar cliente');
    }
  };

  const confirmRestore = (cliente) => {
    setRestoreConfirm(cliente);
  };

  const cancelRestore = () => {
    setRestoreConfirm(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="cliente-list-container">
        <div className="loading">Carregando clientes excluídos...</div>
      </div>
    );
  }

  return (
    <div className="cliente-list-container">
      <div className="list-header">
        <div className="header-content">
          <h1>🗑️ Lixeira - Clientes Excluídos</h1>
          <p>Gerencie clientes que foram excluídos do sistema</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {clientesExcluidos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-content">
            <h3>Nenhum cliente excluído</h3>
            <p>Não há clientes na lixeira no momento</p>
          </div>
        </div>
      ) : (
        <div className="clientes-grid">
          {clientesExcluidos.map(cliente => (
            <div key={cliente.id} className="cliente-card deleted-card">
              <div className="card-header">
                <h3>{cliente.nome}</h3>
                <div className="card-actions">
                  <button
                    onClick={() => confirmRestore(cliente)}
                    className="btn-icon btn-restore"
                    title="Restaurar"
                  >
                    ↩️
                  </button>
                </div>
              </div>
              
              <div className="card-content">
                {cliente.cpf_cnpj && (
                  <div className="info-item">
                    <span className="label">CPF/CNPJ:</span>
                    <span className="value">{cliente.cpf_cnpj}</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="label">Telefone:</span>
                  <span className="value">{cliente.telefone}</span>
                </div>
                {cliente.email && (
                  <div className="info-item">
                    <span className="label">Email:</span>
                    <span className="value">{cliente.email}</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="label">Excluído em:</span>
                  <span className="value">{formatDate(cliente.deleted_at)}</span>
                </div>
              </div>

              <div className="card-footer">
                <span className="status-deleted">Cliente Excluído</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmação de restauração */}
      {restoreConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirmar Restauração</h3>
            </div>
            <div className="modal-content">
              <p>
                Tem certeza que deseja restaurar o cliente <strong>{restoreConfirm.nome}</strong>?
              </p>
              <p className="info">O cliente será reativado e aparecerá na lista principal novamente.</p>
            </div>
            <div className="modal-actions">
              <button
                onClick={cancelRestore}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRestore(restoreConfirm.id)}
                className="btn btn-success"
              >
                Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesExcluidos;