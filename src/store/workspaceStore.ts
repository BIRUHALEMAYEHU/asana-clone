import { create } from 'zustand';
import type {
  Workspace,
  Department,
  Team,
  Project,
  ProjectMember,
  ProjectMemberRole,
  Task,
  Comment,
  ActivityLogEntry,
  PayrollEntry,
  PayrollStatus
} from '../types';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  departments: Department[];
  teams: Team[];
  projects: Project[];
  currentProject: Project | null;
  projectMembersByProject: Record<string, ProjectMember[]>;
  tasks: Task[];
  comments: Comment[];
  activityLog: ActivityLogEntry[];
  payroll: PayrollEntry[];

  reset: () => void;
  fetchAllData: (workspaceId: string) => Promise<void>;

  addDepartment: (department: Omit<Department, 'id'>) => Promise<void>;
  updateDepartment: (id: string, department: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;

  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Omit<Project, 'id'> & { memberIds?: string[] }) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => Promise<void>;
  fetchProjectMembers: (projectId: string) => Promise<ProjectMember[]>;
  addProjectMember: (projectId: string, userId: string, role?: ProjectMemberRole) => Promise<void>;
  updateProjectMemberRole: (projectId: string, userId: string, role: ProjectMemberRole) => Promise<void>;
  removeProjectMember: (projectId: string, userId: string) => Promise<void>;

  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  updatePayrollStatus: (id: string, status: PayrollStatus) => void;
  addPayrollEntry: (entry: PayrollEntry) => void;

  getTasksByDepartment: (deptId: string) => Task[];
  getTasksByAssignee: (userId: string) => Task[];
  getProjectsByDepartment: (deptId: string) => Project[];
  getProjectMembers: (projectId: string) => ProjectMember[];
}

const getToken = () => localStorage.getItem('token');

const throwOnError = async (res: Response, fallback: string) => {
  if (res.ok) return;
  const data = await res.json().catch(() => ({}));
  throw new Error(data.error || fallback);
};

