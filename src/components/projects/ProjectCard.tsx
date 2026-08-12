import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Project, Task, User } from '../../types';
import { Calendar, CheckCircle2, MoreHorizontal, Pencil, Copy, Archive, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWorkspaceStore } from '../../store/workspaceStore';

interface ProjectCardProps {
  project: Project;
  tasks: Task[];
  members: User[];
  index: number;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, tasks, members, index }) => {
  const navigate = useNavigate();
  const deleteProject = useWorkspaceStore(state => state.deleteProject);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  
  const dueDate = new Date(project.createdAt);
  dueDate.setDate(dueDate.getDate() + 30);

  const status = progress === 100 ? 'Completed' : 'Active';

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleDelete = async () => {
    setShowMenu(false);
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      toast.success('Project deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="card project-card"
      style={{ borderTop: `4px solid ${project.color}`, position: 'relative', cursor: 'pointer' }}
      onClick={() => navigate(`/projects/${project.id}`)}
      whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
    >
      <div className="project-card-header">
        <div>
          <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {project.name}
          </h3>
          <span className="badge" style={{ 
            backgroundColor: status === 'Completed' ? 'rgba(0, 184, 148, 0.1)' : 'rgba(108, 92, 231, 0.1)',
            color: status === 'Completed' ? 'var(--color-success)' : 'var(--color-primary)'
          }}>
            {status}
          </span>
        </div>
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button 
            className="btn btn-icon btn-ghost" 
            onClick={handleMenuClick}
            aria-label="Project options"
          >
            <MoreHorizontal size={18} />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="dropdown-menu" 
                style={{ position: 'absolute', right: 0, top: '100%', zIndex: 10, display: 'block', minWidth: '150px' }}
                onClick={e => e.stopPropagation()}
              >
                <button className="dropdown-item"><Pencil size={14} /> Edit Project</button>
                <button className="dropdown-item"><Copy size={14} /> Duplicate</button>
                <button className="dropdown-item"><Archive size={14} /> Archive</button>
                <div className="divider"></div>
                <button className="dropdown-item text-error" onClick={handleDelete} disabled={isDeleting}><Trash2 size={14} /> Delete</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="text-muted text-sm mb-4" style={{ 
        display: '-webkit-box', 
        WebkitLineClamp: 2, 
        WebkitBoxOrient: 'vertical', 
        overflow: 'hidden',
        minHeight: '40px'
      }}>
        {project.description || 'No description provided.'}
      </p>

      <div style={{ marginBottom: 'var(--spacing-4)' }}>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted">Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div style={{ 
          width: '100%', 
          height: '6px', 
          backgroundColor: 'var(--bg-surface)', 
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${progress}%`, 
            height: '100%', 
            backgroundColor: project.color,
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.5s ease-out'
          }} />
        </div>
      </div>

      <div className="project-meta">
        <div className="flex gap-2">
          <div className="badge badge-outline" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <Calendar size={12} />
            {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          <div className="badge badge-outline" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <CheckCircle2 size={12} />
            {completedTasks}/{tasks.length}
          </div>
        </div>

        <div className="flex" style={{ marginLeft: 'auto' }}>
          {members.slice(0, 3).map((member, i) => (
            <div 
              key={member.id} 
              className="avatar" 
              style={{ 
                width: '28px', 
                height: '28px', 
                marginLeft: i > 0 ? '-8px' : '0',
                border: '2px solid var(--bg-card)',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                borderRadius: '50%'
              }}
              title={member.name}
            >
              {member.name.charAt(0)}
            </div>
          ))}
          {members.length > 3 && (
            <div 
              className="avatar"
              style={{ 
                width: '28px', 
                height: '28px', 
                marginLeft: '-8px',
                border: '2px solid var(--bg-card)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                borderRadius: '50%'
              }}
            >
              +{members.length - 3}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
