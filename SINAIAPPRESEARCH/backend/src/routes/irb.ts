import { Router } from 'express';
import {
  ensureSubmissionHandler,
  getSubmissionHandler,
  transitionStatusHandler,
  updatePathHandler,
} from '../controllers/irb.controller';
import { authorize } from '../middleware/authorize';
import { Role } from '../types/auth';

export const irbRouter = Router();

irbRouter.post(
  '/submission',
  authorize(Role.PI, Role.COORDINATOR, Role.REGULATORY),
  ensureSubmissionHandler,
);
irbRouter.post(
  '/transition',
  authorize(Role.REGULATORY, Role.IRB_LIAISON, Role.PI),
  transitionStatusHandler,
);
irbRouter.get('/:studyId', getSubmissionHandler);
irbRouter.patch(
  '/:studyId/path',
  authorize(Role.REGULATORY, Role.IRB_LIAISON),
  updatePathHandler,
);
