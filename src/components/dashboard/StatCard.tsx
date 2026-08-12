import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  trend: number;
  color: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, trend, color }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const increment = value / (duration / 16); // 60fps
    
    if (value === 0) return;

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  const isPositive = trend >= 0;

  return (
    <motion.div 
      className="card"
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--dark-card)', borderRadius: '12px', border: '1px solid var(--dark-border)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ padding: '0.75rem', borderRadius: '50%', backgroundColor: `${color}20`, color: color }}>
          <Icon size={24} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isPositive ? 'var(--success)' : 'var(--error)', fontSize: '0.875rem', fontWeight: 500 }}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>{Math.abs(trend)}%</span>
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>{count}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>{label}</p>
      </div>
    </motion.div>
  );
};
