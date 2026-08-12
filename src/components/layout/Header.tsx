import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, Bell, Sun, Moon, LayoutList, 
  KanbanSquare, CalendarDays, BarChart2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Breadcrumb } from './Breadcrumb';
import { Avatar } from '../common/Avatar';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import './layout.css';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isProjectPage = location.pathname.includes('/projects/');
  
  const { theme, toggleTheme } = useUIStore();
  const { user, logout } = useAuthStore();

  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const displayName = user?.name || 'User';
  const canOpenAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const goTo = (path: string) => {
    setShowProfileMenu(false);
    navigate(path);
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--spacing-6)' }}>
      {/* LEFT SECTION: Breadcrumbs */}
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <Breadcrumb />
      </div>

      {/* CENTER SECTION: Search */}
      <div className="header-center" style={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
        <motion.div 
          className={`search-container ${searchFocused ? 'focused' : ''}`}
          animate={{ width: searchFocused ? 400 : 250 }}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'var(--bg-body)', border: '1px solid var(--border-color)', 
            borderRadius: 'var(--radius-full)', padding: '0 16px', height: '36px' 
          }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search tasks, projects..." 
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{ 
              border: 'none', background: 'transparent', outline: 'none', 
              color: 'var(--text-primary)', width: '100%', fontSize: '0.875rem' 
            }}
          />
        </motion.div>
      </div>

      {/* RIGHT SECTION: Actions */}
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', flex: 1 }}>
        {isProjectPage && (
          <div className="view-toggles" style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '16px', borderRight: '1px solid var(--border-color)' }}>
            <button className="view-toggle-btn active" style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}><LayoutList size={18} /></button>
            <button className="view-toggle-btn" style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><KanbanSquare size={18} /></button>
            <button className="view-toggle-btn" style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><CalendarDays size={18} /></button>
            <button className="view-toggle-btn" style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><BarChart2 size={18} /></button>
          </div>
        )}

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={toggleTheme} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <div className="notification-wrapper" style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', position: 'relative' }}
            >
              <Bell size={20} />
              <span style={{ position: 'absolute', top: '2px', right: '4px', background: 'var(--error)', color: 'white', fontSize: '10px', fontWeight: 'bold', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{ position: 'absolute', top: '100%', right: 0, width: '250px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 50 }}
                >
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>Notifications</div>
                  <div style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <p>Task updated</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="profile-wrapper" style={{ position: 'relative', marginLeft: '8px' }}>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{ padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '50%' }}
            >
              <Avatar name={displayName} src={user?.profilePic} size="sm" status="online" />
            </button>
            
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{ position: 'absolute', top: '100%', right: 0, width: '200px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 50, marginTop: '8px' }}
                >
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                    <strong style={{ display: 'block', fontSize: '0.875rem' }}>{displayName}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</span>
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    <button onClick={() => goTo('/settings')} style={{ width: '100%', padding: '8px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)' }}>Profile Settings</button>
                    {canOpenAdmin && (
                      <button onClick={() => goTo('/admin')} style={{ width: '100%', padding: '8px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)' }}>Admin Panel</button>
                    )}
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>
                    <button onClick={handleLogout} style={{ width: '100%', padding: '8px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--error)' }}>Logout</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
