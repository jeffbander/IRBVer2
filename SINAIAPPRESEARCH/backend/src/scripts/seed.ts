import { prisma } from '../repositories/prismaClient';
import { logger } from '../utils/logger';
import { roles, people, taskTemplates, studyTypes } from './seedData';
import { createStudy } from '../services/study.service';

const seedRoles = async () => {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: { name: role.name },
      create: { id: role.id, name: role.name },
    });
  }
};

const seedTaskTemplates = async () => {
  for (const template of taskTemplates) {
    await prisma.taskTemplate.upsert({
      where: { id: template.id },
      update: { name: template.name, tasks: template.tasks },
      create: { id: template.id, name: template.name, tasks: template.tasks },
    });
  }
};

const seedStudyTypes = async () => {
  for (const type of studyTypes) {
    await prisma.studyType.upsert({
      where: { id: type.id },
      update: {
        name: type.name,
        description: type.description,
        regulatedFields: type.regulatedFields,
        defaultTaskTemplateId: type.defaultTaskTemplateId,
      },
      create: {
        id: type.id,
        name: type.name,
        description: type.description,
        regulatedFields: type.regulatedFields,
        defaultTaskTemplateId: type.defaultTaskTemplateId,
      },
    });
  }
};

const seedPeople = async () => {
  for (const person of people) {
    await prisma.person.upsert({
      where: { id: person.id },
      update: {
        name: person.name,
        email: person.email,
      },
      create: {
        id: person.id,
        name: person.name,
        email: person.email,
      },
    });

    await prisma.personRole.deleteMany({ where: { personId: person.id } });
    if (person.roleIds?.length) {
      await prisma.personRole.createMany({
        data: person.roleIds.map((roleId) => ({ personId: person.id, roleId })),
      });
    }
  }
};

const seedExampleStudy = async () => {
  const existing = await prisma.study.findFirst({ where: { title: 'Omega-3 in Mild Cognitive Impairment' } });
  if (existing) {
    return;
  }

  await createStudy({
    title: 'Omega-3 in Mild Cognitive Impairment',
    shortTitle: 'Omega-3 MCI',
    typeId: 'drug_ind',
    riskLevel: 'MORE_THAN_MINIMAL',
    piId: 'u_pi_lee',
    sponsorName: 'Acme Pharma',
    sites: [
      { name: 'Main Hospital Campus', isInternal: true },
      { name: 'Mercy Hospital', isInternal: false },
    ],
  });
};

async function main() {
  logger.info('Seeding database...');
  await seedRoles();
  await seedTaskTemplates();
  await seedStudyTypes();
  await seedPeople();
  await seedExampleStudy();
  logger.info('Seeding complete');
}

main()
  .catch((error) => {
    logger.error('Seed failed', { error });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
