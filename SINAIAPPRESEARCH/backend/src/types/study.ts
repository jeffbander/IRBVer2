import { z } from 'zod';

export const createStudySchema = z.object({
  title: z.string().min(3),
  shortTitle: z.string().min(2).max(50).optional(),
  typeId: z.string().min(2),
  riskLevel: z.enum(['MINIMAL', 'MORE_THAN_MINIMAL']),
  piId: z.string().min(1),
  sponsorName: z.string().min(1).optional(),
  sites: z.array(
    z.object({
      name: z.string().min(1),
      isInternal: z.boolean().default(true),
    }),
  ).default([]),
});

export type CreateStudyInput = z.infer<typeof createStudySchema>;

export const updateStudySchema = createStudySchema.partial();
export type UpdateStudyInput = z.infer<typeof updateStudySchema>;
