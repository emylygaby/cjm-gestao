import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';
const AUTH_TOKEN_KEY = 'cjm_auth_token';

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

export const setAuthToken = (token) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login/');

    if (status === 401 && !isAuthEndpoint && getAuthToken()) {
      clearAuthToken();

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: (credentials) => apiClient.post('/auth/login/', credentials),
  logout: () => apiClient.post('/auth/logout/'),
  me: () => apiClient.get('/auth/me/'),
};

export const adminUserService = {
  getUsers: () => apiClient.get('/auth/users/'),
  createUser: (userData) => apiClient.post('/auth/users/', userData),
  updateUser: (id, userData) => apiClient.patch(`/auth/users/${id}/`, userData),
  deleteUser: (id) => apiClient.delete(`/auth/users/${id}/`),
};

export const clienteService = {
  // Listar todos os clientes
  getClientes: () => apiClient.get('/clientes/'),
  
  // Listar clientes excluídos
  getClientesExcluidos: () => apiClient.get('/clientes/deleted/'),
  
  // Obter um cliente específico
  getCliente: (id) => apiClient.get(`/clientes/${id}/`),
  
  // Criar novo cliente
  createCliente: (clienteData) => apiClient.post('/clientes/', clienteData),
  
  // Atualizar cliente
  updateCliente: (id, clienteData) => apiClient.put(`/clientes/${id}/`, clienteData),
  
  // Deletar cliente (hard delete - manter por compatibilidade)
  deleteCliente: (id) => apiClient.delete(`/clientes/${id}/`),
  
  // Soft delete (exclusão suave)
  softDeleteCliente: (id) => apiClient.delete(`/clientes/${id}/soft_delete/`),
  
  // Restaurar cliente excluído
  restoreCliente: (id) => apiClient.post(`/clientes/${id}/restore/`),
  
  // Obter orçamentos de um cliente
  getClienteOrcamentos: (id) => apiClient.get(`/clientes/${id}/orcamentos/`),
};

export const orcamentoService = {
  // Listar todos os orçamentos
  getOrcamentos: () => apiClient.get('/orcamentos/'),
  
  // Listar orçamentos excluídos
  getOrcamentosExcluidos: () => apiClient.get('/orcamentos/deleted/'),
  
  // Obter um orçamento específico
  getOrcamento: (id) => apiClient.get(`/orcamentos/${id}/`),
  
  // Criar novo orçamento
  createOrcamento: (orcamentoData) => apiClient.post('/orcamentos/', orcamentoData),
  
  // Atualizar orçamento
  updateOrcamento: (id, orcamentoData) => apiClient.put(`/orcamentos/${id}/`, orcamentoData),
  
  // Deletar orçamento (hard delete - manter por compatibilidade)
  deleteOrcamento: (id) => apiClient.delete(`/orcamentos/${id}/`),
  
  // Soft delete (exclusão suave)
  softDeleteOrcamento: (id) => apiClient.delete(`/orcamentos/${id}/soft_delete/`),
  
  // Restaurar orçamento excluído
  restoreOrcamento: (id) => apiClient.post(`/orcamentos/${id}/restore/`),
  
  // Atualizar status do orçamento
  atualizarStatus: (id, status) => apiClient.post(`/orcamentos/${id}/atualizar_status/`, { status }),
  
  // Gerar PDF do orçamento
  gerarPDF: async (id) => {
    const response = await apiClient.get(`/orcamentos/${id}/gerar_pdf/`, {
      responseType: 'blob',
    });
    
    // Cria um link temporário para download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orcamento_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response;
  },
};

export const unidadeMedidaService = {
  // Listar todas as unidades de medida
  getUnidadesMedida: () => apiClient.get('/unidades-medida/'),
  
  // Obter uma unidade de medida específica
  getUnidadeMedida: (id) => apiClient.get(`/unidades-medida/${id}/`),
};

