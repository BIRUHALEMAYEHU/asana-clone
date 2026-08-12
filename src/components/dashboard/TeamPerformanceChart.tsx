import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Task } from '../../types';

interface TeamPerformanceChartProps {
  tasks: Task[];
}

export const TeamPerformanceChart: React.FC<TeamPerformanceChartProps> = ({ tasks }) => {
  // Aggregate tasks by assignee
  const assigneeStats = tasks.reduce((acc, task) => {
    if (!task.assigneeId) return acc;
    if (!acc[task.assigneeId]) {
      acc[task.assigneeId] = { id: task.assigneeId, completed: 0, pending: 0 };
    }
    if (task.status === 'DONE') {
      acc[task.assigneeId].completed += 1;
    } else {
      acc[task.assigneeId].pending += 1;
    }
    return acc;
  }, {} as Record<string, { id: string, completed: number, pending: number }>);

  // Map to format for Recharts, sort by total tasks
  const data = Object.values(assigneeStats)
    .sort((a, b) => (b.completed + b.pending) - (a.completed + a.pending))
    .slice(0, 5)
    .map(stat => ({
      name: stat.id, // In a real app, map this to user's name
      completed: stat.completed,
      pending: stat.pending
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--dark-card)', border: '1px solid var(--dark-border)', padding: '0.75rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>User: {label}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <p style={{ margin: 0, color: 'var(--success)', fontSize: '0.85rem' }}>Completed: {payload[0].value}</p>
            <p style={{ margin: 0, color: 'var(--warning)', fontSize: '0.85rem' }}>Pending: {payload[1].value}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card" style={{ padding: '1.5rem', background: 'var(--dark-card)', borderRadius: '12px', border: '1px solid var(--dark-border)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)', fontSize: '1.25rem' }}>Team Performance</h3>
      <div style={{ flex: 1, minHeight: '250px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--dark-border)" horizontal={true} vertical={false} />
            <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} width={60} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="completed" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} barSize={20} />
            <Bar dataKey="pending" stackId="a" fill="var(--warning)" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
