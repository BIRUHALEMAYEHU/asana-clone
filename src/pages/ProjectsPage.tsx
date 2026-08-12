import React, { useState, useMemo } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { ProjectCard } from '../components/projects/ProjectCard';
import { ProjectCreateModal } from '../components/projects/ProjectCreateModal';
import { Plus, Search, Filter, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';

export const ProjectsPage: React.FC = () => {
  const { projects, tasks, departments, addProject } = useWorkspaceStore();
  const { user } = useAuthStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Name');

  const visibleProjects = useMemo(() => {
    if (!user) return [];
    if (user.role === 'SUPER_ADMIN') return projects;
    return projects.filter(
      p => (p as any).departmentId === user.departmentId || (p as any).teamId === user.departmentId
    );
  }, [projects, user]);

  const filteredProjects = useMemo(() => {
    return visibleProjects
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(p => {
        if (statusFilter === 'All') return true;
        const pTasks = tasks.filter(t => t.projectId === p.id);
        const progress = pTasks.length > 0 ? (pTasks.filter(t => t.status === 'DONE').length / pTasks.length) * 100 : 0;
        if (statusFilter === 'Active') return progress < 100;
        if (statusFilter === 'Completed') return progress === 100;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'Name') return a.name.localeCompare(b.name);
        if (sortBy === 'Date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return 0;
      });
  }, [visibleProjects, tasks, searchQuery, statusFilter, sortBy]);

  const handleCreateProject = async (data: { name: string; description: string; color: string; departmentId: string }) => {
    await addProject({
      name: data.name,
      description: data.description,
      color: data.color,
      departmentId: data.departmentId,
      workspaceId: user?.workspaceId || '',
      ownerId: user?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any);
  };

  const mockMembers = user ? [user] : [];

  return (
    <div className="page-content" style={{ padding: 'var(--spacing-6)' }}>
      <header className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Projects</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Manage and track your team's initiatives</p>
        </div>
        
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
          <button 
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} />
            <span>Create Project</span>
          </button>
        )}
      </header>

      <div className="card-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select 
              className="select" 
              style={{ width: '140px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Sort by:</span>
          <select 
            className="select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="Name">Name (A-Z)</option>
            <option value="Date">Recent First</option>
          </select>
          
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginLeft: '0.5rem' }}>
            <button className="btn btn-ghost" style={{ borderRadius: 0, padding: '0.5rem', backgroundColor: 'var(--bg-surface)' }}>
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {filteredProjects.length > 0 ? (
        <div className="projects-grid">
          {filteredProjects.map((project, index) => (
            <ProjectCard 
              key={project.id} 
              project={project}
              tasks={tasks.filter(t => t.projectId === project.id)}
              members={mockMembers}
              index={index}
            />
          ))}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-panel"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center', borderStyle: 'dashed' }}
        >
          <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '50%', backgroundColor: 'var(--bg-surface)' }}>
            <LayoutGrid size={32} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 500, margin: '0 0 0.5rem 0' }}>No projects found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 0 1.5rem 0' }}>We couldn't find any projects matching your current filters. Try adjusting your search or create a new one.</p>
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Create Project</button>
          )}
        </motion.div>
      )}

      <ProjectCreateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleCreateProject}
        departments={departments}
      />
    </div>
  );
};
