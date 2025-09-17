import request from 'supertest';
import express from 'express';
import { setupTestEnvironment, teardownTestEnvironment, TestDatabase, TestRedis } from '@research-study/shared';
import { AnswerType, WithdrawalReason, DataRetentionOption } from '@research-study/shared';

describe('Participant Screening & Withdrawal API Contract Tests', () => {
  let app: express.Application;
  let db: TestDatabase;
  let redis: TestRedis;
  let authToken: string;
  const participantId = 'test-participant-id';
  const questionnaireId = 'test-questionnaire-id';

  beforeAll(async () => {
    const env = await setupTestEnvironment();
    db = env.db;
    redis = env.redis;

    app = express();
    app.use(express.json());
    authToken = 'Bearer test-token';

    // Temporary routes - will be replaced with actual implementation
    app.post('/api/v1/participants/:participantId/screening', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.get('/api/v1/participants/:participantId/screening', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.post('/api/v1/participants/:participantId/withdraw', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.get('/api/v1/participants/:participantId/withdrawal', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.post('/api/v1/participants/:participantId/communications', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.get('/api/v1/participants/:participantId/communications', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });
  });

  afterAll(async () => {
    await teardownTestEnvironment(db, redis);
  });

  describe('Screening Management', () => {
    describe('POST /participants/:participantId/screening', () => {
      it('should submit screening responses with eligibility evaluation', async () => {
        const screeningData = {
          questionnaireId,
          responses: [
            {
              questionId: 'q1',
              questionText: 'Are you 18 years or older?',
              answerType: AnswerType.BOOLEAN,
              answer: true,
              required: true,
            },
            {
              questionId: 'q2',
              questionText: 'Do you have any heart conditions?',
              answerType: AnswerType.SINGLE_CHOICE,
              answer: 'No',
              required: true,
            },
            {
              questionId: 'q3',
              questionText: 'Rate your overall health (1-10)',
              answerType: AnswerType.SCALE,
              answer: 8,
              required: false,
            },
            {
              questionId: 'q4',
              questionText: 'List any medications you are taking',
              answerType: AnswerType.TEXT,
              answer: 'Aspirin, Vitamin D',
              required: false,
            },
          ],
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/screening`)
          .set('Authorization', authToken)
          .send(screeningData);

        expect(response.status).toBe(201);
        expect(response.body).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            participantId,
            questionnaireId,
            responses: expect.arrayContaining([
              expect.objectContaining({
                questionId: 'q1',
                questionText: 'Are you 18 years or older?',
                answerType: AnswerType.BOOLEAN,
                answer: true,
                required: true,
              }),
            ]),
            eligibilityResult: expect.objectContaining({
              eligible: expect.any(Boolean),
              criteria: expect.any(Array),
              reviewRequired: expect.any(Boolean),
            }),
            completedDate: expect.any(String),
          })
        );
      });

      it('should handle multiple choice answers', async () => {
        const screeningData = {
          questionnaireId,
          responses: [
            {
              questionId: 'q5',
              questionText: 'Which of the following apply to you?',
              answerType: AnswerType.MULTIPLE_CHOICE,
              answer: ['Hypertension', 'Diabetes'],
              required: true,
            },
          ],
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/screening`)
          .set('Authorization', authToken)
          .send(screeningData);

        expect(response.status).toBe(201);
        expect(response.body.responses[0].answer).toEqual(['Hypertension', 'Diabetes']);
      });

      it('should validate required responses', async () => {
        const screeningData = {
          questionnaireId,
          responses: [
            {
              questionId: 'q1',
              questionText: 'Are you 18 years or older?',
              answerType: AnswerType.BOOLEAN,
              answer: null, // Missing required answer
              required: true,
            },
          ],
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/screening`)
          .set('Authorization', authToken)
          .send(screeningData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('required');
      });

      it('should validate answer types', async () => {
        const screeningData = {
          questionnaireId,
          responses: [
            {
              questionId: 'q3',
              questionText: 'Rate your overall health (1-10)',
              answerType: AnswerType.SCALE,
              answer: 'invalid number', // Should be number
              required: true,
            },
          ],
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/screening`)
          .set('Authorization', authToken)
          .send(screeningData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('answer type');
      });

      it('should calculate eligibility based on criteria', async () => {
        const screeningData = {
          questionnaireId,
          responses: [
            {
              questionId: 'q1',
              questionText: 'Are you 18 years or older?',
              answerType: AnswerType.BOOLEAN,
              answer: false, // This should make participant ineligible
              required: true,
            },
          ],
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/screening`)
          .set('Authorization', authToken)
          .send(screeningData);

        expect(response.status).toBe(201);
        expect(response.body.eligibilityResult.eligible).toBe(false);
        expect(response.body.eligibilityResult.reason).toContain('age requirement');
      });

      it('should flag responses requiring manual review', async () => {
        const screeningData = {
          questionnaireId,
          responses: [
            {
              questionId: 'q6',
              questionText: 'Do you have any serious medical conditions?',
              answerType: AnswerType.TEXT,
              answer: 'Yes, I have a rare heart condition that requires manual review',
              required: true,
            },
          ],
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/screening`)
          .set('Authorization', authToken)
          .send(screeningData);

        expect(response.status).toBe(201);
        expect(response.body.eligibilityResult.reviewRequired).toBe(true);
      });
    });

    describe('GET /participants/:participantId/screening', () => {
      it('should return screening history', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}/screening`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          expect(response.body[0]).toEqual(
            expect.objectContaining({
              id: expect.any(String),
              participantId,
              questionnaireId: expect.any(String),
              responses: expect.any(Array),
              eligibilityResult: expect.any(Object),
              completedDate: expect.any(String),
            })
          );
        }
      });

      it('should filter by questionnaire', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}/screening?questionnaireId=${questionnaireId}`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should include review status', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}/screening?includeReview=true`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });

  describe('Withdrawal Management', () => {
    describe('POST /participants/:participantId/withdraw', () => {
      it('should process withdrawal request with data retention', async () => {
        const withdrawalData = {
          effectiveDate: '2025-02-01T00:00:00.000Z',
          reason: WithdrawalReason.PERSONAL_REASONS,
          dataRetention: DataRetentionOption.RETAIN_ANONYMIZED,
          futureContact: false,
          notifications: true,
          notes: 'Participant requested withdrawal due to time constraints',
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/withdraw`)
          .set('Authorization', authToken)
          .send(withdrawalData);

        expect(response.status).toBe(201);
        expect(response.body).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            participantId,
            requestDate: expect.any(String),
            effectiveDate: withdrawalData.effectiveDate,
            reason: WithdrawalReason.PERSONAL_REASONS,
            dataRetention: DataRetentionOption.RETAIN_ANONYMIZED,
            futureContact: false,
            status: 'REQUESTED',
            notifications: true,
          })
        );
      });

      it('should handle withdrawal with custom reason', async () => {
        const withdrawalData = {
          effectiveDate: '2025-02-15T00:00:00.000Z',
          reason: WithdrawalReason.OTHER,
          customReason: 'Moving to different country, unable to continue participation',
          dataRetention: DataRetentionOption.DELETE_ALL,
          futureContact: false,
          notifications: false,
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/withdraw`)
          .set('Authorization', authToken)
          .send(withdrawalData);

        expect(response.status).toBe(201);
        expect(response.body.reason).toBe(WithdrawalReason.OTHER);
        expect(response.body.customReason).toBe(withdrawalData.customReason);
      });

      it('should require custom reason when reason is OTHER', async () => {
        const withdrawalData = {
          effectiveDate: '2025-02-01T00:00:00.000Z',
          reason: WithdrawalReason.OTHER,
          // Missing customReason
          dataRetention: DataRetentionOption.RETAIN_ALL,
          futureContact: true,
          notifications: true,
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/withdraw`)
          .set('Authorization', authToken)
          .send(withdrawalData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Custom reason required');
      });

      it('should validate effective date is not in the past', async () => {
        const withdrawalData = {
          effectiveDate: '2020-01-01T00:00:00.000Z', // Past date
          reason: WithdrawalReason.PERSONAL_REASONS,
          dataRetention: DataRetentionOption.RETAIN_ANONYMIZED,
          futureContact: false,
          notifications: true,
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/withdraw`)
          .set('Authorization', authToken)
          .send(withdrawalData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('effective date');
      });

      it('should handle adverse event withdrawal', async () => {
        const withdrawalData = {
          effectiveDate: '2025-01-25T00:00:00.000Z',
          reason: WithdrawalReason.ADVERSE_EVENT,
          dataRetention: DataRetentionOption.RETAIN_ALL,
          futureContact: true,
          notifications: true,
          notes: 'Participant experienced serious adverse event - detailed report filed separately',
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/withdraw`)
          .set('Authorization', authToken)
          .send(withdrawalData);

        expect(response.status).toBe(201);
        expect(response.body.reason).toBe(WithdrawalReason.ADVERSE_EVENT);
        expect(response.body.dataRetention).toBe(DataRetentionOption.RETAIN_ALL);
      });

      it('should handle investigator-initiated withdrawal', async () => {
        const withdrawalData = {
          effectiveDate: '2025-01-30T00:00:00.000Z',
          reason: WithdrawalReason.PROTOCOL_VIOLATION,
          dataRetention: DataRetentionOption.RETAIN_ANONYMIZED,
          futureContact: false,
          notifications: false,
          notes: 'Multiple protocol violations - withdrawal initiated by PI',
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/withdraw`)
          .set('Authorization', authToken)
          .send(withdrawalData);

        expect(response.status).toBe(201);
        expect(response.body.reason).toBe(WithdrawalReason.PROTOCOL_VIOLATION);
      });
    });

    describe('GET /participants/:participantId/withdrawal', () => {
      it('should return withdrawal request details', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}/withdrawal`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            participantId,
            requestDate: expect.any(String),
            effectiveDate: expect.any(String),
            reason: expect.any(String),
            dataRetention: expect.any(String),
            status: expect.any(String),
          })
        );
      });

      it('should return 404 if no withdrawal request exists', async () => {
        const response = await request(app)
          .get('/api/v1/participants/active-participant/withdrawal')
          .set('Authorization', authToken);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('No withdrawal request found');
      });
    });
  });

  describe('Communication Management', () => {
    describe('POST /participants/:participantId/communications', () => {
      it('should send immediate communication', async () => {
        const communicationData = {
          studyId: 'test-study-id',
          type: 'WELCOME',
          method: 'EMAIL',
          subject: 'Welcome to the Research Study',
          content: 'Thank you for participating in our research study. Here is important information...',
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/communications`)
          .set('Authorization', authToken)
          .send(communicationData);

        expect(response.status).toBe(201);
        expect(response.body).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            participantId,
            type: 'WELCOME',
            method: 'EMAIL',
            subject: communicationData.subject,
            status: 'PENDING',
            deliveryAttempts: 0,
          })
        );
      });

      it('should schedule future communication', async () => {
        const communicationData = {
          studyId: 'test-study-id',
          type: 'APPOINTMENT_REMINDER',
          method: 'SMS',
          subject: 'Appointment Reminder',
          content: 'Your appointment is scheduled for tomorrow at 2:00 PM.',
          scheduledDate: '2025-01-16T14:00:00.000Z',
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/communications`)
          .set('Authorization', authToken)
          .send(communicationData);

        expect(response.status).toBe(201);
        expect(response.body.scheduledDate).toBe(communicationData.scheduledDate);
        expect(response.body.status).toBe('SCHEDULED');
      });

      it('should use communication template', async () => {
        const communicationData = {
          studyId: 'test-study-id',
          type: 'FOLLOW_UP',
          method: 'EMAIL',
          subject: 'Follow-up Visit',
          content: 'Template will be applied server-side',
          templateId: 'template-123',
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/communications`)
          .set('Authorization', authToken)
          .send(communicationData);

        expect(response.status).toBe(201);
        expect(response.body.templateId).toBe('template-123');
      });

      it('should validate required fields', async () => {
        const communicationData = {
          studyId: 'test-study-id',
          type: 'GENERAL',
          // Missing method, subject, and content
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/communications`)
          .set('Authorization', authToken)
          .send(communicationData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('required');
      });
    });

    describe('GET /participants/:participantId/communications', () => {
      it('should return communication history', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}/communications`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          expect(response.body[0]).toEqual(
            expect.objectContaining({
              id: expect.any(String),
              participantId,
              type: expect.any(String),
              method: expect.any(String),
              subject: expect.any(String),
              status: expect.any(String),
              deliveryAttempts: expect.any(Number),
              createdAt: expect.any(String),
            })
          );
        }
      });

      it('should filter by communication type', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}/communications?type=WELCOME`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should filter by status', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}/communications?status=SENT`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should paginate results', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}/communications?page=1&limit=10`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete enrollment workflow', async () => {
      // 1. Create participant
      const participantData = {
        studyId: 'test-study-integration',
        externalId: 'INT-001',
        consentVersion: '1.0',
      };

      let response = await request(app)
        .post('/api/v1/participants')
        .set('Authorization', authToken)
        .send(participantData);

      expect(response.status).toBe(201);
      const newParticipantId = response.body.id;

      // 2. Submit screening
      const screeningData = {
        questionnaireId: 'integration-questionnaire',
        responses: [
          {
            questionId: 'q1',
            questionText: 'Are you eligible?',
            answerType: AnswerType.BOOLEAN,
            answer: true,
            required: true,
          },
        ],
      };

      response = await request(app)
        .post(`/api/v1/participants/${newParticipantId}/screening`)
        .set('Authorization', authToken)
        .send(screeningData);

      expect(response.status).toBe(201);
      expect(response.body.eligibilityResult.eligible).toBe(true);

      // 3. Record consent
      const consentData = {
        studyId: 'test-study-integration',
        version: '1.0',
        consentType: 'MAIN_STUDY',
        electronicSignature: 'Integration Test User',
      };

      response = await request(app)
        .post(`/api/v1/participants/${newParticipantId}/consent`)
        .set('Authorization', authToken)
        .send(consentData);

      expect(response.status).toBe(201);

      // 4. Update status to enrolled
      response = await request(app)
        .patch(`/api/v1/participants/${newParticipantId}`)
        .set('Authorization', authToken)
        .send({ status: 'ENROLLED' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ENROLLED');
    });

    it('should handle screening failure workflow', async () => {
      // Submit screening that should fail
      const screeningData = {
        questionnaireId: 'failure-test',
        responses: [
          {
            questionId: 'q1',
            questionText: 'Are you 18 years or older?',
            answerType: AnswerType.BOOLEAN,
            answer: false, // Should cause screen failure
            required: true,
          },
        ],
      };

      const response = await request(app)
        .post(`/api/v1/participants/${participantId}/screening`)
        .set('Authorization', authToken)
        .send(screeningData);

      expect(response.status).toBe(201);
      expect(response.body.eligibilityResult.eligible).toBe(false);
    });
  });
});