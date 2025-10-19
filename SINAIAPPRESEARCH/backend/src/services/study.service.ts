import { Prisma, StudyStatus, TaskStatus } from '@prisma/client';
import { prisma } from '../repositories/prismaClient';
import { CreateStudyInput, UpdateStudyInput } from '../types/study';
import { HttpError } from '../middleware/errorHandler';
import { daysFromNow } from '../utils/date';

const DEFAULT_TASK_STATUS: TaskStatus = 'PENDING';

type TemplateTask = {
  title: string;
  role?: string;
  offset_days?: number;
  description?: string;
};

const toTemplateTasks = (payload: unknown): TemplateTask[] => {
  if (!payload || !Array.isArray(payload)) {
    return [];
  }
  return payload
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const data = entry as Record<string, unknown>;
      return {
        title: typeof data.title === 'string' ? data.title : 'Task',
        role: typeof data.role === 'string' ? data.role : undefined,
        offset_days: typeof data.offset_days === 'number' ? data.offset_days : 0,
        description: typeof data.description === 'string' ? data.description : undefined,
      };
    })
    .filter(Boolean) as TemplateTask[];
};

const includeStudyRelations = {
  type: true,
  principalInvestigator: true,
  assignments: { include: { person: true, role: true } },
  tasks: true,
  budget: { include: { lines: true } },
  irbSubmission: { include: { statusHistory: { orderBy: { createdAt: 'asc' } } } },
  documents: true,
  sites: true,
} satisfies Prisma.StudyInclude;

export const createStudy = async (input: CreateStudyInput) => {
  return prisma.$transaction(async (tx) => {
    const studyType = await tx.studyType.findUnique({
      where: { id: input.typeId },
      include: { defaultTaskTemplate: true },
    });
    if (!studyType) {
      throw new HttpError(404, 'Study type not found');
    }

    const pi = await tx.person.findUnique({ where: { id: input.piId } });
    if (!pi) {
      throw new HttpError(404, 'Principal investigator not found');
    }

  const study = await tx.study.create({
    data: {
      title: input.title,
      shortTitle: input.shortTitle ?? null,
      typeId: input.typeId,
      riskLevel: input.riskLevel,
      piId: input.piId,
      sponsorName: input.sponsorName ?? null,
      isMultiSite: input.sites.length > 1,
    },
  });

    if (input.sites.length) {
      await tx.studySite.createMany({
        data: input.sites.map((site) => ({
          studyId: study.id,
          name: site.name,
          isInternal: site.isInternal,
        })),
      });
    }

    await tx.iRBSubmission.create({
      data: {
        studyId: study.id,
      },
    });

    if (studyType.defaultTaskTemplate) {
      const tasks = toTemplateTasks(studyType.defaultTaskTemplate.tasks as unknown);
      if (tasks.length) {
        await tx.task.createMany({
          data: tasks.map((task, index) => ({
            studyId: study.id,
            title: task.title,
            description: task.description ?? null,
            status: DEFAULT_TASK_STATUS,
            roleId: task.role ?? null,
            dueAt: daysFromNow(task.offset_days ?? 0),
            position: index,
          })),
        });
      }
    }

    return tx.study.findUniqueOrThrow({ where: { id: study.id }, include: includeStudyRelations });
  });
};

export const listStudies = async (params: { piId?: string; status?: string; search?: string }) => {
  const { piId, status, search } = params;
  const statusFilter = status && Object.values(StudyStatus).includes(status as StudyStatus)
    ? (status as StudyStatus)
    : undefined;
  return prisma.study.findMany({
    where: {
      deletedAt: null,
      ...(piId ? { piId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { sponsorName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: includeStudyRelations,
    orderBy: { createdAt: 'desc' },
  });
};

export const getStudyById = async (id: string) => {
  const study = await prisma.study.findUnique({ where: { id }, include: includeStudyRelations });
  if (!study || study.deletedAt) {
    throw new HttpError(404, 'Study not found');
  }
  return study;
};

export const updateStudy = async (id: string, input: UpdateStudyInput) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.study.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new HttpError(404, 'Study not found');
    }

    if (input.typeId) {
      const typeExists = await tx.studyType.findUnique({ where: { id: input.typeId } });
      if (!typeExists) {
        throw new HttpError(404, 'Study type not found');
      }
    }

    if (input.piId) {
      const piExists = await tx.person.findUnique({ where: { id: input.piId } });
      if (!piExists) {
        throw new HttpError(404, 'Principal investigator not found');
      }
    }

    const updated = await tx.study.update({
      where: { id },
      data: {
        title: input.title ?? existing.title,
        shortTitle:
          input.shortTitle !== undefined ? input.shortTitle ?? null : existing.shortTitle,
        typeId: input.typeId ?? existing.typeId,
        riskLevel: input.riskLevel ?? existing.riskLevel,
        piId: input.piId ?? existing.piId,
        sponsorName:
          input.sponsorName !== undefined ? input.sponsorName ?? null : existing.sponsorName,
        isMultiSite: input.sites ? input.sites.length > 1 : existing.isMultiSite,
      },
      include: includeStudyRelations,
    });

    if (input.sites) {
      await tx.studySite.deleteMany({ where: { studyId: id } });
      if (input.sites.length) {
        await tx.studySite.createMany({
          data: input.sites.map((site) => ({
            studyId: id,
            name: site.name,
            isInternal: site.isInternal,
          })),
        });
      }
    }

    return updated;
  });
};

export const softDeleteStudy = async (id: string) => {
  await prisma.study.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      status: 'CLOSED',
    },
  });
};
