import { Router } from 'express';
import {
  addBudgetLineHandler,
  listBudgetLinesHandler,
  upsertBudgetHandler,
} from '../controllers/budget.controller';
import { authorize } from '../middleware/authorize';
import { Role } from '../types/auth';

export const budgetsRouter = Router();

budgetsRouter.post('/', authorize(Role.FINANCE, Role.PI, Role.COORDINATOR), upsertBudgetHandler);
budgetsRouter.get('/lines', listBudgetLinesHandler);
budgetsRouter.post(
  '/lines',
  authorize(Role.FINANCE, Role.PI, Role.COORDINATOR),
  addBudgetLineHandler,
);
