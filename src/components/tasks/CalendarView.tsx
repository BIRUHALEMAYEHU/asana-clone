import React, { useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import TaskDetailPanel from './TaskDetailPanel';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  isToday
} from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import type { TaskPriority } from '../../types';

interface CalendarViewProps {
  projectId: string;
}

export default function CalendarView({ projectId }: CalendarViewProps) {
  const { tasks } = useWorkspaceStore();
  const projectTasks = tasks.filter(t => t.projectId === projectId && t.dueDate);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "MMMM yyyy";
  const days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, "d");
      const cloneDay = day;
      
      const dayTasks = projectTasks.filter(t => isSameDay(new Date(t.dueDate!), cloneDay));
      
      days.push(
        <div 
          key={day.toString()} 
          className={`min-h-[120px] p-2 border-r border-b border-[var(--border-color)] bg-[var(--bg-surface)] ${
            !isSameMonth(day, monthStart) 
              ? "opacity-40" 
              : ""
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
              isToday(day) 
                ? "bg-[var(--primary)] text-white" 
                : "text-[var(--text-primary)]"
            }`}>
              {formattedDate}
            </span>
          </div>
          
          <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
            {dayTasks.map(task => {
              let color = 'bg-[var(--bg-hover)] text-[var(--text-primary)] border-[var(--border-color)]';
              if (task.priority === 'URGENT') color = 'bg-[var(--error)]/20 text-[var(--error)] border-[var(--error)]/30';
              else if (task.priority === 'HIGH') color = 'bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/30';
              else if (task.priority === 'MEDIUM') color = 'bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/30';
              else if (task.status === 'DONE') color = 'bg-[var(--success)]/20 text-[var(--success)] border-[var(--success)]/30 line-through';

              return (
                <div 
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`text-xs px-2 py-1 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity ${color}`}
                  title={task.title}
                >
                  {task.title}
                </div>
              );
            })}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full flex flex-col bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      
      {/* Calendar Header */}
      <div className="flex justify-between items-center p-4 border-b border-[var(--border-color)]">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          {format(currentDate, dateFormat)}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-body)] rounded-md border border-[var(--border-color)] transition-colors"
          >
            Today
          </button>
          <div className="flex items-center rounded-md border border-[var(--border-color)] bg-[var(--bg-body)]">
            <button onClick={prevMonth} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border-r border-[var(--border-color)]">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextMonth} className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-7 border-b border-[var(--border-color)] bg-[var(--bg-body)] sticky top-0 z-10">
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)] last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 border-l border-t border-[var(--border-color)] bg-[var(--bg-body)]">
          {days}
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
