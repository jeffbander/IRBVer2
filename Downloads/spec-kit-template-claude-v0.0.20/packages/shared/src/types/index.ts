export interface Study {
  id: string;
  protocolNumber: string;
  title: string;
  description: string;
  status: StudyStatus;
  phase: StudyPhase;
  startDate: Date;
  endDate?: Date;
  targetEnrollment: number;
  currentEnrollment: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum StudyStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ENROLLING = 'ENROLLING',
  ACTIVE = 'ACTIVE',
  CLOSED_TO_ENROLLMENT = 'CLOSED_TO_ENROLLMENT',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
  COMPLETED = 'COMPLETED',
}

export enum StudyPhase {
  PHASE_1 = 'PHASE_1',
  PHASE_2 = 'PHASE_2',
  PHASE_3 = 'PHASE_3',
  PHASE_4 = 'PHASE_4',
  OBSERVATIONAL = 'OBSERVATIONAL',
}

export interface Participant {
  id: string;
  studyId: string;
  externalId: string;
  status: ParticipantStatus;
  enrollmentDate: Date;
  withdrawalDate?: Date;
  withdrawalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ParticipantStatus {
  SCREENING = 'SCREENING',
  ELIGIBLE = 'ELIGIBLE',
  ENROLLED = 'ENROLLED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  WITHDRAWN = 'WITHDRAWN',
  LOST_TO_FOLLOWUP = 'LOST_TO_FOLLOWUP',
  DISCONTINUED = 'DISCONTINUED',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  PRINCIPAL_INVESTIGATOR = 'PRINCIPAL_INVESTIGATOR',
  STUDY_COORDINATOR = 'STUDY_COORDINATOR',
  DATA_ANALYST = 'DATA_ANALYST',
  SITE_COORDINATOR = 'SITE_COORDINATOR',
  MONITOR = 'MONITOR',
  PARTICIPANT = 'PARTICIPANT',
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}