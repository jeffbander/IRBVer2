import { Router } from 'express';
import {
  createStudyHandler,
  deleteStudyHandler,
  getStudyHandler,
  listStudiesHandler,
  updateStudyHandler,
} from '../controllers/study.controller';
import { authorize } from '../middleware/authorize';
import { Role } from '../types/auth';

export const studiesRouter = Router();

studiesRouter.get('/', listStudiesHandler);
studiesRouter.post('/', authorize(Role.PI, Role.COORDINATOR, Role.REGULATORY), createStudyHandler);
studiesRouter.get('/:id', getStudyHandler);
studiesRouter.patch(
  '/:id',
  authorize(Role.PI, Role.COORDINATOR, Role.REGULATORY, Role.DEPARTMENT_ADMIN),
  updateStudyHandler,
);
studiesRouter.delete(
  '/:id',
  authorize(Role.PI, Role.COORDINATOR, Role.REGULATORY, Role.DEPARTMENT_ADMIN),
  deleteStudyHandler,
);
