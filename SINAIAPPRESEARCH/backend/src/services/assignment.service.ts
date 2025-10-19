import { Prisma } from '@prisma/client';
import { prisma } from '../repositories/prismaClient';
import { CreateAssignmentInput, UpdateAssignmentInput } from '../types/assignment';
import { HttpError } from '../middleware/errorHandler';

const toNumber = (value: Prisma.Decimal | number | null | undefined) => {
  if (!value) return 0;
  if (value instanceof Prisma.Decimal) {
    return Number(value.toString());
  }
  return value;
};

const overlaps = (aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date | null) => {
  const endA = aEnd ?? new Date('9999-12-31');
  const endB = bEnd ?? new Date('9999-12-31');
  return aStart <= endB && bStart <= endA;
};

export const createAssignment = async (input: CreateAssignmentInput) => {
  return prisma.$transaction(async (tx) => {
    const study = await tx.study.findUnique({ where: { id: input.studyId } });
    if (!study) {
      throw new HttpError(404, 'Study not found');
    }

    const person = await tx.person.findUnique({ where: { id: input.personId } });
    if (!person) {
      throw new HttpError(404, 'Person not found');
    }

    const role = await tx.role.findUnique({ where: { id: input.roleId } });
    if (!role) {
      throw new HttpError(404, 'Role not found');
    }

    const startDate = new Date(input.startDate);
    const endDate = input.endDate ? new Date(input.endDate) : null;

    const existingAssignments = await tx.studyAssignment.findMany({
      where: { studyId: input.studyId, personId: input.personId },
    });

    const newEffort = input.effortPercent ?? 0;
    for (const assignment of existingAssignments) {
      if (overlaps(startDate, endDate, assignment.startDate, assignment.endDate)) {
        const existingEffort = toNumber(assignment.effortPercent);
        if (existingEffort + newEffort > 100) {
          throw new HttpError(400, 'Assignment exceeds 100% effort for overlapping dates');
        }
      }
    }

    return tx.studyAssignment.create({
      data: {
        studyId: input.studyId,
        personId: input.personId,
        roleId: input.roleId,
        effortPercent: input.effortPercent ?? null,
        hoursPerWeek: input.hoursPerWeek ?? null,
        startDate,
        endDate: endDate ?? null,
      },
      include: { person: true, role: true },
    });
  });
};

export const listAssignmentsForStudy = (studyId: string) => {
  return prisma.studyAssignment.findMany({
    where: { studyId },
    include: { person: true, role: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const getAssignmentById = (id: string) => {
  return prisma.studyAssignment.findUnique({
    where: { id },
    include: { person: true, role: true },
  });
};

export const updateAssignment = async (id: string, input: UpdateAssignmentInput) => {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.studyAssignment.findUnique({ where: { id } });
    if (!assignment) {
      throw new HttpError(404, 'Assignment not found');
    }

    const startDate = input.startDate ? new Date(input.startDate) : assignment.startDate;
    const endDate = input.endDate ? new Date(input.endDate) : assignment.endDate;

    const others = await tx.studyAssignment.findMany({
      where: {
        studyId: assignment.studyId,
        personId: assignment.personId,
        NOT: { id },
      },
    });

    const effort = input.effortPercent ?? toNumber(assignment.effortPercent);

    for (const other of others) {
      if (overlaps(startDate, endDate, other.startDate, other.endDate)) {
        const otherEffort = toNumber(other.effortPercent);
        if (otherEffort + effort > 100) {
          throw new HttpError(400, 'Assignment exceeds 100% effort for overlapping dates');
        }
      }
    }

    return tx.studyAssignment.update({
      where: { id },
      data: {
        startDate,
        endDate,
        effortPercent:
          input.effortPercent !== undefined ? input.effortPercent : assignment.effortPercent,
        hoursPerWeek:
          input.hoursPerWeek !== undefined ? input.hoursPerWeek : assignment.hoursPerWeek,
      },
      include: { person: true, role: true },
    });
  });
};

export const deleteAssignment = async (id: string) => {
  await prisma.studyAssignment.delete({ where: { id } });
};
