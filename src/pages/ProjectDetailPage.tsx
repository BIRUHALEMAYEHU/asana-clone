import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useUIStore } from '../store/uiStore';
import KanbanBoard from '../components/tasks/KanbanBoard';
import ListView from '../components/tasks/ListView';
import CalendarView from '../components/tasks/CalendarView';
import TimelineView from '../components/tasks/TimelineView';
import TaskCreateModal from '../components/tasks/TaskCreateModal';
import { Settings, Plus, LayoutGrid, List, Calendar as CalendarIcon, Clock, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const project = useWorkspaceStore(state => state.projects.find(p => p.id === id));
  const { currentView, setCurrentView } = useUIStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  if (!project) {
    return <div className="p-8 text-center text-[var(--text-primary)]">Project not found</div>;
  }

  const views = [
    { id: 'board', label: 'Board', icon: LayoutGrid },
    { id: 'list', label: 'List', icon: List },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-body)]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: project.color }}
              />
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{project.name}</h1>
            </div>
            <p className="text-[var(--text-secondary)] mt-1">{project.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 mr-4">
              <div className="w-8 h-8 rounded-full bg-[#6C5CE7] border-2 border-[var(--bg-surface)] flex items-center justify-center text-xs text-white">JD</div>
              <div className="w-8 h-8 rounded-full bg-[#00B894] border-2 border-[var(--bg-surface)] flex items-center justify-center text-xs text-white">AS</div>
            </div>
            <button className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-colors cursor-pointer">
              <Settings size={20} />
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-light)] transition-colors cursor-pointer"
            >
              <Plus size={16} />
              Add Task
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {views.map((view) => {
            const Icon = view.icon;
            const isActive = currentView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-colors cursor-pointer ${
                  isActive 
                    ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10' 
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <Icon size={16} />
                {view.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden p-6 relative bg-[var(--bg-body)]">
        {currentView === 'board' && <KanbanBoard projectId={project.id} />}
        {currentView === 'list' && <ListView projectId={project.id} />}
        {currentView === 'calendar' && <CalendarView projectId={project.id} />}
        {currentView === 'timeline' && <TimelineView projectId={project.id} />}
        {currentView === 'dashboard' && (
          <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
            Dashboard view coming soon
          </div>
        )}
      </main>

      {isCreateModalOpen && (
        <TaskCreateModal 
          projectId={project.id} 
          onClose={() => setIsCreateModalOpen(false)} 
        />
      )}
    </div>
  );
}
