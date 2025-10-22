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
    telefone: '',
    endereco: ''
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
        telefone: cliente.telefone || '',
        endereco: cliente.endereco || ''
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

    if (!formData.endereco.trim()) {
      newErrors.endereco = 'Endereço é obrigatório';
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
          <label htmlFor="endereco">Endereço *</label>
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