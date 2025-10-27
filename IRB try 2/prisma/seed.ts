import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data in correct order (reverse of foreign key dependencies)
  console.log('🗑️  Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.automationLog.deleteMany();
  await prisma.participantVisit.deleteMany();
  await prisma.studyVisit.deleteMany();
  await prisma.aiAnalysis.deleteMany();
  await prisma.document.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.studyCoordinator.deleteMany();
  await prisma.study.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  console.log('✅ Existing data cleared');

  // Create roles first
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

  const coordinatorRole = await prisma.role.create({
    data: {
      name: 'coordinator',
      description: 'Study Coordinator',
      permissions: JSON.stringify({
        view_studies: true,
        manage_participants: true,
        enroll_participants: true,
        view_documents: true,
        upload_documents: true,
      }),
    },
  });

  const reviewerRole = await prisma.role.create({
    data: {
      name: 'reviewer',
      description: 'IRB Reviewer',
      permissions: JSON.stringify({
        view_studies: true,
        review_studies: true,
        approve_studies: true,
        view_documents: true,
        view_audit_logs: true,
      }),
    },
  });

  const researcherRole = await prisma.role.create({
    data: {
      name: 'researcher',
      description: 'Research Staff',
      permissions: JSON.stringify({
        view_studies: true,
        view_documents: true,
        manage_participants: true,
        enroll_participants: true,
      }),
    },
  });

  console.log('✅ Created 5 roles');

  // Create users
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      roleId: adminRole.id,
      approved: true,
    },
  });

  const pi1 = await prisma.user.create({
    data: {
      email: 'pi1@test.com',
      firstName: 'Emily',
      lastName: 'Rodriguez',
      password: hashedPassword,
      roleId: piRole.id,
      approved: true,
    },
  });

  const pi2 = await prisma.user.create({
    data: {
      email: 'pi2@test.com',
      firstName: 'James',
      lastName: 'Wilson',
      password: hashedPassword,
      roleId: piRole.id,
      approved: true,
    },
  });

  const coordinator1 = await prisma.user.create({
    data: {
      email: 'coordinator1@test.com',
      firstName: 'Jessica',
      lastName: 'Martinez',
      password: hashedPassword,
      roleId: coordinatorRole.id,
      approved: true,
    },
  });

  console.log('✅ Created 4 users (all password: admin123)');

  // Create studies
  console.log('📚 Creating studies...');

  const study1 = await prisma.study.create({
    data: {
      title: 'Phase III Randomized Trial of Novel Cardiac Drug',
      protocolNumber: 'CARD-2024-001',
      type: 'INTERVENTIONAL',
      status: 'PENDING_REVIEW',
      description: 'A multicenter, randomized, double-blind, placebo-controlled Phase III trial evaluating the efficacy and safety of a novel cardiac medication in patients with heart failure.',
      principalInvestigatorId: pi1.id,
      targetEnrollment: 500,
      currentEnrollment: 0,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2026-03-01'),
      riskLevel: 'MODERATE',
    },
  });

  const study2 = await prisma.study.create({
    data: {
      title: 'Observational Study of Diabetes Treatment Outcomes',
      protocolNumber: 'DIAB-2024-002',
      type: 'OBSERVATIONAL',
      status: 'APPROVED',
      description: 'Long-term observational study tracking treatment outcomes in Type 2 diabetes patients.',
      principalInvestigatorId: pi2.id,
      targetEnrollment: 200,
      currentEnrollment: 12,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2025-01-15'),
      riskLevel: 'MINIMAL',
      irbApprovalDate: new Date('2024-01-10'),
    },
  });

  const study3 = await prisma.study.create({
    data: {
      title: 'Cancer Immunotherapy Combination Study',
      protocolNumber: 'ONCO-2024-003',
      type: 'INTERVENTIONAL',
      status: 'DRAFT',
      description: 'Phase II study evaluating combination immunotherapy for advanced solid tumors.',
      principalInvestigatorId: pi1.id,
      targetEnrollment: 100,
      currentEnrollment: 0,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2026-12-01'),
      riskLevel: 'MODERATE',
    },
  });

  console.log('✅ Created 3 studies');

  // Create protocol documents
  console.log('📄 Creating protocol documents...');

  const doc1 = await prisma.document.create({
    data: {
      studyId: study1.id,
      name: 'CARD-2024-001-Protocol-v1.0.pdf',
      type: 'PROTOCOL',
      version: 1,
      filePath: '/uploads/protocols/card-2024-001.pdf',
      fileSize: 2458000,
      mimeType: 'application/pdf',
      uploadedById: pi1.id,
      ocrStatus: 'completed',
      isOcrSupported: true,
      ocrContent: `CLINICAL TRIAL PROTOCOL

Protocol Number: CARD-2024-001
Study Title: Phase III Randomized Trial of Novel Cardiac Drug XR-450

EXECUTIVE SUMMARY
This phase III multicenter randomized double-blind placebo-controlled trial evaluates XR-450 in heart failure patients.

INCLUSION CRITERIA:
- Age ≥ 18 years
- Documented heart failure with LVEF ≤ 40%
- NYHA Class II-III symptoms
- Stable guideline-directed therapy for ≥ 3 months

EXCLUSION CRITERIA:
- NYHA Class IV heart failure
- Recent MI (< 3 months)
- Severe renal impairment
- Pregnant or breastfeeding

STUDY DESIGN:
- Enrollment: 500 patients
- 1:1 randomization
- Duration: 52 weeks
- Follow-up: 12 weeks

VISIT SCHEDULE:
- Screening (Week -2)
- Baseline/Randomization (Week 0)
- Follow-ups: Weeks 2, 4, 8, 12, 24, 36, 52
- Final: Week 64

PRIMARY ENDPOINT:
Cardiovascular death or heart failure hospitalization

SECONDARY ENDPOINTS:
- 6-minute walk distance
- KCCQ score
- NT-proBNP levels
- All-cause mortality`,
      ocrModel: 'mistral-pixtral-12b-2409',
      ocrProcessedAt: new Date(),
    },
  });

  const doc2 = await prisma.document.create({
    data: {
      studyId: study2.id,
      name: 'DIAB-2024-002-Protocol-v1.2.pdf',
      type: 'PROTOCOL',
      version: 1,
      filePath: '/uploads/protocols/diab-2024-002.pdf',
      fileSize: 1850000,
      mimeType: 'application/pdf',
      uploadedById: pi2.id,
      ocrStatus: 'completed',
      isOcrSupported: true,
      ocrContent: `OBSERVATIONAL STUDY PROTOCOL

Protocol Number: DIAB-2024-002
Study Title: Long-term Outcomes in Type 2 Diabetes

STUDY OVERVIEW:
Prospective observational cohort study of Type 2 diabetes treatment outcomes.

INCLUSION CRITERIA:
- Type 2 diabetes diagnosis
- Age 40-75 years
- HbA1c 7.0-10.0%
- On oral antidiabetic medications

EXCLUSION CRITERIA:
- Type 1 diabetes
- Insulin-dependent
- Severe complications
- Active malignancy

DATA COLLECTION:
- Quarterly HbA1c
- Monthly fasting glucose
- Biannual lipid panels
- Medication adherence tracking

ENROLLMENT: 200 participants
DURATION: 12 months
VISITS: Monthly`,
      ocrModel: 'mistral-pixtral-12b-2409',
      ocrProcessedAt: new Date(),
    },
  });

  console.log('✅ Created 2 protocol documents with OCR content');

  // Create AI analysis for study1
  console.log('🤖 Creating AI analysis...');

  const aiAnalysis1 = await prisma.aiAnalysis.create({
    data: {
      studyId: study1.id,
      status: 'completed',
      model: 'gpt-4o',
      executiveSummary: 'This Phase III clinical trial evaluates XR-450 in heart failure patients. The study employs a robust randomized double-blind design with 500 patients followed for 52 weeks. Primary endpoint focuses on cardiovascular death or hospitalization.',
      complexityScore: 8,
      complianceScore: 92,
      riskLevel: 'medium',
      processingTimeMs: 45000,
      studyMetadata: JSON.stringify({
        phase: 'Phase III',
        enrollment: 500,
        duration: '52 weeks',
        therapeuticArea: 'Cardiology',
        design: 'RCT',
      }),
    },
  });

  // Add inclusion/exclusion criteria
  await prisma.criterion.createMany({
    data: [
      {
        aiAnalysisId: aiAnalysis1.id,
        type: 'inclusion',
        description: 'Age ≥ 18 years',
        originalText: 'Age ≥ 18 years',
        category: 'demographic',
        priority: 1,
      },
      {
        aiAnalysisId: aiAnalysis1.id,
        type: 'inclusion',
        description: 'Documented heart failure with LVEF ≤ 40%',
        originalText: 'Documented heart failure with LVEF ≤ 40%',
        category: 'medical',
        priority: 1,
      },
      {
        aiAnalysisId: aiAnalysis1.id,
        type: 'inclusion',
        description: 'NYHA Class II-III symptoms',
        originalText: 'NYHA Class II-III symptoms',
        category: 'medical',
        priority: 1,
      },
      {
        aiAnalysisId: aiAnalysis1.id,
        type: 'exclusion',
        description: 'NYHA Class IV heart failure',
        originalText: 'NYHA Class IV heart failure',
        category: 'medical',
        priority: 1,
      },
      {
        aiAnalysisId: aiAnalysis1.id,
        type: 'exclusion',
        description: 'Pregnant or breastfeeding women',
        originalText: 'Pregnant or breastfeeding women',
        category: 'demographic',
        priority: 1,
      },
    ],
  });

  // Add visit schedule
  await prisma.visitSchedule.createMany({
    data: [
      {
        aiAnalysisId: aiAnalysis1.id,
        visitName: 'Screening',
        visitNumber: 1,
        dayRange: 'Week -2',
        procedures: JSON.stringify(['Informed consent', 'Medical history', 'Physical exam', 'ECG', 'Labs', 'Echo']),
        duration: '120 minutes',
      },
      {
        aiAnalysisId: aiAnalysis1.id,
        visitName: 'Baseline/Randomization',
        visitNumber: 2,
        dayRange: 'Week 0',
        procedures: JSON.stringify(['Vital signs', 'Randomization', 'Drug dispensing', '6MWT', 'KCCQ']),
        duration: '90 minutes',
      },
      {
        aiAnalysisId: aiAnalysis1.id,
        visitName: 'Follow-up',
        visitNumber: 3,
        dayRange: 'Week 12',
        procedures: JSON.stringify(['Vital signs', 'Physical exam', 'AE review', 'Labs', 'Drug accountability']),
        duration: '60 minutes',
      },
    ],
  });

  console.log('✅ Created AI analysis with criteria and visit schedule');

  // Skip participants, enrollments, coordinators, and audit logs for now - schema has changed
  // Will add back later with correct fields
  console.log('⏭️  Skipping participant creation (schema needs updating)');
  console.log('⏭️  Skipping coordinator assignments (schema needs updating)');
  console.log('⏭️  Skipping audit logs (schema needs updating)');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log('  - 5 roles created (admin, principal_investigator, coordinator, reviewer, researcher)');
  console.log('  - 4 users created');
  console.log('  - 3 studies created');
  console.log('  - 2 protocol documents with OCR content');
  console.log('  - 1 AI analysis with 5 criteria and 3 visit schedules');
  console.log('  - Participants, coordinators, and audit logs skipped (schema needs updating)');
  console.log('\n👤 Test Login Credentials:');
  console.log('  Email: admin@test.com');
  console.log('  Password: admin123');
  console.log('  (All users have the same password)\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
