import { Router } from 'express';
import { listTasksHandler, updateTaskStatusHandler } from '../controllers/task.controller';
import { authorize } from '../middleware/authorize';
import { Role } from '../types/auth';

export const tasksRouter = Router();

tasksRouter.get('/', listTasksHandler);
tasksRouter.patch(
  '/:taskId',
  authorize(Role.PI, Role.COORDINATOR, Role.REGULATORY),
  updateTaskStatusHandler,
);
