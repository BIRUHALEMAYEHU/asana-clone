import React from 'react';
import type { Task, TaskPriority } from '../../types';
import { motion } from 'framer-motion';
import { MessageSquare, Paperclip, Calendar, CheckSquare, GripVertical } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onClick: () => void;
}

const getPriorityColor = (priority: TaskPriority) => {
  switch (priority) {
    case 'URGENT': return 'border-l-[var(--error)]';
    case 'HIGH': return 'border-l-[var(--warning)]';
    case 'MEDIUM': return 'border-l-[var(--accent)]';
    case 'LOW': return 'border-l-[var(--success)]';
    default: return 'border-l-[var(--text-muted)]';
  }
};

export default function TaskCard({ task, onDragStart, onDragEnd, onClick }: TaskCardProps) {
  // Determine date color
  let dateColor = 'text-[var(--text-secondary)]';
  if (task.dueDate) {
    const date = new Date(task.dueDate);
    if (isPast(date) && !isToday(date)) {
      dateColor = 'text-[var(--error)]';
    } else if (isToday(date)) {
      dateColor = 'text-[var(--warning)]';
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      id={`task-${task.id}`}
      draggable
      onDragStart={onDragStart as any}
      onDragEnd={onDragEnd as any}
      onClick={onClick}
      className={`bg-[var(--bg-card)] border border-[var(--border-color)] border-l-4 ${getPriorityColor(task.priority)} rounded-lg p-3 shadow-sm hover:shadow-md hover:border-[var(--text-muted)] transition-all cursor-grab active:cursor-grabbing group relative`}
    >
      <div className="absolute top-3 right-2 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] transition-opacity">
        <GripVertical size={16} />
      </div>

      <div className="mb-2 pr-6">
        <h4 className="text-[var(--text-primary)] font-medium text-sm leading-tight line-clamp-2">
          {task.title}
        </h4>
      </div>

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.labels.map(label => (
            <span key={label} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-secondary)]">
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--border-color)]/50">
        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
          {task.dueDate && (
            <div className={`flex items-center gap-1 ${dateColor}`}>
              <Calendar size={12} />
              <span>{format(new Date(task.dueDate), 'MMM d')}</span>
            </div>
          )}
          
          {/* Mock subtask indicator */}
          <div className="flex items-center gap-1" title="Subtasks">
            <CheckSquare size={12} />
            <span>0/3</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" title="Comments">
              <MessageSquare size={12} />
              <span>2</span>
            </div>
            <div className="flex items-center gap-1" title="Attachments">
              <Paperclip size={12} />
              <span>1</span>
            </div>
          </div>
        </div>

        {task.assigneeId && (
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[10px] font-bold shadow-sm" title={`Assignee: ${task.assigneeId}`}>
            {task.assigneeId.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    </motion.div>
  );
}
