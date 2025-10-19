import { TaskStatus } from '@prisma/client';
import { prisma } from '../repositories/prismaClient';
import { UpdateTaskStatusInput } from '../types/task';
import { HttpError } from '../middleware/errorHandler';

export const listTasksForStudy = (studyId: string) => {
  return prisma.task.findMany({
    where: { studyId },
    orderBy: { position: 'asc' },
  });
};

export const updateTaskStatus = async (input: UpdateTaskStatusInput) => {
  const task = await prisma.task.findUnique({ where: { id: input.taskId } });
  if (!task) {
    throw new HttpError(404, 'Task not found');
  }

  return prisma.task.update({
    where: { id: input.taskId },
    data: { status: input.status as TaskStatus },
  });
};

export const getTaskById = (taskId: string) => {
  return prisma.task.findUnique({ where: { id: taskId } });
};
