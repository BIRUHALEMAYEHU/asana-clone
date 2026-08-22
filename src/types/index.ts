// ── Roles ──
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';

// ── User ──
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  profilePic?: string;
  isVerified: boolean;
  workspaceId?: string;
  departmentId?: string;      // Admin & Member belong to a department
  createdAt?: string;
  position?: string;
  birthday?: string;
  kebeleIdUrl?: string;
  nationalIdUrl?: string;
  bankAccount?: string;
  dateJoined?: string;
  bio?: string;
}

// ── Department ──
export interface Department {
  id: string;
  name: string;
  description: string;
  color: string;
  adminId?: string | null;    // Admin user who leads this department; null clears it
  memberIds?: string[];
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ── Invitation ──
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Invitation {
  id: string;
  email: string;
  name: string;
  role: Role;
  departmentId?: string;
  status: InvitationStatus;
  invitedBy: string;          // user id of inviter
  createdAt: string;
}

// ── Task ──
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  projectId: string;
  departmentId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string | null;    // null clears the due date
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Project ──
export type ProjectMemberRole = 'ADMIN' | 'MEMBER';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  name: string;
  email: string;
  profilePic?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  departmentId?: string;
  name: string;
  description: string;
  ownerId: string;
  color: string;
  memberIds?: string[];
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ── Workspace ──
export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// ── Team ──
export interface Team {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  memberIds: string[];
}

// ── Comment ──
export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  content: string;
  createdAt: string;
}

// ── Activity Log ──
export type ActivityTargetType = 'TASK' | 'PROJECT' | 'WORKSPACE' | 'TEAM' | 'USER' | 'DEPARTMENT';

export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  targetId: string;
  targetType: ActivityTargetType;
  departmentId?: string;
  details?: string;
  createdAt: string;
}

// ── Payroll ──
export type PayrollStatus = 'PENDING' | 'APPROVED' | 'PAID';

export interface PayrollEntry {
  id: string;
  userId: string;
  userName: string;
  departmentId: string;
  departmentName: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netPay: number;
  period: string;           // e.g. "August 2026"
  status: PayrollStatus;
  dateJoined?: string;
  bankAccount?: string;
  employmentType?: 'Internship' | 'Full-time';
  createdAt: string;
}
