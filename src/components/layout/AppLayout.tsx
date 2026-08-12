import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import './layout.css';

export const AppLayout: React.FC = () => {
  const { sidebarCollapsed } = useUIStore();
  const { user, isAuthenticated, fetchUsers } = useAuthStore();
  const { fetchAllData } = useWorkspaceStore();

  useEffect(() => {
    const loadWorkspace = async () => {
      if (!isAuthenticated || !user) return;

      // Refresh users + invitations after page reload.
      await fetchUsers();

      let workspaceId = user.workspaceId;

      if (!workspaceId) {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
          const res = await fetch('/api/workspaces', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const workspaces = await res.json();
            workspaceId = workspaces[0]?.id;
          }
        } catch (error) {
          console.error('Failed to resolve workspace', error);
        }
      }

      if (workspaceId) {
        await fetchAllData(workspaceId);
      }
    };

    loadWorkspace();
  }, [isAuthenticated, user?.id, user?.workspaceId]);

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
