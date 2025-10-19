import { apiClient } from '../lib/apiClient';
import type {
  Budget,
  BudgetLine,
  IRBSubmission,
  Person,
  Role,
  StudyAssignment,
  StudyDetail,
  StudyListItem,
  StudyType,
  Task,
} from '../types/api';

export interface ListStudiesParams {
  piId?: string;
  status?: string;
  search?: string;
}

export const fetchStudies = async (params?: ListStudiesParams): Promise<StudyListItem[]> => {
  const { data } = await apiClient.get<StudyListItem[]>('/studies', { params });
  return data;
};

export const fetchStudyDetail = async (studyId: string): Promise<StudyDetail> => {
  const { data } = await apiClient.get<StudyDetail>(`/studies/${studyId}`);
  return data;
};

export interface CreateStudyPayload {
  title: string;
  shortTitle?: string;
  typeId: string;
  riskLevel: 'MINIMAL' | 'MORE_THAN_MINIMAL';
  piId: string;
  sponsorName?: string;
  sites: Array<{ name: string; isInternal: boolean }>;
}

export const createStudy = async (payload: CreateStudyPayload): Promise<StudyDetail> => {
  const { data } = await apiClient.post<StudyDetail>('/studies', payload);
  return data;
};

export interface UpdateStudyPayload extends Partial<CreateStudyPayload> {}

export const updateStudy = async (studyId: string, payload: UpdateStudyPayload): Promise<StudyDetail> => {
  const { data } = await apiClient.patch<StudyDetail>(`/studies/${studyId}`, payload);
  return data;
};

export const deleteStudy = async (studyId: string) => {
  await apiClient.delete(`/studies/${studyId}`);
};

export const fetchStudyTypes = async (): Promise<StudyType[]> => {
  const { data } = await apiClient.get<StudyType[]>('/meta/study-types');
  return data;
};

export const fetchPeople = async (): Promise<Person[]> => {
  const { data } = await apiClient.get<Person[]>('/meta/people');
  return data;
};

export const fetchRoles = async (): Promise<Role[]> => {
  const { data } = await apiClient.get<Role[]>('/meta/roles');
  return data;
};

export const fetchAssignments = async (studyId: string): Promise<StudyAssignment[]> => {
  const { data } = await apiClient.get<StudyAssignment[]>('/assignments', { params: { studyId } });
  return data;
};

export interface CreateAssignmentPayload {
  studyId: string;
  personId: string;
  roleId: string;
  effortPercent?: number;
  hoursPerWeek?: number;
  startDate: string;
  endDate?: string;
}

export const createAssignment = async (payload: CreateAssignmentPayload): Promise<StudyAssignment> => {
  const { data } = await apiClient.post<StudyAssignment>('/assignments', payload);
  return data;
};

export interface UpdateAssignmentPayload extends Partial<CreateAssignmentPayload> {}

export const updateAssignment = async (
  assignmentId: string,
  payload: UpdateAssignmentPayload,
): Promise<StudyAssignment> => {
  const { data } = await apiClient.patch<StudyAssignment>(`/assignments/${assignmentId}`, payload);
  return data;
};

export const deleteAssignment = async (assignmentId: string) => {
  await apiClient.delete(`/assignments/${assignmentId}`);
};

export interface UpsertBudgetPayload {
  studyId: string;
  currency?: string;
  totalDirect?: number;
  totalIndirect?: number;
  startDate?: string;
  endDate?: string;
}

export const upsertBudget = async (payload: UpsertBudgetPayload): Promise<Budget> => {
  const { data } = await apiClient.post<Budget>('/budgets', payload);
  return data;
};

export interface AddBudgetLinePayload {
  budgetId: string;
  category: string;
  amount: number;
  personId?: string;
  note?: string;
}

export const addBudgetLine = async (payload: AddBudgetLinePayload): Promise<BudgetLine> => {
  const { data } = await apiClient.post<BudgetLine>('/budgets/lines', payload);
  return data;
};

export const fetchTasks = async (studyId: string): Promise<Task[]> => {
  const { data } = await apiClient.get<Task[]>('/tasks', { params: { studyId } });
  return data;
};

export const updateTaskStatus = async (taskId: string, status: Task['status']): Promise<Task> => {
  const { data } = await apiClient.patch<Task>(`/tasks/${taskId}`, { status });
  return data;
};

export interface TransitionIrbPayload {
  studyId: string;
  targetStatus: string;
  note?: string;
  expeditedCategory?: string;
  meetingDate?: string;
  determinedAt?: string;
}

export const transitionIRBStatus = async (payload: TransitionIrbPayload): Promise<IRBSubmission> => {
  const { data } = await apiClient.post<IRBSubmission>('/irb/transition', payload);
  return data;
};

export const updateIRBPath = async (
  studyId: string,
  path: 'UNSET' | 'EXEMPT' | 'EXPEDITED' | 'CONVENED',
): Promise<IRBSubmission> => {
  const { data } = await apiClient.patch<IRBSubmission>(`/irb/${studyId}/path`, { path });
  return data;
};
