export interface StudyType {
  id: string;
  name: string;
  description?: string | null;
  regulatedFields?: Record<string, unknown> | null;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface StudySite {
  id: string;
  name: string;
  isInternal: boolean;
}

export interface StudyAssignment {
  id: string;
  personId: string;
  roleId: string;
  effortPercent?: number | null;
  hoursPerWeek?: number | null;
  startDate: string;
  endDate?: string | null;
  person?: Pick<Person, 'id' | 'name' | 'email'>;
  role?: Role;
}

export type StudyRiskLevel = 'MINIMAL' | 'MORE_THAN_MINIMAL';
export type StudyStatus = 'DRAFT' | 'READY_TO_SUBMIT' | 'SUBMITTED_TO_IRB' | 'ACTIVE' | 'CLOSED';

export interface Role {
  id: string;
  name: string;
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface Task {
  id: string;
  studyId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  dueAt?: string | null;
  ownerId?: string | null;
}

export interface BudgetLine {
  id: string;
  budgetId: string;
  category: string;
  amount: number;
  personId?: string | null;
  note?: string | null;
  person?: Pick<Person, 'id' | 'name' | 'email'> | null;
}

export interface Budget {
  id: string;
  studyId: string;
  currency: string;
  totalDirect?: number | null;
  totalIndirect?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  lines: BudgetLine[];
}

export type IRBStatus =
  | 'DRAFT'
  | 'READY_TO_SUBMIT'
  | 'SUBMITTED'
  | 'PRE_REVIEW'
  | 'MODIFICATIONS_REQUESTED'
  | 'RESUBMITTED'
  | 'EXEMPT_DETERMINATION'
  | 'EXPEDITED_APPROVED'
  | 'MEETING_SCHEDULED'
  | 'APPROVED'
  | 'CONDITIONALLY_APPROVED'
  | 'DEFERRED'
  | 'NOT_APPROVED';

export type IRBPath = 'UNSET' | 'EXEMPT' | 'EXPEDITED' | 'CONVENED';

export interface IRBStatusHistoryEntry {
  id: string;
  fromStatus?: IRBStatus | null;
  toStatus: IRBStatus;
  note?: string | null;
  createdAt: string;
  actorId?: string | null;
}

export interface IRBSubmission {
  id: string;
  studyId: string;
  currentStatus: IRBStatus;
  path: IRBPath;
  expeditedCategory?: string | null;
  submittedAt?: string | null;
  meetingDate?: string | null;
  determinedAt?: string | null;
  continuingReviewRequired: boolean;
  statusHistory: IRBStatusHistoryEntry[];
}

export interface StudySummary {
  id: string;
  title: string;
  shortTitle?: string | null;
  type: StudyType;
  riskLevel: StudyRiskLevel;
  status: StudyStatus;
  sponsorName?: string | null;
  principalInvestigator: Person;
  isMultiSite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudyDetail extends StudySummary {
  assignments: StudyAssignment[];
  tasks: Task[];
  budget?: Budget | null;
  irbSubmission?: IRBSubmission | null;
  documents: Array<{ id: string; kind: string; fileName: string; version: number }>;
  sites: StudySite[];
}

export interface StudyListItem extends StudySummary {}

export interface ApiError {
  message: string;
  details?: unknown;
}
