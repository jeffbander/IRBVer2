import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating admin role permissions...');

  const adminRole = await prisma.role.findFirst({
    where: { name: 'admin' }
  });

  if (!adminRole) {
    console.log('❌ Admin role not found');
    return;
  }

  await prisma.role.update({
    where: { id: adminRole.id },
    data: {
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
      })
    }
  });

  console.log('✅ Admin role permissions updated successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
