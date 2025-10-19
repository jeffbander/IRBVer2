import { z } from 'zod';

export const irbStatusTransitionSchema = z.object({
  studyId: z.string().uuid(),
  targetStatus: z.enum([
    'READY_TO_SUBMIT',
    'SUBMITTED',
    'PRE_REVIEW',
    'MODIFICATIONS_REQUESTED',
    'RESUBMITTED',
    'EXEMPT_DETERMINATION',
    'EXPEDITED_APPROVED',
    'MEETING_SCHEDULED',
    'APPROVED',
    'CONDITIONALLY_APPROVED',
    'DEFERRED',
    'NOT_APPROVED',
  ]),
  note: z.string().optional(),
  expeditedCategory: z.string().optional(),
  meetingDate: z.string().optional(),
  determinedAt: z.string().optional(),
  actorId: z.string().optional(),
});

export type IRBStatusTransitionInput = z.infer<typeof irbStatusTransitionSchema>;

export const createSubmissionSchema = z.object({
  studyId: z.string().uuid(),
  path: z.enum(['UNSET', 'EXEMPT', 'EXPEDITED', 'CONVENED']).default('UNSET'),
  submittedAt: z.string().optional(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
