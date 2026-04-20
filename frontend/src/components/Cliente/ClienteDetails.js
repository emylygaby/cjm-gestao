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
            {cliente.cpf_cnpj && (
              <div className="info-item">
                <label>CPF/CNPJ:</label>
                <span>{cliente.cpf_cnpj}</span>
              </div>
            )}
            <div className="info-item">
              <label>Telefone:</label>
              <span>{cliente.telefone}</span>
            </div>
            {cliente.email && (
              <div className="info-item">
                <label>Email:</label>
                <span>{cliente.email}</span>
              </div>
            )}
            {cliente.endereco && (
              <div className="info-item">
                <label>Endereço:</label>
                <span>{cliente.endereco}</span>
              </div>
            )}
            {cliente.observacao && (
              <div className="info-item full-width">
                <label>Observação:</label>
                <span>{cliente.observacao}</span>
              </div>
            )}
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
                    <h3>Orçamento #{orcamento.id.toString().padStart(5, '0')}</h3>
                    <span className={`status ${orcamento.status.toLowerCase()}`}>
                      {orcamento.status === 'PENDENTE' && 'Pendente'}
                      {orcamento.status === 'APROVADO' && 'Aprovado'}
                      {orcamento.status === 'REJEITADO' && 'Rejeitado'}
                      {orcamento.status === 'EM_ANDAMENTO' && 'Em Andamento'}
                      {orcamento.status === 'CONCLUIDO' && 'Concluído'}
                      {orcamento.status === 'CANCELADO' && 'Cancelado'}
                    </span>
                  </div>
                  <div className="orcamento-content">
                    <p><strong>Data de Emissão:</strong> {new Date(orcamento.data_emissao).toLocaleDateString('pt-BR')}</p>
                    <p><strong>Validade:</strong> {new Date(orcamento.data_validade).toLocaleDateString('pt-BR')}</p>
                    <p><strong>Valor Total:</strong> R$ {parseFloat(orcamento.valor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    {orcamento.observacoes && (
                      <p><strong>Observações:</strong> {orcamento.observacoes}</p>
                    )}
                  </div>
                  <div className="orcamento-actions">
                    <Link to={`/orcamentos/${orcamento.id}`} className="btn btn-sm btn-primary">
                      Ver Detalhes
                    </Link>
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