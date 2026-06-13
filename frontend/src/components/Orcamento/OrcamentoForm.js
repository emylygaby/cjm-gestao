import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { orcamentoService, clienteService, produtoService } from '../../services/api';
import PagamentoModal from './PagamentoModal';
import './OrcamentoForm.css';

const OrcamentoForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const STATUS_TRANSITIONS = {
    PENDENTE: ['APROVADO', 'REJEITADO'],
    APROVADO: ['EM_ANDAMENTO', 'CANCELADO'],
    EM_ANDAMENTO: ['CONCLUIDO', 'CANCELADO'],
    REJEITADO: [],
    CONCLUIDO: [],
    CANCELADO: []
  };

  const ALL_STATUSES = ['PENDENTE', 'APROVADO', 'REJEITADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'];

  const [formData, setFormData] = useState({
    cliente: '',
    data_emissao: new Date().toISOString().split('T')[0],
    data_validade: '',
    status: 'PENDENTE',
    observacoes: ''
  });

  const [itens, setItens] = useState([]);
  const [novoItem, setNovoItem] = useState({
    produto: '',
    quantidade: '',
    preco_venda: '',
    custo_unitario: ''
  });

  const [tipoOrcamento, setTipoOrcamento] = useState('produto'); // 'produto' ou 'mao_de_obra'
  const [maoDeObraItens, setMaoDeObraItens] = useState({
    estrutura: { quantidade: '', preco: '', custo: '' },
    placa: { quantidade: '', preco: '', custo: '' },
    acabamento: { quantidade: '', preco: '', custo: '' }
  });

  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [produtosMaoObra, setProdutosMaoObra] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [orcamentoParaPagamento, setOrcamentoParaPagamento] = useState(null);
  const [statusAnterior, setStatusAnterior] = useState('PENDENTE');

  useEffect(() => {
    fetchClientes();
    fetchProdutos();
    if (isEditing) {
      fetchOrcamento();
    }
  }, [id, isEditing]);

  const fetchClientes = async () => {
    try {
      const response = await clienteService.getClientes();
      const clientesData = response.data.results || response.data;
      setClientes(clientesData);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const fetchProdutos = async () => {
    try {
      const response = await produtoService.getProdutos();
      const produtosData = response.data.results || response.data;
      
      // Separa produtos de mão de obra dos produtos normais
      const produtosMaoObraTemp = {
        estrutura: produtosData.find(p => p.name === 'Mão de Obra - Estrutura'),
        placa: produtosData.find(p => p.name === 'Mão de Obra - Placa'),
        acabamento: produtosData.find(p => p.name === 'Mão de Obra - Acabamento')
      };
      
      // Remove produtos de mão de obra da lista de produtos normais
      const produtosNormais = produtosData.filter(p => 
        !p.name.startsWith('Mão de Obra -')
      );
      
      setProdutosMaoObra(produtosMaoObraTemp);
      setProdutos(produtosNormais);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const fetchOrcamento = async () => {
    try {
      setLoading(true);
      const response = await orcamentoService.getOrcamento(id);
      const orcamento = response.data;
      
      setFormData({
        cliente: orcamento.cliente,
        data_emissao: orcamento.data_emissao,
        data_validade: orcamento.data_validade,
        status: orcamento.status,
        observacoes: orcamento.observacoes || ''
      });
      
      // Armazena o status inicial
      setStatusAnterior(orcamento.status);

      // Verifica se é orçamento de mão de obra
      const isMaoDeObra = orcamento.itens.some(item => 
        item.produto_nome && item.produto_nome.startsWith('Mão de Obra -')
      );

      if (isMaoDeObra) {
        setTipoOrcamento('mao_de_obra');
        
        // Popula os itens de mão de obra
        const maoObraTemp = {
          estrutura: { quantidade: '', preco: '', custo: '' },
          placa: { quantidade: '', preco: '', custo: '' },
          acabamento: { quantidade: '', preco: '', custo: '' }
        };

        orcamento.itens.forEach(item => {
          if (item.produto_nome.includes('Estrutura')) {
            maoObraTemp.estrutura = {
              quantidade: parseFloat(item.quantidade).toString(),
              preco: parseFloat(item.preco_venda).toString(),
              custo: parseFloat(item.custo_unitario).toString()
            };
          } else if (item.produto_nome.includes('Placa')) {
            maoObraTemp.placa = {
              quantidade: parseFloat(item.quantidade).toString(),
              preco: parseFloat(item.preco_venda).toString(),
              custo: parseFloat(item.custo_unitario).toString()
            };
          } else if (item.produto_nome.includes('Acabamento')) {
            maoObraTemp.acabamento = {
              quantidade: parseFloat(item.quantidade).toString(),
              preco: parseFloat(item.preco_venda).toString(),
              custo: parseFloat(item.custo_unitario).toString()
            };
          }
        });

        setMaoDeObraItens(maoObraTemp);
      } else {
        setTipoOrcamento('produto');
        setItens(orcamento.itens.map(item => ({
          produto: parseInt(item.produto),
          produto_nome: item.produto_nome,
          produto_unidade: item.produto_unidade,
          quantidade: parseFloat(item.quantidade),
          preco_venda: parseFloat(item.preco_venda),
          custo_unitario: parseFloat(item.custo_unitario)
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
      setErrors({ general: 'Erro ao carregar dados do orçamento' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      PENDENTE: 'Pendente',
      APROVADO: 'Aprovado',
      REJEITADO: 'Rejeitado',
      EM_ANDAMENTO: 'Em Andamento',
      CONCLUIDO: 'Concluído',
      CANCELADO: 'Cancelado'
    };
    return statusLabels[status] || status;
  };

  const getSelectableStatuses = (currentStatus) => {
    const allowedNext = STATUS_TRANSITIONS[currentStatus] || [];
    return [currentStatus, ...allowedNext];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'status' && isEditing) {
      const fromStatus = formData.status;
      if (value !== fromStatus) {
        const selectable = getSelectableStatuses(fromStatus);
        if (!selectable.includes(value)) {
          setErrors(prev => ({ ...prev, general: 'Transição de status inválida.' }));
          return;
        }

        const ok = window.confirm(
          `Atenção: ao alterar o status, não é possível voltar.\n\nAlterar de "${getStatusLabel(fromStatus)}" para "${getStatusLabel(value)}"?`
        );
        if (!ok) return;
      }
    }
    
    // Se está mudando o status para EM_ANDAMENTO e o status anterior não era EM_ANDAMENTO
    if (name === 'status' && value === 'EM_ANDAMENTO' && statusAnterior !== 'EM_ANDAMENTO' && isEditing) {
      // Armazena o novo valor mas não atualiza ainda
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      return; // Não executa o restante ainda
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setNovoItem(prev => ({
      ...prev,
      [name]: value
    }));

    // Se mudou o produto, preenche automaticamente os preços
    if (name === 'produto' && value) {
      const produtoSelecionado = produtos.find(p => p.id === parseInt(value));
      if (produtoSelecionado) {
        setNovoItem(prev => ({
          ...prev,
          preco_venda: produtoSelecionado.preco_venda,
          custo_unitario: produtoSelecionado.custo_unitario
        }));
      }
    }
  };

  const adicionarItem = () => {
    if (!novoItem.produto || !novoItem.quantidade || !novoItem.preco_venda || !novoItem.custo_unitario) {
      setErrors({ item: 'Preencha todos os campos do item' });
      return;
    }

    const produtoSelecionado = produtos.find(p => p.id === parseInt(novoItem.produto));
    
    const item = {
      produto: parseInt(novoItem.produto),
      produto_nome: produtoSelecionado.name,
      produto_unidade: produtoSelecionado.unimed_simbolo,
      quantidade: parseFloat(novoItem.quantidade),
      preco_venda: parseFloat(novoItem.preco_venda),
      custo_unitario: parseFloat(novoItem.custo_unitario)
    };

    setItens([...itens, item]);
    setNovoItem({
      produto: '',
      quantidade: '',
      preco_venda: '',
      custo_unitario: ''
    });
    setErrors({ ...errors, item: '' });
  };

  const removerItem = (index) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const atualizarItem = (index, campo, valor) => {
    const novosItens = [...itens];
    novosItens[index] = {
      ...novosItens[index],
      [campo]: parseFloat(valor) || 0
    };
    setItens(novosItens);
  };

  const handleMaoDeObraChange = (fase, campo, valor) => {
    setMaoDeObraItens(prev => ({
      ...prev,
      [fase]: {
        ...prev[fase],
        [campo]: valor
      }
    }));
  };

  const converterMaoDeObraParaItens = () => {
    if (!produtosMaoObra) return [];
    
    const itensConvertidos = [];
    
    // Estrutura
    if (maoDeObraItens.estrutura.quantidade && maoDeObraItens.estrutura.preco) {
      itensConvertidos.push({
        produto: produtosMaoObra.estrutura.id,
        quantidade: parseFloat(maoDeObraItens.estrutura.quantidade),
        preco_venda: parseFloat(maoDeObraItens.estrutura.preco),
        custo_unitario: parseFloat(maoDeObraItens.estrutura.custo || 0)
      });
    }
    
    // Placa
    if (maoDeObraItens.placa.quantidade && maoDeObraItens.placa.preco) {
      itensConvertidos.push({
        produto: produtosMaoObra.placa.id,
        quantidade: parseFloat(maoDeObraItens.placa.quantidade),
        preco_venda: parseFloat(maoDeObraItens.placa.preco),
        custo_unitario: parseFloat(maoDeObraItens.placa.custo || 0)
      });
    }
    
    // Acabamento
    if (maoDeObraItens.acabamento.quantidade && maoDeObraItens.acabamento.preco) {
      itensConvertidos.push({
        produto: produtosMaoObra.acabamento.id,
        quantidade: parseFloat(maoDeObraItens.acabamento.quantidade),
        preco_venda: parseFloat(maoDeObraItens.acabamento.preco),
        custo_unitario: parseFloat(maoDeObraItens.acabamento.custo || 0)
      });
    }
    
    return itensConvertidos;
  };

  const calcularSubtotal = (item) => {
    return item.quantidade * item.preco_venda;
  };

  const calcularTotal = () => {
    if (tipoOrcamento === 'mao_de_obra') {
      const itensConvertidos = converterMaoDeObraParaItens();
      return itensConvertidos.reduce((total, item) => total + (item.quantidade * item.preco_venda), 0);
    }
    return itens.reduce((total, item) => total + calcularSubtotal(item), 0);
  };

  const calcularCustoTotal = () => {
    if (tipoOrcamento === 'mao_de_obra') {
      const itensConvertidos = converterMaoDeObraParaItens();
      return itensConvertidos.reduce((total, item) => total + (item.quantidade * item.custo_unitario), 0);
    }
    return itens.reduce((total, item) => total + (item.quantidade * item.custo_unitario), 0);
  };

  const calcularLucro = () => {
    return calcularTotal() - calcularCustoTotal();
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.cliente) {
      newErrors.cliente = 'Cliente é obrigatório';
    }

    if (!formData.data_emissao) {
      newErrors.data_emissao = 'Data de emissão é obrigatória';
    }

    if (!formData.data_validade) {
      newErrors.data_validade = 'Data de validade é obrigatória';
    }

    if (formData.data_validade < formData.data_emissao) {
      newErrors.data_validade = 'Data de validade deve ser posterior à data de emissão';
    }

    // Valida itens baseado no tipo de orçamento
    if (tipoOrcamento === 'produto') {
      if (itens.length === 0) {
        newErrors.itens = 'Adicione pelo menos um item ao orçamento';
      }
    } else {
      const itensConvertidos = converterMaoDeObraParaItens();
      if (itensConvertidos.length === 0) {
        newErrors.itens = 'Preencha pelo menos uma fase de mão de obra';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }
    
    // Se está mudando para EM_ANDAMENTO, abre modal de pagamento
    if (isEditing && formData.status === 'EM_ANDAMENTO' && statusAnterior !== 'EM_ANDAMENTO') {
      try {
        setLoading(true);
        // Busca dados atualizados do orçamento
        const response = await orcamentoService.getOrcamento(id);
        const orcamentoAtualizado = response.data;
        
        // Determina o tipo de orçamento
        const isMaoDeObra = tipoOrcamento === 'mao_de_obra' || 
          orcamentoAtualizado.itens.some(item => item.produto_nome && item.produto_nome.startsWith('Mão de Obra -'));
        
        setOrcamentoParaPagamento({
          ...orcamentoAtualizado,
          tipo_orcamento: isMaoDeObra ? 'MAO_OBRA' : 'PRODUTO'
        });
        setShowPagamentoModal(true);
      } catch (error) {
        console.error('Erro ao carregar dados do orçamento:', error);
        setErrors({ general: 'Erro ao carregar dados do orçamento' });
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);

      // Determina quais itens usar baseado no tipo de orçamento
      const itensParaEnviar = tipoOrcamento === 'mao_de_obra' 
        ? converterMaoDeObraParaItens() 
        : itens.map(item => ({
            produto: item.produto,
            quantidade: item.quantidade,
            preco_venda: item.preco_venda,
            custo_unitario: item.custo_unitario
          }));

      const orcamentoData = {
        ...formData,
        cliente: parseInt(formData.cliente),
        tipo_orcamento: tipoOrcamento === 'mao_de_obra' ? 'MAO_OBRA' : 'PRODUTO',
        itens: itensParaEnviar
      };

      if (isEditing) {
        await orcamentoService.updateOrcamento(id, orcamentoData);
      } else {
        await orcamentoService.createOrcamento(orcamentoData);
      }

      navigate('/orcamentos');
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);

      if (error.response?.data) {
        const serverErrors = error.response.data;
        setErrors(serverErrors);
      } else {
        setErrors({ general: 'Erro ao salvar orçamento. Tente novamente.' });
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handlePagamentoSuccess = () => {
    setShowPagamentoModal(false);
    navigate('/orcamentos');
  };
  
  const handlePagamentoClose = () => {
    setShowPagamentoModal(false);
    // Reverte o status para o anterior
    setFormData(prev => ({
      ...prev,
      status: statusAnterior
    }));
  };

  const handleCancel = () => {
    navigate('/orcamentos');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading && isEditing && !formData.cliente) {
    return (
      <div className="orcamento-form-container">
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="orcamento-form-container">
      <div className="form-header">
        <h1>{isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}</h1>
        <p>{isEditing ? 'Atualize as informações do orçamento' : 'Preencha os dados do novo orçamento'}</p>
      </div>

      {errors.general && (
        <div className="alert alert-error">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="orcamento-form">
        <div className="form-section">
          <h2>Dados do Orçamento</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cliente">Cliente *</label>
              <select
                id="cliente"
                name="cliente"
                value={formData.cliente}
                onChange={handleChange}
                className={errors.cliente ? 'error' : ''}
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
              {errors.cliente && <span className="error-message">{errors.cliente}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                {(isEditing ? getSelectableStatuses(formData.status) : ALL_STATUSES).map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
              {isEditing && (
                <small className="hint">Atenção: ao avançar o status, não é possível voltar.</small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="data_emissao">Data de Emissão *</label>
              <input
                type="date"
                id="data_emissao"
                name="data_emissao"
                value={formData.data_emissao}
                onChange={handleChange}
                className={errors.data_emissao ? 'error' : ''}
              />
              {errors.data_emissao && <span className="error-message">{errors.data_emissao}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="data_validade">Data de Validade *</label>
              <input
                type="date"
                id="data_validade"
                name="data_validade"
                value={formData.data_validade}
                onChange={handleChange}
                className={errors.data_validade ? 'error' : ''}
              />
              {errors.data_validade && <span className="error-message">{errors.data_validade}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="observacoes">Observações</label>
            <textarea
              id="observacoes"
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              placeholder="Observações adicionais sobre o orçamento"
              rows="3"
            />
          </div>
        </div>

        {/* Toggle para Tipo de Orçamento */}
        <div className="form-section">
          <h2>Tipo de Orçamento</h2>
          <div className="tipo-orcamento-toggle">
            <button
              type="button"
              className={`toggle-btn ${tipoOrcamento === 'produto' ? 'active' : ''}`}
              onClick={() => setTipoOrcamento('produto')}
              disabled={isEditing}
            >
              Orçamento de Produtos
            </button>
            <button
              type="button"
              className={`toggle-btn ${tipoOrcamento === 'mao_de_obra' ? 'active' : ''}`}
              onClick={() => setTipoOrcamento('mao_de_obra')}
              disabled={isEditing}
            >
              Orçamento de Mão de Obra
            </button>
          </div>
          {isEditing && (
            <p className="info-message">O tipo de orçamento não pode ser alterado durante a edição.</p>
          )}
        </div>

        <div className="form-section">
          <h2>Itens do Orçamento</h2>
          
          {errors.itens && <div className="alert alert-error">{errors.itens}</div>}
          
          {tipoOrcamento === 'produto' ? (
          <>
          <div className="item-form">
            <div className="form-row">
              <div className="form-group flex-2">
                <label htmlFor="produto">Produto</label>
                <select
                  id="produto"
                  name="produto"
                  value={novoItem.produto}
                  onChange={handleItemChange}
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map(produto => (
                    <option key={produto.id} value={produto.id}>
                      {produto.name} ({produto.unimed_simbolo})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quantidade">Quantidade</label>
                <input
                  type="number"
                  id="quantidade"
                  name="quantidade"
                  value={novoItem.quantidade}
                  onChange={handleItemChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="preco_venda">Preço Unit.</label>
                <input
                  type="number"
                  id="preco_venda"
                  name="preco_venda"
                  value={novoItem.preco_venda}
                  onChange={handleItemChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="custo_unitario">Custo Unit.</label>
                <input
                  type="number"
                  id="custo_unitario"
                  name="custo_unitario"
                  value={novoItem.custo_unitario}
                  onChange={handleItemChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group btn-group">
                <button
                  type="button"
                  onClick={adicionarItem}
                  className="btn btn-success"
                >
                  Adicionar
                </button>
              </div>
            </div>
            {errors.item && <span className="error-message">{errors.item}</span>}
          </div>

          {itens.length > 0 && (
            <div className="itens-table-container">
              <table className="itens-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Unidade</th>
                    <th>Preço Unit.</th>
                    <th>Subtotal</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, index) => (
                    <tr key={index}>
                      <td>{item.produto_nome}</td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={item.quantidade}
                          onChange={(e) => atualizarItem(index, 'quantidade', e.target.value)}
                          className="input-table"
                        />
                      </td>
                      <td>{item.produto_unidade}</td>
                      <td>{formatCurrency(item.preco_venda)}</td>
                      <td className="valor-cell">{formatCurrency(calcularSubtotal(item))}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removerItem(index)}
                          className="btn btn-sm btn-danger"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </>
          ) : (
            /* Formulário de Mão de Obra */
            <div className="mao-obra-form">
              <div className="mao-obra-fase">
                <h3>Estrutura</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="estrutura_quantidade">Área (m²) *</label>
                    <input
                      type="number"
                      id="estrutura_quantidade"
                      value={maoDeObraItens.estrutura.quantidade}
                      onChange={(e) => handleMaoDeObraChange('estrutura', 'quantidade', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="estrutura_preco">Preço por m² *</label>
                    <input
                      type="number"
                      id="estrutura_preco"
                      value={maoDeObraItens.estrutura.preco}
                      onChange={(e) => handleMaoDeObraChange('estrutura', 'preco', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="estrutura_custo">Custo por m² (opcional)</label>
                    <input
                      type="number"
                      id="estrutura_custo"
                      value={maoDeObraItens.estrutura.custo}
                      onChange={(e) => handleMaoDeObraChange('estrutura', 'custo', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Subtotal:</label>
                    <div className="valor-display">
                      {formatCurrency((parseFloat(maoDeObraItens.estrutura.quantidade) || 0) * (parseFloat(maoDeObraItens.estrutura.preco) || 0))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mao-obra-fase">
                <h3>Placa</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="placa_quantidade">Área (m²) *</label>
                    <input
                      type="number"
                      id="placa_quantidade"
                      value={maoDeObraItens.placa.quantidade}
                      onChange={(e) => handleMaoDeObraChange('placa', 'quantidade', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="placa_preco">Preço por m² *</label>
                    <input
                      type="number"
                      id="placa_preco"
                      value={maoDeObraItens.placa.preco}
                      onChange={(e) => handleMaoDeObraChange('placa', 'preco', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="placa_custo">Custo por m² (opcional)</label>
                    <input
                      type="number"
                      id="placa_custo"
                      value={maoDeObraItens.placa.custo}
                      onChange={(e) => handleMaoDeObraChange('placa', 'custo', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Subtotal:</label>
                    <div className="valor-display">
                      {formatCurrency((parseFloat(maoDeObraItens.placa.quantidade) || 0) * (parseFloat(maoDeObraItens.placa.preco) || 0))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mao-obra-fase">
                <h3>Acabamento</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="acabamento_quantidade">Área (m²) *</label>
                    <input
                      type="number"
                      id="acabamento_quantidade"
                      value={maoDeObraItens.acabamento.quantidade}
                      onChange={(e) => handleMaoDeObraChange('acabamento', 'quantidade', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="acabamento_preco">Preço por m² *</label>
                    <input
                      type="number"
                      id="acabamento_preco"
                      value={maoDeObraItens.acabamento.preco}
                      onChange={(e) => handleMaoDeObraChange('acabamento', 'preco', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="acabamento_custo">Custo por m² (opcional)</label>
                    <input
                      type="number"
                      id="acabamento_custo"
                      value={maoDeObraItens.acabamento.custo}
                      onChange={(e) => handleMaoDeObraChange('acabamento', 'custo', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Subtotal:</label>
                    <div className="valor-display">
                      {formatCurrency((parseFloat(maoDeObraItens.acabamento.quantidade) || 0) * (parseFloat(maoDeObraItens.acabamento.preco) || 0))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {((tipoOrcamento === 'produto' && itens.length > 0) || 
          (tipoOrcamento === 'mao_de_obra' && converterMaoDeObraParaItens().length > 0)) && (
          <div className="form-section totals-section">
            <h2>Resumo Financeiro</h2>
            <div className="totals-grid">
              <div className="total-item">
                <span className="total-label">Valor Total:</span>
                <span className="total-value">{formatCurrency(calcularTotal())}</span>
              </div>
              <div className="total-item">
                <span className="total-label">Custo Total:</span>
                <span className="total-value custo">{formatCurrency(calcularCustoTotal())}</span>
              </div>
              <div className="total-item highlight">
                <span className="total-label">Lucro Previsto:</span>
                <span className="total-value lucro">{formatCurrency(calcularLucro())}</span>
              </div>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar Orçamento')}
          </button>
        </div>
      </form>
      
      {showPagamentoModal && orcamentoParaPagamento && (
        <PagamentoModal
          orcamento={orcamentoParaPagamento}
          onClose={handlePagamentoClose}
          onSuccess={handlePagamentoSuccess}
        />
      )}
    </div>
  );
};

export default OrcamentoForm;
