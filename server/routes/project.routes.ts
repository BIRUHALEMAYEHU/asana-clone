import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, resolveWorkspaceId } from './auth.routes';

const router = Router();
router.use(authenticate);

const DEFAULT_PROJECT_COLOR = '#6C5CE7';

// Get projects for workspace
router.get('/:workspaceId', async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const where: any = { workspaceId };

    // Members/Admins only see projects in their department/team.
    if (user.role !== 'SUPER_ADMIN' && user.teamId) {
      where.teamId = user.teamId;
    }

    const projects = await prisma.project.findMany({ where });
    res.json(
      projects.map(p => ({
        ...p,
        departmentId: p.teamId || undefined,
        color: p.color || DEFAULT_PROJECT_COLOR,
        ownerId: user.id,
        description: p.description || ''
      }))
    );
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
      color
    } = req.body;
    let { workspaceId } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can create a project' });
    }

    const actorWorkspaceId = await resolveWorkspaceId(user);
    if (!actorWorkspaceId) return res.status(400).json({ error: 'Workspace not found' });
    if (workspaceId && workspaceId !== actorWorkspaceId) {
      return res.status(403).json({ error: 'Cannot create a project in another workspace' });
    }
    workspaceId = actorWorkspaceId;

    // Department admins can only create projects inside their own department.
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
    res.status(201).json({
      ...project,
      departmentId: project.teamId || undefined,
      color: project.color || DEFAULT_PROJECT_COLOR,
      ownerId: user.id,
      description: project.description || ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const workspaceId = await resolveWorkspaceId(user);
    if (!workspaceId) return res.status(400).json({ error: 'Workspace not found' });

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.workspaceId !== workspaceId) {
      return res.status(403).json({ error: 'Project is not in your workspace' });
    }

    const isOwningDeptAdmin =
      user.role === 'ADMIN' && Boolean(user.teamId) && project.teamId === user.teamId;
    if (user.role !== 'SUPER_ADMIN' && !isOwningDeptAdmin) {
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
