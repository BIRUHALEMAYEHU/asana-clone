import React, { useEffect, useMemo, useState } from 'react';
import { UserPlus, Shield, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../common/Modal';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';
import type { ProjectMemberRole } from '../../types';

interface ProjectMembersModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || '?';

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  projectId,
  isOpen,
  onClose
}) => {
  const {
    fetchProjectMembers,
    getProjectMembers,
    addProjectMember,
    updateProjectMemberRole,
    removeProjectMember
  } = useWorkspaceStore();
  const { user, allUsers } = useAuthStore();

  const members = getProjectMembers(projectId);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectMemberRole>('MEMBER');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchProjectMembers(projectId).catch((err: any) => {
      toast.error(err.message || 'Failed to load members');
    });
  }, [isOpen, projectId, fetchProjectMembers]);

  const memberIds = useMemo(() => new Set(members.map(m => m.userId)), [members]);

  const candidates = useMemo(
    () => allUsers.filter(u => !memberIds.has(u.id)),
    [allUsers, memberIds]
  );

  const canManage =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN' ||
    members.some(m => m.userId === user?.id && m.role === 'ADMIN');

  const handleAdd = async () => {
    if (!selectedUserId) {
      toast.error('Pick a company member to add');
      return;
    }
    setBusy(true);
    try {
      await addProjectMember(projectId, selectedUserId, selectedRole);
      toast.success('Added to project');
      setSelectedUserId('');
      setSelectedRole('MEMBER');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add member');
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (userId: string, role: ProjectMemberRole) => {
    setBusy(true);
    try {
      await updateProjectMemberRole(projectId, userId, role);
      toast.success('Role updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    setBusy(true);
    try {
      await removeProjectMember(projectId, userId);
      toast.success(`Removed ${name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project members" size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Only people already in this company can be added. Project admins can manage the roster
          and will be able to receive restricted DMs later.
        </p>

        {canManage && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: '0.5rem',
              alignItems: 'center'
            }}
          >
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              disabled={busy || candidates.length === 0}
              style={{
                padding: '0.55rem 0.75rem',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="">
                {candidates.length === 0 ? 'Everyone is already on this project' : 'Add company member…'}
              </option>
              {candidates.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value as ProjectMemberRole)}
              disabled={busy}
              style={{
                padding: '0.55rem 0.75rem',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Project admin</option>
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy || !selectedUserId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.55rem 0.9rem',
                borderRadius: 8,
                border: 'none',
                background: 'var(--primary)',
                color: '#fff',
                cursor: busy || !selectedUserId ? 'not-allowed' : 'pointer',
                opacity: busy || !selectedUserId ? 0.6 : 1
              }}
            >
              <UserPlus size={16} />
              Add
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {members.length === 0 && (
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No members yet. Create a project as an admin to become the first project admin.
            </p>
          )}
          {members.map(member => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 10,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-body)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  {initials(member.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{member.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{member.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {canManage ? (
                  <select
                    value={member.role}
                    onChange={e =>
                      handleRoleChange(member.userId, e.target.value as ProjectMemberRole)
                    }
                    disabled={busy}
                    style={{
                      padding: '0.35rem 0.5rem',
                      borderRadius: 6,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Project admin</option>
                  </select>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {member.role === 'ADMIN' && <Shield size={14} />}
                    {member.role === 'ADMIN' ? 'Project admin' : 'Member'}
                  </span>
                )}

                {canManage && (
                  <button
                    type="button"
                    title="Remove from project"
                    onClick={() => handleRemove(member.userId, member.name)}
                    disabled={busy}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      padding: 6,
                      borderRadius: 6
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
