import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path) => {
    return location.pathname === path;
  };

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen((current) => !current);
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            CJM System
          </Link>
          <button
            type="button"
            className={`nav-toggle ${isMenuOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isMenuOpen}
            aria-controls="primary-navigation"
          >
            <span />
            <span />
            <span />
          </button>
          <div
            className={`nav-backdrop ${isMenuOpen ? 'open' : ''}`}
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`} id="primary-navigation">
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Dashboard
            </Link>
            <Link 
              to="/clientes" 
              className={`nav-link ${isActive('/clientes') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Clientes
            </Link>
            <Link 
              to="/produtos" 
              className={`nav-link ${isActive('/produtos') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Produtos
            </Link>
            <Link 
              to="/orcamentos" 
              className={`nav-link ${isActive('/orcamentos') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Orçamentos
            </Link>
            <Link 
              to="/financeiro" 
              className={`nav-link ${isActive('/financeiro') ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Financeiro
            </Link>

            {isAdmin && (
              <Link
                to="/admin/usuarios"
                className={`nav-link ${isActive('/admin/usuarios') ? 'active' : ''}`}
                onClick={closeMenu}
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