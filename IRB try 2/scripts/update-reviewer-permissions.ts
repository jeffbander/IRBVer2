import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateReviewerPermissions() {
  console.log('Updating reviewer role permissions...');

  const reviewerRole = await prisma.role.findUnique({
    where: { name: 'reviewer' },
  });

  if (reviewerRole) {
    await prisma.role.update({
      where: { name: 'reviewer' },
      data: {
        permissions: JSON.stringify([
          'view_studies',
          'review_studies',
          'approve_studies',
          'view_documents',
        ]),
      },
    });
    console.log('✓ Reviewer role updated with approve_studies permission');
  } else {
    console.log('⚠️  Reviewer role not found');
  }

  console.log('\nReviewer role now has the following permissions:');
  const updatedRole = await prisma.role.findUnique({
    where: { name: 'reviewer' },
  });
  console.log(JSON.parse(updatedRole?.permissions as string || '[]'));
}

updateReviewerPermissions()
  .catch((e) => {
    console.error('Error updating reviewer permissions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
