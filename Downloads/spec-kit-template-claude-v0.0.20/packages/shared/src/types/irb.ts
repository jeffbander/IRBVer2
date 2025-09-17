// IRB and Compliance Types for Research Study Management

// Import removed - UserRole not used in this file

// IRB Submission Types
export interface IRBSubmission {
  id: string;
  studyId: string;
  submissionType: IRBSubmissionType;
  status: IRBSubmissionStatus;
  submissionNumber: string;
  title: string;
  description?: string;
  submittedBy: string;
  submittedAt?: Date;
  reviewType: IRBReviewType;
  expeditedCategory?: string[];
  assignedReviewers: string[];
  primaryReviewerId?: string;
  secondaryReviewerId?: string;
  dueDate?: Date;
  reviewedAt?: Date;
  decision?: IRBDecision;
  decisionDate?: Date;
  approvalExpirationDate?: Date;
  conditions?: string[];
  modifications?: string[];
  irbMeetingId?: string;
  meetingDate?: Date;
  nextReviewDue?: Date;
  issueContinuingReview?: boolean;
  documentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum IRBSubmissionType {
  INITIAL = 'INITIAL',
  AMENDMENT = 'AMENDMENT',
  CONTINUING_REVIEW = 'CONTINUING_REVIEW',
  REPORTABLE_EVENT = 'REPORTABLE_EVENT',
  STUDY_CLOSURE = 'STUDY_CLOSURE',
  EMERGENCY_USE = 'EMERGENCY_USE',
}

export enum IRBSubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_CLARIFICATION = 'PENDING_CLARIFICATION',
  APPROVED = 'APPROVED',
  APPROVED_WITH_CONDITIONS = 'APPROVED_WITH_CONDITIONS',
  DISAPPROVED = 'DISAPPROVED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
}

export enum IRBReviewType {
  FULL_BOARD = 'FULL_BOARD',
  EXPEDITED = 'EXPEDITED',
  EXEMPT = 'EXEMPT',
  NOT_HUMAN_SUBJECTS = 'NOT_HUMAN_SUBJECTS',
}

export enum IRBDecision {
  APPROVED = 'APPROVED',
  APPROVED_WITH_CONDITIONS = 'APPROVED_WITH_CONDITIONS',
  DISAPPROVED = 'DISAPPROVED',
  DEFERRED = 'DEFERRED',
  TABLED = 'TABLED',
  REQUIRES_MODIFICATIONS = 'REQUIRES_MODIFICATIONS',
}

// Adverse Events
export interface AdverseEvent {
  id: string;
  studyId: string;
  participantId?: string;
  externalId: string;
  severity: AESeverity;
  seriousness: AESeriousness;
  expectedness: AEExpectedness;
  relatedness: AERelatedness;
  description: string;
  onsetDate: Date;
  resolutionDate?: Date;
  outcome: AEOutcome;
  medicallySignificant: boolean;
  actionTaken?: string;
  concomitantMedications?: string;
  medicalHistory?: string;
  reportedBy: string;
  reportedAt: Date;
  initialReportDate: Date;
  followUpReports: string[];
  reportableToFDA: boolean;
  reportableToSponsor: boolean;
  reportableToIRB: boolean;
  reportingTimeline?: AEReportingTimeline;
  isSAE: boolean;
  saeReportId?: string;
  hospitalizations?: AEHospitalization[];
  status: AEStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum AESeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  LIFE_THREATENING = 'LIFE_THREATENING',
}

export enum AESeriousness {
  NON_SERIOUS = 'NON_SERIOUS',
  SERIOUS = 'SERIOUS',
}

export enum AEExpectedness {
  EXPECTED = 'EXPECTED',
  UNEXPECTED = 'UNEXPECTED',
}

export enum AERelatedness {
  UNRELATED = 'UNRELATED',
  UNLIKELY = 'UNLIKELY',
  POSSIBLE = 'POSSIBLE',
  PROBABLE = 'PROBABLE',
  DEFINITE = 'DEFINITE',
}

export enum AEOutcome {
  RECOVERED = 'RECOVERED',
  RECOVERING = 'RECOVERING',
  NOT_RECOVERED = 'NOT_RECOVERED',
  RECOVERED_WITH_SEQUELAE = 'RECOVERED_WITH_SEQUELAE',
  FATAL = 'FATAL',
  UNKNOWN = 'UNKNOWN',
}

export enum AEStatus {
  DRAFT = 'DRAFT',
  REPORTED = 'REPORTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  CLOSED = 'CLOSED',
  REQUIRES_FOLLOWUP = 'REQUIRES_FOLLOWUP',
}

export enum AEReportingTimeline {
  IMMEDIATE = 'IMMEDIATE',
  EXPEDITED_7_DAY = 'EXPEDITED_7_DAY',
  EXPEDITED_15_DAY = 'EXPEDITED_15_DAY',
  ROUTINE = 'ROUTINE',
}

export interface AEHospitalization {
  admissionDate: Date;
  dischargeDate?: Date;
  reason: string;
  hospital: string;
}

// Protocol Deviations
export interface ProtocolDeviation {
  id: string;
  studyId: string;
  participantId?: string;
  deviationType: DeviationType;
  severity: DeviationSeverity;
  description: string;
  protocolSection: string;
  dateOccurred: Date;
  dateDiscovered: Date;
  impactOnDataIntegrity: boolean;
  impactOnParticipantSafety: boolean;
  impactOnStudyValidity: boolean;
  correctiveAction?: string;
  preventiveAction?: string;
  actionTakenBy?: string;
  actionTakenDate?: Date;
  reportedBy: string;
  reportedAt: Date;
  reportableToSponsor: boolean;
  reportableToIRB: boolean;
  reportableToFDA: boolean;
  status: DeviationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum DeviationType {
  INCLUSION_EXCLUSION = 'INCLUSION_EXCLUSION',
  INFORMED_CONSENT = 'INFORMED_CONSENT',
  RANDOMIZATION = 'RANDOMIZATION',
  STUDY_PROCEDURE = 'STUDY_PROCEDURE',
  CONCOMITANT_MEDICATION = 'CONCOMITANT_MEDICATION',
  VISIT_WINDOW = 'VISIT_WINDOW',
  LABORATORY = 'LABORATORY',
  DOSING = 'DOSING',
  SAFETY_MONITORING = 'SAFETY_MONITORING',
  DATA_COLLECTION = 'DATA_COLLECTION',
  OTHER = 'OTHER',
}

export enum DeviationSeverity {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL',
}

export enum DeviationStatus {
  REPORTED = 'REPORTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACTION_REQUIRED = 'ACTION_REQUIRED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

// Notifications
export enum NotificationTrigger {
  IRB_SUBMISSION_RECEIVED = 'IRB_SUBMISSION_RECEIVED',
  IRB_APPROVAL = 'IRB_APPROVAL',
  IRB_REJECTION = 'IRB_REJECTION',
  CONTINUING_REVIEW_DUE = 'CONTINUING_REVIEW_DUE',
  SAE_REPORTED = 'SAE_REPORTED',
  PROTOCOL_DEVIATION = 'PROTOCOL_DEVIATION',
  DOCUMENT_EXPIRING = 'DOCUMENT_EXPIRING',
  COMPLIANCE_ALERT = 'COMPLIANCE_ALERT',
  AUDIT_SCHEDULED = 'AUDIT_SCHEDULED',
}

export enum NotificationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
  SYSTEM = 'SYSTEM',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}