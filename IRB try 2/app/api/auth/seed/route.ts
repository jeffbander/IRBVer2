import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    // Create default roles
    const roles = await Promise.all([
      prisma.role.upsert({
        where: { name: 'admin' },
        update: {},
        create: {
          name: 'admin',
          description: 'System administrator with full access',
          permissions: JSON.stringify([
            'manage_users',
            'manage_roles',
            'view_studies',
            'view_all_studies',
            'create_studies',
            'edit_own_studies',
            'approve_studies',
            'edit_all_studies',
            'delete_studies',
            'view_audit_logs',
            'manage_system_settings',
            'manage_participants',
            'view_documents',
            'review_studies',
          ]),
        },
      }),
      prisma.role.upsert({
        where: { name: 'reviewer' },
        update: {},
        create: {
          name: 'reviewer',
          description: 'IRB reviewer who can review and approve studies',
          permissions: JSON.stringify([
            'view_all_studies',
            'review_studies',
            'approve_studies',
            'request_changes',
            'view_documents',
            'add_review_comments',
          ]),
        },
      }),
      prisma.role.upsert({
        where: { name: 'researcher' },
        update: {},
        create: {
          name: 'researcher',
          description: 'Principal investigator or research team member',
          permissions: JSON.stringify([
            'view_studies',
            'create_studies',
            'edit_own_studies',
            'manage_participants',
            'upload_documents',
            'submit_for_review',
            'view_own_audit_logs',
          ]),
        },
      }),
      prisma.role.upsert({
        where: { name: 'coordinator' },
        update: {},
        create: {
          name: 'coordinator',
          description: 'Study coordinator who manages participant enrollment',
          permissions: JSON.stringify([
            'view_studies',
            'manage_participants',
            'enroll_participants',
            'upload_consent_forms',
            'view_documents',
            'update_enrollment_status',
          ]),
        },
      }),
    ]);

    // Create default admin user
    const adminRole = roles.find(r => r.name === 'admin');
    if (adminRole) {
      const hashedPassword = await hashPassword('admin123');

      await prisma.user.upsert({
        where: { email: 'admin@irb.local' },
        update: {},
        create: {
          email: 'admin@irb.local',
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Administrator',
          roleId: adminRole.id,
        },
      });
    }

    return NextResponse.json({
      message: 'Seed data created successfully',
      roles: roles.map(r => ({ id: r.id, name: r.name })),
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database' },
      { status: 500 }
    );
  }
}