export const produtoService = {
  // Listar todos os produtos
  getProdutos: () => apiClient.get('/produtos/'),
  
  // Listar produtos excluídos
  getProdutosExcluidos: () => apiClient.get('/produtos/deleted/'),
  
  // Obter um produto específico
  getProduto: (id) => apiClient.get(`/produtos/${id}/`),
  
  // Criar novo produto
  createProduto: (produtoData) => apiClient.post('/produtos/', produtoData),
  
  // Atualizar produto
  updateProduto: (id, produtoData) => apiClient.put(`/produtos/${id}/`, produtoData),
  
  // Deletar produto (hard delete - manter por compatibilidade)
  deleteProduto: (id) => apiClient.delete(`/produtos/${id}/`),
  
  // Soft delete (exclusão suave)
  softDeleteProduto: (id) => apiClient.delete(`/produtos/${id}/soft_delete/`),
  
  // Restaurar produto excluído
  restoreProduto: (id) => apiClient.post(`/produtos/${id}/restore/`),
  
  // Listar produtos com baixo estoque
  getProdutosBaixoEstoque: () => apiClient.get('/produtos/baixo_estoque/'),
  
  // Atualizar estoque de um produto
  atualizarEstoque: (id, quantidade, operacao) => 
    apiClient.post(`/produtos/${id}/atualizar_estoque/`, { quantidade, operacao }),
};

export const categoriaFinanceiraService = {
  // Listar todas as categorias
  getCategorias: () => apiClient.get('/financeiro/categorias/'),
  
  // Listar categorias por tipo
  getCategoriasPorTipo: (tipo) => apiClient.get(`/financeiro/categorias/por_tipo/?tipo=${tipo}`),
  
  // Obter uma categoria específica
  getCategoria: (id) => apiClient.get(`/financeiro/categorias/${id}/`),
  
  // Criar nova categoria
  createCategoria: (categoriaData) => apiClient.post('/financeiro/categorias/', categoriaData),
  
  // Atualizar categoria
  updateCategoria: (id, categoriaData) => apiClient.put(`/financeiro/categorias/${id}/`, categoriaData),
  
  // Deletar categoria
  deleteCategoria: (id) => apiClient.delete(`/financeiro/categorias/${id}/`),
};

export const movimentacaoFinanceiraService = {
  // Listar todas as movimentações
  getMovimentacoes: (params) => apiClient.get('/financeiro/movimentacoes/', { params }),
  
  // Obter uma movimentação específica
  getMovimentacao: (id) => apiClient.get(`/financeiro/movimentacoes/${id}/`),
  
  // Criar nova movimentação
  createMovimentacao: (movimentacaoData) => apiClient.post('/financeiro/movimentacoes/', movimentacaoData),
  
  // Atualizar movimentação
  updateMovimentacao: (id, movimentacaoData) => apiClient.put(`/financeiro/movimentacoes/${id}/`, movimentacaoData),
  
  // Deletar movimentação
  deleteMovimentacao: (id) => apiClient.delete(`/financeiro/movimentacoes/${id}/`),
  
  // Obter resumo mensal
  getResumoMensal: (ano, mes) => {
    const params = ano && mes ? `?ano=${ano}&mes=${mes}` : '';
    return apiClient.get(`/financeiro/movimentacoes/resumo_mensal/${params}`);
  },
  
  // Obter previsão mensal (movimentações reais + parcelamentos + gastos fixos)
  getPrevisaoMes: (ano, mes) => {
    const params = ano && mes ? `?ano=${ano}&mes=${mes}` : '';
    return apiClient.get(`/financeiro/movimentacoes/previsao_mes/${params}`);
  },
  
  // Obter relatório de período
  getRelatorioPeriodo: (dataInicio, dataFim) => 
    apiClient.get(`/financeiro/movimentacoes/relatorio_periodo/?data_inicio=${dataInicio}&data_fim=${dataFim}`),
};

export const gastoFixoService = {
  // Listar todos os gastos fixos
  getGastosFixos: (params) => apiClient.get('/financeiro/gastos-fixos/', { params }),
  
  // Obter um gasto fixo específico
  getGastoFixo: (id) => apiClient.get(`/financeiro/gastos-fixos/${id}/`),
  
  // Criar novo gasto fixo
  createGastoFixo: (gastoFixoData) => apiClient.post('/financeiro/gastos-fixos/', gastoFixoData),
  
  // Atualizar gasto fixo
  updateGastoFixo: (id, gastoFixoData) => apiClient.put(`/financeiro/gastos-fixos/${id}/`, gastoFixoData),
  
  // Deletar gasto fixo
  deleteGastoFixo: (id) => apiClient.delete(`/financeiro/gastos-fixos/${id}/`),
  
  // Obter total mensal de gastos fixos
  getTotalMensal: () => apiClient.get('/financeiro/gastos-fixos/total_mensal/'),
  
  // Gerar movimentação a partir de gasto fixo
  gerarMovimentacao: (id, data) => 
    apiClient.post(`/financeiro/gastos-fixos/${id}/gerar_movimentacao/`, data),
};

export default apiClient;