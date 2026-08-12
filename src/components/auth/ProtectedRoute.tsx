import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { Role } from '../../types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="unauthorized-container" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh',
        color: 'var(--text-primary)', backgroundColor: 'var(--bg-dark)'
      }}>
        <h1>403 - Unauthorized</h1>
        <p>You don't have permission to access this page.</p>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
