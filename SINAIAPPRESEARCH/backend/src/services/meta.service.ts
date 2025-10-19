import { prisma } from '../repositories/prismaClient';

export const listStudyTypes = () => {
  return prisma.studyType.findMany({
    orderBy: { name: 'asc' },
  });
};

export const listPeople = () => {
  return prisma.person.findMany({
    orderBy: { name: 'asc' },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });
};

export const listRoles = () => {
  return prisma.role.findMany({ orderBy: { name: 'asc' } });
};
