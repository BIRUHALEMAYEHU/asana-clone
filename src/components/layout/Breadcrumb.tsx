import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import './layout.css';

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
      <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Home</Link>
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        
        // Basic formatting for breadcrumb segments
        const title = value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');

        return (
          <React.Fragment key={to}>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            {isLast ? (
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{title}</span>
            ) : (
              <Link to={to} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{title}</Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
