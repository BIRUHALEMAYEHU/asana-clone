import { prisma } from './index';
import type { Actor } from './membership';
import { getProjectMembership, isUserInWorkspace } from './membership';

const GENERAL_CHANNEL_NAME = 'general';

export const dmPairKey = (userIdA: string, userIdB: string) =>
  [userIdA, userIdB].sort().join(':');

export const ensureWorkspaceChannel = async (workspaceId: string) => {
  let channel = await prisma.channel.findFirst({
    where: { workspaceId, type: 'WORKSPACE', isDefault: true }
  });
  if (!channel) {
    channel = await prisma.channel.create({
      data: {
        workspaceId,
        type: 'WORKSPACE',
        name: GENERAL_CHANNEL_NAME,
        isDefault: true
      }
    });
  }
  await syncWorkspaceChannelMembers(workspaceId, channel.id);
  return channel;
};

export const syncWorkspaceChannelMembers = async (workspaceId: string, channelId?: string) => {
  const channel =
    channelId
      ? await prisma.channel.findUnique({ where: { id: channelId } })
      : await ensureWorkspaceChannel(workspaceId);
  if (!channel) return;

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId, status: 'ACTIVE' },
    select: { userId: true }
  });

  for (const { userId } of members) {
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: channel.id, userId } },
      create: { channelId: channel.id, userId, source: 'AUTO' },
      update: {}
    });
  }
};

export const ensureDepartmentChannel = async (teamId: string) => {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return null;

  let channel = await prisma.channel.findFirst({
    where: { workspaceId: team.workspaceId, type: 'DEPARTMENT', teamId }
  });
  if (!channel) {
    channel = await prisma.channel.create({
      data: {
        workspaceId: team.workspaceId,
        type: 'DEPARTMENT',
        name: team.name,
        teamId
      }
    });
  } else if (channel.name !== team.name) {
    channel = await prisma.channel.update({
      where: { id: channel.id },
      data: { name: team.name }
    });
  }
  await syncDepartmentChannelMembers(teamId, channel.id);
  return channel;
};

export const syncDepartmentChannelMembers = async (teamId: string, channelId?: string) => {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return;

  const channel = channelId
    ? await prisma.channel.findUnique({ where: { id: channelId } })
    : await ensureDepartmentChannel(teamId);
  if (!channel) return;

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true }
  });

  for (const { userId } of members) {
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: channel.id, userId } },
      create: { channelId: channel.id, userId, source: 'AUTO' },
      update: {}
    });
  }
};

export const ensureProjectChannel = async (projectId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  let channel = await prisma.channel.findFirst({
    where: { workspaceId: project.workspaceId, type: 'PROJECT', projectId }
  });
  if (!channel) {
    channel = await prisma.channel.create({
      data: {
        workspaceId: project.workspaceId,
        type: 'PROJECT',
        name: project.name,
        projectId
      }
    });
  } else if (channel.name !== project.name) {
    channel = await prisma.channel.update({
      where: { id: channel.id },
      data: { name: project.name }
    });
  }
  await syncProjectChannelMembers(projectId, channel.id);
  return channel;
};

export const syncProjectChannelMembers = async (projectId: string, channelId?: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return;

  const channel = channelId
    ? await prisma.channel.findUnique({ where: { id: channelId } })
    : await ensureProjectChannel(projectId);
  if (!channel) return;

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true }
  });

  for (const { userId } of members) {
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: channel.id, userId } },
      create: { channelId: channel.id, userId, source: 'AUTO' },
      update: {}
    });
  }
};

export const addChannelMemberByAdmin = async (channelId: string, userId: string, workspaceId: string) => {
  if (!(await isUserInWorkspace(userId, workspaceId))) {
    throw new Error('User must belong to this company');
  }
  return prisma.channelMember.upsert({
    where: { channelId_userId: { channelId, userId } },
    create: { channelId, userId, source: 'ADMIN' },
    update: { source: 'ADMIN' }
  });
};

export const isProjectAdminInWorkspace = async (userId: string, workspaceId: string) => {
  const count = await prisma.projectMember.count({
    where: {
      userId,
      role: 'ADMIN',
      project: { workspaceId }
    }
  });
  return count > 0;
};

