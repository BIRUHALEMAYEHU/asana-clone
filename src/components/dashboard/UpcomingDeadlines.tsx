import React from 'react';
import { format, isPast, isToday, parseISO } from 'date-fns';
import type { Task, Project } from '../../types';
import { Calendar, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface UpcomingDeadlinesProps {
  tasks: Task[];
  projects: Project[];
}

export const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({ tasks, projects }) => {
  const upcomingTasks = tasks
    .filter(t => t.dueDate && t.status !== 'DONE')
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'var(--error)';
      case 'HIGH': return 'var(--warning)';
      case 'MEDIUM': return 'var(--primary)';
      case 'LOW': return 'var(--success)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem', background: 'var(--dark-card)', borderRadius: '12px', border: '1px solid var(--dark-border)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Calendar size={20} color="var(--primary)" />
        <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem' }}>Upcoming Deadlines</h3>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {upcomingTasks.length > 0 ? upcomingTasks.map((task, index) => {
          const dueDate = parseISO(task.dueDate!);
          const overdue = isPast(dueDate) && !isToday(dueDate);
          const today = isToday(dueDate);
          
          return (
            <motion.div 
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{ 
                padding: '1rem', 
                borderRadius: '8px', 
                background: 'var(--dark-surface)',
                borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              whileHover={{ x: 4 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>{task.title}</h4>
                {(overdue || today) && (
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.25rem', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    color: overdue ? 'var(--error)' : 'var(--warning)',
                    background: overdue ? 'rgba(255, 107, 107, 0.1)' : 'rgba(253, 203, 110, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px'
                  }}>
                    <AlertCircle size={12} />
                    {overdue ? 'Overdue' : 'Today'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{getProjectName(task.projectId)}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{format(dueDate, 'MMM d, yyyy')}</span>
              </div>
            </motion.div>
          );
        }) : (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
            No upcoming deadlines!
          </div>
        )}
      </div>
    </div>
  );
};
