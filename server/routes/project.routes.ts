import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from './auth.routes';
import {
  addProjectMember,
  canManageProjectMembers,
  getProjectMembership,
  isUserInWorkspace,
  mapProjectMemberForClient
} from '../membership';
import { ensureProjectChannel, syncProjectChannelMembers } from '../chat.service';

const router = Router();
router.use(authenticate);

const DEFAULT_PROJECT_COLOR = '#6C5CE7';
const PROJECT_MEMBER_ROLES = ['ADMIN', 'MEMBER'] as const;

const memberInclude = {
  user: { select: { id: true, name: true, email: true, profilePic: true } }
};

const serializeProject = (p: any, ownerId: string, members?: any[]) => ({
  ...p,
  departmentId: p.teamId || undefined,
  color: p.color || DEFAULT_PROJECT_COLOR,
  ownerId,
  description: p.description || '',
  memberIds: Array.isArray(members) ? members.map((m: any) => m.userId) : undefined,
  memberCount: Array.isArray(members) ? members.length : undefined
});

const loadProjectInWorkspace = async (projectId: string, workspaceId: string) => {
  return prisma.project.findFirst({ where: { id: projectId, workspaceId } });
};

const canViewProject = async (
  actor: any,
  project: { id: string; workspaceId: string; teamId: string | null }
) => {
  if (actor.workspaceId !== project.workspaceId) return false;
  if (actor.role === 'SUPER_ADMIN') return true;
  if (actor.teamId && project.teamId === actor.teamId) return true;
  const membership = await getProjectMembership(project.id, actor.id);
  return Boolean(membership);
};

