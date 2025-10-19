import { z } from 'zod';

export const createAssignmentSchema = z.object({
  studyId: z.string().uuid(),
  personId: z.string().min(1),
  roleId: z.string().min(1),
  effortPercent: z.number().min(0).max(100).optional(),
  hoursPerWeek: z.number().min(0).max(60).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const updateAssignmentSchema = createAssignmentSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
