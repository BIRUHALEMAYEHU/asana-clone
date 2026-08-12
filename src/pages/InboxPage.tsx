import React, { useState } from 'react';
import { Bell, Check, MessageSquare, AlertCircle, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock notification type
type NotificationType = 'task_assigned' | 'task_completed' | 'comment_mention' | 'project_update' | 'deadline_reminder';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  targetId: string;
}

const mockNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'task_assigned',
    title: 'New task assigned to you',
    description: 'Sarah assigned "Update homepage hero image" to you',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    read: false,
    targetId: 't1'
  },
  {
    id: 'n2',
    type: 'comment_mention',
    title: 'Mentioned in comment',
    description: 'Michael mentioned you in "API Integration": "Can you review this?"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: false,
    targetId: 't2'
  },
  {
    id: 'n3',
    type: 'deadline_reminder',
    title: 'Task due soon',
    description: 'Task "Q3 Report" is due tomorrow',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    read: true,
    targetId: 't3'
  },
  {
    id: 'n4',
    type: 'project_update',
    title: 'Project status changed',
    description: 'Project "Mobile App" status changed to In Progress',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
    targetId: 'p1'
  },
  {
    id: 'n5',
    type: 'task_completed',
    title: 'Task completed',
    description: 'Emily completed task "Design mockups" that you are following',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    read: true,
    targetId: 't4'
  }
];

export const InboxPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<'All' | 'Unread' | 'Read'>('All');

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'Unread') return !n.read;
    if (filter === 'Read') return n.read;
    return true;
  });

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'task_assigned': return <FileText size={18} style={{ color: 'var(--primary)' }} />;
      case 'task_completed': return <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />;
      case 'comment_mention': return <MessageSquare size={18} style={{ color: 'var(--accent)' }} />;
      case 'project_update': return <RefreshCw size={18} style={{ color: 'var(--info)' }} />;
      case 'deadline_reminder': return <AlertCircle size={18} style={{ color: 'var(--warning)' }} />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="page-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <Bell size={24} style={{ color: 'var(--primary)' }} /> Inbox
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Stay updated on your tasks and projects</p>
        </div>
        
        <button 
          className="btn btn-secondary"
          style={{ fontSize: '0.875rem' }}
          onClick={markAllAsRead}
          disabled={!notifications.some(n => !n.read)}
        >
          <Check size={16} /> Mark all as read
        </button>
      </header>

      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        {['All', 'Unread', 'Read'].map(f => {
          const isSelected = filter === f;
          return (
            <button
              key={f}
              style={{
                padding: '0.375rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                backgroundColor: isSelected ? 'var(--primary-alpha)' : 'transparent',
                color: isSelected ? 'var(--primary)' : 'var(--text-muted)'
              }}
              onClick={() => setFilter(f as any)}
              onMouseEnter={(e) => { if(!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
              onMouseLeave={(e) => { if(!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              {f} {f === 'Unread' && notifications.filter(n => !n.read).length > 0 && `(${notifications.filter(n => !n.read).length})`}
            </button>
          );
        })}
      </div>

      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <AnimatePresence>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  position: 'relative',
                  backgroundColor: !notification.read ? 'var(--primary-alpha)' : 'transparent',
                  borderLeft: !notification.read ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'background-color var(--transition-fast)'
                }}
                onClick={() => markAsRead(notification.id)}
                onMouseEnter={(e) => { if(notification.read) e.currentTarget.style.backgroundColor = 'var(--bg-hover)' }}
                onMouseLeave={(e) => { if(notification.read) e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                {!notification.read && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '-6px',
                    width: '9px',
                    height: '9px',
                    backgroundColor: 'var(--primary)',
                    borderRadius: '50%',
                    transform: 'translateY(-50%)'
                  }} />
                )}
                
                <div style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border-color)',
                  marginTop: '0.25rem'
                }}>
                  {getIcon(notification.type)}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                    <h4 style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 600, 
                      margin: 0, 
                      color: !notification.read ? 'var(--primary)' : 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      paddingRight: '1rem'
                    }}>
                      {notification.title}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {getTimeAgo(notification.timestamp)}
                    </span>
                  </div>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-muted)', 
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {notification.description}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
            >
              <div style={{ 
                width: '64px', height: '64px', borderRadius: '50%', 
                backgroundColor: 'var(--bg-surface)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', 
                marginBottom: '1rem', color: 'var(--text-muted)' 
              }}>
                <Bell size={24} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 500, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>You're all caught up!</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '250px', margin: 0 }}>
                No {filter !== 'All' ? filter.toLowerCase() : ''} notifications to show at the moment.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
