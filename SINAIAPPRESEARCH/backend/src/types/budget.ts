import { z } from 'zod';

export const upsertBudgetSchema = z.object({
  studyId: z.string().uuid(),
  currency: z.string().min(3).max(3).default('USD'),
  totalDirect: z.number().nonnegative().optional(),
  totalIndirect: z.number().nonnegative().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;

export const budgetLineSchema = z.object({
  budgetId: z.string().uuid(),
  category: z.string().min(1),
  amount: z.number().min(0),
  personId: z.string().optional(),
  note: z.string().optional(),
});

export type BudgetLineInput = z.infer<typeof budgetLineSchema>;
