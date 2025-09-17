import { z } from 'zod';
import {
  ParticipantStatus,
  ConsentType,
  ConsentStatus,
  Gender,
  Race,
  Ethnicity,
  EducationLevel,
  MaritalStatus,
  EmploymentStatus,
  InsuranceType,
  ContactMethod,
  AnswerType,
  CommunicationType,
  CommunicationStatus,
  WithdrawalReason,
  DataRetentionOption,
  WithdrawalStatus,
} from '../types/participant';

// Participant Core Schema
export const ParticipantSchema = z.object({
  id: z.string().uuid(),
  studyId: z.string().uuid(),
  externalId: z.string().min(1).max(50).regex(/^[A-Z0-9\-]+$/, 'Invalid participant ID format'),
  status: z.nativeEnum(ParticipantStatus),
  enrollmentDate: z.date(),
  withdrawalDate: z.date().optional(),
  withdrawalReason: z.string().optional(),
  completionDate: z.date().optional(),
  screeningNumber: z.string().optional(),
  randomizationCode: z.string().optional(),
  siteId: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Informed Consent Schema with HIPAA compliance
export const InformedConsentSchema = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  studyId: z.string().uuid(),
  version: z.string().min(1).max(20),
  consentDate: z.date(),
  consentType: z.nativeEnum(ConsentType),
  status: z.nativeEnum(ConsentStatus),
  documentId: z.string().uuid().optional(),
  witnessId: z.string().uuid().optional(),
  witnessName: z.string().min(1).max(200).optional(),
  ipAddress: z.string().ip(),
  userAgent: z.string().min(1).max(500),
  electronicSignature: z.string().min(1).max(500),
  withdrawalDate: z.date().optional(),
  withdrawalReason: z.string().max(1000).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Demographics Schema with HIPAA encryption considerations
export const ParticipantDemographicsSchema = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  dateOfBirth: z.date().refine(
    (date) => {
      const age = new Date().getFullYear() - date.getFullYear();
      return age >= 0 && age <= 120;
    },
    { message: 'Invalid date of birth' }
  ),
  gender: z.nativeEnum(Gender),
  race: z.array(z.nativeEnum(Race)).min(1),
  ethnicity: z.nativeEnum(Ethnicity),
  primaryLanguage: z.string().min(1).max(50),
  educationLevel: z.nativeEnum(EducationLevel).optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),
  employmentStatus: z.nativeEnum(EmploymentStatus).optional(),
  insuranceType: z.nativeEnum(InsuranceType).optional(),
  // Address (encrypted in storage)
  addressLine1: z.string().min(1).max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(2).max(50).optional(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format').optional(),
  country: z.string().min(2).max(100).optional(),
  // Contact (encrypted in storage)
  phoneNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
  email: z.string().email().optional(),
  emergencyContactName: z.string().min(1).max(200).optional(),
  emergencyContactPhone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
  emergencyContactRelation: z.string().min(1).max(100).optional(),
  // Privacy controls
  dataEncrypted: z.boolean(),
  consentToContact: z.boolean(),
  preferredContactMethod: z.nativeEnum(ContactMethod),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Screening Response Schema
export const ScreeningAnswerSchema = z.object({
  questionId: z.string().uuid(),
  questionText: z.string().min(1).max(1000),
  answerType: z.nativeEnum(AnswerType),
  answer: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
  ]),
  required: z.boolean(),
});

