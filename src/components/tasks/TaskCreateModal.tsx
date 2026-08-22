import React, { useMemo, useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';
import type { TaskStatus, TaskPriority, Task } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, Tag, Layout, CircleDashed } from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid'; // Fallback if uuid is not available, we can just use Math.random() or Date.now()

interface TaskCreateModalProps {
  projectId?: string;
  onClose: () => void;
}

export default function TaskCreateModal({ projectId: initialProjectId, onClose }: TaskCreateModalProps) {
  const { addTask, projects, getProjectMembers } = useWorkspaceStore();
  const { user, allUsers, getUsersByDepartment } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(initialProjectId || (projects[0]?.id || ''));
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assignableUsers = useMemo(() => {
    if (!user) return [];
    const activeProjectId = projectId || initialProjectId;
    const projectMembers = activeProjectId ? getProjectMembers(activeProjectId) : [];
    if (projectMembers.length > 0) {
      const ids = new Set(projectMembers.map(m => m.userId));
      return allUsers.filter(u => ids.has(u.id));
    }
    if (user.role === 'SUPER_ADMIN') return allUsers;
    return user.departmentId ? getUsersByDepartment(user.departmentId) : [];
  }, [user, allUsers, getUsersByDepartment, getProjectMembers, initialProjectId, projectId]);

  const handleSubmit = async (e: React.FormEvent, createAnother: boolean = false) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }
    
    if (!projectId) {
      toast.error('Project is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const newTask: Task = {
        id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Simple unique ID
        title: title.trim(),
        description: description.trim(),
        projectId,
        status,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        labels: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addTask(newTask);
      toast.success('Task created successfully');
      
      if (createAnother) {
        setTitle('');
        setDescription('');
        // Keep other fields same for speed
      } else {
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[var(--bg-surface)] w-full max-w-lg rounded-xl shadow-2xl border border-[var(--border-color)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create Task</h2>
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 custom-scrollbar">
          
          <div>
            <input
              autoFocus
              placeholder="Task name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-medium bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-[var(--text-secondary)] text-sm">
              <User size={16} />
              <select 
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="flex-1 bg-transparent border border-[var(--border-color)] rounded p-1.5 outline-none hover:border-[var(--text-muted)] text-[var(--text-primary)]"
              >
                <option value="">Unassigned</option>
                {assignableUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 text-[var(--text-secondary)] text-sm">
              <Calendar size={16} />
              <input 
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 bg-transparent border border-[var(--border-color)] rounded p-1.5 outline-none hover:border-[var(--text-muted)] text-[var(--text-primary)]"
              />
            </div>
            
            <div className="flex items-center gap-3 text-[var(--text-secondary)] text-sm">
              <Layout size={16} />
              <select 
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="flex-1 bg-transparent border border-[var(--border-color)] rounded p-1.5 outline-none hover:border-[var(--text-muted)] text-[var(--text-primary)]"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-3 text-[var(--text-secondary)] text-sm">
              <Tag size={16} />
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="flex-1 bg-transparent border border-[var(--border-color)] rounded p-1.5 outline-none hover:border-[var(--text-muted)] text-[var(--text-primary)]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="flex items-center gap-3 text-[var(--text-secondary)] text-sm">
              <CircleDashed size={16} />
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="flex-1 bg-transparent border border-[var(--border-color)] rounded p-1.5 outline-none hover:border-[var(--text-muted)] text-[var(--text-primary)]"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div>
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[120px] bg-[var(--bg-body)] border border-[var(--border-color)] rounded-md p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--primary)] resize-y"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-body)] flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] rounded-md transition-colors"
          >
            Create & Create Another
          </button>
          <button 
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-light)] rounded-md transition-colors shadow-sm"
          >
            Create Task
          </button>
        </div>
      </motion.div>
    </div>
  );
}
