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

    // Create default users
    const adminRole = roles.find(r => r.name === 'admin');
    const reviewerRole = roles.find(r => r.name === 'reviewer');
    const researcherRole = roles.find(r => r.name === 'researcher');
    const coordinatorRole = roles.find(r => r.name === 'coordinator');

    const users = [];

    // Admin user
    if (adminRole) {
      const hashedPassword = await hashPassword('admin123');
      const admin = await prisma.user.upsert({
        where: { email: 'admin@irb.local' },
        update: {},
        create: {
          email: 'admin@irb.local',
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Administrator',
          roleId: adminRole.id,
          active: true,
          approved: true,
        },
      });
      users.push(admin);
    }

    // Reviewer user
    if (reviewerRole) {
      const hashedPassword = await hashPassword('reviewer123');
      const reviewer = await prisma.user.upsert({
        where: { email: 'reviewer@irb.local' },
        update: {
          firstName: 'Dr. Claude',
          lastName: 'Reviewer',
          password: hashedPassword,
        },
        create: {
          email: 'reviewer@irb.local',
          password: hashedPassword,
          firstName: 'Dr. Claude',
          lastName: 'Reviewer',
          roleId: reviewerRole.id,
          active: true,
          approved: true,
        },
      });
      users.push(reviewer);
    }

    // Researcher user
    if (researcherRole) {
      const hashedPassword = await hashPassword('researcher123');
      const researcher = await prisma.user.upsert({
        where: { email: 'researcher@irb.local' },
        update: {
          firstName: 'Dr. Claude',
          lastName: 'Researcher',
          password: hashedPassword,
        },
        create: {
          email: 'researcher@irb.local',
          password: hashedPassword,
          firstName: 'Dr. Claude',
          lastName: 'Researcher',
          roleId: researcherRole.id,
          active: true,
          approved: true,
        },
      });
      users.push(researcher);
    }

    // Coordinator user
    if (coordinatorRole) {
      const hashedPassword = await hashPassword('coordinator123');
      const coordinator = await prisma.user.upsert({
        where: { email: 'coordinator@irb.local' },
        update: {
          firstName: 'Claude',
          lastName: 'Coordinator',
          password: hashedPassword,
        },
        create: {
          email: 'coordinator@irb.local',
          password: hashedPassword,
          firstName: 'Claude',
          lastName: 'Coordinator',
          roleId: coordinatorRole.id,
          active: true,
          approved: true,
        },
      });
      users.push(coordinator);
    }

    // Create multiple test studies with different characteristics
    const researcher = users.find(u => u.email === 'researcher@irb.local');
    const reviewer = users.find(u => u.email === 'reviewer@irb.local');
    const admin = users.find(u => u.email === 'admin@irb.local');

    const studies = [];
    const participants = [];

    // Study 1: DRAFT - Digital Health Interventions (INTERVENTIONAL, MINIMAL risk)
    if (researcher) {
      const study1 = await prisma.study.upsert({
        where: { protocolNumber: 'PROTO-2025-001' },
        update: {},
        create: {
          title: 'Impact of Digital Health Interventions on Patient Outcomes',
          protocolNumber: 'PROTO-2025-001',
          principalInvestigatorId: researcher.id,
          reviewerId: reviewer?.id,
          status: 'DRAFT',
          type: 'INTERVENTIONAL',
          description: 'A randomized controlled trial to evaluate the effectiveness of a mobile health application in improving medication adherence and health outcomes for patients with chronic conditions.',
          riskLevel: 'MINIMAL',
          targetEnrollment: 100,
        },
      });
      studies.push(study1);

      // Add participant for Study 1
      const participant1 = await prisma.participant.upsert({
        where: { participantId: 'SUBJ-001' },
        update: {},
        create: {
          studyId: study1.id,
          participantId: 'SUBJ-001',
          subjectId: 'IRB-SUBJ-001',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: new Date('1985-06-15'),
          email: 'john.doe@example.com',
          phone: '555-0123',
          status: 'SCREENING',
        },
      });
      participants.push(participant1);

      // Study 2: PENDING_REVIEW - Cancer Immunotherapy (INTERVENTIONAL, HIGH risk)
      const study2 = await prisma.study.upsert({
        where: { protocolNumber: 'PROTO-2025-002' },
        update: {},
        create: {
          title: 'Novel CAR-T Cell Therapy for Advanced Melanoma',
          protocolNumber: 'PROTO-2025-002',
          principalInvestigatorId: researcher.id,
          reviewerId: reviewer?.id,
          status: 'PENDING_REVIEW',
          type: 'INTERVENTIONAL',
          description: 'Phase II clinical trial investigating the safety and efficacy of chimeric antigen receptor (CAR) T-cell therapy in patients with metastatic melanoma who have failed standard treatments.',
          riskLevel: 'HIGH',
          targetEnrollment: 45,
          startDate: new Date('2025-03-01'),
          endDate: new Date('2027-03-01'),
        },
      });
      studies.push(study2);

      // Add 2 participants for Study 2
      const participant2 = await prisma.participant.upsert({
        where: { participantId: 'SUBJ-002' },
        update: {},
        create: {
          studyId: study2.id,
          participantId: 'SUBJ-002',
          subjectId: 'IRB-SUBJ-002',
          firstName: 'Maria',
          lastName: 'Garcia',
          dateOfBirth: new Date('1972-11-22'),
          email: 'maria.garcia@example.com',
          phone: '555-0234',
          status: 'ENROLLED',
          consentDate: new Date('2025-01-10'),
          consentVersion: '2.1',
          enrollmentDate: new Date('2025-01-15'),
          groupAssignment: 'Treatment',
        },
      });
      participants.push(participant2);

      const participant3 = await prisma.participant.upsert({
        where: { participantId: 'SUBJ-003' },
        update: {},
        create: {
          studyId: study2.id,
          participantId: 'SUBJ-003',
          subjectId: 'IRB-SUBJ-003',
          firstName: 'Robert',
          lastName: 'Williams',
          dateOfBirth: new Date('1968-03-14'),
          email: 'robert.williams@example.com',
          phone: '555-0345',
          status: 'ACTIVE',
          consentDate: new Date('2025-01-12'),
          consentVersion: '2.1',
          enrollmentDate: new Date('2025-01-18'),
          groupAssignment: 'Treatment',
        },
      });
      participants.push(participant3);

      // Study 3: ACTIVE - Mental Health Survey (SURVEY, MINIMAL risk)
      const study3 = await prisma.study.upsert({
        where: { protocolNumber: 'PROTO-2025-003' },
        update: {},
        create: {
          title: 'Healthcare Worker Burnout and Mental Health Assessment',
          protocolNumber: 'PROTO-2025-003',
          principalInvestigatorId: admin?.id || researcher.id,
          reviewerId: reviewer?.id,
          status: 'ACTIVE',
          type: 'SURVEY',
          description: 'A longitudinal survey study examining burnout rates, mental health symptoms, and coping strategies among healthcare workers at Mount Sinai Health System during and after the pandemic.',
          riskLevel: 'MINIMAL',
          targetEnrollment: 500,
          currentEnrollment: 127,
          startDate: new Date('2024-11-01'),
          endDate: new Date('2025-12-31'),
          irbApprovalDate: new Date('2024-10-15'),
          irbExpirationDate: new Date('2025-10-15'),
        },
      });
      studies.push(study3);

      // Add 3 participants for Study 3 with different statuses
      const participant4 = await prisma.participant.upsert({
        where: { participantId: 'SUBJ-004' },
        update: {},
        create: {
          studyId: study3.id,
          participantId: 'SUBJ-004',
          subjectId: 'IRB-SUBJ-004',
          firstName: 'Jennifer',
          lastName: 'Lee',
          dateOfBirth: new Date('1990-07-08'),
          email: 'jennifer.lee@example.com',
          phone: '555-0456',
          status: 'COMPLETED',
          consentDate: new Date('2024-11-05'),
          consentVersion: '1.0',
          enrollmentDate: new Date('2024-11-05'),
        },
      });
      participants.push(participant4);

      const participant5 = await prisma.participant.upsert({
        where: { participantId: 'SUBJ-005' },
        update: {},
        create: {
          studyId: study3.id,
          participantId: 'SUBJ-005',
          subjectId: 'IRB-SUBJ-005',
          firstName: 'David',
          lastName: 'Martinez',
          dateOfBirth: new Date('1985-09-30'),
          email: 'david.martinez@example.com',
          phone: '555-0567',
          status: 'WITHDRAWN',
          consentDate: new Date('2024-12-01'),
          consentVersion: '1.0',
          enrollmentDate: new Date('2024-12-01'),
        },
      });
      participants.push(participant5);

      const participant6 = await prisma.participant.upsert({
        where: { participantId: 'SUBJ-006' },
        update: {},
        create: {
          studyId: study3.id,
          participantId: 'SUBJ-006',
          subjectId: 'IRB-SUBJ-006',
          firstName: 'Sarah',
          lastName: 'Thompson',
          dateOfBirth: new Date('1987-12-19'),
          email: 'sarah.thompson@example.com',
          phone: '555-0678',
          status: 'ACTIVE',
          consentDate: new Date('2025-01-08'),
          consentVersion: '1.0',
          enrollmentDate: new Date('2025-01-08'),
        },
      });
      participants.push(participant6);

      // Study 4: APPROVED - Diabetes Observation (OBSERVATIONAL, MODERATE risk)
      const study4 = await prisma.study.upsert({
        where: { protocolNumber: 'PROTO-2025-004' },
        update: {},
        create: {
          title: 'Long-term Outcomes in Type 2 Diabetes Patients with CGM',
          protocolNumber: 'PROTO-2025-004',
          principalInvestigatorId: researcher.id,
          reviewerId: reviewer?.id,
          status: 'APPROVED',
          type: 'OBSERVATIONAL',
          description: 'A 5-year prospective observational cohort study tracking clinical outcomes, quality of life, and healthcare utilization in Type 2 diabetes patients using continuous glucose monitoring versus standard care.',
          riskLevel: 'MODERATE',
          targetEnrollment: 250,
          currentEnrollment: 18,
          startDate: new Date('2025-02-01'),
          endDate: new Date('2030-02-01'),
          irbApprovalDate: new Date('2025-01-20'),
          irbExpirationDate: new Date('2026-01-20'),
        },
      });
      studies.push(study4);

      // Add 2 participants for Study 4
      const participant7 = await prisma.participant.upsert({
        where: { participantId: 'SUBJ-007' },
        update: {},
        create: {
          studyId: study4.id,
          participantId: 'SUBJ-007',
          subjectId: 'IRB-SUBJ-007',
          firstName: 'Michael',
          lastName: 'Anderson',
          dateOfBirth: new Date('1975-05-25'),
          email: 'michael.anderson@example.com',
          phone: '555-0789',
          status: 'ENROLLED',
          consentDate: new Date('2025-01-22'),
          consentVersion: '1.0',
          enrollmentDate: new Date('2025-01-25'),
          groupAssignment: 'CGM Group',
        },
      });
      participants.push(participant7);

      const participant8 = await prisma.participant.upsert({
        where: { participantId: 'SUBJ-008' },
        update: {},
        create: {
          studyId: study4.id,
          participantId: 'SUBJ-008',
          subjectId: 'IRB-SUBJ-008',
          firstName: 'Lisa',
          lastName: 'Brown',
          dateOfBirth: new Date('1982-08-11'),
          email: 'lisa.brown@example.com',
          phone: '555-0890',
          status: 'SCREENING',
          consentDate: new Date('2025-01-28'),
          consentVersion: '1.0',
        },
      });
      participants.push(participant8);
    }

    return NextResponse.json({
      message: 'Seed data created successfully',
      data: {
        roles: roles.map(r => ({ id: r.id, name: r.name })),
        users: users.map(u => ({ id: u.id, email: u.email, name: `${u.firstName} ${u.lastName}`, role: u.roleId })),
        studies: studies.map(s => ({
          id: s.id,
          title: s.title,
          protocolNumber: s.protocolNumber,
          status: s.status,
          type: s.type,
          riskLevel: s.riskLevel
        })),
        participants: participants.map(p => ({
          id: p.id,
          participantId: p.participantId,
          name: `${p.firstName} ${p.lastName}`,
          status: p.status,
          studyId: p.studyId
        })),
        summary: {
          totalStudies: studies.length,
          totalParticipants: participants.length,
          studiesByStatus: {
            DRAFT: studies.filter(s => s.status === 'DRAFT').length,
            PENDING_REVIEW: studies.filter(s => s.status === 'PENDING_REVIEW').length,
            APPROVED: studies.filter(s => s.status === 'APPROVED').length,
            ACTIVE: studies.filter(s => s.status === 'ACTIVE').length,
          }
        }
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database' },
      { status: 500 }
    );
  }
}