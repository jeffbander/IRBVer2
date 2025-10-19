import { Router } from 'express';
import {
  createAssignmentHandler,
  deleteAssignmentHandler,
  listAssignmentsHandler,
  updateAssignmentHandler,
} from '../controllers/assignment.controller';
import { authorize } from '../middleware/authorize';
import { Role } from '../types/auth';

export const assignmentsRouter = Router();

assignmentsRouter.get('/', listAssignmentsHandler);
assignmentsRouter.post(
  '/',
  authorize(Role.PI, Role.COORDINATOR, Role.REGULATORY, Role.DEPARTMENT_ADMIN),
  createAssignmentHandler,
);
assignmentsRouter.patch(
  '/:id',
  authorize(Role.PI, Role.COORDINATOR, Role.REGULATORY, Role.DEPARTMENT_ADMIN),
  updateAssignmentHandler,
);
assignmentsRouter.delete(
  '/:id',
  authorize(Role.PI, Role.COORDINATOR, Role.REGULATORY, Role.DEPARTMENT_ADMIN),
  deleteAssignmentHandler,
);
