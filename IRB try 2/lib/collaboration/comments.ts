import { prisma } from '@/lib/prisma';

export interface CreateCommentOptions {
  studyId: string;
  userId: string;
  section: string;
  content: string;
}

export interface ResolveCommentOptions {
  commentId: string;
  resolvedById: string;
}

/**
 * Create a protocol comment
 */
export async function createComment(options: CreateCommentOptions) {
  const { studyId, userId, section, content } = options;

  const comment = await prisma.protocolComment.create({
    data: {
      studyId,
      userId,
      section,
      content,
    },
  });

  return comment;
}

/**
 * Get all comments for a study
 */
export async function getComments(studyId: string, includeResolved: boolean = false) {
  const where: any = { studyId };

  if (!includeResolved) {
    where.resolved = false;
  }

  const comments = await prisma.protocolComment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return comments;
}

/**
 * Get comments for a specific section
 */
export async function getSectionComments(studyId: string, section: string) {
  const comments = await prisma.protocolComment.findMany({
    where: {
      studyId,
      section,
      resolved: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  return comments;
}

/**
 * Resolve a comment
 */
export async function resolveComment(options: ResolveCommentOptions) {
  const { commentId, resolvedById } = options;

  const comment = await prisma.protocolComment.update({
    where: { id: commentId },
    data: {
      resolved: true,
      resolvedById,
      resolvedAt: new Date(),
    },
  });

  return comment;
}

/**
 * Update active collaboration session
 */
export async function updateCollaborationSession(studyId: string, activeUsers: string[]) {
  const session = await prisma.collaborationSession.upsert({
    where: { studyId },
    update: {
      activeUsers: JSON.stringify(activeUsers),
      lastActivity: new Date(),
    },
    create: {
      studyId,
      activeUsers: JSON.stringify(activeUsers),
    },
  });

  return session;
}

/**
 * Get active collaboration session
 */
export async function getCollaborationSession(studyId: string) {
  const session = await prisma.collaborationSession.findUnique({
    where: { studyId },
  });

  if (!session) {
    return null;
  }

  return {
    ...session,
    activeUsers: JSON.parse(session.activeUsers),
  };
}

/**
 * Remove user from collaboration session
 */
export async function removeUserFromSession(studyId: string, userId: string) {
  const session = await getCollaborationSession(studyId);

  if (!session) {
    return null;
  }

  const updatedUsers = session.activeUsers.filter((id: string) => id !== userId);

  return await updateCollaborationSession(studyId, updatedUsers);
}