export const CriteriaEvaluationSchema = z.object({
  criteriaId: z.string().uuid(),
  criteriaText: z.string().min(1).max(1000),
  required: z.boolean(),
  met: z.boolean(),
  value: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export const EligibilityResultSchema = z.object({
  eligible: z.boolean(),
  score: z.number().min(0).max(100).optional(),
  criteria: z.array(CriteriaEvaluationSchema),
  reason: z.string().max(1000).optional(),
  reviewRequired: z.boolean(),
});

export const ScreeningResponseSchema = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  questionnaireId: z.string().uuid(),
  responses: z.array(ScreeningAnswerSchema),
  eligibilityResult: EligibilityResultSchema,
  completedDate: z.date(),
  reviewedBy: z.string().uuid().optional(),
  reviewedDate: z.date().optional(),
  notes: z.string().max(2000).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Communication Schema
export const ParticipantCommunicationSchema = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  studyId: z.string().uuid(),
  type: z.nativeEnum(CommunicationType),
  method: z.nativeEnum(ContactMethod),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  scheduledDate: z.date().optional(),
  sentDate: z.date().optional(),
  status: z.nativeEnum(CommunicationStatus),
  templateId: z.string().uuid().optional(),
  deliveryAttempts: z.number().min(0).max(10),
  lastAttemptDate: z.date().optional(),
  response: z.string().max(5000).optional(),
  responseDate: z.date().optional(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Enrollment History Schema
export const EnrollmentHistorySchema = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  fromStatus: z.nativeEnum(ParticipantStatus),
  toStatus: z.nativeEnum(ParticipantStatus),
  changedBy: z.string().uuid(),
  changedDate: z.date(),
  reason: z.string().min(1).max(500),
  notes: z.string().max(2000).optional(),
  ipAddress: z.string().ip(),
  userAgent: z.string().min(1).max(500),
  createdAt: z.date(),
});

// Withdrawal Request Schema
export const WithdrawalRequestSchema = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  studyId: z.string().uuid(),
  requestDate: z.date(),
  effectiveDate: z.date(),
  reason: z.nativeEnum(WithdrawalReason),
  customReason: z.string().max(1000).optional(),
  dataRetention: z.nativeEnum(DataRetentionOption),
  futureContact: z.boolean(),
  requestedBy: z.string().uuid(),
  processedBy: z.string().uuid().optional(),
  processedDate: z.date().optional(),
  status: z.nativeEnum(WithdrawalStatus),
  notifications: z.boolean(),
  notes: z.string().max(2000).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// API Request/Response Schemas
export const CreateParticipantRequestSchema = z.object({
  studyId: z.string().uuid(),
  externalId: z.string().min(1).max(50).regex(/^[A-Z0-9\-]+$/, 'Invalid participant ID format'),
  screeningNumber: z.string().min(1).max(50).optional(),
  consentVersion: z.string().min(1).max(20),
  consentDate: z.string().datetime().optional(),
  consentDocumentId: z.string().uuid().optional(),
  siteId: z.string().uuid().optional(),
});

export const UpdateParticipantRequestSchema = z.object({
  status: z.nativeEnum(ParticipantStatus).optional(),
  withdrawalDate: z.string().datetime().optional(),
  withdrawalReason: z.string().max(500).optional(),
  completionDate: z.string().datetime().optional(),
  randomizationCode: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
}).refine(
  (data) => {
    // If status is WITHDRAWN, require withdrawal date and reason
    if (data.status === ParticipantStatus.WITHDRAWN) {
      return data.withdrawalDate && data.withdrawalReason;
    }
    // If status is COMPLETED, require completion date
    if (data.status === ParticipantStatus.COMPLETED) {
      return data.completionDate;
    }
    return true;
  },
  {
    message: 'Required fields missing for status change',
    path: ['status'],
  }
);

export const CreateDemographicsRequestSchema = z.object({
  participantId: z.string().uuid(),
  dateOfBirth: z.string().datetime(),
  gender: z.nativeEnum(Gender),
  race: z.array(z.nativeEnum(Race)).min(1),
  ethnicity: z.nativeEnum(Ethnicity),
  primaryLanguage: z.string().min(1).max(50),
  educationLevel: z.nativeEnum(EducationLevel).optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),
  employmentStatus: z.nativeEnum(EmploymentStatus).optional(),
  insuranceType: z.nativeEnum(InsuranceType).optional(),
  addressLine1: z.string().min(1).max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(2).max(50).optional(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format').optional(),
  country: z.string().min(2).max(100).optional(),
  phoneNumber: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
  email: z.string().email().optional(),
  emergencyContactName: z.string().min(1).max(200).optional(),
  emergencyContactPhone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),
  emergencyContactRelation: z.string().min(1).max(100).optional(),
  consentToContact: z.boolean(),
  preferredContactMethod: z.nativeEnum(ContactMethod),
});

export const ParticipantListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.union([
    z.nativeEnum(ParticipantStatus),
    z.array(z.nativeEnum(ParticipantStatus)),
  ]).optional(),
  siteId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
});

export const CreateConsentRequestSchema = z.object({
  participantId: z.string().uuid(),
  studyId: z.string().uuid(),
  version: z.string().min(1).max(20),
  consentType: z.nativeEnum(ConsentType),
  documentId: z.string().uuid().optional(),
  witnessId: z.string().uuid().optional(),
  witnessName: z.string().min(1).max(200).optional(),
  electronicSignature: z.string().min(1).max(500),
});

