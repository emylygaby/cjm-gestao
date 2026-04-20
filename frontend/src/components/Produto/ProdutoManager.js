import React, { useState, useEffect } from 'react';
import { produtoService, unidadeMedidaService } from '../../services/api';
import './ProdutoManager.css';

const ProdutoManager = () => {
  const [produtos, setProdutos] = useState([]);
  const [unidadesMedida, setUnidadesMedida] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    descricao: '',
    unimed: '',
    estoque: '0.00',
    custo_unitario: '0.00',
    preco_venda: '0.00'
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchProdutos();
    fetchUnidadesMedida();
  }, []);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const response = await produtoService.getProdutos();
      const produtosData = response.data.results || response.data;
      setProdutos(produtosData);
      setError('');
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setError('Erro ao carregar a lista de produtos');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnidadesMedida = async () => {
    try {
      console.log('🔍 Buscando unidades de medida...');
      const response = await unidadeMedidaService.getUnidadesMedida();
      console.log('✅ Unidades recebidas:', response.data);
      setUnidadesMedida(response.data);
    } catch (error) {
      console.error('❌ Erro ao carregar unidades de medida:', error);
      console.error('Detalhes do erro:', error.response?.data || error.message);
      setError('Erro ao carregar unidades de medida. Verifique se o backend está rodando.');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpar erro específico quando usuário começar a digitar
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.unimed) {
      newErrors.unimed = 'Unidade de medida é obrigatória';
    }

    const estoque = parseFloat(formData.estoque);
    if (isNaN(estoque) || estoque < 0) {
      newErrors.estoque = 'Estoque deve ser um número válido e não negativo';
    }

    const custo = parseFloat(formData.custo_unitario);
    if (isNaN(custo) || custo < 0) {
      newErrors.custo_unitario = 'Custo unitário deve ser um número válido e não negativo';
    }

    const preco = parseFloat(formData.preco_venda);
    if (isNaN(preco) || preco < 0) {
      newErrors.preco_venda = 'Preço de venda deve ser um número válido e não negativo';
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
      
      // Converter valores numéricos
      const dataToSend = {
        ...formData,
        estoque: parseFloat(formData.estoque),
        custo_unitario: parseFloat(formData.custo_unitario),
        preco_venda: parseFloat(formData.preco_venda),
        unimed: parseInt(formData.unimed)
      };
      
      if (editingProduto) {
        await produtoService.updateProduto(editingProduto.id, dataToSend);
      } else {
        await produtoService.createProduto(dataToSend);
      }
      
      await fetchProdutos();
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      
      if (error.response?.data) {
        setFormErrors(error.response.data);
      } else {
        setError('Erro ao salvar produto. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (produto) => {
    setEditingProduto(produto);
    setFormData({
      name: produto.name,
      descricao: produto.descricao || '',
      unimed: produto.unimed.toString(),
      estoque: produto.estoque.toString(),
      custo_unitario: produto.custo_unitario.toString(),
      preco_venda: produto.preco_venda.toString()
    });
    setShowForm(true);
    setFormErrors({});
  };

  const handleDelete = async (produtoId) => {
    try {
      await produtoService.softDeleteProduto(produtoId);
      setProdutos(produtos.filter(p => p.id !== produtoId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      setError('Erro ao excluir produto');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      descricao: '',
      unimed: '',
      estoque: '0.00',
      custo_unitario: '0.00',
      preco_venda: '0.00'
    });
    setEditingProduto(null);
    setFormErrors({});
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  const handleNewProduto = () => {
    resetForm();
    setShowForm(true);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  if (loading && produtos.length === 0) {
    return (
      <div className="produto-manager-container">
        <div className="loading">Carregando produtos...</div>
      </div>
    );
  }

  return (
    <div className="produto-manager-container">
      <div className="page-header">
        <div className="header-content">
          <h1>Produtos</h1>
          <p>Gerencie seu catálogo de produtos</p>
        </div>
        {!showForm && (
          <button onClick={handleNewProduto} className="btn btn-primary">
            Novo Produto
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {showForm && (
        <div className="produto-form-card">
          <div className="form-card-header">
            <h2>{editingProduto ? 'Editar Produto' : 'Novo Produto'}</h2>
            <button onClick={handleCancel} className="btn-close" aria-label="Fechar">
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="produto-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Nome do Produto *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={formErrors.name ? 'error' : ''}
                  placeholder="Ex: Produto ABC"
                />
                {formErrors.name && (
                  <span className="error-message">{formErrors.name}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="unimed">Unidade de Medida *</label>
                <select
                  id="unimed"
                  name="unimed"
                  value={formData.unimed}
                  onChange={handleChange}
                  className={formErrors.unimed ? 'error' : ''}
                >
                  <option value="">Selecione...</option>
                  {console.log('📦 Renderizando unidades:', unidadesMedida.length, 'unidades') || unidadesMedida.map(unidade => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome} ({unidade.simbolo})
                    </option>
                  ))}
                </select>
                {formErrors.unimed && (
                  <span className="error-message">{formErrors.unimed}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="descricao">Descrição</label>
              <textarea
                id="descricao"
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                placeholder="Descrição opcional do produto..."
                rows="3"
              />
            </div>

            <div className="form-row form-row-three">
              <div className="form-group">
                <label htmlFor="estoque">Estoque</label>
                <input
                  type="number"
                  id="estoque"
                  name="estoque"
                  value={formData.estoque}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={formErrors.estoque ? 'error' : ''}
                />
                {formErrors.estoque && (
                  <span className="error-message">{formErrors.estoque}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="custo_unitario">Custo Unitário (R$)</label>
                <input
                  type="number"
                  id="custo_unitario"
                  name="custo_unitario"
                  value={formData.custo_unitario}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={formErrors.custo_unitario ? 'error' : ''}
                />
                {formErrors.custo_unitario && (
                  <span className="error-message">{formErrors.custo_unitario}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="preco_venda">Preço de Venda (R$)</label>
                <input
                  type="number"
                  id="preco_venda"
                  name="preco_venda"
                  value={formData.preco_venda}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={formErrors.preco_venda ? 'error' : ''}
                />
                {formErrors.preco_venda && (
                  <span className="error-message">{formErrors.preco_venda}</span>
                )}
              </div>
            </div>

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
                {loading ? 'Salvando...' : (editingProduto ? 'Atualizar' : 'Cadastrar')}
              </button>
            </div>
          </form>
        </div>
      )}

      {produtos.length === 0 && !showForm ? (
        <div className="empty-state">
          <div className="empty-content">
            <h3>Nenhum produto cadastrado</h3>
            <p>Comece adicionando seu primeiro produto</p>
            <button onClick={handleNewProduto} className="btn btn-primary">
              Cadastrar Produto
            </button>
          </div>
        </div>
      ) : !showForm && (
        <div className="produtos-table-container">
          <table className="produtos-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Unidade</th>
                <th className="text-center">Estoque</th>
                <th className="text-right">Custo</th>
                <th className="text-right">Preço Venda</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map(produto => (
                <tr key={produto.id}>
                  <td>
                    <div className="produto-name">
                      {produto.name}
                      {produto.descricao && (
                        <span className="produto-desc">{produto.descricao}</span>
                      )}
                    </div>
                  </td>
                  <td>{produto.unimed_simbolo}</td>
                  <td className="text-center">
                    <span className={`badge-estoque ${produto.estoque < 10 ? 'badge-low' : 'badge-ok'}`}>
                      {formatNumber(produto.estoque)}
                    </span>
                  </td>
                  <td className="text-right">{formatCurrency(produto.custo_unitario)}</td>
                  <td className="text-right">{formatCurrency(produto.preco_venda)}</td>
                  <td className="actions-cell">
                    <button
                      onClick={() => handleEdit(produto)}
                      className="btn-action btn-edit"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(produto)}
                      className="btn-action btn-delete"
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmar Exclusão</h3>
            <p>Tem certeza que deseja excluir o produto <strong>{deleteConfirm.name}</strong>?</p>
            <div className="modal-actions">
              <button 
                onClick={() => setDeleteConfirm(null)} 
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

export default ProdutoManager;
