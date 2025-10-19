import { Router } from 'express';
import { studiesRouter } from './studies';
import { assignmentsRouter } from './assignments';
import { budgetsRouter } from './budgets';
import { irbRouter } from './irb';
import { tasksRouter } from './tasks';
import { metaRouter } from './meta';

export const router = Router();

router.use('/studies', studiesRouter);
router.use('/assignments', assignmentsRouter);
router.use('/budgets', budgetsRouter);
router.use('/irb', irbRouter);
router.use('/tasks', tasksRouter);
router.use('/meta', metaRouter);
