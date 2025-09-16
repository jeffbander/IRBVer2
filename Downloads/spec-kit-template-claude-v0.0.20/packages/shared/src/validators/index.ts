import { z } from 'zod';
import { StudyStatus, StudyPhase, ParticipantStatus, UserRole } from '../types';

export const StudySchema = z.object({
  id: z.string().uuid(),
  protocolNumber: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  status: z.nativeEnum(StudyStatus),
  phase: z.nativeEnum(StudyPhase),
  startDate: z.date(),
  endDate: z.date().optional(),
  targetEnrollment: z.number().int().positive(),
  currentEnrollment: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ParticipantSchema = z.object({
  id: z.string().uuid(),
  studyId: z.string().uuid(),
  externalId: z.string().min(1),
  status: z.nativeEnum(ParticipantStatus),
  enrollmentDate: z.date(),
  withdrawalDate: z.date().optional(),
  withdrawalReason: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.nativeEnum(UserRole),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateStudySchema = StudySchema.omit({
  id: true,
  currentEnrollment: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateStudySchema = CreateStudySchema.partial();

export const CreateParticipantSchema = ParticipantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateParticipantSchema = CreateParticipantSchema.partial();