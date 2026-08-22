import { Router } from 'express';
import { prisma } from '../index';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import {
  addWorkspaceMember,
  getActor,
  getActorForWorkspace,
  listWorkspaceActors,
  mapActorForClient,
  setUserDepartment
} from '../membership';
import {
  ensureDepartmentChannel,
  ensureWorkspaceChannel,
  syncWorkspaceChannelMembers
} from '../chat.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Email Service for Invitations
const sendInvitationEmail = async (email: string, inviteUrl: string) => {
  let transporter;
  const isSmtpConfigured = Boolean(process.env.SMTP_HOST);

  if (isSmtpConfigured) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Use Ethereal fake SMTP for testing if no env vars are provided
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('No SMTP_HOST found in environment. Using Ethereal Email (mock/test SMTP). Real emails will NOT be delivered to actual inboxes until SMTP_HOST/USER/PASS are set.');
  }

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"Team" <no-reply@example.com>',
    to: email,
    subject: "Invitation to join the workspace",
    text: `You have been invited to join the workspace. Click here to accept: ${inviteUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>You've been invited!</h2>
        <p>You have been invited to join the workspace on TeamFlow.</p>
        <div style="margin: 20px 0;">
          <a href="${inviteUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Accept Invitation</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      </div>
    `,
  });

  console.log(`[EMAIL] Invitation sent to: ${email}`);
  const previewUrl = !isSmtpConfigured ? nodemailer.getTestMessageUrl(info) || null : null;
  if (previewUrl) {
    console.log(`[EMAIL] Ethereal Test Email Preview URL: ${previewUrl}`);
  }

  return { isSmtpConfigured, previewUrl };
};

export const mapUserForClient = async (userId: string) => {
  const actor = await getActor(userId);
  if (!actor) return null;
  return mapActorForClient(actor);
};

export const resolveWorkspaceId = async (user: { id?: string; workspaceId?: string } | null) => {
  if (user?.workspaceId) return user.workspaceId;
  if (!user?.id) return null;
  const actor = await getActor(user.id);
  return actor?.workspaceId || null;
};

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please accept your invitation before signing in' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const clientUser = await mapUserForClient(user.id);
    if (!clientUser) {
      return res.status(403).json({ error: 'User has no workspace membership' });
    }

    res.json({ user: clientUser, token });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public: whether the first Super Admin signup is still allowed.
router.get('/signup-status', async (_req, res) => {
  try {
    const existingUsers = await prisma.user.count({ where: { isVerified: true } });
    res.json({ open: existingUsers === 0 });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { email, name, password } = req.body;

    // After the first Super Admin exists, new people must join via invitation.
    // Open signup would create a second workspace and break invites against the wrong departments.
    const existingUsers = await prisma.user.count({ where: { isVerified: true } });
    if (existingUsers > 0) {
      return res.status(403).json({
        error: 'A workspace already exists. Please use an invitation link to join.'
      });
    }
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        isVerified: true
      }
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: `${name || 'My'} Workspace`,
        ownerId: user.id
      }
    });

    await addWorkspaceMember(user.id, workspace.id, 'SUPER_ADMIN');
    await ensureWorkspaceChannel(workspace.id);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const clientUser = await mapUserForClient(user.id);

    res.status(201).json({ user: clientUser, token });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware for authentication
