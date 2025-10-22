import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import ClienteList from './components/Cliente/ClienteList';
import ClienteForm from './components/Cliente/ClienteForm';
import ClienteDetails from './components/Cliente/ClienteDetails';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<ClienteList />} />
          <Route path="/clientes/novo" element={<ClienteForm />} />
          <Route path="/clientes/:id" element={<ClienteDetails />} />
          <Route path="/clientes/:id/editar" element={<ClienteForm />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
