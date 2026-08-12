import { Router } from 'express';
import { prisma } from '../index';
import { authenticate, resolveWorkspaceId } from './auth.routes';

const router = Router();
router.use(authenticate);

const DEFAULT_COLOR = '#6C5CE7';

// Map a Team row (optionally with members) to the frontend Department shape.
const mapDepartmentForClient = (team: any) => ({
  id: team.id,
  name: team.name,
  description: team.description || `${team.name} Department`,
  color: team.color || DEFAULT_COLOR,
  adminId: team.leadId,
  memberIds: Array.isArray(team.members) ? team.members.map((m: any) => m.id) : [],
  memberCount: Array.isArray(team.members) ? team.members.length : 0,
  budget: 0,
  expenses: 0,
  goals: [],
  createdAt: team.createdAt,
  updatedAt: team.updatedAt
});

// A department lead must also belong to the department: the client reads membership
// from User.teamId (exposed as departmentId), and POST /api/auth/invite refuses an
// ADMIN with no teamId.
const syncLeadMembership = async (team: { id: string; leadId: string | null }) => {
  if (!team.leadId) return;
  await prisma.user.update({ where: { id: team.leadId }, data: { teamId: team.id } });
};

// Get all departments (Teams in schema)
router.get('/:workspaceId', async (req: any, res) => {
  try {
    const { workspaceId } = req.params;
    const teams = await prisma.team.findMany({
      where: { workspaceId },
      include: {
        lead: true,
        members: true
      }
    });
    // Map to frontend Department format
    res.json(teams.map(mapDepartmentForClient));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create department (Team)
router.post('/', async (req: any, res) => {
  try {
    const { name, leadId, color, description } = req.body;
    let { workspaceId } = req.body;

    const actor = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!actor) return res.status(404).json({ error: 'User not found' });
    if (actor.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only a Super Admin can create a department' });
    }

    const actorWorkspaceId = await resolveWorkspaceId(actor);
    if (!actorWorkspaceId) return res.status(400).json({ error: 'Workspace not found' });
    if (workspaceId && workspaceId !== actorWorkspaceId) {
      return res.status(403).json({ error: 'Cannot create a department in another workspace' });
    }
    workspaceId = actorWorkspaceId;

    const nextLeadId = leadId || null;
    if (nextLeadId) {
      const lead = await prisma.user.findFirst({ where: { id: nextLeadId, workspaceId } });
      if (!lead) {
        return res.status(400).json({ error: 'Invalid department lead for this workspace' });
      }
    }

    const team = await prisma.team.create({
      data: {
        name,
        workspaceId,
        leadId: nextLeadId,
        color: color || null,
        description: description || null
      }
    });

    // The frontend derives department membership from User.teamId, so a lead who is
    // not also a member shows as unassigned and cannot invite into their department.
    await syncLeadMembership(team);

    const withMembers = await prisma.team.findUnique({
      where: { id: team.id },
      include: { members: true }
    });

    res.status(201).json(mapDepartmentForClient(withMembers ?? team));
  } catch (error) {
    console.error('Dept creation error:', error);
    res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
});

// Update department (Team)
router.patch('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, leadId } = req.body || {};

    const actor = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!actor) return res.status(404).json({ error: 'User not found' });

    const workspaceId = await resolveWorkspaceId(actor);
    if (!workspaceId) return res.status(400).json({ error: 'Workspace not found' });

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return res.status(404).json({ error: 'Department not found' });
    if (team.workspaceId !== workspaceId) {
      return res.status(403).json({ error: 'Department is not in your workspace' });
    }

    const isDepartmentAdmin = actor.role === 'ADMIN' && actor.teamId === team.id;
    if (actor.role !== 'SUPER_ADMIN' && !isDepartmentAdmin) {
      return res.status(403).json({ error: 'Not allowed to update this department' });
    }

    const data: any = {};
    if (name !== undefined && name !== null && name !== '') data.name = String(name);
    if (description !== undefined) data.description = description || null;
    if (color !== undefined) data.color = color || null;
    if (leadId !== undefined) {
      const nextLeadId = leadId || null;
      if (nextLeadId) {
        const lead = await prisma.user.findFirst({ where: { id: nextLeadId, workspaceId } });
        if (!lead) {
          return res.status(400).json({ error: 'Invalid department lead for this workspace' });
        }
      }
      data.leadId = nextLeadId;
    }

    const updated = await prisma.team.update({
      where: { id },
      data,
      include: { members: true }
    });

    await syncLeadMembership(updated);

    const withMembers = await prisma.team.findUnique({
      where: { id },
      include: { members: true }
    });

    res.json(mapDepartmentForClient(withMembers ?? updated));
  } catch (error) {
    console.error('Dept update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete department
router.delete('/:id', async (req: any, res) => {
  try {
    const { id } = req.params;

    const actor = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!actor) return res.status(404).json({ error: 'User not found' });
    if (actor.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only a Super Admin can delete a department' });
    }

    const workspaceId = await resolveWorkspaceId(actor);
    if (!workspaceId) return res.status(400).json({ error: 'Workspace not found' });

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return res.status(404).json({ error: 'Department not found' });
    if (team.workspaceId !== workspaceId) {
      return res.status(403).json({ error: 'Department is not in your workspace' });
    }

    const [memberCount, projectCount] = await Promise.all([
      prisma.user.count({ where: { teamId: id } }),
      prisma.project.count({ where: { teamId: id } })
    ]);

    if (memberCount > 0 || projectCount > 0) {
      const parts: string[] = [];
      if (memberCount > 0) parts.push(`${memberCount} member${memberCount === 1 ? '' : 's'}`);
      if (projectCount > 0) parts.push(`${projectCount} project${projectCount === 1 ? '' : 's'}`);
      return res.status(409).json({
        error: `Cannot delete department: ${parts.join(' and ')} ${
          memberCount + projectCount === 1 ? 'is' : 'are'
        } still assigned to it. Move or remove them first.`
      });
    }

    await prisma.team.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Dept delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