export const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const actor = await getActor(decoded.userId);
    if (!actor) return res.status(401).json({ error: 'User not found' });
    req.user = decoded;
    req.actor = actor;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/me', authenticate, async (req: any, res) => {
  try {
    res.json(mapActorForClient(req.actor));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fields a user is allowed to change on their own profile.
const PROFILE_FIELDS = ['name', 'position', 'birthday', 'bankAccount', 'dateJoined', 'bio'];

router.patch('/me', authenticate, async (req: any, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const data: any = {};
    for (const field of PROFILE_FIELDS) {
      const value = req.body?.[field];
      if (value === undefined) continue;
      data[field] = value === null || value === '' ? null : String(value);
    }

    if (Object.keys(data).length === 0) {
      return res.json(mapActorForClient(req.actor));
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data });
    const clientUser = await mapUserForClient(updated.id);
    res.json(clientUser);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', authenticate, async (req: any, res) => {
  try {
    const actors = await listWorkspaceActors(req.actor.workspaceId);
    res.json(actors.map(mapActorForClient));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MEMBER'];

// Admin: change a user's role and/or department
router.patch('/users/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { role, departmentId } = req.body || {};
    const actor = req.actor;

    if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can modify users' });
    }

    const workspaceId = actor.workspaceId;
    const target = await getActorForWorkspace(id, workspaceId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (role !== undefined) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      if (target.id === actor.id && role !== target.role) {
        return res.status(400).json({ error: 'You cannot change your own role' });
      }

      if (role !== target.role) {
        const ownedWorkspaces = await prisma.workspace.count({ where: { ownerId: target.id } });
        if (ownedWorkspaces > 0) {
          return res.status(403).json({ error: "The workspace owner's role cannot be changed" });
        }
        if (target.role === 'SUPER_ADMIN') {
          const superAdmins = await prisma.workspaceMember.count({
            where: { workspaceId, role: 'SUPER_ADMIN', status: 'ACTIVE' }
          });
          if (superAdmins <= 1) {
            return res
              .status(403)
              .json({ error: 'Cannot change the role of the last Super Admin in the workspace' });
          }
        }
      }
    }

    if (actor.role === 'ADMIN') {
      if (target.role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Department admins cannot modify a Super Admin' });
      }
      if (role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Department admins cannot grant Super Admin' });
      }
      if (!actor.teamId || target.teamId !== actor.teamId) {
        return res.status(403).json({ error: 'Department admins can only modify users in their own department' });
      }
      if (departmentId !== undefined && (departmentId || null) !== actor.teamId) {
        return res.status(403).json({ error: 'Department admins cannot move users to another department' });
      }
    }

    if (role !== undefined) {
      await prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: id } },
        data: { role }
      });
    }
    if (departmentId !== undefined) {
      const teamId = departmentId || null;
      if (teamId) {
        const team = await prisma.team.findFirst({ where: { id: teamId, workspaceId } });
        if (!team) {
          return res.status(400).json({ error: 'Invalid department for this workspace' });
        }
      }
      await setUserDepartment(id, workspaceId, teamId);
    }

    const updated = await getActorForWorkspace(id, workspaceId);
    res.json(updated ? mapActorForClient(updated) : null);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: remove a user from the workspace
