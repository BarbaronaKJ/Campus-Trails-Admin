import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

function Layout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    dashboard: true,
    mapManagement: true,
    contentAssets: true,
    userInteraction: true,
    systemSettings: true
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const MenuItem = ({ to, label, onClick }) => (
    <li>
      <Link 
        to={to} 
        onClick={onClick}
        className={isActive(to) ? 'active' : ''}
      >
        {!collapsed && <span className="menu-label">{label}</span>}
        {collapsed && <span className="menu-label" title={label}>{label.substring(0, 2)}</span>}
      </Link>
    </li>
  );

  const MenuSection = ({ title, sectionKey, children }) => (
    <div className="menu-section">
      <div 
        className="menu-section-header"
        onClick={() => !collapsed && toggleSection(sectionKey)}
      >
        {!collapsed && (
          <>
            <span className="section-title">{title}</span>
            <span className="section-toggle">
              {expandedSections[sectionKey] ? '▼' : '▶'}
            </span>
          </>
        )}
        {collapsed && (
          <span className="section-title" title={title}>{title.substring(0, 3)}</span>
        )}
      </div>
      {(!collapsed && expandedSections[sectionKey]) && (
        <ul className="menu-section-items">
          {children}
        </ul>
      )}
    </div>
  );

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>{collapsed ? 'CT' : 'Campus Trails'}</h2>
          {!collapsed && <p>Admin Panel</p>}
        </div>
        
        <div className="user-info">
          {!collapsed && <p>{user?.email}</p>}
          <button 
            onClick={handleLogout} 
            className="btn btn-secondary"
            title={collapsed ? 'Logout' : ''}
          >
            {collapsed ? 'Out' : 'Logout'}
          </button>
        </div>

        <div className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '▶' : '◀'}
        </div>

        <ul className="sidebar-menu">
          {/* Dashboard */}
          <MenuItem to="/" label="Dashboard" />

          {/* Map Management */}
          <MenuSection title="Map Management" sectionKey="mapManagement">
            <MenuItem to="/pins" label="Facility Pins" />
            <MenuItem to="/floors" label="Floor Plans" />
            <MenuItem to="/campuses" label="Campuses" />
          </MenuSection>

          {/* Content & Assets */}
          <MenuSection title="Content & Assets" sectionKey="contentAssets">
            <MenuItem to="/media" label="Media Library" />
          </MenuSection>

          {/* User & Interaction */}
          <MenuSection title="User & Interaction" sectionKey="userInteraction">
            <MenuItem to="/users" label="User Management" />
            <MenuItem to="/feedbacks" label="Feedback & Reports" />
            <MenuItem to="/notifications" label="Notifications" />
          </MenuSection>

          {/* System Settings */}
          <MenuSection title="System Settings" sectionKey="systemSettings">
            <MenuItem to="/settings" label="API Configuration" />
            <MenuItem to="/profile" label="Profile Settings" />
            <MenuItem to="/developers" label="Developers" />
          </MenuSection>
        </ul>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
