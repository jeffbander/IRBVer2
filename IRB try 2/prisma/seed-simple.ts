import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting simplified database seed...');

  // Create roles
  console.log('📝 Creating roles...');
  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'System Administrator',
      permissions: JSON.stringify({
        view_studies: true,
        create_studies: true,
        edit_studies: true,
        delete_studies: true,
        approve_studies: true,
        review_studies: true,
        manage_participants: true,
        enroll_participants: true,
        view_documents: true,
        manage_documents: true,
        upload_documents: true,
        delete_documents: true,
        manage_users: true,
        manage_coordinators: true,
        view_audit_logs: true,
      }),
    },
  });

  const piRole = await prisma.role.create({
    data: {
      name: 'principal_investigator',
      description: 'Principal Investigator',
      permissions: JSON.stringify({
        view_studies: true,
        create_studies: true,
        edit_studies: true,
        manage_participants: true,
        enroll_participants: true,
        view_documents: true,
        upload_documents: true,
        manage_documents: true,
      }),
    },
  });

  console.log('✅ Created 2 roles');

  // Create users
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.create({
    data: {
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      roleId: adminRole.id,
      approved: true,
    },
  });

  await prisma.user.create({
    data: {
      email: 'pi@test.com',
      firstName: 'Principal',
      lastName: 'Investigator',
      password: hashedPassword,
      roleId: piRole.id,
      approved: true,
    },
  });

  console.log('✅ Created 2 users');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n👤 Test Login Credentials:');
  console.log('  Email: admin@test.com');
  console.log('  Password: admin123\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
