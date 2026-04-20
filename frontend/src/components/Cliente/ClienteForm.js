import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clienteService } from '../../services/api';
import './ClienteForm.css';

const ClienteForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    nome: '',
    cpf_cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    observacao: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditing) {
      fetchCliente();
    }
  }, [id, isEditing]);

  const fetchCliente = async () => {
    try {
      setLoading(true);
      const response = await clienteService.getCliente(id);
      const cliente = response.data;
      setFormData({
        nome: cliente.nome || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        telefone: cliente.telefone || '',
        email: cliente.email || '',
        endereco: cliente.endereco || '',
        observacao: cliente.observacao || ''
      });
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      setErrors({ general: 'Erro ao carregar dados do cliente' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpar erro específico quando usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = 'Telefone é obrigatório';
    }

    if (formData.cpf_cnpj) {
      const cleanedCpfCnpj = formData.cpf_cnpj.replace(/\D/g, '');
      if (cleanedCpfCnpj.length !== 11 && cleanedCpfCnpj.length !== 14) {
        newErrors.cpf_cnpj = 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos';
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      if (isEditing) {
        await clienteService.updateCliente(id, formData);
      } else {
        await clienteService.createCliente(formData);
      }
      
      navigate('/clientes');
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      
      if (error.response?.data) {
        const serverErrors = error.response.data;
        setErrors(serverErrors);
      } else {
        setErrors({ general: 'Erro ao salvar cliente. Tente novamente.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/clientes');
  };

  if (loading && isEditing && !formData.nome) {
    return (
      <div className="cliente-form-container">
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="cliente-form-container">
      <div className="form-header">
        <h1>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h1>
        <p>{isEditing ? 'Atualize as informações do cliente' : 'Preencha os dados do novo cliente'}</p>
      </div>

      {errors.general && (
        <div className="alert alert-error">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="cliente-form">
        <div className="form-group">
          <label htmlFor="nome">Nome *</label>
          <input
            type="text"
            id="nome"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            className={errors.nome ? 'error' : ''}
            placeholder="Digite o nome completo"
          />
          {errors.nome && <span className="error-message">{errors.nome}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="cpf_cnpj">CPF/CNPJ</label>
          <input
            type="text"
            id="cpf_cnpj"
            name="cpf_cnpj"
            value={formData.cpf_cnpj}
            onChange={handleChange}
            className={errors.cpf_cnpj ? 'error' : ''}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
          />
          {errors.cpf_cnpj && <span className="error-message">{errors.cpf_cnpj}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="telefone">Telefone *</label>
          <input
            type="tel"
            id="telefone"
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            className={errors.telefone ? 'error' : ''}
            placeholder="(00) 00000-0000"
          />
          {errors.telefone && <span className="error-message">{errors.telefone}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            placeholder="exemplo@email.com"
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="endereco">Endereço</label>
          <textarea
            id="endereco"
            name="endereco"
            value={formData.endereco}
            onChange={handleChange}
            className={errors.endereco ? 'error' : ''}
            placeholder="Digite o endereço completo"
            rows="3"
          />
          {errors.endereco && <span className="error-message">{errors.endereco}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="observacao">Observação</label>
          <textarea
            id="observacao"
            name="observacao"
            value={formData.observacao}
            onChange={handleChange}
            className={errors.observacao ? 'error' : ''}
            placeholder="Observações adicionais sobre o cliente"
            rows="3"
          />
          {errors.observacao && <span className="error-message">{errors.observacao}</span>}
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
            {loading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar Cliente')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClienteForm;