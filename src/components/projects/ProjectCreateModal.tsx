import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; color: string; departmentId: string }) => void | Promise<void>;
  departments: { id: string; name: string }[];
}

const PRESET_COLORS = [
  '#6C5CE7', // Primary purple
  '#00B894', // Success teal
  '#FD79A8', // Accent pink
  '#FDCB6E', // Warning yellow
  '#FF6B6B', // Error red
  '#0984E3', // Blue
  '#00CEC9', // Cyan
  '#636E72', // Gray
];

export const ProjectCreateModal: React.FC<ProjectCreateModalProps> = ({ isOpen, onClose, onSubmit, departments }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({ name, description, color, departmentId });
      toast.success('Project created successfully!');
      onClose();

      // Reset form
      setName('');
      setDescription('');
      setColor(PRESET_COLORS[0]);
      setDepartmentId(departments[0]?.id || '');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)'
        }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="modal-content"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--spacing-6)',
              width: '100%',
              maxWidth: '500px',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Create New Project</h2>
              <button onClick={onClose} className="btn btn-icon btn-ghost">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label" htmlFor="projectName">Project Name <span className="text-error">*</span></label>
                <input
                  id="projectName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Website Redesign"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="projectDesc">Description</label>
                <textarea
                  id="projectDesc"
                  className="form-input"
                  placeholder="What is this project about?"
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="projectTeam">Department</label>
                <select 
                  id="projectTeam" 
                  className="form-input" 
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                >
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Start Date</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="date" className="form-input" style={{ paddingLeft: '36px' }} />
                  </div>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Due Date</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="date" className="form-input" style={{ paddingLeft: '36px' }} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Project Color</label>
                <div className="flex gap-2 mt-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className="color-picker-btn"
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c,
                        border: color === c ? '2px solid white' : '2px solid transparent',
                        outline: color === c ? `2px solid ${c}` : 'none',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onClick={() => setColor(c)}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
