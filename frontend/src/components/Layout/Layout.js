import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
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
              to="/produtos" 
              className={`nav-link ${isActive('/produtos') ? 'active' : ''}`}
            >
              Produtos
            </Link>
            <Link 
              to="/orcamentos" 
              className={`nav-link ${isActive('/orcamentos') ? 'active' : ''}`}
            >
              Orçamentos
            </Link>
            <Link 
              to="/financeiro" 
              className={`nav-link ${isActive('/financeiro') ? 'active' : ''}`}
            >
              Financeiro
            </Link>

            {isAdmin && (
              <Link
                to="/admin/usuarios"
                className={`nav-link ${isActive('/admin/usuarios') ? 'active' : ''}`}
              >
                Admin
              </Link>
            )}

            <span className="nav-user">{user?.username}</span>
            <button type="button" className="nav-logout" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>
      </nav>
      <main className="main-content">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default Layout;