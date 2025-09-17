// Participant Types for Research Study Management System
// HIPAA-compliant participant enrollment and management

export interface Participant {
  id: string;
  studyId: string;
  externalId: string; // Study-specific participant ID (e.g., MSH-001-0001)
  status: ParticipantStatus;
  enrollmentDate: Date;
  withdrawalDate?: Date;
  withdrawalReason?: string;
  completionDate?: Date;
  screeningNumber?: string;
  randomizationCode?: string;
  siteId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ParticipantStatus {
  PRESCREENING = 'PRESCREENING',
  SCREENING = 'SCREENING',
  SCREEN_FAILURE = 'SCREEN_FAILURE',
  ELIGIBLE = 'ELIGIBLE',
  ENROLLED = 'ENROLLED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  WITHDRAWN = 'WITHDRAWN',
  LOST_TO_FOLLOWUP = 'LOST_TO_FOLLOWUP',
  DISCONTINUED = 'DISCONTINUED',
  TERMINATED = 'TERMINATED'
}

// Informed Consent Management
export interface InformedConsent {
  id: string;
  participantId: string;
  studyId: string;
  version: string;
  consentDate: Date;
  consentType: ConsentType;
  status: ConsentStatus;
  documentId?: string;
  witnessId?: string;
  witnessName?: string;
  ipAddress: string;
  userAgent: string;
  electronicSignature: string;
  withdrawalDate?: Date;
  withdrawalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ConsentType {
  MAIN_STUDY = 'MAIN_STUDY',
  BIOSPECIMEN = 'BIOSPECIMEN',
  GENETIC_TESTING = 'GENETIC_TESTING',
  DATA_SHARING = 'DATA_SHARING',
  PHOTOGRAPHY = 'PHOTOGRAPHY',
  FUTURE_CONTACT = 'FUTURE_CONTACT'
}

export enum ConsentStatus {
  PENDING = 'PENDING',
  SIGNED = 'SIGNED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
  SUPERSEDED = 'SUPERSEDED'
}

// Demographics (HIPAA-compliant, encrypted)
export interface ParticipantDemographics {
  id: string;
  participantId: string;
  dateOfBirth: Date; // Encrypted
  gender: Gender;
  race: Race[];
  ethnicity: Ethnicity;
  primaryLanguage: string;
  educationLevel?: EducationLevel;
  maritalStatus?: MaritalStatus;
  employmentStatus?: EmploymentStatus;
  insuranceType?: InsuranceType;
  // Address information (encrypted)
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  // Contact information (encrypted)
  phoneNumber?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  // Privacy controls
  dataEncrypted: boolean;
  consentToContact: boolean;
  preferredContactMethod: ContactMethod;
  createdAt: Date;
  updatedAt: Date;
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NON_BINARY = 'NON_BINARY',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
  OTHER = 'OTHER'
}

export enum Race {
  AMERICAN_INDIAN_ALASKA_NATIVE = 'AMERICAN_INDIAN_ALASKA_NATIVE',
  ASIAN = 'ASIAN',
  BLACK_AFRICAN_AMERICAN = 'BLACK_AFRICAN_AMERICAN',
  NATIVE_HAWAIIAN_PACIFIC_ISLANDER = 'NATIVE_HAWAIIAN_PACIFIC_ISLANDER',
  WHITE = 'WHITE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum Ethnicity {
  HISPANIC_LATINO = 'HISPANIC_LATINO',
  NOT_HISPANIC_LATINO = 'NOT_HISPANIC_LATINO',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum EducationLevel {
  LESS_THAN_HIGH_SCHOOL = 'LESS_THAN_HIGH_SCHOOL',
  HIGH_SCHOOL_GED = 'HIGH_SCHOOL_GED',
  SOME_COLLEGE = 'SOME_COLLEGE',
  ASSOCIATES_DEGREE = 'ASSOCIATES_DEGREE',
  BACHELORS_DEGREE = 'BACHELORS_DEGREE',
  MASTERS_DEGREE = 'MASTERS_DEGREE',
  DOCTORAL_DEGREE = 'DOCTORAL_DEGREE',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
  SEPARATED = 'SEPARATED',
  DOMESTIC_PARTNERSHIP = 'DOMESTIC_PARTNERSHIP',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum EmploymentStatus {
  EMPLOYED_FULL_TIME = 'EMPLOYED_FULL_TIME',
  EMPLOYED_PART_TIME = 'EMPLOYED_PART_TIME',
  UNEMPLOYED = 'UNEMPLOYED',
  RETIRED = 'RETIRED',
  STUDENT = 'STUDENT',
  DISABLED = 'DISABLED',
  HOMEMAKER = 'HOMEMAKER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum InsuranceType {
  PRIVATE = 'PRIVATE',
  MEDICARE = 'MEDICARE',
  MEDICAID = 'MEDICAID',
  MILITARY = 'MILITARY',
  UNINSURED = 'UNINSURED',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export enum ContactMethod {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  SMS = 'SMS',
  MAIL = 'MAIL',
  PORTAL = 'PORTAL'
}

// Screening and Eligibility
export interface ScreeningResponse {
  id: string;
  participantId: string;
  questionnaireId: string;
  responses: ScreeningAnswer[];
  eligibilityResult: EligibilityResult;
  completedDate: Date;
  reviewedBy?: string;
  reviewedDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScreeningAnswer {
  questionId: string;
  questionText: string;
  answerType: AnswerType;
  answer: string | number | boolean | string[];
  required: boolean;
}

export enum AnswerType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  DATE = 'DATE',
  SCALE = 'SCALE'
}

export interface EligibilityResult {
  eligible: boolean;
  score?: number;
  criteria: CriteriaEvaluation[];
  reason?: string;
  reviewRequired: boolean;
}

export interface CriteriaEvaluation {
  criteriaId: string;
  criteriaText: string;
  required: boolean;
  met: boolean;
  value?: string;
  reason?: string;
}

// Communication and Notifications
export interface ParticipantCommunication {
  id: string;
  participantId: string;
  studyId: string;
  type: CommunicationType;
  method: ContactMethod;
  subject: string;
  content: string;
  scheduledDate?: Date;
  sentDate?: Date;
  status: CommunicationStatus;
  templateId?: string;
  deliveryAttempts: number;
  lastAttemptDate?: Date;
  response?: string;
  responseDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum CommunicationType {
  WELCOME = 'WELCOME',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  VISIT_CONFIRMATION = 'VISIT_CONFIRMATION',
  FOLLOW_UP = 'FOLLOW_UP',
  ADVERSE_EVENT_FOLLOW_UP = 'ADVERSE_EVENT_FOLLOW_UP',
  STUDY_UPDATE = 'STUDY_UPDATE',
  WITHDRAWAL_CONFIRMATION = 'WITHDRAWAL_CONFIRMATION',
  COMPLETION_NOTICE = 'COMPLETION_NOTICE',
  GENERAL = 'GENERAL'
}

export enum CommunicationStatus {
  SCHEDULED = 'SCHEDULED',
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  RESPONDED = 'RESPONDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

// Enrollment History and Audit
export interface EnrollmentHistory {
  id: string;
  participantId: string;
  fromStatus: ParticipantStatus;
  toStatus: ParticipantStatus;
  changedBy: string;
  changedDate: Date;
  reason: string;
  notes?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

// Withdrawal Management
export interface WithdrawalRequest {
  id: string;
  participantId: string;
  studyId: string;
  requestDate: Date;
  effectiveDate: Date;
  reason: WithdrawalReason;
  customReason?: string;
  dataRetention: DataRetentionOption;
  futureContact: boolean;
  requestedBy: string; // participant or staff
  processedBy?: string;
  processedDate?: Date;
  status: WithdrawalStatus;
  notifications: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum WithdrawalReason {
  ADVERSE_EVENT = 'ADVERSE_EVENT',
  PERSONAL_REASONS = 'PERSONAL_REASONS',
  LACK_OF_EFFICACY = 'LACK_OF_EFFICACY',
  PROTOCOL_VIOLATION = 'PROTOCOL_VIOLATION',
  LOST_TO_FOLLOWUP = 'LOST_TO_FOLLOWUP',
  INVESTIGATOR_DECISION = 'INVESTIGATOR_DECISION',
  SPONSOR_DECISION = 'SPONSOR_DECISION',
  DEATH = 'DEATH',
  OTHER = 'OTHER'
}

export enum DataRetentionOption {
  DELETE_ALL = 'DELETE_ALL',
  RETAIN_ANONYMIZED = 'RETAIN_ANONYMIZED',
  RETAIN_ALL = 'RETAIN_ALL'
}

export enum WithdrawalStatus {
  REQUESTED = 'REQUESTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  PROCESSED = 'PROCESSED',
  REJECTED = 'REJECTED'
}

// API Request/Response types
export interface CreateParticipantRequest {
  studyId: string;
  externalId: string;
  screeningNumber?: string;
  consentVersion: string;
  consentDate?: string;
  consentDocumentId?: string;
  siteId?: string;
}

export interface UpdateParticipantRequest {
  status?: ParticipantStatus;
  withdrawalDate?: string;
  withdrawalReason?: string;
  completionDate?: string;
  randomizationCode?: string;
  notes?: string;
}

export interface ParticipantListResponse {
  participants: Participant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    status?: ParticipantStatus[];
    siteId?: string;
    dateRange?: {
      startDate: string;
      endDate: string;
    };
  };
}

// Export all for easy imports
export * from './index';