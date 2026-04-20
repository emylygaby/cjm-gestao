import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Notificacoes.css';

function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('NAO_LIDA');

  useEffect(() => {
    fetchNotificacoes();
    // Atualiza a cada 5 minutos
    const interval = setInterval(fetchNotificacoes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchNotificacoes = async () => {
    try {
      const url = filter === 'NAO_LIDA' 
        ? '/financeiro/notificacoes/nao_lidas/' 
        : `/financeiro/notificacoes/?status=${filter}`;
      
      const response = await api.get(url);
      setNotificacoes(response.data);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLida = async (id) => {
    try {
      await api.post(`/financeiro/notificacoes/${id}/marcar_lida/`);
      fetchNotificacoes();
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const marcarTodasLidas = async () => {
    try {
      await api.post('/financeiro/notificacoes/marcar_todas_lidas/');
      fetchNotificacoes();
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const getTipoLabel = (tipo) => {
    const tipos = {
      'VENCIMENTO_PROXIMO': '⏰ Vencimento Próximo',
      'VENCIMENTO_HOJE': '🔔 Vence Hoje',
      'ATRASADO': '⚠️ Pagamento Atrasado'
    };
    return tipos[tipo] || tipo;
  };

  const getTipoClass = (tipo) => {
    const classes = {
      'VENCIMENTO_PROXIMO': 'notif-warning',
      'VENCIMENTO_HOJE': 'notif-info',
      'ATRASADO': 'notif-danger'
    };
    return classes[tipo] || '';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="notificacoes-container"><div className="loading">Carregando...</div></div>;
  }

  return (
    <div className="notificacoes-container">
      <div className="notificacoes-header">
        <h1>Notificações</h1>
        {notificacoes.length > 0 && filter === 'NAO_LIDA' && (
          <button onClick={marcarTodasLidas} className="btn-marcar-todas">
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="notificacoes-filters">
        <button 
          className={`filter-btn ${filter === 'NAO_LIDA' ? 'active' : ''}`}
          onClick={() => setFilter('NAO_LIDA')}
        >
          Não Lidas
        </button>
        <button 
          className={`filter-btn ${filter === 'LIDA' ? 'active' : ''}`}
          onClick={() => setFilter('LIDA')}
        >
          Lidas
        </button>
        <button 
          className={`filter-btn ${filter === '' ? 'active' : ''}`}
          onClick={() => setFilter('')}
        >
          Todas
        </button>
      </div>

      <div className="notificacoes-list">
        {notificacoes.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma notificação encontrada</p>
          </div>
        ) : (
          notificacoes.map((notif) => (
            <div 
              key={notif.id} 
              className={`notificacao-card ${getTipoClass(notif.tipo)} ${notif.status === 'NAO_LIDA' ? 'nao-lida' : ''}`}
            >
              <div className="notif-header">
                <span className="notif-tipo">{getTipoLabel(notif.tipo)}</span>
                <span className="notif-data">{formatDate(notif.data_criacao)}</span>
              </div>
              <div className="notif-body">
                <p className="notif-mensagem">{notif.mensagem}</p>
                {notif.parcela_numero && (
                  <div className="notif-details">
                    <span>Parcela {notif.parcela_numero}/{notif.parcela_total}</span>
                    <span>R$ {parseFloat(notif.parcela_valor).toFixed(2)}</span>
                    <span>Vencimento: {new Date(notif.parcela_vencimento).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>
              {notif.status === 'NAO_LIDA' && (
                <div className="notif-actions">
                  <button 
                    onClick={() => marcarComoLida(notif.id)}
                    className="btn-marcar-lida"
                  >
                    Marcar como lida
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Notificacoes;
