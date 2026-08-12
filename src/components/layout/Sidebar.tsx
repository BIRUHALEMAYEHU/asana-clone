import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard, 
  CheckSquare, 
  Bell, 
  FolderKanban, 
  LogOut,
  Shield,
  CreditCard,
  Building2,
  Settings,
  Hexagon
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Avatar } from '../common/Avatar';
import './layout.css';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label }) => {
  const { sidebarCollapsed } = useUIStore();
  return (
    <li>
      <NavLink 
        to={to} 
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} 
        title={sidebarCollapsed ? label : ''}
      >
        <Icon className="nav-icon" size={20} />
        {!sidebarCollapsed && <span className="nav-label">{label}</span>}
      </NavLink>
    </li>
  );
};

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const { departments, projects } = useWorkspaceStore();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavLinks = () => {
    switch (user.role) {
      case 'SUPER_ADMIN':
        return (
          <>
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/projects" icon={FolderKanban} label="Projects" />
            <NavItem to="/my-tasks" icon={CheckSquare} label="My Tasks" />
            <NavItem to="/inbox" icon={Bell} label="Inbox" />
            <hr className="nav-separator" style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--border-color, #333)' }} />
            <NavItem to="/admin" icon={Shield} label="Admin Panel" />
            <NavItem to="/admin/payroll" icon={CreditCard} label="Payroll" />
            <hr className="nav-separator" style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--border-color, #333)' }} />
            <NavItem to="/settings" icon={Settings} label="Settings" />
          </>
        );
      case 'ADMIN':
        return (
          <>
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/projects" icon={FolderKanban} label="Department Tasks" />
            <NavItem to="/my-tasks" icon={CheckSquare} label="My Tasks" />
            <NavItem to="/inbox" icon={Bell} label="Inbox" />
            <hr className="nav-separator" style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--border-color, #333)' }} />
            <NavItem to="/admin" icon={Building2} label="Department Mgmt" />
            <hr className="nav-separator" style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--border-color, #333)' }} />
            <NavItem to="/settings" icon={Settings} label="Settings" />
          </>
        );
      case 'MEMBER':
      default:
        return (
          <>
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/projects" icon={FolderKanban} label="Projects" />
            <NavItem to="/my-tasks" icon={CheckSquare} label="My Tasks" />
            <NavItem to="/inbox" icon={Bell} label="Inbox" />
            <hr className="nav-separator" style={{ margin: '12px 0', border: 'none', borderTop: '1px solid var(--border-color, #333)' }} />
            <NavItem to="/settings" icon={Settings} label="Settings" />
          </>
        );
    }
  };

  const getRoleBadgeColor = () => {
    switch (user.role) {
      case 'SUPER_ADMIN': return '#9b51e0'; // Purple
      case 'ADMIN': return '#2d9cdb'; // Blue
      default: return '#828282'; // Gray
    }
  };

  return (
    <motion.aside 
      className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
      animate={{ width: sidebarCollapsed ? 70 : 240 }}
      transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
    >
      <div className="sidebar-header">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Hexagon size={24} style={{ color: 'var(--primary, #9b51e0)' }} />
          {!sidebarCollapsed && <span className="brand-text" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Teamflow</span>}
        </div>
        <button className="collapse-btn" onClick={toggleSidebar} title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav" style={{ overflowY: 'auto', flex: 1, paddingBottom: '20px' }}>
        <div className="nav-section">
          <ul className="nav-list">
            {renderNavLinks()}
          </ul>
        </div>

        {user.role === 'SUPER_ADMIN' && !sidebarCollapsed && departments.length > 0 && (
          <div className="nav-section" style={{ marginTop: '20px' }}>
            <h4 className="section-title">DEPARTMENTS</h4>
            <ul className="nav-list">
              {departments.map(dept => (
                <li key={dept.id} className="nav-item" style={{ cursor: 'pointer' }} title={dept.name} onClick={() => navigate('/admin/departments')}>
                  <span className="team-indicator" style={{ backgroundColor: dept.color, width: 8, height: 8, borderRadius: '50%', marginRight: 12, flexShrink: 0 }} />
                  <span className="nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dept.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'MEMBER') && !sidebarCollapsed && projects.length > 0 && (
          <div className="nav-section" style={{ marginTop: '20px' }}>
            <h4 className="section-title">PROJECTS</h4>
            <ul className="nav-list">
              {projects
                .filter(p =>
                  user.role === 'SUPER_ADMIN' ||
                  (p as any).departmentId === user.departmentId ||
                  (p as any).teamId === user.departmentId
                )
                .map(project => (
                  <li key={project.id} className="nav-item" style={{ cursor: 'pointer' }} title={project.name} onClick={() => navigate(`/projects/${project.id}`)}>
                    <span className="project-color" style={{ backgroundColor: project.color || '#6C5CE7', width: 8, height: 8, borderRadius: '50%', marginRight: 12, flexShrink: 0 }} />
                    <span className="nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', width: '100%' }}>
          <Avatar name={user.name} src={user.profilePic} size={sidebarCollapsed ? 'sm' : 'md'} />
          {!sidebarCollapsed && (
            <div className="user-info" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="user-name" style={{ fontSize: '0.9rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div className="user-role-badge" style={{ 
                fontSize: '0.7rem', 
                backgroundColor: getRoleBadgeColor(), 
                color: 'white', 
                padding: '2px 6px', 
                borderRadius: '4px', 
                display: 'inline-block',
                marginTop: '4px',
                width: 'fit-content'
              }}>
                {user.role.replace('_', ' ')}
              </div>
            </div>
          )}
        </div>
        {!sidebarCollapsed && (
          <button className="logout-btn" onClick={handleLogout} title="Logout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #888)' }}>
            <LogOut size={18} />
          </button>
        )}
        {sidebarCollapsed && (
          <button className="logout-btn" onClick={handleLogout} title="Logout" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #888)' }}>
            <LogOut size={18} />
          </button>
        )}
      </div>
    </motion.aside>
  );
};
