import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AdminRoute from './components/Auth/AdminRoute';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import ClienteList from './components/Cliente/ClienteList';
import ClienteForm from './components/Cliente/ClienteForm';
import ClienteDetails from './components/Cliente/ClienteDetails';
import ProdutoManager from './components/Produto/ProdutoManager';
import OrcamentoList from './components/Orcamento/OrcamentoList';
import OrcamentoForm from './components/Orcamento/OrcamentoForm';
import OrcamentoDetails from './components/Orcamento/OrcamentoDetails';
import Financeiro from './components/Financeiro/Financeiro';
import UserManagement from './components/Admin/UserManagement';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<ClienteList />} />
            <Route path="/clientes/novo" element={<ClienteForm />} />
            <Route path="/clientes/:id" element={<ClienteDetails />} />
            <Route path="/clientes/:id/editar" element={<ClienteForm />} />
            <Route path="/produtos" element={<ProdutoManager />} />
            <Route path="/orcamentos" element={<OrcamentoList />} />
            <Route path="/orcamentos/novo" element={<OrcamentoForm />} />
            <Route path="/orcamentos/:id" element={<OrcamentoDetails />} />
            <Route path="/orcamentos/:id/editar" element={<OrcamentoForm />} />
            <Route path="/financeiro" element={<Financeiro />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin/usuarios" element={<UserManagement />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
