import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './Dashboard.css';

const getCurrentMonth = () => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
};

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const navigate = useNavigate();

  const COLORS = {
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    gray: '#6b7280',
    pendente: '#f59e0b',
    aprovado: '#10b981',
    rejeitado: '#ef4444',
    em_andamento: '#3b82f6',
    concluido: '#059669',
    cancelado: '#6b7280'
  };

  const STATUS_COLORS = {
    PENDENTE: COLORS.pendente,
    APROVADO: COLORS.aprovado,
    REJEITADO: COLORS.rejeitado,
    EM_ANDAMENTO: COLORS.em_andamento,
    CONCLUIDO: COLORS.concluido,
    CANCELADO: COLORS.cancelado
  };

  const periodoLabel = useMemo(() => {
    if (dashboardData?.periodo_referencia?.label) {
      return dashboardData.periodo_referencia.label;
    }

    const [year, month] = selectedMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [dashboardData, selectedMonth]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/financeiro/dashboard/', {
        params: { mes: selectedMonth }
      });
      setDashboardData(response.data);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setError('Erro ao carregar dados do dashboard. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);

  const formatPercentage = (value) => `${(value || 0).toFixed(2)}%`;

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Carregando dados do dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-container">
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="btn-retry">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { visao_geral_financeira, funil_vendas, inteligencia_operacao } = dashboardData;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Painel Executivo</h1>
          <p>Indicadores estratégicos com análise mensal consolidada</p>
          <span className="period-pill">Período: {periodoLabel}</span>
        </div>

        <div className="dashboard-actions">
          <label htmlFor="mes-referencia" className="month-label">
            Mês de referência
          </label>
          <input
            id="mes-referencia"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="month-input"
          />
          <button onClick={fetchDashboardData} className="btn-refresh">
            Atualizar
          </button>
        </div>
      </div>

      <section className="dashboard-section">
        <h2 className="section-title">Visão Geral Financeira</h2>

        <div className="cards-grid">
          <div className="stat-card card-entrada">
            <div className="card-icon card-icon-success">EN</div>
            <div className="card-content">
              <div className="card-label">Entradas do mês</div>
              <div className="card-value">{formatCurrency(visao_geral_financeira.caixa_mes.entradas)}</div>
              <div className="card-sublabel">
                Parcelas pagas: {formatCurrency(visao_geral_financeira.caixa_mes.parcelas_pagas)}
              </div>
            </div>
          </div>

          <div className="stat-card card-saida">
            <div className="card-icon card-icon-danger">SA</div>
            <div className="card-content">
              <div className="card-label">Saídas do mês</div>
              <div className="card-value">{formatCurrency(visao_geral_financeira.caixa_mes.saidas)}</div>
              <div className="card-sublabel">
                Fixos projetados: {formatCurrency(visao_geral_financeira.caixa_mes.saidas_fixas_projetadas)}
              </div>
            </div>
          </div>

          <div
            className={`stat-card ${
              visao_geral_financeira.caixa_mes.saldo >= 0 ? 'card-saldo-positivo' : 'card-saldo-negativo'
            }`}
          >
            <div
              className={`card-icon ${
                visao_geral_financeira.caixa_mes.saldo >= 0 ? 'card-icon-success' : 'card-icon-danger'
              }`}
            >
              SD
            </div>
            <div className="card-content">
              <div className="card-label">Saldo do mês</div>
              <div className="card-value">{formatCurrency(visao_geral_financeira.caixa_mes.saldo)}</div>
              <div className="card-sublabel">Entradas menos saídas</div>
            </div>
          </div>

          <div
            className={`stat-card card-inadimplencia ${
              visao_geral_financeira.inadimplencia.quantidade_parcelas > 0 ? 'card-alert' : ''
            }`}
            onClick={() =>
              visao_geral_financeira.inadimplencia.quantidade_parcelas > 0 && navigate('/financeiro')
            }
            style={{
              cursor:
                visao_geral_financeira.inadimplencia.quantidade_parcelas > 0 ? 'pointer' : 'default'
            }}
          >
            <div className="card-icon card-icon-warning">AT</div>
            <div className="card-content">
              <div className="card-label">Valores em atraso</div>
              <div className="card-value">
                {formatCurrency(visao_geral_financeira.inadimplencia.total_atrasado)}
              </div>
              <div className="card-sublabel">
                {visao_geral_financeira.inadimplencia.quantidade_parcelas} parcela(s) em aberto
              </div>
            </div>
          </div>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Projeção de faturamento para os próximos 6 meses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={visao_geral_financeira.projecao_faturamento}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #d6e0f0' }}
              />
              <Legend />
              <Bar
                dataKey="receita_prevista"
                name="Receita prevista"
                fill={COLORS.success}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="chart-description">
            Projeção baseada em parcelas com vencimento nos meses futuros
          </p>
        </div>

        {visao_geral_financeira.inadimplencia.orcamentos_inadimplentes.length > 0 && (
          <div className="chart-container">
            <h3 className="chart-title">Clientes com parcelas em atraso</h3>
            <div className="table-responsive">
              <table className="inadimplentes-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Telefone</th>
                    <th>Valor atrasado</th>
                    <th>Parcelas</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {visao_geral_financeira.inadimplencia.orcamentos_inadimplentes.map((item, index) => (
                    <tr key={index}>
                      <td>{item.cliente_nome}</td>
                      <td>{item.cliente_telefone || '-'}</td>
                      <td className="valor-destaque">{formatCurrency(item.valor_atrasado)}</td>
                      <td>{item.quantidade_parcelas}</td>
                      <td>
                        <a href={`tel:${item.cliente_telefone}`} className="btn-contact">
                          Contatar
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Funil de Vendas</h2>

        <div className="cards-grid">
          <div className="stat-card card-conversao">
            <div className="card-icon card-icon-info">CV</div>
            <div className="card-content">
              <div className="card-label">Taxa de conversão do mês</div>
              <div className="card-value">{formatPercentage(funil_vendas.taxa_conversao.percentual)}</div>
              <div className="card-sublabel">
                {funil_vendas.taxa_conversao.orcamentos_aprovados} de{' '}
                {funil_vendas.taxa_conversao.total_orcamentos} orçamentos convertidos
              </div>
            </div>
          </div>

          <div className="stat-card card-ticket">
            <div className="card-icon card-icon-info">TM</div>
            <div className="card-content">
              <div className="card-label">Ticket médio do mês</div>
              <div className="card-value">{formatCurrency(funil_vendas.ticket_medio.valor)}</div>
              <div className="card-sublabel">
                {funil_vendas.ticket_medio.quantidade_aprovados} orçamentos aprovados no período
              </div>
            </div>
          </div>

          <div className="stat-card card-pipeline">
            <div className="card-icon card-icon-info">PL</div>
            <div className="card-content">
              <div className="card-label">Pipeline do mês</div>
              <div className="card-value">{funil_vendas.pipeline.total_orcamentos}</div>
              <div className="card-sublabel">Valor agregado: {formatCurrency(funil_vendas.pipeline.valor_total)}</div>
            </div>
          </div>
        </div>

        <div className="charts-row">
          <div className="chart-container chart-half">
            <h3 className="chart-title">Distribuição de status dos orçamentos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={funil_vendas.pipeline.status_breakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status_display, quantidade }) => `${status_display}: ${quantidade}`}
                  outerRadius={100}
                  dataKey="quantidade"
                >
                  {funil_vendas.pipeline.status_breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS.gray} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container chart-half">
            <h3 className="chart-title">Status detalhado</h3>
            <div className="pipeline-list">
              {funil_vendas.pipeline.status_breakdown.map((item, index) => (
                <div
                  key={index}
                  className="pipeline-item"
                  onClick={() => navigate('/orcamentos')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="pipeline-status">
                    <div
                      className="status-indicator"
                      style={{ backgroundColor: STATUS_COLORS[item.status] || COLORS.gray }}
                    ></div>
                    <span className="status-name">{item.status_display}</span>
                  </div>
                  <div className="pipeline-values">
                    <div className="pipeline-count">{item.quantidade}</div>
                    <div className="pipeline-value">{formatCurrency(item.valor_total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Inteligência de Operação</h2>

        <div className="chart-container">
          <h3 className="chart-title">Serviço completo versus mão de obra</h3>
          <div className="comparativo-grid">
            <div className="comparativo-card">
              <h4>Serviço completo</h4>
              <div className="comparativo-stats">
                <div className="stat-row">
                  <span>Quantidade</span>
                  <strong>{inteligencia_operacao.comparativo_tipo_servico.servico_completo.quantidade}</strong>
                </div>
                <div className="stat-row">
                  <span>Valor total</span>
                  <strong>
                    {formatCurrency(inteligencia_operacao.comparativo_tipo_servico.servico_completo.valor_total)}
                  </strong>
                </div>
                <div className="stat-row">
                  <span>Lucro total</span>
                  <strong className="text-success">
                    {formatCurrency(inteligencia_operacao.comparativo_tipo_servico.servico_completo.lucro_total)}
                  </strong>
                </div>
                <div className="stat-row">
                  <span>Margem</span>
                  <strong className="text-success">
                    {formatPercentage(
                      inteligencia_operacao.comparativo_tipo_servico.servico_completo.margem_percentual
                    )}
                  </strong>
                </div>
              </div>
            </div>

            <div className="comparativo-card">
              <h4>Mão de obra</h4>
              <div className="comparativo-stats">
                <div className="stat-row">
                  <span>Quantidade</span>
                  <strong>{inteligencia_operacao.comparativo_tipo_servico.mao_obra.quantidade}</strong>
                </div>
                <div className="stat-row">
                  <span>Valor total</span>
                  <strong>{formatCurrency(inteligencia_operacao.comparativo_tipo_servico.mao_obra.valor_total)}</strong>
                </div>
                <div className="stat-row">
                  <span>Lucro total</span>
                  <strong className="text-success">
                    {formatCurrency(inteligencia_operacao.comparativo_tipo_servico.mao_obra.lucro_total)}
                  </strong>
                </div>
                <div className="stat-row">
                  <span>Margem</span>
                  <strong className="text-success">
                    {formatPercentage(inteligencia_operacao.comparativo_tipo_servico.mao_obra.margem_percentual)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Margem de lucro: previsto versus realizado</h3>
          <div className="lucro-comparison">
            <div className="lucro-card">
              <div className="lucro-label">Lucro previsto</div>
              <div className="lucro-value">{formatCurrency(inteligencia_operacao.margem_lucro.lucro_previsto)}</div>
              <div className="lucro-sublabel">Com base nos orçamentos aprovados do período</div>
            </div>
            <div className="lucro-separator">→</div>
            <div className="lucro-card">
              <div className="lucro-label">Lucro realizado</div>
              <div className="lucro-value">{formatCurrency(inteligencia_operacao.margem_lucro.lucro_realizado)}</div>
              <div className="lucro-sublabel">Entradas menos saídas registradas no período</div>
            </div>
            <div className="lucro-separator">=</div>
            <div
              className={`lucro-card ${
                inteligencia_operacao.margem_lucro.diferenca >= 0 ? 'lucro-positivo' : 'lucro-negativo'
              }`}
            >
              <div className="lucro-label">Diferença</div>
              <div className="lucro-value">{formatCurrency(inteligencia_operacao.margem_lucro.diferenca)}</div>
              <div className="lucro-sublabel">
                {inteligencia_operacao.margem_lucro.diferenca >= 0
                  ? 'Resultado acima do previsto'
                  : 'Resultado abaixo do previsto'}
              </div>
            </div>
          </div>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Top 5 produtos e serviços mais rentáveis</h3>
          <div className="table-responsive">
            <table className="top-produtos-table">
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Produto/Serviço</th>
                  <th>Tipo</th>
                  <th>Qtd. vendida</th>
                  <th>Receita total</th>
                  <th>Lucro total</th>
                  <th>Margem</th>
                </tr>
              </thead>
              <tbody>
                {inteligencia_operacao.top_produtos_rentaveis.map((produto, index) => (
                  <tr key={index}>
                    <td className="posicao">#{index + 1}</td>
                    <td className="produto-nome">{produto.produto_nome}</td>
                    <td>
                      <span className={`badge ${produto.is_mao_obra ? 'badge-mao-obra' : 'badge-produto'}`}>
                        {produto.is_mao_obra ? 'Mão de obra' : 'Serviço completo'}
                      </span>
                    </td>
                    <td>{produto.quantidade_vendida.toFixed(2)}</td>
                    <td>{formatCurrency(produto.receita_total)}</td>
                    <td className="text-success">{formatCurrency(produto.lucro_total)}</td>
                    <td className="text-success">{formatPercentage(produto.margem_percentual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="section-title">Ações rápidas</h2>
        <div className="quick-actions">
          <Link to="/orcamentos/novo" className="action-button action-primary">
            Novo orçamento
          </Link>
          <Link to="/clientes/novo" className="action-button action-secondary">
            Novo cliente
          </Link>
          <Link to="/financeiro" className="action-button action-secondary">
            Movimentações
          </Link>
          <Link to="/produtos" className="action-button action-secondary">
            Produtos
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
