import { prisma } from '@/lib/prisma';

/**
 * Permission checking utilities for role-based access control
 */

/**
 * Helper function to check if a permission exists in user's permissions
 * Handles both object format {permission: true} and array format [permission, ...]
 */
function hasPermission(permissions: any, permission: string): boolean {
  if (!permissions) return false;

  // Handle object format (e.g., {view_studies: true})
  if (typeof permissions === 'object' && !Array.isArray(permissions)) {
    return permissions[permission] === true;
  }

  // Handle array format (legacy)
  if (Array.isArray(permissions)) {
    return permissions.includes(permission);
  }

  return false;
}

/**
 * Check if a user can view a specific study
 * - Admin: can view all studies
 * - Reviewer: can view studies assigned to them
 * - Researcher: can view studies where they are PI
 * - Coordinator: can view studies they are assigned to
 */
export async function canViewStudy(userId: string, studyId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.active || !user.approved) {
      return false;
    }

    // Admin can view all studies
    if (user.role.name === 'admin') {
      return true;
    }

    const study = await prisma.study.findUnique({
      where: { id: studyId },
      include: {
        studyCoordinators: {
          where: { coordinatorId: userId, active: true },
        },
      },
    });

    if (!study) {
      return false;
    }

    // PI can view their own studies
    if (study.principalInvestigatorId === userId) {
      return true;
    }

    // Reviewer can view studies assigned to them
    if (user.role.name === 'reviewer' && study.reviewerId === userId) {
      return true;
    }

    // Coordinator can view studies they are assigned to
    if (user.role.name === 'coordinator' && study.studyCoordinators.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking view study permission:', error);
    return false;
  }
}

/**
 * Check if a user can edit a specific study
 * - Admin: can edit all studies
 * - Researcher/PI: can edit their own studies (not in APPROVED or ACTIVE status)
 * - Reviewer: cannot edit
 * - Coordinator: can edit assigned studies (limited fields)
 */
export async function canEditStudy(userId: string, studyId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.active || !user.approved) {
      return false;
    }

    // Admin can edit all studies
    if (user.role.name === 'admin') {
      return true;
    }

    const study = await prisma.study.findUnique({
      where: { id: studyId },
      include: {
        studyCoordinators: {
          where: { coordinatorId: userId, active: true },
        },
      },
    });

    if (!study) {
      return false;
    }

    // PI can edit their own studies (with some restrictions based on status)
    if (study.principalInvestigatorId === userId && user.role.name === 'researcher') {
      // Cannot edit APPROVED or ACTIVE studies without admin approval
      if (study.status === 'APPROVED' || study.status === 'ACTIVE') {
        return false;
      }
      return true;
    }

    // Coordinator can make limited edits to assigned studies
    if (user.role.name === 'coordinator' && study.studyCoordinators.length > 0) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking edit study permission:', error);
    return false;
  }
}

/**
 * Check if a user can view audit logs
 * - Admin: can view all audit logs
 * - Coordinator: can view logs for their assigned studies
 * - Researcher: can view logs for their own studies
 * - Reviewer: can view logs for studies assigned to them
 */
export async function canViewAuditLogs(
  userId: string,
  entity?: string,
  entityId?: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.active || !user.approved) {
      return false;
    }

    // Admin can view all audit logs
    if (user.role.name === 'admin') {
      return true;
    }

    // If checking for a specific entity
    if (entity === 'Study' && entityId) {
      const study = await prisma.study.findUnique({
        where: { id: entityId },
        include: {
          studyCoordinators: {
            where: { coordinatorId: userId, active: true },
          },
        },
      });

      if (!study) {
        return false;
      }

      // PI can view logs for their studies
      if (study.principalInvestigatorId === userId) {
        return true;
      }

      // Reviewer can view logs for assigned studies
      if (user.role.name === 'reviewer' && study.reviewerId === userId) {
        return true;
      }

      // Coordinator can view logs for assigned studies
      if (user.role.name === 'coordinator' && study.studyCoordinators.length > 0) {
        return true;
      }
    }

    // For general audit log access (no specific entity)
    if (!entity && !entityId) {
      // Researchers, reviewers, and coordinators can view logs related to their work
      if (['researcher', 'reviewer', 'coordinator'].includes(user.role.name)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking audit log permission:', error);
    return false;
  }
}

/**
 * Check if a user can delete a study
 * - Admin: can delete any study
 * - PI: can delete their own DRAFT studies only
 */
export async function canDeleteStudy(userId: string, studyId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.active || !user.approved) {
      return false;
    }

    // Admin can delete any study
    if (user.role.name === 'admin') {
      return true;
    }

    const study = await prisma.study.findUnique({
      where: { id: studyId },
    });

    if (!study) {
      return false;
    }

    // PI can only delete their own DRAFT studies
    if (study.principalInvestigatorId === userId && study.status === 'DRAFT') {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking delete study permission:', error);
    return false;
  }
}

/**
 * Check if a user can manage coordinators for a study
 * - Admin: can manage coordinators for all studies
 * - PI/Researcher: can manage coordinators for their own studies
 * - Others: cannot manage coordinators
 */
export async function canManageCoordinators(
  userId: string,
  studyId: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.active || !user.approved) {
      return false;
    }

    const permissions = user.role.permissions;

    // Admins can manage all coordinators
    if (hasPermission(permissions, 'manage_users') || user.role.name === 'admin') {
      return true;
    }

    // Principal Investigator can manage their study's coordinators
    const study = await prisma.study.findUnique({
      where: { id: studyId },
    });

    if (!study) {
      return false;
    }

    return study.principalInvestigatorId === userId;
  } catch (error) {
    console.error('Error checking manage coordinators permission:', error);
    return false;
  }
}

/**
 * Check if a user can enroll patients in a specific study
 * - Admin: can enroll in any study
 * - PI/Researcher: can enroll in their own studies
 * - Coordinator: can enroll ONLY in assigned studies
 */
export async function canEnrollPatient(
  userId: string,
  studyId: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !user.active || !user.approved) {
      return false;
    }

    const permissions = user.role.permissions;

    // Must have enroll_participants permission
    if (!hasPermission(permissions, 'enroll_participants')) {
      return false;
    }

    // Admins can enroll in any study
    if (user.role.name === 'admin') {
      return true;
    }

    const study = await prisma.study.findUnique({
      where: { id: studyId },
      include: {
        studyCoordinators: {
          where: { coordinatorId: userId, active: true },
        },
      },
    });

    if (!study) {
      return false;
    }

    // PI/Researcher can enroll in their own studies
    if (study.principalInvestigatorId === userId) {
      return true;
    }

    // Coordinator must be assigned to the study
    if (user.role.name === 'coordinator') {
      return study.studyCoordinators.length > 0;
    }

    return false;
  } catch (error) {
    console.error('Error checking enroll patient permission:', error);
    return false;
  }
}
