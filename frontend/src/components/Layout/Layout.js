import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            CJM System
          </Link>
          <div className="nav-menu">
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/clientes" 
              className={`nav-link ${isActive('/clientes') ? 'active' : ''}`}
            >
              Clientes
            </Link>
            <Link 
              to="/clientes/novo" 
              className={`nav-link ${isActive('/clientes/novo') ? 'active' : ''}`}
            >
              Novo Cliente
            </Link>
          </div>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;