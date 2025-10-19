import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { budgetLineSchema, upsertBudgetSchema } from '../types/budget';
import { addBudgetLine, getBudgetByStudyId, listBudgetLines, upsertBudget } from '../services/budget.service';
import { recordAuditEvent } from '../services/audit.service';

export const upsertBudgetHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = upsertBudgetSchema.parse(req.body);
  const before = await getBudgetByStudyId(parsed.studyId);
  const budget = await upsertBudget(parsed);
  const actorId = req.user?.id;
  await recordAuditEvent({
    action: before ? 'budget.update' : 'budget.create',
    entityType: 'Budget',
    entityId: budget.id,
    ...(actorId ? { actorId } : {}),
    before,
    after: budget,
    request: req,
  });
  res.json(budget);
});

export const addBudgetLineHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = budgetLineSchema.parse(req.body);
  const line = await addBudgetLine(parsed);
  const actorId = req.user?.id;
  await recordAuditEvent({
    action: 'budgetLine.create',
    entityType: 'BudgetLine',
    entityId: line.id,
    ...(actorId ? { actorId } : {}),
    before: null,
    after: line,
    request: req,
  });
  res.status(201).json(line);
});

export const listBudgetLinesHandler = asyncHandler(async (req: Request, res: Response) => {
  const { budgetId } = req.query;
  if (!budgetId || typeof budgetId !== 'string') {
    return res.status(400).json({ message: 'budgetId query param is required' });
  }
  const lines = await listBudgetLines(budgetId);
  res.json(lines);
});