// List members — register before /:workspaceId so paths stay unambiguous.
router.get('/:projectId/members', async (req: any, res) => {
  try {
    const { projectId } = req.params;
    const actor = req.actor;
    const project = await loadProjectInWorkspace(projectId, actor.workspaceId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!(await canViewProject(actor, project))) {
      return res.status(403).json({ error: 'Not allowed to view this project' });
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: memberInclude,
      orderBy: { createdAt: 'asc' }
    });
    res.json(members.map(mapProjectMemberForClient));
  } catch (error) {
    console.error('List project members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:projectId/members', async (req: any, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.body || {};
    const actor = req.actor;

    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const memberRole = role || 'MEMBER';
    if (!PROJECT_MEMBER_ROLES.includes(memberRole)) {
      return res.status(400).json({ error: 'Invalid project member role' });
    }

    const project = await loadProjectInWorkspace(projectId, actor.workspaceId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!(await canManageProjectMembers(actor, project))) {
      return res.status(403).json({ error: 'Not allowed to manage project members' });
    }
    if (!(await isUserInWorkspace(userId, actor.workspaceId))) {
      return res.status(400).json({ error: 'User must already belong to this company' });
    }

    await addProjectMember(projectId, userId, memberRole);
    await syncProjectChannelMembers(projectId);
    const row = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: memberInclude
    });
    res.status(201).json(mapProjectMemberForClient(row!));
  } catch (error) {
    console.error('Add project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:projectId/members/:userId', async (req: any, res) => {
  try {
    const { projectId, userId } = req.params;
    const { role } = req.body || {};
    const actor = req.actor;

    if (!PROJECT_MEMBER_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid project member role' });
    }

    const project = await loadProjectInWorkspace(projectId, actor.workspaceId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!(await canManageProjectMembers(actor, project))) {
      return res.status(403).json({ error: 'Not allowed to manage project members' });
    }

    const existing = await getProjectMembership(projectId, userId);
    if (!existing) return res.status(404).json({ error: 'Project member not found' });

    if (existing.role === 'ADMIN' && role === 'MEMBER') {
      const adminCount = await prisma.projectMember.count({
        where: { projectId, role: 'ADMIN' }
      });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'A project must keep at least one project admin' });
      }
    }

    await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role }
    });
    const row = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: memberInclude
    });
    res.json(mapProjectMemberForClient(row!));
  } catch (error) {
    console.error('Update project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:projectId/members/:userId', async (req: any, res) => {
  try {
    const { projectId, userId } = req.params;
    const actor = req.actor;

    const project = await loadProjectInWorkspace(projectId, actor.workspaceId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!(await canManageProjectMembers(actor, project))) {
      return res.status(403).json({ error: 'Not allowed to manage project members' });
    }

    const existing = await getProjectMembership(projectId, userId);
    if (!existing) return res.status(404).json({ error: 'Project member not found' });

    if (existing.role === 'ADMIN') {
      const adminCount = await prisma.projectMember.count({
        where: { projectId, role: 'ADMIN' }
      });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last project admin' });
      }
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } }
    });

    const projectChannel = await prisma.channel.findFirst({
      where: { projectId, type: 'PROJECT' }
    });
    if (projectChannel) {
      await prisma.channelMember.deleteMany({
        where: { channelId: projectChannel.id, userId, source: 'AUTO' }
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Remove project member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:workspaceId', async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const user = req.actor;
    if (workspaceId !== user.workspaceId) {
      return res.status(403).json({ error: 'Cannot list projects in another workspace' });
    }

    let projects;
    if (user.role === 'SUPER_ADMIN') {
      projects = await prisma.project.findMany({
        where: { workspaceId },
        include: { members: true }
      });
    } else {
      projects = await prisma.project.findMany({
        where: {
          workspaceId,
          OR: [
            ...(user.teamId ? [{ teamId: user.teamId }] : []),
            { members: { some: { userId: user.id } } }
          ]
        },
        include: { members: true }
      });
    }

    res.json(projects.map(p => serializeProject(p, user.id, p.members)));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const {
      name,
      description,
      deptId,
      departmentId,
      teamId: bodyTeamId,
      status,
      startDate,
      dueDate,
      color,
      memberIds
    } = req.body;
    let { workspaceId } = req.body;

    const user = req.actor;
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can create a project' });
    }

    const actorWorkspaceId = user.workspaceId;
    if (workspaceId && workspaceId !== actorWorkspaceId) {
      return res.status(403).json({ error: 'Cannot create a project in another workspace' });
    }
    workspaceId = actorWorkspaceId;

    let teamId = deptId || departmentId || bodyTeamId || user.teamId || null;
    if (user.role === 'ADMIN') {
      if (!user.teamId) {
        return res.status(400).json({ error: 'Department admin has no department assigned' });
      }
      if (teamId !== user.teamId) {
        return res.status(403).json({ error: 'Department admins can only create projects in their own department' });
      }
      teamId = user.teamId;
    }

    if (teamId) {
      const team = await prisma.team.findFirst({ where: { id: teamId, workspaceId } });
      if (!team) {
        return res.status(400).json({ error: 'Invalid department for this workspace' });
      }
    }

    const extraMemberIds: string[] = Array.isArray(memberIds)
      ? [...new Set(memberIds.filter((id: unknown) => typeof id === 'string' && id !== user.id))]
      : [];

    for (const memberId of extraMemberIds) {
      if (!(await isUserInWorkspace(memberId, workspaceId))) {
        return res.status(400).json({ error: 'All project members must already belong to this company' });
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        workspaceId,
        teamId,
        color: color || null,
        status: status || 'ACTIVE',
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    // Creator is always the first project admin.
    await addProjectMember(project.id, user.id, 'ADMIN');
    for (const memberId of extraMemberIds) {
      await addProjectMember(project.id, memberId, 'MEMBER');
    }

    await ensureProjectChannel(project.id);

    const members = await prisma.projectMember.findMany({ where: { projectId: project.id } });
    res.status(201).json(serializeProject(project, user.id, members));
  } catch (error) {
    console.error('Project create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const user = req.actor;
    const workspaceId = user.workspaceId;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.workspaceId !== workspaceId) {
      return res.status(403).json({ error: 'Project is not in your workspace' });
    }

    const isOwningDeptAdmin =
      user.role === 'ADMIN' && Boolean(user.teamId) && project.teamId === user.teamId;
    const isProjectAdmin = (await getProjectMembership(id, user.id))?.role === 'ADMIN';
    if (user.role !== 'SUPER_ADMIN' && !isOwningDeptAdmin && !isProjectAdmin) {
      return res.status(403).json({ error: 'Not allowed to delete this project' });
    }

    const taskCount = await prisma.task.count({ where: { projectId: id } });
    if (taskCount > 0) {
      return res.status(409).json({
        error: `Cannot delete project: ${taskCount} task${taskCount === 1 ? '' : 's'} ${
          taskCount === 1 ? 'is' : 'are'
        } still assigned to it. Move or remove them first.`
      });
    }

    await prisma.project.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Project delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
