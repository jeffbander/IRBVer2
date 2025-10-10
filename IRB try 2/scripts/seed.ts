import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'System Administrator',
      permissions: JSON.stringify([
        'view_studies',
        'create_studies',
        'edit_studies',
        'delete_studies',
        'edit_all_studies',
        'manage_participants',
        'manage_users',
        'upload_documents',
        'delete_documents',
        'view_audit_logs',
        'approve_studies',
        'review_studies',
      ]),
    },
  });

  const researcherRole = await prisma.role.upsert({
    where: { name: 'researcher' },
    update: {},
    create: {
      name: 'researcher',
      description: 'Researcher',
      permissions: JSON.stringify([
        'view_studies',
        'create_studies',
        'edit_own_studies',
        'manage_participants',
        'upload_documents',
      ]),
    },
  });

  const reviewerRole = await prisma.role.upsert({
    where: { name: 'reviewer' },
    update: {},
    create: {
      name: 'reviewer',
      description: 'IRB Reviewer',
      permissions: JSON.stringify([
        'view_studies',
        'review_studies',
        'view_documents',
      ]),
    },
  });

  const coordinatorRole = await prisma.role.upsert({
    where: { name: 'coordinator' },
    update: {},
    create: {
      name: 'coordinator',
      description: 'Study Coordinator',
      permissions: JSON.stringify([
        'view_studies',
        'manage_participants',
        'upload_documents',
      ]),
    },
  });

  console.log('✓ Roles created');

  // Create admin user
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      roleId: adminRole.id,
      active: true,
    },
  });

  console.log('✓ Admin user created: admin@example.com / admin123');

  // Create test researcher
  const researcherPassword = await hashPassword('researcher123');
  const researcher = await prisma.user.upsert({
    where: { email: 'researcher@example.com' },
    update: {},
    create: {
      email: 'researcher@example.com',
      password: researcherPassword,
      firstName: 'John',
      lastName: 'Researcher',
      roleId: researcherRole.id,
      active: true,
    },
  });

  console.log('✓ Researcher user created: researcher@example.com / researcher123');

  // Create PI user (same as researcher role)
  const piPassword = await hashPassword('password123');
  const pi = await prisma.user.upsert({
    where: { email: 'pi@example.com' },
    update: {},
    create: {
      email: 'pi@example.com',
      password: piPassword,
      firstName: 'Principal',
      lastName: 'Investigator',
      roleId: researcherRole.id,
      active: true,
    },
  });

  console.log('✓ PI user created: pi@example.com / password123');

  // Create reviewer user
  const reviewerPassword = await hashPassword('password123');
  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@example.com' },
    update: {},
    create: {
      email: 'reviewer@example.com',
      password: reviewerPassword,
      firstName: 'Jane',
      lastName: 'Reviewer',
      roleId: reviewerRole.id,
      active: true,
    },
  });

  console.log('✓ Reviewer user created: reviewer@example.com / password123');

  // Create regular user
  const userPassword = await hashPassword('password123');
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userPassword,
      firstName: 'Regular',
      lastName: 'User',
      roleId: coordinatorRole.id,
      active: true,
    },
  });

  console.log('✓ Regular user created: user@example.com / password123');

  console.log('\nDatabase seeded successfully!');
  console.log('\nLogin credentials:');
  console.log('  Admin: admin@example.com / admin123');
  console.log('  Researcher: researcher@example.com / researcher123');
  console.log('  PI: pi@example.com / password123');
  console.log('  Reviewer: reviewer@example.com / password123');
  console.log('  User: user@example.com / password123');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
