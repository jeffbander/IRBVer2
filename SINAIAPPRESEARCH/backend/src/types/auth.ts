export interface AuthenticatedUser {
  id: string;
  email?: string;
  name?: string;
  roles: string[];
  raw?: Record<string, unknown>;
}

export const Role = {
  PI: 'pi',
  CO_INVESTIGATOR: 'co_i',
  COORDINATOR: 'coordinator',
  REGULATORY: 'regulatory',
  DEPARTMENT_ADMIN: 'dept_admin',
  IRB_LIAISON: 'irb_liaison',
  FINANCE: 'finance',
  VIEWER: 'viewer',
} as const;

export type RoleValue = (typeof Role)[keyof typeof Role];
