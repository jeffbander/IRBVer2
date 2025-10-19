import { Prisma } from '@prisma/client';
import { prisma } from '../repositories/prismaClient';
import { BudgetLineInput, UpsertBudgetInput } from '../types/budget';
import { HttpError } from '../middleware/errorHandler';

export const upsertBudget = async (input: UpsertBudgetInput) => {
  const study = await prisma.study.findUnique({ where: { id: input.studyId } });
  if (!study) {
    throw new HttpError(404, 'Study not found');
  }

  const updateData: Prisma.BudgetUncheckedUpdateInput = {};
  const createData: Prisma.BudgetUncheckedCreateInput = {
    studyId: input.studyId,
    currency: input.currency ?? 'USD',
  };

  if (input.currency) {
    updateData.currency = input.currency;
    createData.currency = input.currency;
  }
  if (input.totalDirect !== undefined) {
    updateData.totalDirect = input.totalDirect;
    createData.totalDirect = input.totalDirect;
  }
  if (input.totalIndirect !== undefined) {
    updateData.totalIndirect = input.totalIndirect;
    createData.totalIndirect = input.totalIndirect;
  }
  if (input.startDate) {
    const value = new Date(input.startDate);
    updateData.startDate = value;
    createData.startDate = value;
  }
  if (input.endDate) {
    const value = new Date(input.endDate);
    updateData.endDate = value;
    createData.endDate = value;
  }

  const budget = await prisma.budget.upsert({
    where: { studyId: input.studyId },
    update: updateData,
    create: createData,
    include: { lines: { include: { person: true } } },
  });

  return budget;
};

export const addBudgetLine = async (input: BudgetLineInput) => {
  const budget = await prisma.budget.findUnique({ where: { id: input.budgetId }, include: { study: true } });
  if (!budget) {
    throw new HttpError(404, 'Budget not found');
  }

  if (input.personId) {
    const person = await prisma.person.findUnique({ where: { id: input.personId } });
    if (!person) {
      throw new HttpError(404, 'Person not found for budget line');
    }
  }

  return prisma.budgetLine.create({
    data: {
      budgetId: input.budgetId,
      category: input.category,
      amount: input.amount,
      personId: input.personId ?? null,
      note: input.note ?? null,
    },
    include: { person: true },
  });
};

export const listBudgetLines = (budgetId: string) => {
  return prisma.budgetLine.findMany({
    where: { budgetId },
    include: { person: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const getBudgetByStudyId = (studyId: string) => {
  return prisma.budget.findUnique({
    where: { studyId },
    include: { lines: { include: { person: true } } },
  });
};
