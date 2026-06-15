import React, { useState, useEffect } from 'react';
import { categoriaFinanceiraService, movimentacaoFinanceiraService, gastoFixoService, parcelamentoService } from '../../services/api';
import './Financeiro.css';

const Financeiro = () => {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMovimentacao, setEditingMovimentacao] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Estados para controle de mês/ano
  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth() + 1); // 1-12
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());
  const [previsaoMensal, setPrevisaoMensal] = useState(null);
  const [editingGastoFixoId, setEditingGastoFixoId] = useState(null);
  const [editingParcelamento, setEditingParcelamento] = useState(null);
  const [parcelamentoForm, setParcelamentoForm] = useState({
    status: 'PENDENTE',
    data_pagamento: new Date().toISOString().split('T')[0]
  });
  
  const [formData, setFormData] = useState({
    descricao: '',
    detalhes: '',
    valor: '',
    tipo: 'SAIDA',
    tipo_movimentacao: 'COMUM',
    data_movimentacao: new Date().toISOString().split('T')[0],
    dia_vencimento: '',
    categoria: '',
    orcamento: ''
  });

  const [formErrors, setFormErrors] = useState({});
  
  useEffect(() => {
    fetchData();
  }, [mesSelecionado, anoSelecionado]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCategorias(),
        fetchMovimentacoes()
      ]);
      setError('');
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCategorias = async () => {
    try {
      const response = await categoriaFinanceiraService.getCategorias();
      console.log('Resposta de categorias:', response.data);
      const categoriasData = Array.isArray(response.data) ? response.data : (response.data.results || []);
      console.log('Categorias processadas:', categoriasData);
      setCategorias(categoriasData);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
      setCategorias([]);
    }
  };
  
  const fetchMovimentacoes = async () => {
    try {
      const response = await movimentacaoFinanceiraService.getPrevisaoMes(anoSelecionado, mesSelecionado);
      setPrevisaoMensal(response.data);
      
      // Combina movimentações reais, parcelamentos e gastos fixos em uma lista única
      const itensCompletos = [
        ...response.data.movimentacoes_reais.map(mov => ({ ...mov, tipoItem: 'real' })),
        ...response.data.parcelamentos.map(parc => ({ ...parc, tipoItem: 'parcelamento' })),
        ...response.data.gastos_fixos.map(gasto => ({ ...gasto, tipoItem: 'gasto_fixo' }))
      ];
      
      // Ordena por data
      itensCompletos.sort((a, b) => {
        const dataA = new Date(a.data_movimentacao || a.data_vencimento);
        const dataB = new Date(b.data_movimentacao || b.data_vencimento);
        return dataB - dataA; // Mais recentes primeiro
      });
      
      setMovimentacoes(itensCompletos);
    } catch (err) {
      console.error('Erro ao carregar movimentações:', err);
    }
  };
  
  const mesAnterior = () => {
    if (mesSelecionado === 1) {
      setMesSelecionado(12);
      setAnoSelecionado(anoSelecionado - 1);
    } else {
      setMesSelecionado(mesSelecionado - 1);
    }
  };
  
  const proximoMes = () => {
    if (mesSelecionado === 12) {
      setMesSelecionado(1);
      setAnoSelecionado(anoSelecionado + 1);
    } else {
      setMesSelecionado(mesSelecionado + 1);
    }
  };
  
  const mesAtual = () => {
    const agora = new Date();
    setMesSelecionado(agora.getMonth() + 1);
    setAnoSelecionado(agora.getFullYear());
  };
  
  const getNomeMes = (mes) => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes - 1];
  };
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = {
        ...prev,
        [name]: value
      };

      if (name === 'tipo_movimentacao') {
        // Para gasto fixo (categorizado), sempre tratamos como SAÍDA.
        if (value === 'CATEGORIZADA') {
          next.tipo = 'SAIDA';
          next.orcamento = '';
          next.detalhes = '';
        }

        // Se o usuário alternar o tipo, limpa estados de edição.
        setEditingMovimentacao(null);
        setEditingGastoFixoId(null);
      }

      return next;
    });
    
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Descrição/Nome é obrigatório
    if (!formData.descricao.trim()) {
      newErrors.descricao = formData.tipo_movimentacao === 'CATEGORIZADA'
        ? 'Nome do gasto fixo é obrigatório'
        : 'Descrição é obrigatória para movimentações comuns';
    }

    // Categoria é obrigatória apenas para movimentações categorizadas (gastos fixos)
    if (formData.tipo_movimentacao === 'CATEGORIZADA' && !formData.categoria) {
      newErrors.categoria = 'Categoria é obrigatória para gastos fixos';
    }

    if (formData.tipo_movimentacao === 'CATEGORIZADA') {
      const dia = parseInt(formData.dia_vencimento, 10);
      if (isNaN(dia) || dia < 1 || dia > 31) {
        newErrors.dia_vencimento = 'Dia de vencimento deve estar entre 1 e 31';
      }
    }

    const valor = parseFloat(formData.valor);
    if (isNaN(valor) || valor <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    }

    if (formData.tipo_movimentacao === 'COMUM' && !formData.data_movimentacao) {
      newErrors.data_movimentacao = 'Data é obrigatória';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // === GASTO FIXO (REGRA RECORRENTE) ===
      if (formData.tipo_movimentacao === 'CATEGORIZADA') {
        const payload = {
          nome: formData.descricao.trim(),
          valor: parseFloat(formData.valor),
          periodo: 'MENSAL',
          dia_vencimento: parseInt(formData.dia_vencimento, 10),
          categoria: parseInt(formData.categoria)
        };

        if (editingGastoFixoId) {
          await gastoFixoService.updateGastoFixo(editingGastoFixoId, payload);
        } else {
          await gastoFixoService.createGastoFixo(payload);
        }

        await fetchMovimentacoes();
        resetForm();
        setShowForm(false);
        setError('');
        return;
      }
      
      const dataToSend = {
        descricao: formData.descricao,
        detalhes: formData.detalhes || null,
        valor: parseFloat(formData.valor),
        tipo: formData.tipo,
        tipo_movimentacao: formData.tipo_movimentacao,
        data_movimentacao: formData.data_movimentacao,
        categoria: formData.tipo_movimentacao === 'CATEGORIZADA' && formData.categoria 
          ? parseInt(formData.categoria) 
          : null,
        orcamento: formData.orcamento ? parseInt(formData.orcamento) : null
      };
      
      if (editingMovimentacao) {
        await movimentacaoFinanceiraService.updateMovimentacao(editingMovimentacao.id, dataToSend);
      } else {
        await movimentacaoFinanceiraService.createMovimentacao(dataToSend);
      }
      
      await fetchMovimentacoes();
      resetForm();
      setShowForm(false);
      setError('');
    } catch (error) {
      console.error('Erro ao salvar movimentação:', error);
      
      if (error.response?.data) {
        setFormErrors(error.response.data);
      } else {
        setError('Erro ao salvar movimentação. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getMovimentacaoIdOriginal = (item) => {
    // Gastos fixos "inferidos" a partir de movimentações categorizadas antigas
    if (item.tipoItem === 'gasto_fixo' && typeof item.id === 'string' && item.id.startsWith('gasto_fixo_cat_')) {
      return parseInt(item.id.replace('gasto_fixo_cat_', ''), 10);
    }
    return item.id;
  };

  const getGastoFixoIdOriginal = (item) => {
    // Gastos fixos vindos da tabela GastoFixo
    if (item.tipoItem === 'gasto_fixo' && typeof item.id === 'string' && item.id.startsWith('gasto_fixo_') && !item.id.startsWith('gasto_fixo_cat_')) {
      return parseInt(item.id.replace('gasto_fixo_', ''), 10);
    }
    return null;
  };

  const getParcelamentoIdOriginal = (item) => {
    if (item.parcelamento_id) {
      return item.parcelamento_id;
    }

    if (item.tipoItem === 'parcelamento' && typeof item.id === 'string' && item.id.startsWith('parcela_')) {
      return parseInt(item.id.replace('parcela_', ''), 10);
    }

    return item.id;
  };

  const handleEdit = async (movimentacao) => {
    try {
      // Se for um gasto fixo vindo da tabela GastoFixo, edita como regra recorrente
      if (movimentacao.tipoItem === 'gasto_fixo') {
        const gastoFixoId = getGastoFixoIdOriginal(movimentacao);
        if (gastoFixoId) {
          const response = await gastoFixoService.getGastoFixo(gastoFixoId);
          const gasto = response.data;
          setEditingGastoFixoId(gasto.id);
          setEditingMovimentacao(null);
          setFormData({
            descricao: gasto.nome || '',
            detalhes: '',
            valor: (gasto.valor ?? '').toString(),
            tipo: 'SAIDA',
            tipo_movimentacao: 'CATEGORIZADA',
            data_movimentacao: new Date().toISOString().split('T')[0],
            dia_vencimento: (gasto.dia_vencimento ?? '').toString(),
            categoria: gasto.categoria ? gasto.categoria.toString() : '',
            orcamento: ''
          });
          setShowForm(true);
          setFormErrors({});
          return;
        }

        // Caso contrário, é um gasto fixo "inferido" (gasto_fixo_cat_) e edita a movimentação original
        const idOriginal = getMovimentacaoIdOriginal(movimentacao);
        const response = await movimentacaoFinanceiraService.getMovimentacao(idOriginal);
        const movimentacaoParaEditar = response.data;
        setEditingMovimentacao(movimentacaoParaEditar);
        setEditingGastoFixoId(null);
        setFormData({
          descricao: movimentacaoParaEditar.descricao,
          detalhes: movimentacaoParaEditar.detalhes || '',
          valor: movimentacaoParaEditar.valor.toString(),
          tipo: movimentacaoParaEditar.tipo,
          tipo_movimentacao: movimentacaoParaEditar.tipo_movimentacao || 'COMUM',
          data_movimentacao: movimentacaoParaEditar.data_movimentacao,
          dia_vencimento: '',
          categoria: movimentacaoParaEditar.categoria ? movimentacaoParaEditar.categoria.toString() : '',
          orcamento: movimentacaoParaEditar.orcamento ? movimentacaoParaEditar.orcamento.toString() : ''
        });
        setShowForm(true);
        setFormErrors({});
        return;
      }

      // Movimentação real
      setEditingMovimentacao(movimentacao);
      setEditingGastoFixoId(null);
      setFormData({
        descricao: movimentacao.descricao,
        detalhes: movimentacao.detalhes || '',
        valor: movimentacao.valor.toString(),
        tipo: movimentacao.tipo,
        tipo_movimentacao: movimentacao.tipo_movimentacao || 'COMUM',
        data_movimentacao: movimentacao.data_movimentacao,
        dia_vencimento: '',
        categoria: movimentacao.categoria ? movimentacao.categoria.toString() : '',
        orcamento: movimentacao.orcamento ? movimentacao.orcamento.toString() : ''
      });
      setShowForm(true);
      setFormErrors({});
    } catch (error) {
      console.error('Erro ao buscar movimentação:', error);
      setError('Erro ao carregar dados para edição');
    }
  };

  const handleDelete = async (item) => {
    try {
      setLoading(true);
      if (item.tipoItem === 'gasto_fixo') {
        const gastoFixoId = getGastoFixoIdOriginal(item);
        if (gastoFixoId) {
          await gastoFixoService.deleteGastoFixo(gastoFixoId);
        } else {
          // Gasto fixo "inferido" (movimentação categorizada antiga)
          const idParaExcluir = getMovimentacaoIdOriginal(item);
          await movimentacaoFinanceiraService.deleteMovimentacao(idParaExcluir);
        }
      } else {
        const idParaExcluir = getMovimentacaoIdOriginal(item);
        await movimentacaoFinanceiraService.deleteMovimentacao(idParaExcluir);
      }
      await fetchMovimentacoes();
      setDeleteConfirm(null);
      setError('');
    } catch (error) {
      console.error('Erro ao excluir movimentação:', error);
      setError('Erro ao excluir movimentação');
    } finally {
      setLoading(false);
    }
  };

  const handleEditParcelamento = (parcelamento) => {
    setEditingParcelamento(parcelamento);
    setParcelamentoForm({
      status: parcelamento.status || 'PENDENTE',
      data_pagamento: parcelamento.data_pagamento || new Date().toISOString().split('T')[0]
    });
    setError('');
  };

  const handleChangeParcelamentoForm = (e) => {
    const { name, value } = e.target;
    setParcelamentoForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveParcelamento = async (e) => {
    e.preventDefault();

    if (!editingParcelamento) {
      return;
    }

    try {
      setLoading(true);

      const payload = {
        status: parcelamentoForm.status,
        data_pagamento: parcelamentoForm.status === 'PAGO' ? parcelamentoForm.data_pagamento : null
      };

      const parcelamentoId = getParcelamentoIdOriginal(editingParcelamento);
      await parcelamentoService.updateParcelamento(parcelamentoId, payload);
      await fetchMovimentacoes();
      setEditingParcelamento(null);
      setError('');
    } catch (error) {
      console.error('Erro ao atualizar parcelamento:', error);
      setError('Erro ao atualizar parcelamento');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelParcelamento = () => {
    setEditingParcelamento(null);
  };

  const confirmDelete = (movimentacao) => {
    setDeleteConfirm(movimentacao);
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    setFormData({
      descricao: '',
      detalhes: '',
      valor: '',
      tipo: 'SAIDA',
      tipo_movimentacao: 'COMUM',
      data_movimentacao: new Date().toISOString().split('T')[0],
      dia_vencimento: '',
      categoria: '',
      orcamento: ''
    });
    setEditingMovimentacao(null);
    setEditingGastoFixoId(null);
    setFormErrors({});
  };

  const handleNewMovimentacao = () => {
    resetForm();
    setShowForm(true);
  };

  const handleCancelForm = () => {
    resetForm();
    setShowForm(false);
  };

  const getTipoLabel = (tipo) => {
    return tipo === 'ENTRADA' ? 'Entrada' : 'Saída';
  };

  const getTipoMovimentacaoLabel = (tipoMov) => {
    return tipoMov === 'CATEGORIZADA' ? 'Gasto Fixo' : 'Movimentação Comum';
  };

  const getTipoOrigemLabel = (movimentacao) => {
    if (movimentacao.tipoItem === 'parcelamento') {
      return 'Parcelamento';
    }
    if (movimentacao.tipoItem === 'gasto_fixo') {
      return 'Gasto Fixo';
    }
    if (movimentacao.orcamento) {
      return 'Orçamento';
    }
    return movimentacao.tipo_movimentacao === 'CATEGORIZADA' ? 'Gasto Fixo' : 'Manual';
  };
  
  const getTipoItem = (item) => {
    if (item.tipoItem === 'parcelamento') {
      // Parcelamentos herdam o tipo da movimentação que os criou
      // Como não temos o tipo diretamente, deduzimos que parcelamentos de orçamento são entradas
      return 'ENTRADA';
    }
    if (item.tipoItem === 'gasto_fixo') {
      return 'SAIDA';
    }
    return item.tipo || 'SAIDA';
  };
  
  const getValorItem = (item) => {
    if (item.tipoItem === 'parcelamento' || item.tipoItem === 'gasto_fixo') {
      return item.valor;
    }
    return item.valor;
  };
  
  const getDataItem = (item) => {
    if (item.tipoItem === 'parcelamento' || item.tipoItem === 'gasto_fixo') {
      return item.data_vencimento;
    }
    return item.data_movimentacao;
  };
  
  const getStatusBadge = (item) => {
    if (item.tipoItem === 'parcelamento') {
      if (item.status === 'PAGO') {
        return <span className="badge badge-success">Pago</span>;
      }
      if (item.status === 'ATRASADO') {
        return <span className="badge badge-danger">Atrasado</span>;
      }
      return <span className="badge badge-warning">Pendente</span>;
    }
    if (item.tipoItem === 'gasto_fixo') {
      return <span className="badge badge-info">Previsto</span>;
    }
    return <span className="badge badge-success">Realizado</span>;
  };

  if (loading && movimentacoes.length === 0) {
    return (
      <div className="financeiro-container">
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="financeiro-container">
      <div className="page-header">
        <div className="header-content">
          <h1>Gestão Financeira</h1>
          <p>Controle de entradas e saídas financeiras</p>
        </div>
        {!showForm && (
          <button onClick={handleNewMovimentacao} className="btn btn-primary">
            Nova Movimentação
          </button>
        )}
      </div>
      
      {/* Navegação de Mês */}
      <div className="month-selector">
        <button onClick={mesAnterior} className="btn btn-secondary">
          ← Anterior
        </button>
        <div className="month-display">
          <h2>{getNomeMes(mesSelecionado)} de {anoSelecionado}</h2>
          {(mesSelecionado !== hoje.getMonth() + 1 || anoSelecionado !== hoje.getFullYear()) && (
            <button onClick={mesAtual} className="btn btn-link">
              Voltar para hoje
            </button>
          )}
        </div>
        <button onClick={proximoMes} className="btn btn-secondary">
          Próximo →
        </button>
      </div>
      
      {/* Resumo Financeiro */}
      {previsaoMensal && (
        <div className="resumo-financeiro">
          <div className="resumo-card">
            <h3>Entradas</h3>
            <p className="valor-positivo">{formatCurrency(previsaoMensal.resumo.total_entradas_previsto)}</p>
            <small>Real: {formatCurrency(previsaoMensal.resumo.entradas_reais)}</small>
          </div>
          <div className="resumo-card">
            <h3>Saídas</h3>
            <p className="valor-negativo">{formatCurrency(previsaoMensal.resumo.total_saidas_previsto)}</p>
            <small>Real: {formatCurrency(previsaoMensal.resumo.saidas_reais)}</small>
          </div>
          <div className="resumo-card">
            <h3>Saldo Previsto</h3>
            <p className={previsaoMensal.resumo.saldo_previsto >= 0 ? 'valor-positivo' : 'valor-negativo'}>
              {formatCurrency(previsaoMensal.resumo.saldo_previsto)}
            </p>
            <small>
              {previsaoMensal.resumo.quantidade_movimentacoes_reais} realizados | 
              {previsaoMensal.resumo.quantidade_parcelamentos} parcelamentos | 
              {previsaoMensal.resumo.quantidade_gastos_fixos} fixos
            </small>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {showForm && (
        <div className="form-card">
          <div className="form-card-header">
            <h2>
              {(editingMovimentacao || editingGastoFixoId)
                ? (formData.tipo_movimentacao === 'CATEGORIZADA' ? 'Editar Gasto Fixo' : 'Editar Movimentação')
                : (formData.tipo_movimentacao === 'CATEGORIZADA' ? 'Novo Gasto Fixo' : 'Nova Movimentação')}
            </h2>
            <button onClick={handleCancelForm} className="btn-close">
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit} className="financeiro-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="descricao">
                  {formData.tipo_movimentacao === 'CATEGORIZADA' ? 'Nome do Gasto Fixo *' : 'Descrição *'}
                </label>
                <input
                  type="text"
                  id="descricao"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  className={formErrors.descricao ? 'error' : ''}
                  placeholder={formData.tipo_movimentacao === 'CATEGORIZADA' ? 'Ex: Salários' : 'Ex: Pagamento de fornecedor'}
                />
                {formErrors.descricao && (
                  <span className="error-message">{formErrors.descricao}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="valor">Valor (R$) *</label>
                <input
                  type="number"
                  id="valor"
                  name="valor"
                  value={formData.valor}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={formErrors.valor ? 'error' : ''}
                  placeholder="0,00"
                />
                {formErrors.valor && (
                  <span className="error-message">{formErrors.valor}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tipo">Tipo *</label>
                <select
                  id="tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className={formErrors.tipo ? 'error' : ''}
                  disabled={formData.tipo_movimentacao === 'CATEGORIZADA'}
                >
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
                {formErrors.tipo && (
                  <span className="error-message">{formErrors.tipo}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="tipo_movimentacao">Tipo de Movimentação *</label>
                <select
                  id="tipo_movimentacao"
                  name="tipo_movimentacao"
                  value={formData.tipo_movimentacao}
                  onChange={handleChange}
                  className={formErrors.tipo_movimentacao ? 'error' : ''}
                >
                  <option value="COMUM">Movimentação Comum</option>
                  <option value="CATEGORIZADA">Gasto Fixo (Categorizado)</option>
                </select>
                {formErrors.tipo_movimentacao && (
                  <span className="error-message">{formErrors.tipo_movimentacao}</span>
                )}
              </div>
            </div>

            {formData.tipo_movimentacao === 'COMUM' && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="data_movimentacao">Data *</label>
                  <input
                    type="date"
                    id="data_movimentacao"
                    name="data_movimentacao"
                    value={formData.data_movimentacao}
                    onChange={handleChange}
                    className={formErrors.data_movimentacao ? 'error' : ''}
                  />
                  {formErrors.data_movimentacao && (
                    <span className="error-message">{formErrors.data_movimentacao}</span>
                  )}
                </div>
              </div>
            )}

            {formData.tipo_movimentacao === 'CATEGORIZADA' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="categoria">Categoria *</label>
                    <select
                      id="categoria"
                      name="categoria"
                      value={formData.categoria}
                      onChange={handleChange}
                      className={formErrors.categoria ? 'error' : ''}
                    >
                      <option value="">Selecione uma categoria</option>
                    {Array.isArray(categorias) && categorias
                      .filter(cat => cat.tipo === 'SAIDA')
                      .map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nome}
                        </option>
                      ))}
                  </select>
                  {formErrors.categoria && (
                    <span className="error-message">{formErrors.categoria}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="dia_vencimento">Dia de Vencimento (1-31) *</label>
                  <input
                    type="number"
                    id="dia_vencimento"
                    name="dia_vencimento"
                    value={formData.dia_vencimento}
                    onChange={handleChange}
                    min="1"
                    max="31"
                    className={formErrors.dia_vencimento ? 'error' : ''}
                    placeholder="Ex: 10"
                  />
                  <small className="help-text">
                    Usado para projetar o gasto fixo todo mês.
                  </small>
                  {formErrors.dia_vencimento && (
                    <span className="error-message">{formErrors.dia_vencimento}</span>
                  )}
                </div>
              </div>
              </>
            )}

            {formData.tipo_movimentacao === 'COMUM' && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="detalhes">Detalhes Adicionais</label>
                  <input
                    type="text"
                    id="detalhes"
                    name="detalhes"
                    value={formData.detalhes}
                    onChange={handleChange}
                    className={formErrors.detalhes ? 'error' : ''}
                    placeholder="Ex: Observações"
                  />
                  {formErrors.detalhes && (
                    <span className="error-message">{formErrors.detalhes}</span>
                  )}
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={handleCancelForm} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {movimentacoes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-content">
            <h3>Nenhuma movimentação financeira cadastrada</h3>
            <p>Comece adicionando sua primeira movimentação</p>
            <button onClick={handleNewMovimentacao} className="btn btn-primary">
              Cadastrar Movimentação
            </button>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="financeiro-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Origem</th>
                <th>Status</th>
                <th>Valor</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((mov, index) => (
                <tr key={mov.id || `${mov.tipoItem}_${index}`} className={mov.tipoItem !== 'real' ? 'row-previsto' : ''}>
                  <td>{formatDate(getDataItem(mov))}</td>
                  <td>{mov.descricao}</td>
                  <td>{mov.categoria_nome || mov.categoria || '-'}</td>
                  <td>
                    <span className={`badge badge-${getTipoItem(mov).toLowerCase()}`}>
                      {getTipoLabel(getTipoItem(mov))}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-origem">
                      {getTipoOrigemLabel(mov)}
                    </span>
                  </td>
                  <td>
                    {getStatusBadge(mov)}
                  </td>
                  <td className={getTipoItem(mov) === 'ENTRADA' ? 'valor-positivo' : 'valor-negativo'}>
                    {formatCurrency(getValorItem(mov))}
                  </td>
                  <td className="text-center">
                    {(mov.tipoItem === 'real' || mov.tipoItem === 'gasto_fixo') && (
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(mov)}
                          className="btn-action btn-edit"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => confirmDelete(mov)}
                          className="btn-action btn-delete"
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                    {mov.tipoItem === 'parcelamento' && (
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEditParcelamento(mov)}
                          className="btn-action btn-paid"
                          title="Editar parcela"
                        >
                          {mov.status === 'PAGO' ? '✅' : '💰'}
                        </button>
                      </div>
                    )}
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
            <p>Tem certeza que deseja excluir a movimentação "{deleteConfirm.descricao}"?</p>
            
            {deleteConfirm.tipoItem === 'gasto_fixo' && (
              <div className="alert alert-info" style={{ marginTop: '15px' }}>
                <strong>ℹ️ Atenção - Gasto Fixo Recorrente:</strong>
                <p style={{ marginTop: '8px', fontSize: '0.9em' }}>
                  Este gasto fixo será removido a partir de <strong>{getNomeMes(mesSelecionado)}/{anoSelecionado}</strong> e meses seguintes.
                  O histórico dos meses anteriores será mantido para análise financeira.
                </p>
              </div>
            )}
            
            <div className="modal-actions">
              <button onClick={cancelDelete} className="btn btn-secondary">
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="btn btn-danger"
                disabled={loading}
              >
                {loading ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingParcelamento && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Editar parcela</h3>
            <p>
              Atualize o status da parcela {editingParcelamento.numero_parcela}/{editingParcelamento.total_parcelas}
              {' '}de {editingParcelamento.orcamento_cliente || editingParcelamento.cliente || 'orçamento'}.
            </p>

            <form onSubmit={handleSaveParcelamento} className="parcelamento-form">
              <div className="form-group">
                <label htmlFor="parcelamento-status">Status</label>
                <select
                  id="parcelamento-status"
                  name="status"
                  value={parcelamentoForm.status}
                  onChange={handleChangeParcelamentoForm}
                >
                  <option value="PENDENTE">Pendente</option>
                  <option value="PAGO">Pago</option>
                  <option value="ATRASADO">Atrasado</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="parcelamento-data-pagamento">Data de pagamento</label>
                <input
                  id="parcelamento-data-pagamento"
                  type="date"
                  name="data_pagamento"
                  value={parcelamentoForm.data_pagamento}
                  onChange={handleChangeParcelamentoForm}
                  disabled={parcelamentoForm.status !== 'PAGO'}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleCancelParcelamento} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financeiro;
