import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Role, Invitation } from '../types';
import { useWorkspaceStore } from './workspaceStore';
import { useChatStore } from './chatStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  allUsers: User[];
  invitations: Invitation[];
  
  // Actions
  login: (email: string, password?: string) => Promise<void>;
  signup: (email: string, name: string, password?: string) => Promise<void>;
  acceptInvitationWithToken: (token: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  inviteUser: (email: string, name: string, role: Role, departmentId: string) => Promise<{ inviteUrl?: string; previewUrl?: string | null; message?: string }>;
  getInvitationLink: (invitationId: string) => Promise<string>;
  declineInvitation: (invitationId: string) => Promise<void>;
  updateUserRole: (userId: string, newRole: Role, departmentId?: string) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  getUsersByDepartment: (departmentId: string) => User[];
  fetchUsers: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      allUsers: [],
      invitations: [],

      login: async (email: string, password?: string) => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Login failed');
          }
          const { user, token } = await res.json();
          localStorage.setItem('token', token);
          useWorkspaceStore.getState().reset();
          useChatStore.getState().reset();
          set({ user, isAuthenticated: true, isLoading: false });
          get().fetchUsers();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      signup: async (email: string, name: string, password?: string) => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, password })
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Signup failed');
          }
          const { user, token } = await res.json();
          localStorage.setItem('token', token);
          useWorkspaceStore.getState().reset();
          useChatStore.getState().reset();
          set({ user, isAuthenticated: true, isLoading: false });
          get().fetchUsers();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      acceptInvitationWithToken: async (token: string, password: string) => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/auth/invitations/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password })
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to accept invitation');
          }

          const { user, token: sessionToken } = await res.json();
          localStorage.setItem('token', sessionToken);
          useWorkspaceStore.getState().reset();
          useChatStore.getState().reset();
          set({ user, isAuthenticated: true, isLoading: false });
          get().fetchUsers();
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, isAuthenticated: false, allUsers: [], invitations: [] });
        // Prevent the next login from seeing the previous user's departments/projects.
        useWorkspaceStore.getState().reset();
        useChatStore.getState().reset();
      },

      updateProfile: async (data: Partial<User>) => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const res = await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.error || 'Failed to update profile');
        }

        set((state) => ({ user: { ...(state.user as User), ...payload } }));
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      inviteUser: async (email: string, name: string, role: Role, departmentId: string) => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');
        
        const res = await fetch('/api/auth/invite', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email, name, role, departmentId })
        });
        
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to send invite');
        }
        
        await get().fetchUsers();
        return {
          inviteUrl: data.inviteUrl,
          previewUrl: data.previewUrl,
          message: data.message
        };
      },

      getInvitationLink: async (invitationId: string) => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`/api/auth/invitations/${invitationId}/link`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to get invitation link');
        }
        if (!data.inviteUrl) throw new Error('No invitation link returned');
        return data.inviteUrl as string;
      },

      fetchUsers: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
          const res = await fetch('/api/auth/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) return;

          const users = await res.json();
          set({ allUsers: users });

          const invRes = await fetch('/api/auth/invitations/pending', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (invRes.ok) {
            const pendingInvitations = await invRes.json();
            set({ invitations: pendingInvitations });
          } else {
            set({ invitations: [] });
          }
        } catch (error) {
          console.error('Failed to fetch users', error);
        }
      },

      declineInvitation: async (invitationId: string) => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');
        try {
          const res = await fetch(`/api/auth/invitations/${invitationId}/decline`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to revoke invitation');
          }
          await get().fetchUsers();
        } catch (error) {
          console.error(error);
          throw error;
        }
      },

      updateUserRole: async (userId: string, newRole: Role, departmentId?: string) => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`/api/auth/users/${userId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ role: newRole, departmentId: departmentId || null })
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to update user');
        }

        const updated = await res.json().catch(() => null);
        if (updated && get().user?.id === userId) {
          set((state) => ({ user: { ...(state.user as User), ...updated } }));
        }
        await get().fetchUsers();
      },

      removeUser: async (userId: string) => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(`/api/auth/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to remove user');
        }

        await get().fetchUsers();
      },

      getUsersByDepartment: (departmentId: string) => {
        return get().allUsers.filter(u => (u as any).teamId === departmentId || u.departmentId === departmentId);
      }
    }),
    {
      name: 'auth-storage-v3',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
