import React, { useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import type { TaskStatus, TaskPriority, Task } from '../../types';
import TaskDetailPanel from './TaskDetailPanel';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Calendar, User, Tag, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface ListViewProps {
  projectId: string;
}

const GROUPS: { id: TaskStatus; title: string }[] = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'REVIEW', title: 'Review' },
  { id: 'DONE', title: 'Done' }
];

export default function ListView({ projectId }: ListViewProps) {
  const { tasks, updateTask } = useWorkspaceStore();
  const projectTasks = tasks.filter(t => t.projectId === projectId);
  
  const [collapsedGroups, setCollapsedGroups] = useState<Set<TaskStatus>>(new Set());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const toggleGroup = (status: TaskStatus) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(status)) {
      newCollapsed.delete(status);
    } else {
      newCollapsed.add(status);
    }
    setCollapsedGroups(newCollapsed);
  };

  const toggleTaskSelection = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const toggleTaskStatus = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    try {
      await updateTask(task.id, { status: newStatus });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task');
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT': return 'text-[var(--error)]';
      case 'HIGH': return 'text-[var(--warning)]';
      case 'MEDIUM': return 'text-[var(--accent)]';
      case 'LOW': return 'text-[var(--success)]';
      default: return 'text-[var(--text-muted)]';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      
      {/* Table Header */}
      <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_auto] gap-4 p-3 border-b border-[var(--border-color)] bg-[var(--bg-body)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider items-center">
        <div className="w-8 flex justify-center">
          <input type="checkbox" className="rounded bg-transparent border-[var(--border-color)]" disabled />
        </div>
        <div>Task Name</div>
        <div>Assignee</div>
        <div>Due Date</div>
        <div>Priority</div>
        <div>Status</div>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {GROUPS.map(group => {
          const groupTasks = projectTasks.filter(t => t.status === group.id);
          const isCollapsed = collapsedGroups.has(group.id);
          
          return (
            <div key={group.id} className="mb-4 last:mb-0">
              <div 
                className="flex items-center gap-2 p-3 bg-[var(--bg-body)]/50 border-y border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors group/header sticky top-0 z-10"
                onClick={() => toggleGroup(group.id)}
              >
                <span className="text-[var(--text-muted)] group-hover/header:text-[var(--text-primary)] transition-colors">
                  {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </span>
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">{group.title}</h3>
                <span className="text-xs text-[var(--text-secondary)] ml-2">{groupTasks.length}</span>
              </div>
              
              {!isCollapsed && (
                <div className="flex flex-col">
                  {groupTasks.length === 0 ? (
                    <div className="p-4 text-center text-sm text-[var(--text-muted)] border-b border-[var(--border-color)]">
                      No tasks in this group
                    </div>
                  ) : (
                    groupTasks.map(task => (
                      <div 
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_auto] gap-4 p-3 border-b border-[var(--border-color)] items-center cursor-pointer hover:bg-[var(--bg-hover)] transition-colors group/row ${selectedTasks.has(task.id) ? 'bg-[var(--primary)]/5' : ''}`}
                      >
                        <div className="w-8 flex justify-center" onClick={(e) => toggleTaskSelection(e, task.id)}>
                          <input 
                            type="checkbox" 
                            checked={selectedTasks.has(task.id)}
                            readOnly
                            className="rounded bg-transparent border-[var(--border-color)]" 
                          />
                        </div>
                        
                        <div className="flex items-center gap-3 min-w-0">
                          <button 
                            onClick={(e) => toggleTaskStatus(e, task)}
                            className="text-[var(--text-muted)] hover:text-[var(--success)] transition-colors"
                          >
                            {task.status === 'DONE' ? <CheckCircle2 size={16} className="text-[var(--success)]" /> : <Circle size={16} />}
                          </button>
                          <span className={`text-sm truncate font-medium ${task.status === 'DONE' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          {task.assigneeId ? (
                            <>
                              <div className="w-5 h-5 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[10px] font-bold">
                                {task.assigneeId.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="truncate hidden md:inline">User {task.assigneeId.replace('u', '')}</span>
                            </>
                          ) : (
                            <span className="text-[var(--text-muted)] flex items-center gap-1"><User size={14}/> Unassigned</span>
                          )}
                        </div>

                        <div className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
                          {task.dueDate ? (
                            <>
                              <Calendar size={14} className={new Date(task.dueDate) < new Date() ? 'text-[var(--error)]' : ''} />
                              <span className={new Date(task.dueDate) < new Date() ? 'text-[var(--error)]' : ''}>
                                {format(new Date(task.dueDate), 'MMM d, yyyy')}
                              </span>
                            </>
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </div>

                        <div className={`text-sm font-medium capitalize flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                          <Tag size={12} /> {task.priority.toLowerCase()}
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                           {task.labels && task.labels.slice(0, 2).map(label => (
                            <span key={label} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-body)] border border-[var(--border-color)] text-[var(--text-secondary)] truncate max-w-[60px]">
                              {label}
                            </span>
                          ))}
                          {task.labels && task.labels.length > 2 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-body)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                              +{task.labels.length - 2}
                            </span>
                          )}
                        </div>

                        <div className="w-8 flex justify-center opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <button className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedTasks.size > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xl rounded-full px-6 py-3 flex items-center gap-6 z-20"
          >
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {selectedTasks.size} tasks selected
            </span>
            <div className="w-px h-4 bg-[var(--border-color)]"></div>
            <div className="flex gap-2">
              <button className="text-sm px-3 py-1.5 rounded bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors">
                Complete
              </button>
              <button className="text-sm px-3 py-1.5 rounded bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors">
                Assign
              </button>
              <button className="text-sm px-3 py-1.5 rounded text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors">
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
