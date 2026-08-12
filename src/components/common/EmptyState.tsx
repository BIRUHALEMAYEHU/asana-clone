import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { motion } from 'framer-motion';
import './common.css';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <motion.div 
      className="empty-state"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="empty-state-icon-wrapper">
        <Icon className="empty-state-icon" size={48} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="empty-state-action">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
};
