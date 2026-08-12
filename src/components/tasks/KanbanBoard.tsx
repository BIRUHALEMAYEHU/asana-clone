import React, { useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { TaskStatus } from '../../types';
import TaskCard from './TaskCard';
import TaskDetailPanel from './TaskDetailPanel';
import { Plus, Filter, SortDesc } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface KanbanBoardProps {
  projectId: string;
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'REVIEW', title: 'Review' },
  { id: 'DONE', title: 'Done' }
];

export default function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { tasks, updateTask } = useWorkspaceStore();
  const projectTasks = tasks.filter(t => t.projectId === projectId);
  
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    
    setTimeout(() => {
      const el = document.getElementById(`task-${taskId}`);
      if (el) el.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, taskId: string) => {
    const el = document.getElementById(`task-${taskId}`);
    if (el) el.style.opacity = '1';
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedTaskId) {
      const task = tasks.find(t => t.id === draggedTaskId);
      if (task && task.status !== status) {
        try {
          await updateTask(draggedTaskId, { status });
        } catch (err: any) {
          toast.error(err.message || 'Failed to move task');
        }
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4 text-[var(--text-secondary)]">
        <div className="flex gap-2">
          <button className="flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-md hover:text-[var(--text-primary)] transition-colors text-sm cursor-pointer">
            <Filter size={14} /> Filter
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-md hover:text-[var(--text-primary)] transition-colors text-sm cursor-pointer">
            <SortDesc size={14} /> Sort
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
        {COLUMNS.map(column => {
          const columnTasks = projectTasks.filter(t => t.status === column.id);
          
          return (
            <div 
              key={column.id}
              className={`flex-shrink-0 w-80 bg-[var(--bg-surface)] rounded-xl border flex flex-col transition-colors ${
                dragOverColumn === column.id ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border-color)]'
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="p-4 flex justify-between items-center border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[var(--text-primary)]">{column.title}</h3>
                  <span className="text-xs bg-[var(--bg-hover)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
                <button className="text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 p-1 rounded-md transition-colors cursor-pointer">
                  <Plus size={16} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                <AnimatePresence>
                  {columnTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={(e) => handleDragEnd(e, task.id)}
                      onClick={() => setSelectedTaskId(task.id)}
                    />
                  ))}
                </AnimatePresence>
                
                {columnTasks.length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] text-sm">
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Panel Overlay */}
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
