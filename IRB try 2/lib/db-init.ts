import { prisma } from './prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the database at runtime on Vercel
 * This is needed because Vercel's filesystem is read-only except for /tmp
 * The database created during build is not accessible at runtime
 */
export async function ensureDatabase(): Promise<void> {
  // If already initialized, return immediately
  if (isInitialized) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    return initPromise;
  }

  // Start initialization
  initPromise = (async () => {
    try {
      // Check if database exists and has tables
      try {
        await prisma.$queryRaw`SELECT 1 FROM Role LIMIT 1`;
        console.log('✅ Database already initialized');
        isInitialized = true;
        return;
      } catch (error) {
        console.log('📦 Database not found or empty, initializing...');
      }

      // Run migrations
      console.log('🔄 Running database migrations...');
      await execAsync('npx prisma migrate deploy');
      console.log('✅ Migrations complete');

      // Seed database
      console.log('🌱 Seeding database...');

      // Import seed logic directly
      const bcrypt = await import('bcryptjs');

      // Create roles
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

      // Create admin user
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

      console.log('✅ Database seeded successfully');
      console.log('👤 Admin user: admin@test.com / admin123');

      isInitialized = true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  })();

  return initPromise;
}
