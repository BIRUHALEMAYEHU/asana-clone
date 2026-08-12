import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Building2, Users, UserPlus, DollarSign, Settings,
  CheckSquare, Plus, Pencil, Trash2, XCircle, Bell, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  PieChart, Pie, Cell, BarChart as RechartsBarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, endOfMonth, addDays } from 'date-fns';

import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { Role, Department, User } from '../types';

const COLORS = ['#6C5CE7', '#00B894', '#FDCB6E', '#E17055', '#0984E3', '#00CEC9'];

// --- Subcomponents ---

const OverviewTab: React.FC = () => {
  const { allUsers } = useAuthStore();
  const { departments, projects, tasks } = useWorkspaceStore();

  const tasksByStatus = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const taskData = Object.keys(tasksByStatus).map(key => ({
    name: key,
    value: tasksByStatus[key]
  }));

  return (
    <div className="page-content">
      <div className="bento-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Users', value: allUsers.length },
          { label: 'Departments', value: departments.length },
          { label: 'Projects', value: projects.length },
          { label: 'Tasks', value: tasks.length },
        ].map((stat, i) => (
          <div key={i} className="card-panel col-span-3">
            <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{stat.label}</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bento-grid">
        <div className="card-panel col-span-6">
          <h3 className="card-panel-title">Tasks by Status</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={taskData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '0.5rem' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const DepartmentsTab: React.FC = () => {
  const { departments, addDepartment, updateDepartment, deleteDepartment } = useWorkspaceStore();
  const { allUsers } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: '', description: '', color: '#6C5CE7', adminId: '' });

  const resetForm = () => {
    setFormData({ name: '', description: '', color: '#6C5CE7', adminId: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (dept: Department) => {
    setFormData({
      name: dept.name,
      description: dept.description || '',
      color: dept.color || '#6C5CE7',
      adminId: dept.adminId || ''
    });
    setEditingId(dept.id);
    setShowForm(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateDepartment(editingId, {
          name: formData.name,
          description: formData.description,
          color: formData.color,
          adminId: formData.adminId || null
        });
        toast.success('Department updated');
      } else {
        const newDept: Omit<Department, 'id'> = {
          name: formData.name,
          description: formData.description,
          color: formData.color,
          adminId: formData.adminId || undefined,
          memberIds: formData.adminId ? [formData.adminId] : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await addDepartment(newDept);
        toast.success('Department created');
      }
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!window.confirm(`Delete "${dept.name}"? This cannot be undone.`)) return;

    setPendingDeleteId(dept.id);
    try {
      await deleteDepartment(dept.id);
      toast.success('Department deleted');
      if (editingId === dept.id) resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete department');
    } finally {
      setPendingDeleteId(null);
    }
  };

  const admins = allUsers.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Manage Departments</h2>
        <button 
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} /> {showForm ? 'Cancel' : 'Add Department'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleCreate} 
            className="card-panel"
            style={{ marginBottom: '1.5rem', overflow: 'hidden' }}
          >
            <div className="bento-grid">
              <div className="col-span-6" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input" />
              </div>
              <div className="col-span-6" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Color</label>
                <input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} style={{ width: '100%', height: '40px', padding: '2px', background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }} />
              </div>
              <div className="col-span-6" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="textarea" />
              </div>
              <div className="col-span-6" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Assign Admin (Optional)</label>
                <select value={formData.adminId} onChange={e => setFormData({...formData, adminId: e.target.value})} className="select">
                  <option value="">None</option>
                  {admins.map(a => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="bento-grid">
        {departments.map(dept => (
          <div key={dept.id} className="card-panel col-span-4" style={{ borderTop: `4px solid ${dept.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{dept.name}</h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{dept.description}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button onClick={() => startEdit(dept)} className="btn btn-ghost" style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(dept)} disabled={pendingDeleteId === dept.id} className="btn btn-ghost" style={{ padding: '0.5rem', color: 'var(--error)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <span>
                {allUsers.filter(u => u.departmentId === dept.id).length || dept.memberIds?.length || dept.memberCount || 0} members
              </span>
              {dept.adminId && <span>Admin: {allUsers.find(u => u.id === dept.adminId)?.name}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
  let badgeClass = 'badge ';
  if (role === 'SUPER_ADMIN') badgeClass += 'badge-error'; // using error color (red/pink) for super admin
  else if (role === 'ADMIN') badgeClass += 'badge-info';
  else badgeClass += 'badge-default';

  return (
    <span className={badgeClass}>
      {role.replace('_', ' ')}
    </span>
  );
};

const UsersTab: React.FC<{ users?: User[], hideDepartment?: boolean }> = ({ users, hideDepartment }) => {
  const { allUsers, updateUserRole, removeUser } = useAuthStore();
  const { departments } = useWorkspaceStore();
  const displayUsers = users || allUsers;
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const handleUpdate = async (userId: string, role: Role, departmentId: string | undefined, successMessage: string) => {
    setPendingUserId(userId);
    try {
      await updateUserRole(userId, role, departmentId);
      toast.success(successMessage);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user');
    } finally {
      setPendingUserId(null);
    }
  };

  const handleRemove = async (user: User) => {
    if (!window.confirm(`Remove ${user.name} from the workspace? This cannot be undone.`)) return;

    setPendingUserId(user.id);
    try {
      await removeUser(user.id);
      toast.success('User removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove user');
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="card-panel col-span-12" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-body)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '1rem', fontWeight: 500 }}>User</th>
              <th style={{ padding: '1rem', fontWeight: 500 }}>Position</th>
              <th style={{ padding: '1rem', fontWeight: 500 }}>Role</th>
              {!hideDepartment && <th style={{ padding: '1rem', fontWeight: 500 }}>Department</th>}
              <th style={{ padding: '1rem', fontWeight: 500 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayUsers.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 600 }}>
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user.name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                  </div>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{user.position || 'N/A'}</td>
                <td style={{ padding: '1rem' }}><RoleBadge role={user.role} /></td>
                {!hideDepartment && (
                  <td style={{ padding: '1rem' }}>
                    <select
                      value={user.departmentId || ''}
                      onChange={(e) => handleUpdate(user.id, user.role, e.target.value, 'Department updated')}
                      disabled={pendingUserId === user.id}
                      className="select"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                    >
                      <option value="">None</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                )}
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdate(user.id, e.target.value as Role, user.departmentId, 'Role updated')}
                      disabled={pendingUserId === user.id}
                      className="select"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                    >
                      {!hideDepartment && <option value="SUPER_ADMIN">Super Admin</option>}
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                    </select>
                    <button 
                      onClick={() => handleRemove(user)}
                      disabled={pendingUserId === user.id}
                      className="btn btn-ghost"
                      style={{ padding: '0.5rem', color: 'var(--error)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const InviteTab: React.FC<{ isSuperAdmin: boolean; fixedDepartmentId?: string }> = ({ isSuperAdmin, fixedDepartmentId }) => {
  const { inviteUser, invitations, declineInvitation, getInvitationLink } = useAuthStore();
  const { departments } = useWorkspaceStore();
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [departmentId, setDepartmentId] = useState(fixedDepartmentId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState('');
  const [copyingId, setCopyingId] = useState<string | null>(null);

  // Keep the selected department in sync when the list loads/changes after login.
  useEffect(() => {
    if (fixedDepartmentId) {
      setDepartmentId(fixedDepartmentId);
      return;
    }
    if (!departmentId || !departments.some(d => d.id === departmentId)) {
      setDepartmentId(departments[0]?.id || '');
    }
  }, [departments, fixedDepartmentId, departmentId]);

  const copyInviteUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy — select the link manually');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      toast.error('Please fill all fields');
      return;
    }

    const selectedDepartmentId = fixedDepartmentId || departmentId;
    if (!selectedDepartmentId) {
      toast.error('Please select a department');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await inviteUser(email, name, role, selectedDepartmentId);
      toast.success(`Invitation created for ${email}`);
      if (result.inviteUrl) {
        setLastInviteUrl(result.inviteUrl);
        await copyInviteUrl(result.inviteUrl);
      }
      setEmail('');
      setName('');
      setRole('MEMBER');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    try {
      await declineInvitation(invitationId);
      toast.success('Invitation revoked');
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke invitation');
    }
  };

  const handleCopyPendingLink = async (invitationId: string) => {
    setCopyingId(invitationId);
    try {
      const url = await getInvitationLink(invitationId);
      setLastInviteUrl(url);
      await copyInviteUrl(url);
    } catch (err: any) {
      toast.error(err.message || 'Failed to get invitation link');
    } finally {
      setCopyingId(null);
    }
  };

  const relevantInvitations = isSuperAdmin
    ? invitations
    : invitations.filter(i => i.departmentId === fixedDepartmentId);

  return (
    <div className="page-content bento-grid">
      <div className="col-span-12">
        <form onSubmit={handleInvite} className="card-panel">
          <h3 className="card-panel-title">Invite New User</h3>
          <div className="bento-grid">
            <div className="col-span-6" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} className="input" />
            </div>
            <div className="col-span-6" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Email</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" />
            </div>
            <div className="col-span-6" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value as Role)} className="select">
                {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
              </select>
            </div>
            <div className="col-span-6" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Department</label>
              {isSuperAdmin ? (
                <select
                  required
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                  className="select"
                >
                  <option value="">Select department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  disabled
                  value={departments.find(d => d.id === fixedDepartmentId)?.name || 'Your department'}
                />
              )}
            </div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
          {lastInviteUrl && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <a href={lastInviteUrl} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all', color: 'var(--primary)', flex: 1 }}>
                {lastInviteUrl}
              </a>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '0.5rem', flexShrink: 0 }}
                title="Copy link"
                onClick={() => copyInviteUrl(lastInviteUrl)}
              >
                <Copy size={18} />
              </button>
            </div>
          )}
        </form>
      </div>

      <div className="card-panel col-span-12" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 className="card-panel-title" style={{ margin: 0 }}>Invitations</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-body)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Name / Email</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Role</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Department</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {relevantInvitations.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No invitations yet
                  </td>
                </tr>
              )}
              {relevantInvitations.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{inv.name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{inv.email}</div>
                  </td>
                  <td style={{ padding: '1rem' }}><RoleBadge role={inv.role} /></td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    {departments.find(d => d.id === inv.departmentId)?.name || 'Unassigned'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${
                      inv.status === 'pending' ? 'badge-warning' :
                      inv.status === 'accepted' ? 'badge-success' :
                      'badge-error'
                    }`}>
                      {inv.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {inv.status === 'pending' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button
                          onClick={() => handleCopyPendingLink(inv.id)}
                          className="btn btn-ghost"
                          style={{ padding: '0.5rem', color: 'var(--primary)' }}
                          title="Copy invite link"
                          disabled={copyingId === inv.id}
                        >
                          <Copy size={18} />
                        </button>
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          className="btn btn-ghost"
                          style={{ padding: '0.5rem', color: 'var(--error)' }}
                          title="Revoke invitation"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PayrollTab: React.FC = () => {
  const { payroll, updatePayrollStatus, addPayrollEntry, departments } = useWorkspaceStore();
  const { allUsers } = useAuthStore();
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', baseSalary: 5000, bonus: 0, deductions: 0, dateJoined: '', bankAccount: '', employmentType: 'Full-time' as 'Internship' | 'Full-time' });
  
  const totalPayroll = payroll.reduce((acc, p) => acc + p.netPay, 0);
  const pending = payroll.filter(p => p.status === 'PENDING').reduce((acc, p) => acc + p.netPay, 0);
  const approved = payroll.filter(p => p.status === 'APPROVED').reduce((acc, p) => acc + p.netPay, 0);
  const paid = payroll.filter(p => p.status === 'PAID').reduce((acc, p) => acc + p.netPay, 0);

  const nextPayrollDate = endOfMonth(new Date());

  const handleSendNotifications = () => {
    toast.success('Monthly payroll reminders have been sent to all department admins and in-app notifications.');
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const netPay = Number(formData.baseSalary) + Number(formData.bonus) - Number(formData.deductions);
    
    addPayrollEntry({
      id: `pr_${Date.now()}`,
      userId: `u_${Date.now()}`,
      userName: formData.name,
      departmentId: '',
      departmentName: 'Unassigned',
      baseSalary: Number(formData.baseSalary),
      bonus: Number(formData.bonus),
      deductions: Number(formData.deductions),
      netPay: netPay,
      period: format(nextPayrollDate, 'MMMM yyyy'),
      status: 'PENDING',
      dateJoined: formData.dateJoined,
      bankAccount: formData.bankAccount,
      employmentType: formData.employmentType,
      createdAt: new Date().toISOString()
    });
    
    toast.success('Employee added to payroll');
    setShowForm(false);
    setFormData({ name: '', baseSalary: 5000, bonus: 0, deductions: 0, dateJoined: '', bankAccount: '', employmentType: 'Full-time' });
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Monthly Payroll</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Next scheduled payroll: {format(nextPayrollDate, 'MMMM do, yyyy')}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} /> {showForm ? 'Cancel' : 'Add Employee'}
          </button>
          <button 
            onClick={handleSendNotifications}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Bell size={18} /> Send Upcoming Payroll Notifications
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleAddEmployee} 
            className="card-panel"
            style={{ marginBottom: '1.5rem', overflow: 'hidden' }}
          >
            <div className="bento-grid">
              <div className="col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Name</label>
                <input required type="text" placeholder="Enter name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input" />
              </div>
              <div className="col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Base Salary</label>
                <input type="number" required value={formData.baseSalary} onChange={e => setFormData({...formData, baseSalary: Number(e.target.value)})} className="input" />
              </div>
              <div className="col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Bonus</label>
                <input type="number" required value={formData.bonus} onChange={e => setFormData({...formData, bonus: Number(e.target.value)})} className="input" />
              </div>
              <div className="col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Deductions</label>
                <input type="number" required value={formData.deductions} onChange={e => setFormData({...formData, deductions: Number(e.target.value)})} className="input" />
              </div>
              <div className="col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Date Joined</label>
                <input required type="date" value={formData.dateJoined} onChange={e => setFormData({...formData, dateJoined: e.target.value})} className="input" />
              </div>
              <div className="col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Bank Account</label>
                <input required type="text" placeholder="Bank Account Number" value={formData.bankAccount} onChange={e => setFormData({...formData, bankAccount: e.target.value})} className="input" />
              </div>
              <div className="col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Employment Type</label>
                <select value={formData.employmentType} onChange={e => setFormData({...formData, employmentType: e.target.value as 'Internship' | 'Full-time'})} className="select">
                  <option value="Full-time">Full-time</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary">Add to Payroll</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="bento-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Payroll', value: totalPayroll },
          { label: 'Pending', value: pending },
          { label: 'Approved', value: approved },
          { label: 'Paid', value: paid },
        ].map((stat, i) => (
          <div key={i} className="card-panel col-span-3">
            <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{stat.label}</h3>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)' }}>${stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="card-panel col-span-12" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-body)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Employee</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Department</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Base</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Net Pay</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Date Joined</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Bank Account</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Type</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: 500 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map(entry => (
                <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>{entry.userName}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{entry.departmentName}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>${entry.baseSalary.toLocaleString()}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>${entry.netPay.toLocaleString()}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{entry.dateJoined || 'N/A'}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{entry.bankAccount || 'N/A'}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{entry.employmentType || 'N/A'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className={`badge ${
                      entry.status === 'PENDING' ? 'badge-warning' :
                      entry.status === 'APPROVED' ? 'badge-info' :
                      'badge-success'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {entry.status === 'PENDING' && (
                        <button onClick={() => updatePayrollStatus(entry.id, 'APPROVED')} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Approve</button>
                      )}
                      {entry.status === 'APPROVED' && (
                        <button onClick={() => updatePayrollStatus(entry.id, 'PAID')} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Pay</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SettingsTab: React.FC = () => {
  const { currentWorkspace } = useWorkspaceStore();
  const [name, setName] = useState(currentWorkspace?.name || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Settings saved');
  };

  return (
    <div className="card-panel" style={{ maxWidth: '600px' }}>
      <h3 className="card-panel-title">Workspace Settings</h3>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Workspace Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input" />
        </div>
        <div>
          <button type="submit" className="btn btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  );
};

const DeptOverviewTab: React.FC<{ departmentId: string }> = ({ departmentId }) => {
  const { departments, getTasksByDepartment } = useWorkspaceStore();
  const { allUsers } = useAuthStore();
  
  const dept = departments.find(d => d.id === departmentId);
  const tasks = getTasksByDepartment(departmentId);
  const members = allUsers.filter(u => u.departmentId === departmentId);

  const tasksByStatus = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const taskData = Object.keys(tasksByStatus).map(key => ({
    name: key,
    value: tasksByStatus[key]
  }));

  if (!dept) {
    return (
      <div className="card-panel" style={{ padding: '2rem' }}>
        <h3 style={{ marginTop: 0 }}>Loading department...</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Your department data is being loaded. Refresh if this message stays.
        </p>
      </div>
    );
  }

  return (
    <div className="page-content bento-grid">
      <div className="card-panel col-span-6">
        <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Department Members</h3>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{members.length}</p>
      </div>
      <div className="card-panel col-span-6">
        <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Tasks</h3>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{tasks.length}</p>
      </div>
      
      <div className="card-panel col-span-12">
        <h3 className="card-panel-title">Tasks by Status</h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={taskData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '0.5rem' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="value" fill={dept.color || "var(--primary)"} radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const DeptTasksTab: React.FC<{ departmentId: string }> = ({ departmentId }) => {
  const { getTasksByDepartment } = useWorkspaceStore();
  const tasks = getTasksByDepartment(departmentId);

  return (
    <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-body)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '1rem', fontWeight: 500 }}>Title</th>
              <th style={{ padding: '1rem', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '1rem', fontWeight: 500 }}>Priority</th>
              <th style={{ padding: '1rem', fontWeight: 500 }}>Assignee</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>{task.title}</td>
                <td style={{ padding: '1rem' }}>
                  <span className="badge badge-default">{task.status.replace('_', ' ')}</span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span className={`badge ${task.priority === 'URGENT' ? 'badge-error' : task.priority === 'HIGH' ? 'badge-warning' : 'badge-info'}`}>
                    {task.priority}
                  </span>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{task.assigneeName || 'Unassigned'}</td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No tasks found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// --- Main Page Component ---

export const AdminPage: React.FC = () => {
  const { user, allUsers } = useAuthStore();
  
  if (!user || user.role === 'MEMBER') {
    return <Navigate to="/dashboard" replace />;
  }

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const SUPER_ADMIN_TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'invite', label: 'Invite', icon: UserPlus },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const ADMIN_TABS = [
    { id: 'dept_overview', label: 'Overview', icon: BarChart },
    { id: 'dept_members', label: 'Members', icon: Users },
    { id: 'dept_invite', label: 'Invite', icon: UserPlus },
    { id: 'dept_tasks', label: 'Tasks', icon: CheckSquare },
  ];

  const tabs = isSuperAdmin ? SUPER_ADMIN_TABS : ADMIN_TABS;
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine initial tab from URL
  const getInitialTab = () => {
    const path = location.pathname;
    if (path.includes('/departments')) return isSuperAdmin ? 'departments' : 'dept_overview';
    if (path.includes('/users')) return isSuperAdmin ? 'users' : 'dept_members';
    if (path.includes('/invite')) return isSuperAdmin ? 'invite' : 'dept_invite';
    if (path.includes('/payroll')) return 'payroll';
    if (path.includes('/analytics')) return 'overview';
    return tabs[0].id;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab === 'departments') navigate('/admin/departments', { replace: true });
    else if (activeTab === 'users' || activeTab === 'dept_members') navigate('/admin/users', { replace: true });
    else if (activeTab === 'invite' || activeTab === 'dept_invite') navigate('/admin/invite', { replace: true });
    else if (activeTab === 'payroll') navigate('/admin/payroll', { replace: true });
    else if (activeTab === 'overview' || activeTab === 'dept_overview') navigate('/admin', { replace: true });
  }, [activeTab, navigate]);

  const deptMembers = allUsers.filter(u => u.departmentId === user.departmentId);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'departments': return <DepartmentsTab />;
      case 'users': return <UsersTab />;
      case 'invite': return <InviteTab isSuperAdmin={true} />;
      case 'payroll': return <PayrollTab />;
      case 'settings': return <SettingsTab />;
      case 'dept_overview': return <DeptOverviewTab departmentId={user.departmentId!} />;
      case 'dept_members': return <UsersTab users={deptMembers} hideDepartment={true} />;
      case 'dept_invite': return <InviteTab isSuperAdmin={false} fixedDepartmentId={user.departmentId!} />;
      case 'dept_tasks': return <DeptTasksTab departmentId={user.departmentId!} />;
      default: return null;
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
          {isSuperAdmin ? 'Admin Center' : 'Department Admin'}
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 500,
                border: 'none',
                background: isActive ? 'var(--primary-alpha)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ minHeight: '500px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
