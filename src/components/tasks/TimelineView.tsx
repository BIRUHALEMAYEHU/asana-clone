import React, { useState, useMemo } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import TaskDetailPanel from './TaskDetailPanel';
import { 
  format, 
  addDays, 
  subDays,
  differenceInDays, 
  startOfWeek,
  endOfWeek,
  isSameDay,
  isToday
} from 'date-fns';
import { AnimatePresence } from 'framer-motion';

interface TimelineViewProps {
  projectId: string;
}

export default function TimelineView({ projectId }: TimelineViewProps) {
  const { tasks } = useWorkspaceStore();
  const projectTasks = tasks.filter(t => t.projectId === projectId);
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Generate timeline dates (e.g. 2 weeks before today, 4 weeks after)
  const today = new Date();
  const timelineStart = subDays(today, 14);
  const timelineEnd = addDays(today, 28);
  const totalDays = differenceInDays(timelineEnd, timelineStart) + 1;

  const dates = useMemo(() => {
    const d = [];
    for (let i = 0; i < totalDays; i++) {
      d.push(addDays(timelineStart, i));
    }
    return d;
  }, [timelineStart, totalDays]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'bg-[var(--text-muted)]';
      case 'IN_PROGRESS': return 'bg-[var(--primary)]';
      case 'REVIEW': return 'bg-[var(--warning)]';
      case 'DONE': return 'bg-[var(--success)]';
      default: return 'bg-[var(--primary)]';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden relative">
      
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        {/* Timeline Header */}
        <div className="flex sticky top-0 z-20 bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
          {/* Task Info Column */}
          <div className="w-64 flex-shrink-0 border-r border-[var(--border-color)] p-4 font-semibold text-sm text-[var(--text-secondary)] sticky left-0 z-30 bg-[var(--bg-surface)]">
            Task Name
          </div>
          
          {/* Dates Columns */}
          <div className="flex">
            {dates.map((date, i) => (
              <div 
                key={i} 
                className={`flex-shrink-0 w-12 flex flex-col items-center justify-center border-r border-[var(--border-color)] py-2 ${isToday(date) ? 'bg-[var(--primary)]/10' : ''}`}
              >
                <span className="text-[10px] text-[var(--text-muted)] uppercase">{format(date, 'EEE')}</span>
                <span className={`text-sm font-medium ${isToday(date) ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                  {format(date, 'd')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Body */}
        <div className="flex flex-col relative">
          
          {/* Today vertical line */}
          <div 
            className="absolute top-0 bottom-0 w-px bg-[var(--primary)] z-10 opacity-50"
            style={{ 
              left: `calc(16rem + ${differenceInDays(today, timelineStart) * 3}rem + 1.5rem)` 
            }}
          />

          {projectTasks.map(task => {
            // Fallback for tasks without due date: put them today
            const dueDate = task.dueDate ? new Date(task.dueDate) : today;
            const startDate = task.createdAt ? new Date(task.createdAt) : subDays(dueDate, 2);
            
            // Calculate position
            const startDiff = differenceInDays(startDate, timelineStart);
            const duration = Math.max(1, differenceInDays(dueDate, startDate) + 1);
            
            // Hide if completely out of view
            if (startDiff + duration < 0 || startDiff > totalDays) return null;

            // Clamp to view
            const renderStart = Math.max(0, startDiff);
            const renderDuration = Math.min(totalDays - renderStart, duration - (renderStart - startDiff));

            return (
              <div key={task.id} className="flex border-b border-[var(--border-color)] group hover:bg-[var(--bg-hover)] transition-colors">
                {/* Task Name */}
                <div 
                  className="w-64 flex-shrink-0 border-r border-[var(--border-color)] p-3 sticky left-0 z-30 bg-[var(--bg-surface)] group-hover:bg-[var(--bg-hover)] flex items-center gap-2 cursor-pointer transition-colors"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  {task.assigneeId && (
                    <div className="w-5 h-5 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                      {task.assigneeId.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate" title={task.title}>
                    {task.title}
                  </span>
                </div>
                
                {/* Timeline Row */}
                <div className="flex relative h-12 w-full">
                  {/* Grid lines */}
                  {dates.map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-12 border-r border-[var(--border-color)] opacity-20" />
                  ))}
                  
                  {/* Task Bar */}
                  <div 
                    className={`absolute top-2 h-8 rounded-md ${getStatusColor(task.status)} flex items-center px-2 cursor-pointer opacity-90 hover:opacity-100 shadow-sm transition-opacity`}
                    style={{ 
                      left: `${renderStart * 3}rem`, 
                      width: `${renderDuration * 3}rem`,
                      minWidth: renderDuration > 0 ? '3rem' : '0'
                    }}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <span className="text-xs text-white truncate px-1">
                      {task.title}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {projectTasks.length === 0 && (
            <div className="p-8 text-center text-[var(--text-muted)]">
              No tasks in this project yet
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedTaskId && (
          <TaskDetailPanel 
            taskId={selectedTaskId} 
            onClose={() => setSelectedTaskId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
