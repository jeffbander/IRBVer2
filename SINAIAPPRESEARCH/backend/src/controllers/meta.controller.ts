import { asyncHandler } from '../middleware/asyncHandler';
import { listPeople, listRoles, listStudyTypes } from '../services/meta.service';
import type { Request, Response } from 'express';

export const listStudyTypesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const studyTypes = await listStudyTypes();
  res.json(studyTypes);
});

export const listPeopleHandler = asyncHandler(async (_req: Request, res: Response) => {
  const people = await listPeople();
  res.json(
    people.map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email,
      roles: person.roles.map((entry) => entry.roleId),
    })),
  );
});

export const listRolesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await listRoles();
  res.json(roles);
});
