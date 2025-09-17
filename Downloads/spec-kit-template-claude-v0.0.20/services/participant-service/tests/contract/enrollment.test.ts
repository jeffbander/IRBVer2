import request from 'supertest';
import express from 'express';
import { setupTestEnvironment, teardownTestEnvironment, TestDatabase, TestRedis } from '@research-study/shared';
import { ParticipantStatus, ConsentType, Gender, Race, Ethnicity, ContactMethod } from '@research-study/shared';

describe('Participant Enrollment API Contract Tests', () => {
  let app: express.Application;
  let db: TestDatabase;
  let redis: TestRedis;
  let authToken: string;
  const studyId = 'test-study-id-12345';
  const siteId = 'test-site-id-67890';

  beforeAll(async () => {
    const env = await setupTestEnvironment();
    db = env.db;
    redis = env.redis;

    // Create minimal Express app for testing
    app = express();
    app.use(express.json());

    // Mock auth token for testing
    authToken = 'Bearer test-token';

    // Temporary routes - will be replaced with actual implementation
    app.get('/api/v1/participants', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.post('/api/v1/participants', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.get('/api/v1/participants/:participantId', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.patch('/api/v1/participants/:participantId', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.post('/api/v1/participants/:participantId/consent', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.get('/api/v1/participants/:participantId/consent', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.post('/api/v1/participants/:participantId/demographics', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.get('/api/v1/participants/:participantId/demographics', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.post('/api/v1/participants/:participantId/screening', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.post('/api/v1/participants/:participantId/withdraw', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.get('/api/v1/participants/:participantId/history', (req, res) => {
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

  describe('Participant Registration', () => {
    describe('POST /participants', () => {
      it('should create new participant with minimal required data', async () => {
        const newParticipant = {
          studyId,
          externalId: 'MSH-001-0001',
          consentVersion: '1.0',
          siteId,
        };

        const response = await request(app)
          .post('/api/v1/participants')
          .set('Authorization', authToken)
          .send(newParticipant);

        expect(response.status).toBe(201);
        expect(response.body).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            studyId,
            externalId: newParticipant.externalId,
            status: ParticipantStatus.PRESCREENING,
            enrollmentDate: expect.any(String),
            siteId,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        );
      });

      it('should create participant with screening number and consent date', async () => {
        const newParticipant = {
          studyId,
          externalId: 'MSH-001-0002',
          screeningNumber: 'SCR-001',
          consentVersion: '1.0',
          consentDate: '2025-01-15T10:00:00.000Z',
          consentDocumentId: 'doc-123',
          siteId,
        };

        const response = await request(app)
          .post('/api/v1/participants')
          .set('Authorization', authToken)
          .send(newParticipant);

        expect(response.status).toBe(201);
        expect(response.body.screeningNumber).toBe(newParticipant.screeningNumber);
        expect(response.body.status).toBe(ParticipantStatus.SCREENING);
      });

      it('should validate required fields', async () => {
        const invalidParticipant = {
          externalId: 'MSH-001-0003',
          // Missing studyId and consentVersion
        };

        const response = await request(app)
          .post('/api/v1/participants')
          .set('Authorization', authToken)
          .send(invalidParticipant);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('studyId');
        expect(response.body.error).toContain('consentVersion');
      });

      it('should validate participant ID format', async () => {
        const invalidParticipant = {
          studyId,
          externalId: 'invalid id with spaces',
          consentVersion: '1.0',
        };

        const response = await request(app)
          .post('/api/v1/participants')
          .set('Authorization', authToken)
          .send(invalidParticipant);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid participant ID format');
      });

      it('should prevent duplicate participant IDs within study', async () => {
        const participant = {
          studyId,
          externalId: 'MSH-001-DUPLICATE',
          consentVersion: '1.0',
        };

        // First enrollment should succeed
        await request(app)
          .post('/api/v1/participants')
          .set('Authorization', authToken)
          .send(participant);

        // Second enrollment with same ID should fail
        const response = await request(app)
          .post('/api/v1/participants')
          .set('Authorization', authToken)
          .send(participant);

        expect(response.status).toBe(409);
        expect(response.body.error).toContain('already exists');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/v1/participants')
          .send({
            studyId,
            externalId: 'MSH-001-0004',
            consentVersion: '1.0',
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      });

      it('should require enrollment permissions', async () => {
        const response = await request(app)
          .post('/api/v1/participants')
          .set('Authorization', 'Bearer readonly-token')
          .send({
            studyId,
            externalId: 'MSH-001-0005',
            consentVersion: '1.0',
          });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Participant Management', () => {
    describe('GET /participants', () => {
      it('should return paginated list of participants', async () => {
        const response = await request(app)
          .get('/api/v1/participants')
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
          expect.objectContaining({
            participants: expect.any(Array),
            pagination: expect.objectContaining({
              page: expect.any(Number),
              limit: expect.any(Number),
              total: expect.any(Number),
              totalPages: expect.any(Number),
            }),
          })
        );
      });

      it('should filter by status', async () => {
        const response = await request(app)
          .get('/api/v1/participants?status=ENROLLED')
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.participants)).toBe(true);
      });

      it('should filter by multiple statuses', async () => {
        const response = await request(app)
          .get('/api/v1/participants?status=ENROLLED,ACTIVE')
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.participants)).toBe(true);
      });

      it('should filter by site', async () => {
        const response = await request(app)
          .get(`/api/v1/participants?siteId=${siteId}`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.participants)).toBe(true);
      });

      it('should filter by date range', async () => {
        const response = await request(app)
          .get('/api/v1/participants?startDate=2025-01-01&endDate=2025-12-31')
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.participants)).toBe(true);
      });

      it('should support search', async () => {
        const response = await request(app)
          .get('/api/v1/participants?search=MSH-001')
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.participants)).toBe(true);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/v1/participants?page=2&limit=10')
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.limit).toBe(10);
      });
    });

    describe('GET /participants/:participantId', () => {
      const participantId = 'test-participant-id';

      it('should return participant details', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
          expect.objectContaining({
            id: participantId,
            studyId: expect.any(String),
            externalId: expect.any(String),
            status: expect.any(String),
            enrollmentDate: expect.any(String),
          })
        );
      });

      it('should return 404 for non-existent participant', async () => {
        const response = await request(app)
          .get('/api/v1/participants/non-existent')
          .set('Authorization', authToken);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error');
      });

      it('should require view permissions', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}`)
          .set('Authorization', 'Bearer no-access-token');

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('PATCH /participants/:participantId', () => {
      const participantId = 'test-participant-id';

      it('should update participant status', async () => {
        const update = {
          status: ParticipantStatus.ENROLLED,
        };

        const response = await request(app)
          .patch(`/api/v1/participants/${participantId}`)
          .set('Authorization', authToken)
          .send(update);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(ParticipantStatus.ENROLLED);
        expect(response.body).toHaveProperty('updatedAt');
      });

      it('should handle withdrawal with required fields', async () => {
        const update = {
          status: ParticipantStatus.WITHDRAWN,
          withdrawalDate: '2025-01-20T14:30:00.000Z',
          withdrawalReason: 'Personal reasons',
        };

        const response = await request(app)
          .patch(`/api/v1/participants/${participantId}`)
          .set('Authorization', authToken)
          .send(update);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(ParticipantStatus.WITHDRAWN);
        expect(response.body.withdrawalDate).toBeDefined();
        expect(response.body.withdrawalReason).toBeDefined();
      });

      it('should handle completion with completion date', async () => {
        const update = {
          status: ParticipantStatus.COMPLETED,
          completionDate: '2025-06-15T12:00:00.000Z',
        };

        const response = await request(app)
          .patch(`/api/v1/participants/${participantId}`)
          .set('Authorization', authToken)
          .send(update);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe(ParticipantStatus.COMPLETED);
        expect(response.body.completionDate).toBeDefined();
      });

      it('should validate status transitions', async () => {
        // Attempt invalid transition (e.g., COMPLETED to ENROLLED)
        const update = {
          status: ParticipantStatus.ENROLLED,
        };

        const response = await request(app)
          .patch('/api/v1/participants/completed-participant')
          .set('Authorization', authToken)
          .send(update);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid status transition');
      });

      it('should require withdrawal fields when withdrawing', async () => {
        const update = {
          status: ParticipantStatus.WITHDRAWN,
          // Missing withdrawalDate and withdrawalReason
        };

        const response = await request(app)
          .patch(`/api/v1/participants/${participantId}`)
          .set('Authorization', authToken)
          .send(update);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Required fields missing');
      });

      it('should add randomization code', async () => {
        const update = {
          randomizationCode: 'RAND-001-A',
        };

        const response = await request(app)
          .patch(`/api/v1/participants/${participantId}`)
          .set('Authorization', authToken)
          .send(update);

        expect(response.status).toBe(200);
        expect(response.body.randomizationCode).toBe(update.randomizationCode);
      });

      it('should require update permissions', async () => {
        const response = await request(app)
          .patch(`/api/v1/participants/${participantId}`)
          .set('Authorization', 'Bearer readonly-token')
          .send({ status: ParticipantStatus.ACTIVE });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Informed Consent Management', () => {
    const participantId = 'test-participant-id';

    describe('POST /participants/:participantId/consent', () => {
      it('should record new consent', async () => {
        const consentData = {
          studyId,
          version: '2.0',
          consentType: ConsentType.MAIN_STUDY,
          electronicSignature: 'John Doe',
          documentId: 'consent-doc-123',
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/consent`)
          .set('Authorization', authToken)
          .send(consentData);

        expect(response.status).toBe(201);
        expect(response.body).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            participantId,
            version: '2.0',
            consentType: ConsentType.MAIN_STUDY,
            status: 'SIGNED',
            ipAddress: expect.any(String),
            consentDate: expect.any(String),
          })
        );
      });

      it('should require electronic signature', async () => {
        const consentData = {
          studyId,
          version: '2.0',
          consentType: ConsentType.MAIN_STUDY,
          // Missing electronicSignature
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/consent`)
          .set('Authorization', authToken)
          .send(consentData);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('electronicSignature');
      });

      it('should support witness information', async () => {
        const consentData = {
          studyId,
          version: '2.0',
          consentType: ConsentType.BIOSPECIMEN,
          electronicSignature: 'Jane Smith',
          witnessName: 'Dr. Wilson',
          witnessId: 'witness-123',
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/consent`)
          .set('Authorization', authToken)
          .send(consentData);

        expect(response.status).toBe(201);
        expect(response.body.witnessName).toBe('Dr. Wilson');
        expect(response.body.witnessId).toBe('witness-123');
      });
    });

    describe('GET /participants/:participantId/consent', () => {
      it('should return consent history', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}/consent`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          expect(response.body[0]).toEqual(
            expect.objectContaining({
              id: expect.any(String),
              version: expect.any(String),
              consentType: expect.any(String),
              status: expect.any(String),
              consentDate: expect.any(String),
            })
          );
        }
      });

      it('should filter by consent type', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}/consent?type=MAIN_STUDY`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });

  describe('Demographics Collection', () => {
    const participantId = 'test-participant-id';

    describe('POST /participants/:participantId/demographics', () => {
      it('should record demographics with required fields', async () => {
        const demographics = {
          dateOfBirth: '1980-05-15T00:00:00.000Z',
          gender: Gender.FEMALE,
          race: [Race.WHITE, Race.ASIAN],
          ethnicity: Ethnicity.NOT_HISPANIC_LATINO,
          primaryLanguage: 'English',
          consentToContact: true,
          preferredContactMethod: ContactMethod.EMAIL,
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/demographics`)
          .set('Authorization', authToken)
          .send(demographics);

        expect(response.status).toBe(201);
        expect(response.body).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            participantId,
            gender: Gender.FEMALE,
            race: [Race.WHITE, Race.ASIAN],
            ethnicity: Ethnicity.NOT_HISPANIC_LATINO,
            dataEncrypted: true,
          })
        );
      });

      it('should support optional contact information', async () => {
        const demographics = {
          dateOfBirth: '1975-03-22T00:00:00.000Z',
          gender: Gender.MALE,
          race: [Race.BLACK_AFRICAN_AMERICAN],
          ethnicity: Ethnicity.HISPANIC_LATINO,
          primaryLanguage: 'Spanish',
          email: 'participant@example.com',
          phoneNumber: '+1-555-123-4567',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          emergencyContactName: 'Maria Gonzalez',
          emergencyContactPhone: '+1-555-987-6543',
          emergencyContactRelation: 'Spouse',
          consentToContact: true,
          preferredContactMethod: ContactMethod.PHONE,
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/demographics`)
          .set('Authorization', authToken)
          .send(demographics);

        expect(response.status).toBe(201);
        expect(response.body.email).toBe(demographics.email);
        expect(response.body.phoneNumber).toBe(demographics.phoneNumber);
        expect(response.body.emergencyContactName).toBe(demographics.emergencyContactName);
      });

      it('should validate email format', async () => {
        const demographics = {
          dateOfBirth: '1990-01-01T00:00:00.000Z',
          gender: Gender.NON_BINARY,
          race: [Race.OTHER],
          ethnicity: Ethnicity.PREFER_NOT_TO_SAY,
          primaryLanguage: 'English',
          email: 'invalid-email-format',
          consentToContact: false,
          preferredContactMethod: ContactMethod.MAIL,
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/demographics`)
          .set('Authorization', authToken)
          .send(demographics);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('email');
      });

      it('should validate phone number format', async () => {
        const demographics = {
          dateOfBirth: '1985-12-10T00:00:00.000Z',
          gender: Gender.PREFER_NOT_TO_SAY,
          race: [Race.NATIVE_HAWAIIAN_PACIFIC_ISLANDER],
          ethnicity: Ethnicity.NOT_HISPANIC_LATINO,
          primaryLanguage: 'English',
          phoneNumber: 'invalid-phone',
          consentToContact: true,
          preferredContactMethod: ContactMethod.SMS,
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/demographics`)
          .set('Authorization', authToken)
          .send(demographics);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('phone');
      });

      it('should validate ZIP code format', async () => {
        const demographics = {
          dateOfBirth: '1992-07-30T00:00:00.000Z',
          gender: Gender.FEMALE,
          race: [Race.AMERICAN_INDIAN_ALASKA_NATIVE],
          ethnicity: Ethnicity.NOT_HISPANIC_LATINO,
          primaryLanguage: 'English',
          zipCode: 'invalid-zip',
          consentToContact: true,
          preferredContactMethod: ContactMethod.EMAIL,
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/demographics`)
          .set('Authorization', authToken)
          .send(demographics);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('ZIP code');
      });

      it('should validate age range', async () => {
        const demographics = {
          dateOfBirth: '1800-01-01T00:00:00.000Z', // Too old
          gender: Gender.MALE,
          race: [Race.WHITE],
          ethnicity: Ethnicity.NOT_HISPANIC_LATINO,
          primaryLanguage: 'English',
          consentToContact: true,
          preferredContactMethod: ContactMethod.EMAIL,
        };

        const response = await request(app)
          .post(`/api/v1/participants/${participantId}/demographics`)
          .set('Authorization', authToken)
          .send(demographics);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('date of birth');
      });
    });

    describe('GET /participants/:participantId/demographics', () => {
      it('should return demographics (with encryption note)', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}/demographics`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(
          expect.objectContaining({
            participantId,
            gender: expect.any(String),
            race: expect.any(Array),
            ethnicity: expect.any(String),
            dataEncrypted: true,
          })
        );
      });

      it('should require appropriate permissions for PHI access', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}/demographics`)
          .set('Authorization', 'Bearer limited-access-token');

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Participant History and Audit', () => {
    const participantId = 'test-participant-id';

    describe('GET /participants/:participantId/history', () => {
      it('should return enrollment history', async () => {
        const response = await request(app)
          .get(`/api/v1/participants/${participantId}/history`)
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          expect(response.body[0]).toEqual(
            expect.objectContaining({
              id: expect.any(String),
              participantId,
              fromStatus: expect.any(String),
              toStatus: expect.any(String),
              changedBy: expect.any(String),
              changedDate: expect.any(String),
              reason: expect.any(String),
            })
          );
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/participants')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/v1/participants')
        .set('Authorization', authToken)
        .send('some data');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return consistent error format', async () => {
      const response = await request(app)
        .get('/api/v1/participants/non-existent')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: expect.any(String),
          message: expect.any(String),
          timestamp: expect.any(String),
        })
      );
    });
  });
});