import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const clienteService = {
  // Listar todos os clientes
  getClientes: () => apiClient.get('/clientes/'),
  
  // Obter um cliente específico
  getCliente: (id) => apiClient.get(`/clientes/${id}/`),
  
  // Criar novo cliente
  createCliente: (clienteData) => apiClient.post('/clientes/', clienteData),
  
  // Atualizar cliente
  updateCliente: (id, clienteData) => apiClient.put(`/clientes/${id}/`, clienteData),
  
  // Deletar cliente
  deleteCliente: (id) => apiClient.delete(`/clientes/${id}/`),
  
  // Obter orçamentos de um cliente
  getClienteOrcamentos: (id) => apiClient.get(`/clientes/${id}/orcamentos/`),
};

export const orcamentoService = {
  // Listar todos os orçamentos
  getOrcamentos: () => apiClient.get('/orcamentos/'),
  
  // Obter um orçamento específico
  getOrcamento: (id) => apiClient.get(`/orcamentos/${id}/`),
  
  // Criar novo orçamento
  createOrcamento: (orcamentoData) => apiClient.post('/orcamentos/', orcamentoData),
  
  // Atualizar orçamento
  updateOrcamento: (id, orcamentoData) => apiClient.put(`/orcamentos/${id}/`, orcamentoData),
  
  // Deletar orçamento
  deleteOrcamento: (id) => apiClient.delete(`/orcamentos/${id}/`),
};

export default apiClient;