const emptyWorkspaceState = {
  workspaces: [] as Workspace[],
  currentWorkspace: null as Workspace | null,
  departments: [] as Department[],
  teams: [] as Team[],
  projects: [] as Project[],
  currentProject: null as Project | null,
  projectMembersByProject: {} as Record<string, ProjectMember[]>,
  tasks: [] as Task[],
  comments: [] as Comment[],
  activityLog: [] as ActivityLogEntry[],
  payroll: [] as PayrollEntry[]
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...emptyWorkspaceState,

  reset: () => set({ ...emptyWorkspaceState }),

  fetchAllData: async (workspaceId: string) => {
    const token = getToken();
    if (!token) return;

    set({
      departments: [],
      projects: [],
      tasks: [],
      currentProject: null,
      currentWorkspace: null,
      projectMembersByProject: {}
    });

    try {
      const [deptRes, projRes, wsRes] = await Promise.all([
        fetch(`/api/departments/${workspaceId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/projects/${workspaceId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/workspaces', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (deptRes.ok && projRes.ok) {
        const departments = await deptRes.json();
        const projects = await projRes.json();
        const workspaces = wsRes.ok ? await wsRes.json() : [];

        const currentWorkspace =
          workspaces.find((w: any) => w.id === workspaceId) ||
          workspaces[0] || {
            id: workspaceId,
            name: 'Workspace',
            ownerId: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

        set({ departments, projects, currentWorkspace, workspaces });

        const allTasks: Task[] = [];
        for (const proj of projects) {
          const tRes = await fetch(`/api/tasks/${proj.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (tRes.ok) {
            allTasks.push(...(await tRes.json()));
          }
        }
        set({ tasks: allTasks });
      }
    } catch (error) {
      console.error('Failed to fetch workspace data', error);
    }
  },

  addDepartment: async deptData => {
    const token = getToken();
    const res = await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: deptData.name,
        description: deptData.description,
        color: deptData.color,
        leadId: deptData.adminId || null,
        workspaceId: (deptData as any).workspaceId || get().currentWorkspace?.id
      })
    });
    await throwOnError(res, 'Failed to create department');
    const newDept = await res.json();
    set(state => ({ departments: [...state.departments, newDept] }));
  },

  updateDepartment: async (id, updatedFields) => {
    const token = getToken();
    const res = await fetch(`/api/departments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: updatedFields.name,
        description: updatedFields.description,
        color: updatedFields.color,
        leadId: updatedFields.adminId === undefined ? undefined : updatedFields.adminId || null
      })
    });
    await throwOnError(res, 'Failed to update department');
    const updated = await res.json();
    set(state => ({
      departments: state.departments.map(dept => (dept.id === id ? { ...dept, ...updated } : dept))
    }));
  },

  deleteDepartment: async id => {
    const token = getToken();
    const res = await fetch(`/api/departments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    await throwOnError(res, 'Failed to delete department');
    set(state => ({ departments: state.departments.filter(d => d.id !== id) }));
  },

  setProjects: projects => set({ projects }),
  setCurrentProject: project => set({ currentProject: project }),

  addProject: async projectData => {
    const token = getToken();
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: projectData.name,
        description: projectData.description,
        departmentId: (projectData as any).departmentId,
        deptId: (projectData as any).departmentId,
        color: (projectData as any).color,
        workspaceId: projectData.workspaceId,
        memberIds: projectData.memberIds
      })
    });
    await throwOnError(res, 'Failed to create project');
    const newProj = await res.json();
    set(state => ({ projects: [...state.projects, newProj] }));
  },

  updateProject: (id, updatedFields) =>
    set(state => ({
      projects: state.projects.map(proj => (proj.id === id ? { ...proj, ...updatedFields } : proj)),
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, ...updatedFields }
          : state.currentProject
    })),

  deleteProject: async id => {
    const token = getToken();
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    await throwOnError(res, 'Failed to delete project');
    set(state => {
      const nextMembers = { ...state.projectMembersByProject };
      delete nextMembers[id];
      return {
        projects: state.projects.filter(p => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        projectMembersByProject: nextMembers
      };
    });
  },

  fetchProjectMembers: async projectId => {
    const token = getToken();
    const res = await fetch(`/api/projects/${projectId}/members`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await throwOnError(res, 'Failed to load project members');
    const members: ProjectMember[] = await res.json();
    set(state => ({
      projectMembersByProject: { ...state.projectMembersByProject, [projectId]: members },
      projects: state.projects.map(p =>
        p.id === projectId
          ? { ...p, memberIds: members.map(m => m.userId), memberCount: members.length }
          : p
      )
    }));
    return members;
  },

  addProjectMember: async (projectId, userId, role = 'MEMBER') => {
    const token = getToken();
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, role })
    });
    await throwOnError(res, 'Failed to add project member');
    const member: ProjectMember = await res.json();
    set(state => {
      const existing = state.projectMembersByProject[projectId] || [];
      const next = [...existing.filter(m => m.userId !== userId), member];
      return {
        projectMembersByProject: { ...state.projectMembersByProject, [projectId]: next },
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, memberIds: next.map(m => m.userId), memberCount: next.length }
            : p
        )
      };
    });
  },

  updateProjectMemberRole: async (projectId, userId, role) => {
    const token = getToken();
    const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role })
    });
    await throwOnError(res, 'Failed to update project member');
    const member: ProjectMember = await res.json();
    set(state => {
      const existing = state.projectMembersByProject[projectId] || [];
      return {
        projectMembersByProject: {
          ...state.projectMembersByProject,
          [projectId]: existing.map(m => (m.userId === userId ? member : m))
        }
      };
    });
  },

  removeProjectMember: async (projectId, userId) => {
    const token = getToken();
    const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    await throwOnError(res, 'Failed to remove project member');
    set(state => {
      const existing = state.projectMembersByProject[projectId] || [];
      const next = existing.filter(m => m.userId !== userId);
      return {
        projectMembersByProject: { ...state.projectMembersByProject, [projectId]: next },
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, memberIds: next.map(m => m.userId), memberCount: next.length }
            : p
        )
      };
    });
  },

  setTasks: tasks => set({ tasks }),

  addTask: async taskData => {
    const token = getToken();
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(taskData)
    });
    await throwOnError(res, 'Failed to create task');
    const newTask = await res.json();
    set(state => ({ tasks: [...state.tasks, newTask] }));
  },

  updateTask: async (id, updatedFields) => {
    const token = getToken();
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(updatedFields)
    });
    await throwOnError(res, 'Failed to update task');
    set(state => ({
      tasks: state.tasks.map(task => (task.id === id ? { ...task, ...updatedFields } : task))
    }));
  },

  deleteTask: async id => {
    const token = getToken();
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    await throwOnError(res, 'Failed to delete task');
    set(state => ({ tasks: state.tasks.filter(task => task.id !== id) }));
  },

  updatePayrollStatus: (id, status) =>
    set(state => ({
      payroll: state.payroll.map(entry => (entry.id === id ? { ...entry, status } : entry))
    })),

  addPayrollEntry: entry => set(state => ({ payroll: [...state.payroll, entry] })),

  getTasksByDepartment: (deptId: string) => {
    const projectIds = get()
      .projects.filter(
        project =>
          (project as any).departmentId === deptId || (project as any).teamId === deptId
      )
      .map(project => project.id);
    return get().tasks.filter(
      task => projectIds.includes(task.projectId) || (task as any).departmentId === deptId
    );
  },
  getTasksByAssignee: (userId: string) => get().tasks.filter(task => task.assigneeId === userId),
  getProjectsByDepartment: (deptId: string) =>
    get().projects.filter(
      project =>
        (project as any).departmentId === deptId || (project as any).teamId === deptId
    ),
  getProjectMembers: (projectId: string) => get().projectMembersByProject[projectId] || []
}));