router.delete('/users/:id', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;

    const actor = req.actor;
    if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can remove users' });
    }

    const workspaceId = actor.workspaceId;
    const target = await getActorForWorkspace(id, workspaceId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (target.id === actor.id) {
      return res.status(400).json({ error: 'You cannot remove your own account' });
    }

    // Workspace.ownerId is a required relation, so an owner can never be deleted.
    const ownedWorkspaces = await prisma.workspace.count({ where: { ownerId: target.id } });
    if (ownedWorkspaces > 0) {
      return res.status(403).json({ error: 'The workspace owner cannot be removed' });
    }

    if (actor.role === 'ADMIN') {
      if (target.role !== 'MEMBER') {
        return res.status(403).json({ error: 'Department admins can only remove members' });
      }
      if (!actor.teamId || target.teamId !== actor.teamId) {
        return res.status(403).json({ error: 'Department admins can only remove users in their own department' });
      }
    }

    // Comments, attachments and activity logs point at the user through required
    // relations, so they cannot be detached without destroying history.
    const [commentCount, attachmentCount, activityCount] = await Promise.all([
      prisma.comment.count({ where: { authorId: target.id } }),
      prisma.attachment.count({ where: { uploadedById: target.id } }),
      prisma.activityLog.count({ where: { actorId: target.id } })
    ]);

    const blockers: string[] = [];
    if (commentCount > 0) blockers.push(`${commentCount} comment(s)`);
    if (attachmentCount > 0) blockers.push(`${attachmentCount} attachment(s)`);
    if (activityCount > 0) blockers.push(`${activityCount} activity log entr(ies)`);

    if (blockers.length > 0) {
      return res.status(409).json({
        error: `Cannot remove ${target.email}: ${blockers.join(' and ')} still reference this user. Delete that content first.`
      });
    }

    await prisma.$transaction([
      // Detach what the schema allows to be detached.
      prisma.task.updateMany({ where: { assigneeId: target.id }, data: { assigneeId: null } }),
      prisma.team.updateMany({ where: { leadId: target.id }, data: { leadId: null } }),
      // Invitation.invitedById is required, so hand the history to the acting admin.
      prisma.invitation.updateMany({ where: { invitedById: target.id }, data: { invitedById: actor.id } }),
      // Personal rows with no value once the user is gone.
      prisma.notification.deleteMany({ where: { userId: target.id } }),
      prisma.refreshToken.deleteMany({ where: { userId: target.id } }),
      prisma.user.delete({ where: { id: target.id } })
    ]);

    res.status(204).send();
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send an invitation email (creates an Invitation record in DB)
router.post('/invite', authenticate, async (req: any, res) => {
  try {
    const { email, name, role, departmentId } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const inviter = req.actor;

    if (inviter.role !== 'SUPER_ADMIN' && inviter.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can send invitations' });
    }

    const inviteRole = role || 'MEMBER';
    if (inviter.role === 'ADMIN' && inviteRole === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Department admins cannot invite Super Admins' });
    }

    const workspaceId = inviter.workspaceId;

    // Department admins can only invite into their own department.
    let teamId = departmentId || null;
    if (inviter.role === 'ADMIN') {
      teamId = inviter.teamId;
      if (!teamId) {
        return res.status(400).json({ error: 'Department admin has no department assigned' });
      }
    }

    if (teamId) {
      const team = await prisma.team.findFirst({
        where: { id: teamId, workspaceId }
      });
      if (!team) {
        return res.status(400).json({ error: 'Invalid department for this workspace' });
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser?.isVerified) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const existingInvite = await prisma.invitation.findFirst({
      where: {
        email,
        workspaceId,
        status: 'pending'
      }
    });
    if (existingInvite) {
      return res.status(400).json({ error: 'A pending invitation already exists for this email' });
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        name,
        role: inviteRole,
        status: 'pending',
        workspaceId,
        teamId,
        invitedById: inviter.id,
        expiresAt
      }
    });

    const inviteToken = jwt.sign(
      { invitationId: invitation.id, email: invitation.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = process.env.FRONTEND_URL || `${protocol}://${host}`;
    const inviteUrl = `${baseUrl}/#/signup?email=${encodeURIComponent(email)}&token=${inviteToken}`;

    let emailResult: { isSmtpConfigured: boolean; previewUrl: string | null } = {
      isSmtpConfigured: false,
      previewUrl: null
    };

    try {
      emailResult = await sendInvitationEmail(email, inviteUrl);
    } catch (emailError) {
      console.error('Email send failed (invite still created):', emailError);
    }

    res.json({
      message: emailResult.isSmtpConfigured
        ? 'Invitation sent successfully to email'
        : 'Invitation created successfully',
      previewUrl: emailResult.previewUrl,
      inviteUrl,
      invitationId: invitation.id
    });
  } catch (error) {
    console.error('Invite handler error:', error);
    res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
});

// Admin: regenerate a copyable invite link for a pending invitation
router.post('/invitations/:id/link', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const actor = req.actor;
    if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can copy invitation links' });
    }

    const invitation = await prisma.invitation.findUnique({ where: { id } });
    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending invitations have a link' });
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' }
      });
      return res.status(400).json({ error: 'Invitation expired' });
    }

    const workspaceId = actor.workspaceId;
    if (invitation.workspaceId !== workspaceId) {
      return res.status(403).json({ error: 'Not allowed to access this invitation' });
    }
    if (actor.role === 'ADMIN' && invitation.teamId !== actor.teamId) {
      return res.status(403).json({ error: 'Not allowed to access this invitation' });
    }

    const remainingMs = invitation.expiresAt.getTime() - Date.now();
    const expiresInSeconds = Math.max(60, Math.floor(remainingMs / 1000));

    const inviteToken = jwt.sign(
      { invitationId: invitation.id, email: invitation.email },
      JWT_SECRET,
      { expiresIn: expiresInSeconds }
    );

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = process.env.FRONTEND_URL || `${protocol}://${host}`;
    const inviteUrl = `${baseUrl}/#/signup?email=${encodeURIComponent(invitation.email)}&token=${inviteToken}`;

    res.json({ inviteUrl, invitationId: invitation.id });
  } catch (error) {
    console.error('Invitation link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: list invitations for the inviter's workspace (pending + accepted + declined)
router.get('/invitations/pending', authenticate, async (req: any, res) => {
  try {
    const inviter = req.actor;
    const workspaceId = inviter.workspaceId;

    const where: any = { workspaceId };

    // Department admins only see invites for their department.
    if (inviter.role === 'ADMIN' && inviter.teamId) {
      where.teamId = inviter.teamId;
    }

    const invitations = await prisma.invitation.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(
      invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        name: inv.name || '',
        role: inv.role,
        departmentId: inv.teamId || undefined,
        status: inv.status,
        invitedBy: inv.invitedById,
        createdAt: inv.createdAt.toISOString()
      }))
    );
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invitee: accept invitation using token
router.post('/invitations/accept', async (req: any, res) => {
  try {
    const { token, password, name } = req.body;
    if (!token) return res.status(400).json({ error: 'Missing token' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const invitationId: string | undefined = decoded?.invitationId;
    if (!invitationId) return res.status(400).json({ error: 'Invalid token' });

    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation) return res.status(400).json({ error: 'Invitation not found' });
    if (invitation.status !== 'pending') return res.status(400).json({ error: `Invitation is ${invitation.status}` });
    if (invitation.expiresAt.getTime() < Date.now()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' }
      });
      return res.status(400).json({ error: 'Invitation expired' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const finalName = name || invitation.name || invitation.email.split('@')[0];

    // Create new user if needed; otherwise upgrade existing pending/unverified user.
    let user = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: invitation.email,
          name: finalName,
          passwordHash,
          isVerified: true
        }
      });
    } else if (user.isVerified) {
      return res.status(400).json({ error: 'User already exists. Please sign in instead.' });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: finalName,
          passwordHash,
          isVerified: true
        }
      });
    }

    await addWorkspaceMember(user.id, invitation.workspaceId, invitation.role);
    if (invitation.teamId) {
      await setUserDepartment(user.id, invitation.workspaceId, invitation.teamId);
    }

    await syncWorkspaceChannelMembers(invitation.workspaceId);
    if (invitation.teamId) {
      await ensureDepartmentChannel(invitation.teamId);
    }

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date()
      }
    });

    const sessionToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const clientUser = await mapUserForClient(user.id);
    res.status(201).json({ user: clientUser, token: sessionToken });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(401).json({ error: 'Invalid or expired invitation token' });
  }
});

// Admin: decline/revoke an invitation
router.post('/invitations/:id/decline', authenticate, async (req: any, res) => {
  try {
    const { id } = req.params;
    const inviter = req.actor;

    const invitation = await prisma.invitation.findUnique({ where: { id } });
    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending invitations can be revoked' });
    }

    const workspaceId = inviter.workspaceId;
    if (invitation.workspaceId !== workspaceId) {
      return res.status(403).json({ error: 'Not allowed to revoke this invitation' });
    }

    if (inviter.role === 'ADMIN' && invitation.teamId !== inviter.teamId) {
      return res.status(403).json({ error: 'Not allowed to revoke this invitation' });
    }

    await prisma.invitation.update({
      where: { id },
      data: { status: 'declined' }
    });
    res.json({ message: 'Invitation revoked' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
