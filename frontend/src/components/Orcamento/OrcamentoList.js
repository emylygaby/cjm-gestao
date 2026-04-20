import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orcamentoService } from '../../services/api';
import './OrcamentoList.css';

const OrcamentoList = () => {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrcamentos();
  }, []);

  const fetchOrcamentos = async () => {
    try {
      setLoading(true);
      const response = await orcamentoService.getOrcamentos();
      const orcamentosData = response.data.results || response.data;
      setOrcamentos(orcamentosData);
      setError('');
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      setError('Erro ao carregar a lista de orçamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (orcamentoId) => {
    navigate(`/orcamentos/${orcamentoId}`);
  };

  const handleEdit = (orcamentoId) => {
    navigate(`/orcamentos/${orcamentoId}/editar`);
  };

  const handleDelete = async (orcamentoId) => {
    try {
      await orcamentoService.softDeleteOrcamento(orcamentoId);
      setOrcamentos(orcamentos.filter(orc => orc.id !== orcamentoId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      setError('Erro ao excluir orçamento');
    }
  };

  const handleDownloadPDF = async (orcamentoId, event) => {
    event.stopPropagation();
    try {
      await orcamentoService.gerarPDF(orcamentoId);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      setError('Erro ao gerar PDF do orçamento');
    }
  };

  const confirmDelete = (orcamento, event) => {
    event.stopPropagation();
    setDeleteConfirm(orcamento);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
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
      <div className="orcamento-list-container">
        <div className="loading">Carregando orçamentos...</div>
      </div>
    );
  }

  return (
    <div className="orcamento-list-container">
      <div className="list-header">
        <div className="header-content">
          <h1>Orçamentos</h1>
          <p>Gerencie todos os seus orçamentos</p>
        </div>
        <Link to="/orcamentos/novo" className="btn btn-primary">
          Novo Orçamento
        </Link>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {orcamentos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-content">
            <h3>Nenhum orçamento cadastrado</h3>
            <p>Comece criando seu primeiro orçamento</p>
            <Link to="/orcamentos/novo" className="btn btn-primary">
              Criar Orçamento
            </Link>
          </div>
        </div>
      ) : (
        <div className="orcamentos-table-container">
          <table className="orcamentos-table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente</th>
                <th>Data Emissão</th>
                <th>Validade</th>
                <th>Status</th>
                <th>Valor Total</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {orcamentos.map((orcamento) => (
                <tr key={orcamento.id} onClick={() => handleView(orcamento.id)} className="clickable-row">
                  <td>#{orcamento.id}</td>
                  <td>{orcamento.cliente_nome}</td>
                  <td>{formatDate(orcamento.data_emissao)}</td>
                  <td>{formatDate(orcamento.data_validade)}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(orcamento.status)}`}>
                      {getStatusLabel(orcamento.status)}
                    </span>
                  </td>
                  <td className="valor-cell">{formatCurrency(orcamento.valor_total)}</td>
                  <td className="actions-cell">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(orcamento.id);
                      }}
                      className="btn btn-sm btn-info"
                      title="Ver detalhes"
                    >
                      Ver
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(orcamento.id);
                      }}
                      className="btn btn-sm btn-secondary"
                      title="Editar"
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => handleDownloadPDF(orcamento.id, e)}
                      className="btn btn-sm btn-success"
                      title="Baixar PDF"
                    >
                      PDF
                    </button>
                    <button
                      onClick={(e) => confirmDelete(orcamento, e)}
                      className="btn btn-sm btn-danger"
                      title="Excluir"
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

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirmar Exclusão</h3>
            <p>Tem certeza que deseja excluir o orçamento #{deleteConfirm.id}?</p>
            <p className="warning-text">Esta ação pode ser desfeita posteriormente.</p>
            <div className="modal-actions">
              <button onClick={cancelDelete} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="btn btn-danger">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrcamentoList;
