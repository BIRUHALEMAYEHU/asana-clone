import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Task } from '../../types';

interface WorkloadChartProps {
  tasks: Task[];
}

export const WorkloadChart: React.FC<WorkloadChartProps> = ({ tasks }) => {
  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = [
    { name: 'To Do', value: statusCounts['TODO'] || 0, color: 'var(--text-secondary)' },
    { name: 'In Progress', value: statusCounts['IN_PROGRESS'] || 0, color: 'var(--primary)' },
    { name: 'In Review', value: statusCounts['REVIEW'] || 0, color: 'var(--warning)' },
    { name: 'Completed', value: statusCounts['DONE'] || 0, color: 'var(--success)' },
  ].filter(item => item.value > 0);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--dark-card)', border: '1px solid var(--dark-border)', padding: '0.75rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: payload[0].payload.color }} />
            <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              {payload[0].name}: {payload[0].value}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card" style={{ padding: '1.5rem', background: 'var(--dark-card)', borderRadius: '12px', border: '1px solid var(--dark-border)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)', fontSize: '1.25rem' }}>Workload Distribution</h3>
      <div style={{ flex: 1, minHeight: '250px', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              formatter={(value, entry: any) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{total}</span>
          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tasks</span>
        </div>
      </div>
    </div>
  );
};
