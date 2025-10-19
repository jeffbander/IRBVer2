import { z } from 'zod';

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
