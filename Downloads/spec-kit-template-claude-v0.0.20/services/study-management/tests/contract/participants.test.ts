import request from 'supertest';
import express from 'express';
import { setupTestEnvironment, teardownTestEnvironment, TestDatabase, TestRedis } from '@research-study/shared';

describe('Participants API Contract Tests', () => {
  let app: express.Application;
  let db: TestDatabase;
  let redis: TestRedis;
  let authToken: string;
  const studyId = 'test-study-id';

  beforeAll(async () => {
    const env = await setupTestEnvironment();
    db = env.db;
    redis = env.redis;

    // Create minimal Express app for testing
    app = express();
    app.use(express.json());

    // Mock auth token for testing
    authToken = 'Bearer test-token';

    // These routes will be implemented later
    app.get('/api/v1/studies/:studyId/participants', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.post('/api/v1/studies/:studyId/participants', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.patch('/api/v1/studies/:studyId/participants/:participantId', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });
  });

  afterAll(async () => {
    await teardownTestEnvironment(db, redis);
  });

  describe('GET /studies/:studyId/participants', () => {
    it('should return list of participants', async () => {
      const response = await request(app)
        .get(`/api/v1/studies/${studyId}/participants`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Each participant should have required fields
      if (response.body.length > 0) {
        const participant = response.body[0];
        expect(participant).toHaveProperty('id');
        expect(participant).toHaveProperty('participantId');
        expect(participant).toHaveProperty('status');
        expect(participant).toHaveProperty('enrollmentDate');
      }
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get(`/api/v1/studies/${studyId}/participants?status=ENROLLED`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/studies/${studyId}/participants`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent study', async () => {
      const response = await request(app)
        .get('/api/v1/studies/non-existent/participants')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should require view permissions for study', async () => {
      const response = await request(app)
        .get(`/api/v1/studies/${studyId}/participants`)
        .set('Authorization', 'Bearer no-access-token');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /studies/:studyId/participants', () => {
    it('should enroll new participant', async () => {
      const newParticipant = {
        participantId: 'MSH-001-0001',
        screeningNumber: 'SCR-001',
        consentDate: '2025-01-15',
        consentVersion: '1.0',
        consentDocumentId: 'doc-id',
      };

      const response = await request(app)
        .post(`/api/v1/studies/${studyId}/participants`)
        .set('Authorization', authToken)
        .send(newParticipant);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.participantId).toBe(newParticipant.participantId);
      expect(response.body.status).toBe('SCREENING');
      expect(response.body.consentVersion).toBe(newParticipant.consentVersion);
      expect(response.body).toHaveProperty('enrollmentDate');
    });

    it('should require participantId', async () => {
      const response = await request(app)
        .post(`/api/v1/studies/${studyId}/participants`)
        .set('Authorization', authToken)
        .send({
          consentVersion: '1.0',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should require consent version', async () => {
      const response = await request(app)
        .post(`/api/v1/studies/${studyId}/participants`)
        .set('Authorization', authToken)
        .send({
          participantId: 'MSH-001-0002',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should prevent duplicate participant IDs', async () => {
      const participant = {
        participantId: 'MSH-001-DUPLICATE',
        consentVersion: '1.0',
      };

      // First enrollment should succeed
      await request(app)
        .post(`/api/v1/studies/${studyId}/participants`)
        .set('Authorization', authToken)
        .send(participant);

      // Second enrollment with same ID should fail
      const response = await request(app)
        .post(`/api/v1/studies/${studyId}/participants`)
        .set('Authorization', authToken)
        .send(participant);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate consent date format', async () => {
      const response = await request(app)
        .post(`/api/v1/studies/${studyId}/participants`)
        .set('Authorization', authToken)
        .send({
          participantId: 'MSH-001-0003',
          consentVersion: '1.0',
          consentDate: 'invalid-date',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should require enrollment permissions', async () => {
      const response = await request(app)
        .post(`/api/v1/studies/${studyId}/participants`)
        .set('Authorization', 'Bearer no-enroll-token')
        .send({
          participantId: 'MSH-001-0004',
          consentVersion: '1.0',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /studies/:studyId/participants/:participantId', () => {
    const participantId = 'MSH-001-0001';

    it('should update participant status', async () => {
      const response = await request(app)
        .patch(`/api/v1/studies/${studyId}/participants/${participantId}`)
        .set('Authorization', authToken)
        .send({
          status: 'ENROLLED',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ENROLLED');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should handle withdrawal', async () => {
      const response = await request(app)
        .patch(`/api/v1/studies/${studyId}/participants/${participantId}`)
        .set('Authorization', authToken)
        .send({
          status: 'WITHDRAWN',
          withdrawalDate: '2025-01-20',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('WITHDRAWN');
      expect(response.body.withdrawalDate).toBeDefined();
    });

    it('should handle completion', async () => {
      const response = await request(app)
        .patch(`/api/v1/studies/${studyId}/participants/${participantId}`)
        .set('Authorization', authToken)
        .send({
          status: 'COMPLETED',
          completionDate: '2025-06-15',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('COMPLETED');
      expect(response.body.completionDate).toBeDefined();
    });

    it('should validate status transitions', async () => {
      // Cannot go from WITHDRAWN back to ENROLLED
      const response = await request(app)
        .patch(`/api/v1/studies/${studyId}/participants/withdrawn-participant`)
        .set('Authorization', authToken)
        .send({
          status: 'ENROLLED',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate status enum', async () => {
      const response = await request(app)
        .patch(`/api/v1/studies/${studyId}/participants/${participantId}`)
        .set('Authorization', authToken)
        .send({
          status: 'INVALID_STATUS',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent participant', async () => {
      const response = await request(app)
        .patch(`/api/v1/studies/${studyId}/participants/non-existent`)
        .set('Authorization', authToken)
        .send({
          status: 'ENROLLED',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should require update permissions', async () => {
      const response = await request(app)
        .patch(`/api/v1/studies/${studyId}/participants/${participantId}`)
        .set('Authorization', 'Bearer readonly-token')
        .send({
          status: 'ENROLLED',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate date formats', async () => {
      const response = await request(app)
        .patch(`/api/v1/studies/${studyId}/participants/${participantId}`)
        .set('Authorization', authToken)
        .send({
          status: 'WITHDRAWN',
          withdrawalDate: 'not-a-date',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});