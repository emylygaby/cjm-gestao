import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clienteService } from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalClientes: 0,
    clientesRecentes: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await clienteService.getClientes();
      const clientes = response.data.results || response.data;
      
      setStats({
        totalClientes: clientes.length,
        clientesRecentes: clientes.slice(-5).reverse()
      });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Bem-vindo ao Sistema de Gestão de Clientes</p>
      </div>

      <div className="dashboard-cards">
        <div className="stat-card">
          <div className="stat-number">{stats.totalClientes}</div>
          <div className="stat-label">Total de Clientes</div>
        </div>
        
        <div className="action-card">
          <h3>Ações Rápidas</h3>
          <div className="action-buttons">
            <Link to="/clientes/novo" className="action-btn primary">
              Novo Cliente
            </Link>
            <Link to="/clientes" className="action-btn secondary">
              Ver Todos os Clientes
            </Link>
          </div>
        </div>
      </div>

      <div className="recent-clients">
        <h2>Clientes Recentes</h2>
        {stats.clientesRecentes.length > 0 ? (
          <div className="clients-grid">
            {stats.clientesRecentes.map(cliente => (
              <div key={cliente.id} className="client-card">
                <h3>{cliente.nome}</h3>
                <p><strong>Telefone:</strong> {cliente.telefone}</p>
                <p><strong>Endereço:</strong> {cliente.endereco}</p>
                <div className="client-actions">
                  <Link to={`/clientes/${cliente.id}`} className="btn-link">
                    Ver Detalhes
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>Nenhum cliente cadastrado ainda.</p>
            <Link to="/clientes/novo" className="btn-primary">
              Cadastrar Primeiro Cliente
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;