/** Who the actor may start a restricted DM with. */
export const canStartDmWith = async (actor: Actor, targetUserId: string) => {
  if (actor.id === targetUserId) return false;
  if (!(await isUserInWorkspace(targetUserId, actor.workspaceId))) return false;

  if (actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN') return true;

  const targetMembership = await prisma.workspaceMember.findFirst({
    where: { userId: targetUserId, workspaceId: actor.workspaceId, status: 'ACTIVE' }
  });
  if (!targetMembership) return false;

  if (targetMembership.role === 'SUPER_ADMIN' || targetMembership.role === 'ADMIN') return true;

  const targetIsProjectAdmin = await isProjectAdminInWorkspace(targetUserId, actor.workspaceId);
  if (targetIsProjectAdmin) return true;

  return false;
};

export const getOrCreateDirectConversation = async (
  actor: Actor,
  targetUserId: string
) => {
  const allowed = await canStartDmWith(actor, targetUserId);
  if (!allowed) {
    throw new Error('You can only message admins or project admins in your company');
  }

  const pairKey = dmPairKey(actor.id, targetUserId);
  let conversation = await prisma.directConversation.findUnique({
    where: { workspaceId_pairKey: { workspaceId: actor.workspaceId, pairKey } }
  });

  if (!conversation) {
    conversation = await prisma.directConversation.create({
      data: {
        workspaceId: actor.workspaceId,
        pairKey,
        createdById: actor.id,
        participants: {
          create: [{ userId: actor.id }, { userId: targetUserId }]
        }
      }
    });
  } else {
    for (const userId of [actor.id, targetUserId]) {
      await prisma.directParticipant.upsert({
        where: {
          conversationId_userId: { conversationId: conversation.id, userId }
        },
        create: { conversationId: conversation.id, userId },
        update: {}
      });
    }
  }

  return conversation;
};

export const isChannelMember = async (channelId: string, userId: string) => {
  const row = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } }
  });
  return Boolean(row);
};

export const canManageChannelMembers = async (actor: Actor, channel: {
  id: string;
  workspaceId: string;
  type: string;
  teamId: string | null;
  projectId: string | null;
}) => {
  if (actor.workspaceId !== channel.workspaceId) return false;
  if (actor.role === 'SUPER_ADMIN') return true;
  if (channel.type === 'DEPARTMENT' && actor.role === 'ADMIN' && actor.teamId === channel.teamId) {
    return true;
  }
  if (channel.type === 'PROJECT' && channel.projectId) {
    const pm = await getProjectMembership(channel.projectId, actor.id);
    if (pm?.role === 'ADMIN') return true;
    if (actor.role === 'ADMIN' && actor.teamId) {
      const project = await prisma.project.findUnique({ where: { id: channel.projectId } });
      if (project?.teamId === actor.teamId) return true;
    }
  }
  return false;
};

export const mapMessageForClient = (msg: {
  id: string;
  body: string;
  authorId: string;
  createdAt: Date;
  editedAt: Date | null;
  author: { id: string; name: string | null; email: string; profilePic: string | null };
}) => ({
  id: msg.id,
  body: msg.body,
  authorId: msg.authorId,
  authorName: msg.author.name || msg.author.email,
  authorProfilePic: msg.author.profilePic || undefined,
  createdAt: msg.createdAt.toISOString(),
  editedAt: msg.editedAt?.toISOString()
});

export const authorSelect = { id: true, name: true, email: true, profilePic: true };

export const refreshActorChannels = async (actor: Actor) => {
  await ensureWorkspaceChannel(actor.workspaceId);

  const teamMemberships = await prisma.teamMember.findMany({
    where: { userId: actor.id, team: { workspaceId: actor.workspaceId } },
    select: { teamId: true }
  });
  for (const { teamId } of teamMemberships) {
    await ensureDepartmentChannel(teamId);
  }

  const projectMemberships = await prisma.projectMember.findMany({
    where: { userId: actor.id, project: { workspaceId: actor.workspaceId } },
    select: { projectId: true }
  });
  for (const { projectId } of projectMemberships) {
    await ensureProjectChannel(projectId);
  }

  if (actor.teamId) {
    await ensureDepartmentChannel(actor.teamId);
  }
};
