import { Router } from 'express';
import { authorize } from '../middleware/authorize';
import { Role } from '../types/auth';
import { listPeopleHandler, listRolesHandler, listStudyTypesHandler } from '../controllers/meta.controller';

export const metaRouter = Router();

metaRouter.get('/study-types', authorize(), listStudyTypesHandler);
metaRouter.get('/people', authorize(Role.PI, Role.COORDINATOR, Role.REGULATORY, Role.DEPARTMENT_ADMIN, Role.FINANCE), listPeopleHandler);
metaRouter.get('/roles', authorize(), listRolesHandler);
