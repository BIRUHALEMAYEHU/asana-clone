import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Building2, Briefcase, CheckCircle, 
  Clock, AlertCircle, Plus, Wallet, Activity,
  BarChart2
} from 'lucide-react';
import { format, formatDistanceToNow, isFuture, isPast, isToday, addDays } from 'date-fns';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => (
  <motion.div variants={itemVariants} className="card-panel col-span-3" style={{ borderTop: `4px solid ${color}`, padding: '1.25rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ padding: '0.75rem', backgroundColor: `${color}15`, borderRadius: '0.75rem', color }}>
        <Icon size={24} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{title}</p>
        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</h3>
      </div>
    </div>
  </motion.div>
);

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, allUsers } = useAuthStore();
  const { departments, projects, tasks, payroll, activityLog } = useWorkspaceStore();

  const totalDepartments = departments.length;
  const totalStaff = allUsers.length;
  const activeProjects = projects.length;
  const totalTasks = tasks.length;

  const totalPayroll = payroll.reduce((acc, p) => acc + p.netPay, 0);
  const pendingPayroll = payroll.filter(p => p.status === 'PENDING').reduce((acc, p) => acc + p.netPay, 0);
  const paidPayroll = payroll.filter(p => p.status === 'PAID').reduce((acc, p) => acc + p.netPay, 0);

  const mockProductivityData = Array.from({ length: 7 }).map((_, i) => ({
    name: format(addDays(new Date(), -6 + i), 'MMM dd'),
    completed: Math.floor(Math.random() * 20) + 5
  }));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Welcome Banner */}
      <motion.div variants={itemVariants} className="bento-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card-panel col-span-12" style={{ 
          background: 'linear-gradient(135deg, var(--primary) 0%, #a29bfe 100%)', 
          color: 'white',
          border: 'none',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>Welcome back, {user?.name}</h1>
              <p style={{ margin: 0, opacity: 0.9 }}>Today is {format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => navigate('/admin/departments')}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'white', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={18} /> Create Department
              </button>
              <button 
                onClick={() => navigate('/admin/invite')}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Users size={18} /> Invite User
              </button>
              <button 
                onClick={() => navigate('/admin/payroll')}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Wallet size={18} /> Manage Payroll
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="bento-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard title="Total Departments" value={totalDepartments} icon={Building2} color="#6C5CE7" />
        <StatCard title="Total Staff" value={totalStaff} icon={Users} color="#00B894" />
        <StatCard title="Active Projects" value={activeProjects} icon={Briefcase} color="#0984E3" />
        <StatCard title="All Tasks" value={totalTasks} icon={CheckCircle} color="#FDCB6E" />
      </div>

      {/* Charts & Activity */}
      <div className="bento-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Productivity Chart spans 8 cols */}
        <motion.div variants={itemVariants} className="card-panel col-span-8">
          <h3 className="card-panel-title">Productivity Overview</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockProductivityData}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                <Area type="monotone" dataKey="completed" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Payroll Summary spans 4 cols */}
        <motion.div variants={itemVariants} className="card-panel col-span-4" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="card-panel-title">Payroll Summary</h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Payroll (This Month)</p>
              <h2 style={{ margin: '0.5rem 0', fontSize: '2.5rem', color: 'var(--text-primary)' }}>${totalPayroll.toLocaleString()}</h2>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0, 184, 148, 0.1)', borderRadius: '0.5rem' }}>
              <span style={{ color: '#00B894', fontWeight: 600 }}>Paid</span>
              <span style={{ fontWeight: 600 }}>${paidPayroll.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(253, 203, 110, 0.1)', borderRadius: '0.5rem' }}>
              <span style={{ color: '#FDCB6E', fontWeight: 600 }}>Pending</span>
              <span style={{ fontWeight: 600 }}>${pendingPayroll.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Departments & Activity */}
      <div className="bento-grid">
        <motion.div variants={itemVariants} className="card-panel col-span-8">
          <h3 className="card-panel-title">Department Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            {departments.map(dept => {
              const deptTasks = tasks.filter(t => {
                const project = projects.find(p => p.id === t.projectId);
                return (t as any).departmentId === dept.id || (project as any)?.departmentId === dept.id || (project as any)?.teamId === dept.id;
              });
              const doneTasks = deptTasks.filter(t => t.status === 'DONE').length;
              const progress = deptTasks.length ? Math.round((doneTasks / deptTasks.length) * 100) : 0;
              const admin = allUsers.find(u => u.id === dept.adminId);
              const memberCount = allUsers.filter(u => u.departmentId === dept.id).length || dept.memberIds?.length || dept.memberCount || 0;
              
              return (
                <div key={dept.id} style={{ padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', borderLeft: `4px solid ${dept.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.125rem' }}>{dept.name}</h4>
                    <span style={{ background: `${dept.color}20`, color: dept.color, padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      {memberCount} Members
                    </span>
                  </div>
                  {admin && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>Admin: {admin.name}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span>Tasks Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: dept.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card-panel col-span-4">
          <h3 className="card-panel-title">Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '400px', paddingRight: '0.5rem' }}>
            {activityLog.slice(0, 10).map(entry => (
              <div key={entry.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ background: 'var(--primary-alpha)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '50%' }}>
                  <Activity size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 600 }}>{entry.userName}</span> {entry.action.replace('_', ' ')}
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, allUsers } = useAuthStore();
  const { departments, tasks, projects } = useWorkspaceStore();

  const department = departments.find(d => d.id === user?.departmentId);
  
  const deptMembers = allUsers.filter(u => u.departmentId === user?.departmentId);
  const deptProjects = projects.filter(p =>
    (p as any).departmentId === user?.departmentId || (p as any).teamId === user?.departmentId
  );
  const deptProjectIds = deptProjects.map(p => p.id);
  const deptTasks = tasks.filter(t =>
    (t as any).departmentId === user?.departmentId || deptProjectIds.includes(t.projectId)
  );
  const completedTasks = deptTasks.filter(t => t.status === 'DONE').length;

  const taskDistribution = [
    { name: 'TODO', value: deptTasks.filter(t => t.status === 'TODO').length },
    { name: 'IN PROGRESS', value: deptTasks.filter(t => t.status === 'IN_PROGRESS').length },
    { name: 'REVIEW', value: deptTasks.filter(t => t.status === 'REVIEW').length },
    { name: 'DONE', value: deptTasks.filter(t => t.status === 'DONE').length },
  ];

  if (!user?.departmentId) {
    return (
      <div className="card-panel" style={{ padding: '2rem' }}>
        <h3 style={{ marginTop: 0 }}>No department assigned</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Your account is active, but no department is linked yet. Ask a Super Admin to assign you to a department.
        </p>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="card-panel" style={{ padding: '2rem' }}>
        <h3 style={{ marginTop: 0 }}>Loading department...</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Fetching your department data. If this stays empty, refresh the page.
        </p>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Welcome Banner */}
      <motion.div variants={itemVariants} className="bento-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card-panel col-span-12" style={{ 
          background: `linear-gradient(135deg, ${department.color} 0%, ${department.color}dd 100%)`, 
          color: 'white',
          border: 'none',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>Department: {department.name}</h1>
              <p style={{ margin: 0, opacity: 0.9 }}>{department.description}</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => navigate('/projects')}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'white', color: department.color, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={18} /> Create Project
              </button>
              <button 
                onClick={() => navigate('/admin/invite')}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Users size={18} /> Invite Member
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="bento-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard title="Dept Members" value={deptMembers.length} icon={Users} color={department.color} />
        <StatCard title="Dept Tasks" value={deptTasks.length} icon={CheckCircle} color={department.color} />
        <StatCard title="Active Projects" value={deptProjects.length} icon={Briefcase} color={department.color} />
        <StatCard title="Completed Tasks" value={completedTasks} icon={BarChart2} color={department.color} />
      </div>

      {/* Charts & Members */}
      <div className="bento-grid">
        <motion.div variants={itemVariants} className="card-panel col-span-8">
          <h3 className="card-panel-title">Task Status Distribution</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskDistribution} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis type="number" stroke="var(--text-secondary)" />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" width={100} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '0.5rem' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="value" fill={department.color} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card-panel col-span-4">
          <h3 className="card-panel-title">Department Members</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '400px', paddingRight: '0.5rem' }}>
            {deptMembers.map(member => {
              const memberTasks = deptTasks.filter(t => t.assigneeId === member.id).length;
              return (
                <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${department.color}20`, color: department.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.875rem' }}>{member.name}</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{member.email}</p>
                    </div>
                  </div>
                  <span style={{ background: 'var(--bg-body)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {memberTasks} Tasks
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

const MemberDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { tasks, projects } = useWorkspaceStore();

  const myTasks = tasks.filter(t => t.assigneeId === user?.id);
  const dueToday = myTasks.filter(t => t.dueDate && isToday(new Date(t.dueDate)) && t.status !== 'DONE').length;
  const overdue = myTasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== 'DONE').length;
  const completed = myTasks.filter(t => t.status === 'DONE').length;

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'URGENT': return '#D63031';
      case 'HIGH': return '#E17055';
      case 'MEDIUM': return '#FDCB6E';
      case 'LOW': return '#00B894';
      default: return 'var(--text-secondary)';
    }
  };

  const upcomingDeadlines = myTasks
    .filter(t => t.dueDate && isFuture(new Date(t.dueDate)) && t.status !== 'DONE')
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const statuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Welcome Banner */}
      <motion.div variants={itemVariants} className="bento-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card-panel col-span-12" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', color: 'var(--text-primary)' }}>My Workspace</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Welcome back, {user?.name}. You have {myTasks.length - completed} pending tasks.</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--primary)' }}>{format(new Date(), 'MMMM do, yyyy')}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="bento-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard title="My Tasks" value={myTasks.length} icon={CheckCircle} color="#6C5CE7" />
        <StatCard title="Due Today" value={dueToday} icon={Clock} color="#FDCB6E" />
        <StatCard title="Overdue" value={overdue} icon={AlertCircle} color="#D63031" />
        <StatCard title="Completed" value={completed} icon={Activity} color="#00B894" />
      </div>

      {/* Tasks & Deadlines */}
      <div className="bento-grid">
        <motion.div variants={itemVariants} className="card-panel col-span-8">
          <h3 className="card-panel-title">My Tasks Overview</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {statuses.map(status => {
              const statusTasks = myTasks.filter(t => t.status === status);
              if (statusTasks.length === 0) return null;
              return (
                <div key={status}>
                  <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {status.replace('_', ' ')} ({statusTasks.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {statusTasks.map(task => {
                      const project = projects.find(p => p.id === task.projectId);
                      return (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
                          <div>
                            <h5 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>{task.title}</h5>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{project?.name || 'No Project'}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: '1rem', background: `${getPriorityColor(task.priority)}20`, color: getPriorityColor(task.priority) }}>
                              {task.priority}
                            </span>
                            {task.dueDate && (
                              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Clock size={14} /> {format(new Date(task.dueDate), 'MMM dd')}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card-panel col-span-4">
          <h3 className="card-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} color="#E17055" /> Upcoming Deadlines
          </h3>
          {upcomingDeadlines.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.875rem' }}>No upcoming deadlines.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {upcomingDeadlines.map(task => (
                <div key={task.id} style={{ padding: '1rem', borderLeft: `3px solid ${getPriorityColor(task.priority)}`, borderTop: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', borderRadius: '0 0.5rem 0.5rem 0' }}>
                  <h5 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem' }}>{task.title}</h5>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Due: {task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : 'N/A'}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) return null;

  if (user.role === 'SUPER_ADMIN') return <SuperAdminDashboard />;
  if (user.role === 'ADMIN') return <AdminDashboard />;
  return <MemberDashboard />;
};