export const CreateCommunicationRequestSchema = z.object({
  participantId: z.string().uuid(),
  studyId: z.string().uuid(),
  type: z.nativeEnum(CommunicationType),
  method: z.nativeEnum(ContactMethod),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  scheduledDate: z.string().datetime().optional(),
  templateId: z.string().uuid().optional(),
});

export const CreateWithdrawalRequestSchema = z.object({
  participantId: z.string().uuid(),
  effectiveDate: z.string().datetime(),
  reason: z.nativeEnum(WithdrawalReason),
  customReason: z.string().max(1000).optional(),
  dataRetention: z.nativeEnum(DataRetentionOption),
  futureContact: z.boolean(),
  notifications: z.boolean(),
  notes: z.string().max(2000).optional(),
}).refine(
  (data) => {
    // If reason is OTHER, require custom reason
    return data.reason !== WithdrawalReason.OTHER || data.customReason;
  },
  {
    message: 'Custom reason required when withdrawal reason is OTHER',
    path: ['customReason'],
  }
);

// Status transition validation
export const VALID_STATUS_TRANSITIONS: Record<ParticipantStatus, ParticipantStatus[]> = {
  [ParticipantStatus.PRESCREENING]: [
    ParticipantStatus.SCREENING,
    ParticipantStatus.SCREEN_FAILURE,
    ParticipantStatus.WITHDRAWN,
  ],
  [ParticipantStatus.SCREENING]: [
    ParticipantStatus.ELIGIBLE,
    ParticipantStatus.SCREEN_FAILURE,
    ParticipantStatus.WITHDRAWN,
  ],
  [ParticipantStatus.SCREEN_FAILURE]: [],
  [ParticipantStatus.ELIGIBLE]: [
    ParticipantStatus.ENROLLED,
    ParticipantStatus.WITHDRAWN,
  ],
  [ParticipantStatus.ENROLLED]: [
    ParticipantStatus.ACTIVE,
    ParticipantStatus.WITHDRAWN,
    ParticipantStatus.DISCONTINUED,
  ],
  [ParticipantStatus.ACTIVE]: [
    ParticipantStatus.COMPLETED,
    ParticipantStatus.WITHDRAWN,
    ParticipantStatus.LOST_TO_FOLLOWUP,
    ParticipantStatus.DISCONTINUED,
    ParticipantStatus.TERMINATED,
  ],
  [ParticipantStatus.COMPLETED]: [],
  [ParticipantStatus.WITHDRAWN]: [],
  [ParticipantStatus.LOST_TO_FOLLOWUP]: [
    ParticipantStatus.ACTIVE,
    ParticipantStatus.WITHDRAWN,
    ParticipantStatus.DISCONTINUED,
  ],
  [ParticipantStatus.DISCONTINUED]: [],
  [ParticipantStatus.TERMINATED]: [],
};

export const validateStatusTransition = (
  currentStatus: ParticipantStatus,
  newStatus: ParticipantStatus
): boolean => {
  return VALID_STATUS_TRANSITIONS[currentStatus].includes(newStatus);
};

// HIPAA compliance validation helpers
export const validateHIPAACompliance = z.object({
  hasPatientConsent: z.boolean(),
  encryptionEnabled: z.boolean(),
  auditTrailRequired: z.boolean(),
  dataRetentionPeriod: z.number().min(1).max(120), // months
  minimumNecessaryData: z.boolean(),
});

// Export all schemas
export const ParticipantValidators = {
  Participant: ParticipantSchema,
  InformedConsent: InformedConsentSchema,
  Demographics: ParticipantDemographicsSchema,
  ScreeningResponse: ScreeningResponseSchema,
  Communication: ParticipantCommunicationSchema,
  EnrollmentHistory: EnrollmentHistorySchema,
  WithdrawalRequest: WithdrawalRequestSchema,
  CreateParticipantRequest: CreateParticipantRequestSchema,
  UpdateParticipantRequest: UpdateParticipantRequestSchema,
  CreateDemographicsRequest: CreateDemographicsRequestSchema,
  ParticipantListQuery: ParticipantListQuerySchema,
  CreateConsentRequest: CreateConsentRequestSchema,
  CreateCommunicationRequest: CreateCommunicationRequestSchema,
  CreateWithdrawalRequest: CreateWithdrawalRequestSchema,
  HIPAACompliance: validateHIPAACompliance,
};