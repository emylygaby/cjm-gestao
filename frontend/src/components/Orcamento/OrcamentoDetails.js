import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { orcamentoService } from '../../services/api';
import PagamentoModal from './PagamentoModal';
import './OrcamentoDetails.css';

const OrcamentoDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');

  useEffect(() => {
    fetchOrcamento();
  }, [id]);

  const fetchOrcamento = async () => {
    try {
      setLoading(true);
      const response = await orcamentoService.getOrcamento(id);
      setOrcamento(response.data);
      setError('');
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
      setError('Erro ao carregar os detalhes do orçamento');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await orcamentoService.gerarPDF(id);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setError('Erro ao gerar PDF do orçamento');
    }
  };

  const handleEdit = () => {
    navigate(`/orcamentos/${id}/editar`);
  };

  const handleBack = () => {
    navigate('/orcamentos');
  };

  const handleStatusChange = async (newStatus) => {
    // Se o novo status for EM_ANDAMENTO, abre o modal de pagamento
    if (newStatus === 'EM_ANDAMENTO') {
      setPendingStatus(newStatus);
      setShowPagamentoModal(true);
      return;
    }

    // Para outros status, atualiza diretamente
    try {
      await orcamentoService.atualizarStatus(id, newStatus);
      await fetchOrcamento(); // Recarrega o orçamento
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      setError('Erro ao atualizar status do orçamento');
    }
  };

  const handlePagamentoSuccess = () => {
    setShowPagamentoModal(false);
    setPendingStatus('');
    fetchOrcamento(); // Recarrega o orçamento após processar pagamento
  };

  const handlePagamentoCancel = () => {
    setShowPagamentoModal(false);
    setPendingStatus('');
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'PENDENTE': 'status-pendente',
      'APROVADO': 'status-aprovado',
      'REJEITADO': 'status-rejeitado',
      'EM_ANDAMENTO': 'status-em-andamento',
      'CONCLUIDO': 'status-concluido',
      'CANCELADO': 'status-cancelado'
    };
    return statusClasses[status] || 'status-pendente';
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      'PENDENTE': 'Pendente',
      'APROVADO': 'Aprovado',
      'REJEITADO': 'Rejeitado',
      'EM_ANDAMENTO': 'Em Andamento',
      'CONCLUIDO': 'Concluído',
      'CANCELADO': 'Cancelado'
    };
    return statusLabels[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="orcamento-details-container">
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  if (error || !orcamento) {
    return (
      <div className="orcamento-details-container">
        <div className="alert alert-error">{error || 'Orçamento não encontrado'}</div>
        <button onClick={handleBack} className="btn btn-secondary">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="orcamento-details-container">
      <div className="details-header">
        <div className="header-left">
          <button onClick={handleBack} className="btn-back">
            ← Voltar
          </button>
          <div className="header-info">
            <h1>Orçamento #{orcamento.id}</h1>
            <span className={`status-badge ${getStatusBadgeClass(orcamento.status)}`}>
              {getStatusLabel(orcamento.status)}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={handleDownloadPDF} className="btn btn-success">
            Baixar PDF
          </button>
          <button onClick={handleEdit} className="btn btn-primary">
            Editar
          </button>
        </div>
      </div>

      <div className="details-content">
        <div className="details-section">
          <h2>Informações do Orçamento</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Data de Emissão:</span>
              <span className="info-value">{formatDate(orcamento.data_emissao)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Data de Validade:</span>
              <span className="info-value">{formatDate(orcamento.data_validade)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status:</span>
              <select 
                value={orcamento.status} 
                onChange={(e) => handleStatusChange(e.target.value)}
                className="status-select"
              >
                <option value="PENDENTE">Pendente</option>
                <option value="APROVADO">Aprovado</option>
                <option value="REJEITADO">Rejeitado</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            <div className="info-item">
              <span className="info-label">Criado em:</span>
              <span className="info-value">{formatDate(orcamento.created_at)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Atualizado em:</span>
              <span className="info-value">{formatDate(orcamento.updated_at)}</span>
            </div>
          </div>
        </div>

        <div className="details-section">
          <h2>Dados do Cliente</h2>
          <div className="info-grid">
            <div className="info-item full-width">
              <span className="info-label">Nome:</span>
              <span className="info-value">{orcamento.cliente_nome}</span>
            </div>
            {orcamento.cliente_telefone && (
              <div className="info-item">
                <span className="info-label">Telefone:</span>
                <span className="info-value">{orcamento.cliente_telefone}</span>
              </div>
            )}
            {orcamento.cliente_email && (
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{orcamento.cliente_email}</span>
              </div>
            )}
            {orcamento.cliente_endereco && (
              <div className="info-item full-width">
                <span className="info-label">Endereço:</span>
                <span className="info-value">{orcamento.cliente_endereco}</span>
              </div>
            )}
          </div>
        </div>

        <div className="details-section">
          <h2>Itens do Orçamento</h2>
          <div className="itens-table-container">
            <table className="itens-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Produto</th>
                  <th>Quantidade</th>
                  <th>Unidade</th>
                  <th>Preço Unit.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {orcamento.itens.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="produto-info">
                        <strong>{item.produto_nome}</strong>
                        {item.produto_descricao && (
                          <small>{item.produto_descricao}</small>
                        )}
                      </div>
                    </td>
                    <td>{parseFloat(item.quantidade).toFixed(2)}</td>
                    <td>{item.produto_unidade}</td>
                    <td>{formatCurrency(item.preco_venda)}</td>
                    <td className="valor-cell">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="details-section totals-section">
          <h2>Resumo Financeiro</h2>
          <div className="totals-grid">
            <div className="total-item">
              <span className="total-label">Valor Total:</span>
              <span className="total-value">{formatCurrency(orcamento.valor_total)}</span>
            </div>
            <div className="total-item">
              <span className="total-label">Custo Total:</span>
              <span className="total-value custo">{formatCurrency(orcamento.custo_total)}</span>
            </div>
            <div className="total-item highlight">
              <span className="total-label">Lucro Previsto:</span>
              <span className="total-value lucro">{formatCurrency(orcamento.lucro_previsto)}</span>
            </div>
          </div>
        </div>

        {orcamento.observacoes && (
          <div className="details-section">
            <h2>Observações</h2>
            <p className="observacoes-text">{orcamento.observacoes}</p>
          </div>
        )}
      </div>

      {showPagamentoModal && (
        <PagamentoModal
          orcamento={orcamento}
          onClose={handlePagamentoCancel}
          onSuccess={handlePagamentoSuccess}
        />
      )}
    </div>
  );
};

export default OrcamentoDetails;
