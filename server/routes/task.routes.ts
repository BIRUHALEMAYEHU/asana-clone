import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, resolveWorkspaceId } from './auth.routes';

const router = Router();
router.use(authenticate);

// Fields the client is allowed to write on a task.
const TASK_UPDATABLE_FIELDS = ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate'];

// Prisma stores labels as a JSON string, but the client contract is string[].
const serializeTask = (task: any) => {
  let labels: string[] = [];
  try {
    const parsed = JSON.parse(task.labels ?? '[]');
    if (Array.isArray(parsed)) labels = parsed;
  } catch {
    labels = [];
  }
  return { ...task, labels };
};

const isAssigneeInWorkspace = async (assigneeId: string, workspaceId: string) => {
  const assignee = await prisma.user.findFirst({ where: { id: assigneeId, workspaceId } });
  return Boolean(assignee);
};

// Get tasks for project
router.get('/:projectId', async (req: any, res) => {
  try {
    const { projectId } = req.params;
    const tasks = await prisma.task.findMany({
      where: { projectId }
    });
    res.json(tasks.map(serializeTask));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: any, res) => {
  try {
    const { title, description, projectId, assigneeId, status, priority, dueDate } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const workspaceId = await resolveWorkspaceId(user);
    if (!workspaceId) return res.status(400).json({ error: 'Workspace not found' });

    if (!projectId) return res.status(400).json({ error: 'Invalid project' });
    const project = await prisma.project.findFirst({ where: { id: projectId, workspaceId } });
    if (!project) return res.status(400).json({ error: 'Invalid project' });

    if (assigneeId && !(await isAssigneeInWorkspace(assigneeId, workspaceId))) {
      return res.status(400).json({ error: 'Invalid assignee' });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId,
        assigneeId: assigneeId || null,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });
    res.status(201).json(serializeTask(task));
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const workspaceId = await resolveWorkspaceId(user);
    if (!workspaceId) return res.status(400).json({ error: 'Workspace not found' });
    const project = await prisma.project.findFirst({ where: { id: task.projectId, workspaceId } });
    if (!project) return res.status(403).json({ error: 'Task is not in your workspace' });

    // Whitelist only writable fields; anything else the frontend sends is ignored.
    const data: any = {};
    for (const field of TASK_UPDATABLE_FIELDS) {
      if (body[field] === undefined) continue;
      data[field] = body[field];
    }

    if (data.dueDate !== undefined) {
      if (data.dueDate === null || data.dueDate === '') {
        data.dueDate = null;
      } else {
        const parsed = new Date(data.dueDate);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({ error: 'Invalid dueDate' });
        }
        data.dueDate = parsed;
      }
    }

    if (data.assigneeId !== undefined) {
      if (!data.assigneeId) {
        data.assigneeId = null;
      } else if (!(await isAssigneeInWorkspace(data.assigneeId, workspaceId))) {
        return res.status(400).json({ error: 'Invalid assignee' });
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data
    });
    res.json(serializeTask(updated));
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const workspaceId = await resolveWorkspaceId(user);
    if (!workspaceId) return res.status(400).json({ error: 'Workspace not found' });
    const project = await prisma.project.findFirst({ where: { id: task.projectId, workspaceId } });
    if (!project) return res.status(403).json({ error: 'Task is not in your workspace' });

    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Task delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
