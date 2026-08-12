import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityLogEntry } from '../../types';
import { CheckCircle2, MessageSquare, UserPlus, FileText, FolderPlus } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActivityFeedProps {
  activities: ActivityLogEntry[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="card" style={{ padding: '1.5rem', background: 'var(--dark-card)', borderRadius: '12px', border: '1px solid var(--dark-border)', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1.25rem' }}>Recent Activity</h3>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          No recent activity
        </div>
      </div>
    );
  }

  const getIcon = (action: string) => {
    switch (action) {
      case 'task_created': return <FileText size={16} color="var(--primary)" />;
      case 'task_completed': return <CheckCircle2 size={16} color="var(--success)" />;
      case 'comment_added': return <MessageSquare size={16} color="var(--accent)" />;
      case 'member_joined': return <UserPlus size={16} color="var(--warning)" />;
      case 'project_created': return <FolderPlus size={16} color="var(--secondary)" />;
      default: return <FileText size={16} color="var(--text-secondary)" />;
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem', background: 'var(--dark-card)', borderRadius: '12px', border: '1px solid var(--dark-border)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)', fontSize: '1.25rem' }}>Recent Activity</h3>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
        {activities.slice(0, 10).map((activity, index) => (
          <motion.div 
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}
          >
            <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: 'var(--dark-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getIcon(activity.action)}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600 }}>{activity.userId}</span> {activity.action.replace('_', ' ')}
              </p>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
      <button style={{ marginTop: '1rem', padding: '0.75rem', width: '100%', background: 'transparent', border: '1px solid var(--dark-border)', color: 'var(--primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>
        View All Activity
      </button>
    </div>
  );
};
