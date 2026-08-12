import { Router } from 'express';
import { prisma } from '../index';
import { authenticate } from './auth.routes';

const router = Router();

router.use(authenticate);

// Get all workspaces for the authenticated user
router.get('/', async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: req.user.userId },
          ...(user.workspaceId ? [{ id: user.workspaceId }] : [])
        ]
      }
    });
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create workspace
router.post('/', async (req: any, res) => {
  try {
    const { name } = req.body;
    const workspace = await prisma.workspace.create({
      data: {
        name,
        ownerId: req.user.userId,
      }
    });
    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
