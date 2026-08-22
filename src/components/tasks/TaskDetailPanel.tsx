import React, { useMemo, useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';
import type { Task, TaskStatus, TaskPriority } from '../../types';
import { motion } from 'framer-motion';
import { 
  X, Check, Clock, User, Tag, Paperclip, 
  MessageSquare, Trash2, CheckSquare, Plus,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
}

export default function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const { tasks, updateTask, deleteTask, getProjectMembers } = useWorkspaceStore();
  const { user, allUsers, getUsersByDepartment } = useAuthStore();
  const task = tasks.find(t => t.id === taskId);

  const assignableUsers = useMemo(() => {
    if (!user || !task) return [];
    const projectMembers = getProjectMembers(task.projectId);
    if (projectMembers.length > 0) {
      const ids = new Set(projectMembers.map(m => m.userId));
      return allUsers.filter(u => ids.has(u.id));
    }
    if (user.role === 'SUPER_ADMIN') return allUsers;
    return user.departmentId ? getUsersByDepartment(user.departmentId) : [];
  }, [user, allUsers, getUsersByDepartment, getProjectMembers, task]);
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task?.title || '');
  const [descriptionValue, setDescriptionValue] = useState(task?.description || '');

  if (!task) return null;

  const applyUpdate = async (fields: Partial<Task>) => {
    try {
      await updateTask(task.id, fields);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task');
    }
  };

  const handleTitleSubmit = () => {
    if (titleValue.trim() && titleValue !== task.title) {
      applyUpdate({ title: titleValue.trim() });
    } else {
      setTitleValue(task.title);
    }
    setIsEditingTitle(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteTask(task.id);
      toast.success('Task deleted');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete task');
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 bottom-0 w-full max-w-2xl bg-[var(--bg-surface)] shadow-2xl z-50 flex flex-col border-l border-[var(--border-color)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-4 text-[var(--text-secondary)]">
            <button className="px-3 py-1.5 rounded bg-[var(--bg-hover)] text-sm flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors">
              <Check size={14} /> Mark complete
            </button>
            <div className="flex items-center gap-1 text-xs">
              <Paperclip size={14} />
              <MoreHorizontal size={14} />
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="mb-6">
            {isEditingTitle ? (
              <input
                autoFocus
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={e => e.key === 'Enter' && handleTitleSubmit()}
                className="w-full text-2xl font-bold bg-[var(--bg-body)] border border-[var(--primary)] rounded px-3 py-1 outline-none text-[var(--text-primary)]"
              />
            ) : (
              <h2 
                onClick={() => setIsEditingTitle(true)}
                className="text-2xl font-bold text-[var(--text-primary)] cursor-text hover:bg-[var(--bg-hover)] p-1 -ml-1 rounded transition-colors"
              >
                {task.title}
              </h2>
            )}
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-4">
                <span className="w-24 text-[var(--text-secondary)] text-sm flex items-center gap-2">
                  <User size={16} /> Assignee
                </span>
                <select 
                  value={task.assigneeId || ''}
                  onChange={(e) => applyUpdate({ assigneeId: e.target.value })}
                  className="bg-transparent border border-[var(--border-color)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] hover:border-[var(--text-muted)] focus:border-[var(--primary)] outline-none"
                >
                  <option value="">Unassigned</option>
                  {assignableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <span className="w-24 text-[var(--text-secondary)] text-sm flex items-center gap-2">
                  <Clock size={16} /> Due Date
                </span>
                <input 
                  type="date" 
                  value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                  onChange={(e) => applyUpdate({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="bg-transparent border border-[var(--border-color)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div className="flex items-center gap-4">
                <span className="w-24 text-[var(--text-secondary)] text-sm flex items-center gap-2">
                  <Tag size={16} /> Priority
                </span>
                <select 
                  value={task.priority}
                  onChange={(e) => applyUpdate({ priority: e.target.value as TaskPriority })}
                  className="bg-transparent border border-[var(--border-color)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <span className="w-24 text-[var(--text-secondary)] text-sm">Status</span>
                <select 
                  value={task.status}
                  onChange={(e) => applyUpdate({ status: e.target.value as TaskStatus })}
                  className="bg-transparent border border-[var(--border-color)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)]"
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">Description</h3>
            <textarea
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              onBlur={() => applyUpdate({ description: descriptionValue })}
              placeholder="Add more details to this task..."
              className="w-full min-h-[120px] bg-transparent border border-[var(--border-color)] rounded-md p-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] outline-none resize-y"
            />
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <CheckSquare size={16} /> Subtasks
              </h3>
              <button className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer">
                <Plus size={14} /> Add subtask
              </button>
            </div>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 bg-[var(--bg-body)] p-2 rounded border border-[var(--border-color)]">
                  <input type="checkbox" className="rounded bg-transparent border-[var(--border-color)]" />
                  <span className="text-sm text-[var(--text-primary)] flex-1">Mock Subtask {i}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
              <MessageSquare size={16} /> Comments
            </h3>
            <div className="space-y-4 mb-4">
              {/* Mock comment */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--primary-light)] flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                  JD
                </div>
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-medium text-[var(--text-primary)] text-sm">John Doe</span>
                    <span className="text-xs text-[var(--text-secondary)]">2 hours ago</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-body)] p-3 rounded-r-lg rounded-bl-lg">
                    I've started working on the initial designs. Will share them soon!
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                ME
              </div>
              <div className="flex-1">
                <textarea 
                  placeholder="Ask a question or post an update..."
                  className="w-full min-h-[80px] bg-transparent border border-[var(--border-color)] rounded-md p-3 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] outline-none resize-y mb-2"
                />
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <button className="p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] rounded">
                      <Paperclip size={16} />
                    </button>
                  </div>
                  <button className="px-4 py-1.5 bg-[var(--primary)] text-white rounded text-sm hover:bg-[var(--primary-light)] transition-colors cursor-pointer">
                    Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-[var(--border-color)] flex justify-between items-center text-[var(--text-secondary)] text-xs">
          <span>Created on {format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
          <button 
            onClick={handleDelete}
            className="flex items-center gap-1 text-[var(--error)] hover:bg-[var(--error)]/10 px-2 py-1 rounded transition-colors cursor-pointer"
          >
            <Trash2 size={14} /> Delete task
          </button>
        </div>
      </motion.div>
    </>
  );
}
