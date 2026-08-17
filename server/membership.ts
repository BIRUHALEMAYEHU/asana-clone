import { prisma } from './index';

export type Actor = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  workspaceId: string;
  teamId: string | null;
  isVerified: boolean;
  profilePic: string | null;
  position: string | null;
  birthday: string | null;
  bankAccount: string | null;
  dateJoined: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const profileFromUser = (user: any, role: string, workspaceId: string, teamId: string | null): Actor => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role,
  workspaceId,
  teamId,
  isVerified: user.isVerified,
  profilePic: user.profilePic,
  position: user.position,
  birthday: user.birthday,
  bankAccount: user.bankAccount,
  dateJoined: user.dateJoined,
  bio: user.bio,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const mapActorForClient = (actor: Actor) => ({
  id: actor.id,
  email: actor.email,
  name: actor.name,
  role: actor.role,
  isVerified: actor.isVerified,
  profilePic: actor.profilePic,
  position: actor.position,
  birthday: actor.birthday,
  bankAccount: actor.bankAccount,
  dateJoined: actor.dateJoined,
  bio: actor.bio,
  workspaceId: actor.workspaceId,
  departmentId: actor.teamId || undefined,
  createdAt: actor.createdAt,
  updatedAt: actor.updatedAt
});

const primaryTeamId = (
  teamMemberships: Array<{ teamId: string; role: string; team: { workspaceId: string } }>,
  workspaceId: string
) => {
  const inWorkspace = teamMemberships.filter(m => m.team.workspaceId === workspaceId);
  const lead = inWorkspace.find(m => m.role === 'LEAD');
  return (lead || inWorkspace[0])?.teamId || null;
};

export const getActor = async (userId: string): Promise<Actor | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } },
      teamMemberships: { include: { team: { select: { workspaceId: true } } } }
    }
  });
  if (!user) return null;
  const membership = user.memberships[0];
  if (!membership) return null;
  return profileFromUser(
    user,
    membership.role,
    membership.workspaceId,
    primaryTeamId(user.teamMemberships, membership.workspaceId)
  );
};

export const getActorForWorkspace = async (
  userId: string,
  workspaceId: string
): Promise<Actor | null> => {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId, status: 'ACTIVE' },
    include: {
      user: {
        include: {
          teamMemberships: { include: { team: { select: { workspaceId: true } } } }
        }
      }
    }
  });
  if (!membership) return null;
  return profileFromUser(
    membership.user,
    membership.role,
    membership.workspaceId,
    primaryTeamId(membership.user.teamMemberships, workspaceId)
  );
};

export const listWorkspaceActors = async (workspaceId: string): Promise<Actor[]> => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { workspaceId, status: 'ACTIVE' },
    include: {
      user: {
        include: {
          teamMemberships: { include: { team: { select: { workspaceId: true } } } }
        }
      }
    }
  });
  return memberships
    .filter(m => m.user.isVerified)
    .map(m =>
      profileFromUser(
        m.user,
        m.role,
        m.workspaceId,
        primaryTeamId(m.user.teamMemberships, workspaceId)
      )
    );
};

export const addWorkspaceMember = async (userId: string, workspaceId: string, role: string) => {
  return prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId } },
    create: { userId, workspaceId, role, status: 'ACTIVE' },
    update: { role, status: 'ACTIVE' }
  });
};

export const setUserDepartment = async (userId: string, workspaceId: string, teamId: string | null) => {
  const current = await prisma.teamMember.findMany({
    where: { userId, team: { workspaceId } }
  });
  const toRemove = current.filter(m => m.teamId !== teamId);
  if (toRemove.length > 0) {
    await prisma.teamMember.deleteMany({ where: { id: { in: toRemove.map(m => m.id) } } });
  }
  if (teamId) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId, role: 'MEMBER' },
      update: {}
    });
  }
};

export const ensureTeamLeadMembership = async (team: { id: string; leadId: string | null }) => {
  if (!team.leadId) return;
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: team.leadId } },
    create: { teamId: team.id, userId: team.leadId, role: 'LEAD' },
    update: { role: 'LEAD' }
  });
};

export const isUserInWorkspace = async (userId: string, workspaceId: string) => {
  const row = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId, status: 'ACTIVE' }
  });
  return Boolean(row);
};
