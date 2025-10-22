import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { clienteService } from '../../services/api';
import './ClienteDetails.css';

const ClienteDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClienteDetails();
  }, [id]);

  const fetchClienteDetails = async () => {
    try {
      setLoading(true);
      const [clienteResponse, orcamentosResponse] = await Promise.all([
        clienteService.getCliente(id),
        clienteService.getClienteOrcamentos(id).catch(() => ({ data: [] }))
      ]);
      
      setCliente(clienteResponse.data);
      setOrcamentos(orcamentosResponse.data);
      setError('');
    } catch (error) {
      console.error('Erro ao carregar detalhes do cliente:', error);
      setError('Erro ao carregar detalhes do cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/clientes/${id}/editar`);
  };

  const handleBack = () => {
    navigate('/clientes');
  };

  if (loading) {
    return (
      <div className="cliente-details-container">
        <div className="loading">Carregando detalhes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cliente-details-container">
        <div className="alert alert-error">
          {error}
        </div>
        <button onClick={handleBack} className="btn btn-secondary">
          Voltar para Lista
        </button>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="cliente-details-container">
        <div className="alert alert-error">
          Cliente não encontrado
        </div>
        <button onClick={handleBack} className="btn btn-secondary">
          Voltar para Lista
        </button>
      </div>
    );
  }

  return (
    <div className="cliente-details-container">
      <div className="details-header">
        <div className="header-content">
          <h1>{cliente.nome}</h1>
          <p>Informações detalhadas do cliente</p>
        </div>
        <div className="header-actions">
          <button onClick={handleBack} className="btn btn-secondary">
            Voltar
          </button>
          <button onClick={handleEdit} className="btn btn-primary">
            Editar Cliente
          </button>
        </div>
      </div>

      <div className="details-content">
        <div className="info-section">
          <h2>Informações Pessoais</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Nome:</label>
              <span>{cliente.nome}</span>
            </div>
            <div className="info-item">
              <label>Telefone:</label>
              <span>{cliente.telefone}</span>
            </div>
            <div className="info-item">
              <label>Endereço:</label>
              <span>{cliente.endereco}</span>
            </div>
            <div className="info-item">
              <label>Data de Cadastro:</label>
              <span>{new Date(cliente.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="info-item">
              <label>Última Atualização:</label>
              <span>{new Date(cliente.updated_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>

        <div className="orcamentos-section">
          <div className="section-header">
            <h2>Orçamentos</h2>
            <span className="badge">{orcamentos.length}</span>
          </div>
          
          {orcamentos.length === 0 ? (
            <div className="empty-orcamentos">
              <p>Nenhum orçamento encontrado para este cliente.</p>
              <Link to="/orcamentos/novo" className="btn btn-outline">
                Criar Primeiro Orçamento
              </Link>
            </div>
          ) : (
            <div className="orcamentos-list">
              {orcamentos.map(orcamento => (
                <div key={orcamento.id} className="orcamento-card">
                  <div className="orcamento-header">
                    <h3>Orçamento #{orcamento.id}</h3>
                    <span className={`status ${orcamento.status}`}>
                      {orcamento.status === 'pendente' && 'Pendente'}
                      {orcamento.status === 'aprovado' && 'Aprovado'}
                      {orcamento.status === 'rejeitado' && 'Rejeitado'}
                    </span>
                  </div>
                  <div className="orcamento-content">
                    <p><strong>Descrição:</strong> {orcamento.descricao}</p>
                    <p><strong>Valor:</strong> R$ {parseFloat(orcamento.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p><strong>Data:</strong> {new Date(orcamento.data_orcamento).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClienteDetails;