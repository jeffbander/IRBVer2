import request from 'supertest';
import express from 'express';
import { setupTestEnvironment, teardownTestEnvironment, TestDatabase, TestRedis } from '@research-study/shared';

describe('Studies API Contract Tests', () => {
  let app: express.Application;
  let db: TestDatabase;
  let redis: TestRedis;
  let authToken: string;

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
    app.get('/api/v1/studies', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.post('/api/v1/studies', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.get('/api/v1/studies/:studyId', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.patch('/api/v1/studies/:studyId', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });

    app.post('/api/v1/studies/:studyId/submit-irb', (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });
  });

  afterAll(async () => {
    await teardownTestEnvironment(db, redis);
  });

  describe('GET /studies', () => {
    it('should return paginated list of studies', async () => {
      const response = await request(app)
        .get('/api/v1/studies')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/studies?status=APPROVED')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      // All returned studies should have status APPROVED
    });

    it('should filter by PI', async () => {
      const response = await request(app)
        .get('/api/v1/studies?piId=uuid-here')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/studies?page=2&limit=10')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/studies');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /studies', () => {
    it('should create new study with required fields', async () => {
      const newStudy = {
        title: 'Phase 2 Study of Novel Cancer Treatment',
        type: 'DRUG_IND',
        protocolNumber: 'MSH-2025-001',
        description: 'A randomized controlled trial testing efficacy',
        principalInvestigatorId: 'pi-user-id',
      };

      const response = await request(app)
        .post('/api/v1/studies')
        .set('Authorization', authToken)
        .send(newStudy);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(newStudy.title);
      expect(response.body.type).toBe(newStudy.type);
      expect(response.body.protocolNumber).toBe(newStudy.protocolNumber);
      expect(response.body.status).toBe('DRAFT');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should reject study without title', async () => {
      const response = await request(app)
        .post('/api/v1/studies')
        .set('Authorization', authToken)
        .send({
          type: 'DRUG_IND',
          principalInvestigatorId: 'pi-user-id',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject study without type', async () => {
      const response = await request(app)
        .post('/api/v1/studies')
        .set('Authorization', authToken)
        .send({
          title: 'Study Title',
          principalInvestigatorId: 'pi-user-id',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject study without PI', async () => {
      const response = await request(app)
        .post('/api/v1/studies')
        .set('Authorization', authToken)
        .send({
          title: 'Study Title',
          type: 'DRUG_IND',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate title length (max 500)', async () => {
      const response = await request(app)
        .post('/api/v1/studies')
        .set('Authorization', authToken)
        .send({
          title: 'a'.repeat(501),
          type: 'DRUG_IND',
          principalInvestigatorId: 'pi-user-id',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate study type enum', async () => {
      const response = await request(app)
        .post('/api/v1/studies')
        .set('Authorization', authToken)
        .send({
          title: 'Study Title',
          type: 'INVALID_TYPE',
          principalInvestigatorId: 'pi-user-id',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should require proper authorization role', async () => {
      const response = await request(app)
        .post('/api/v1/studies')
        .set('Authorization', 'Bearer participant-token')
        .send({
          title: 'Study Title',
          type: 'DRUG_IND',
          principalInvestigatorId: 'pi-user-id',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /studies/:studyId', () => {
    const studyId = 'test-study-id';

    it('should return study details', async () => {
      const response = await request(app)
        .get(`/api/v1/studies/${studyId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', studyId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('principalInvestigator');
      expect(response.body.principalInvestigator).toHaveProperty('id');
      expect(response.body.principalInvestigator).toHaveProperty('firstName');
      expect(response.body.principalInvestigator).toHaveProperty('lastName');
    });

    it('should return 404 for non-existent study', async () => {
      const response = await request(app)
        .get('/api/v1/studies/non-existent-id')
        .set('Authorization', authToken);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/studies/${studyId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /studies/:studyId', () => {
    const studyId = 'test-study-id';

    it('should update study fields', async () => {
      const updates = {
        title: 'Updated Study Title',
        description: 'Updated description',
        status: 'READY_TO_SUBMIT',
      };

      const response = await request(app)
        .patch(`/api/v1/studies/${studyId}`)
        .set('Authorization', authToken)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updates.title);
      expect(response.body.description).toBe(updates.description);
      expect(response.body.status).toBe(updates.status);
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should validate status transitions', async () => {
      const response = await request(app)
        .patch(`/api/v1/studies/${studyId}`)
        .set('Authorization', authToken)
        .send({
          status: 'APPROVED', // Cannot go directly to APPROVED
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should require edit permissions', async () => {
      const response = await request(app)
        .patch(`/api/v1/studies/${studyId}`)
        .set('Authorization', 'Bearer readonly-token')
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent study', async () => {
      const response = await request(app)
        .patch('/api/v1/studies/non-existent-id')
        .set('Authorization', authToken)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /studies/:studyId/submit-irb', () => {
    const studyId = 'test-study-id';

    it('should submit study to IRB', async () => {
      const response = await request(app)
        .post(`/api/v1/studies/${studyId}/submit-irb`)
        .set('Authorization', authToken)
        .send({
          reviewPath: 'EXPEDITED',
          notes: 'Ready for expedited review per category 7',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('studyId', studyId);
      expect(response.body).toHaveProperty('submissionNumber');
      expect(response.body).toHaveProperty('reviewPath', 'EXPEDITED');
      expect(response.body).toHaveProperty('status', 'SUBMITTED');
      expect(response.body).toHaveProperty('submittedAt');
    });

    it('should validate review path', async () => {
      const response = await request(app)
        .post(`/api/v1/studies/${studyId}/submit-irb`)
        .set('Authorization', authToken)
        .send({
          reviewPath: 'INVALID_PATH',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should require study to be ready', async () => {
      const response = await request(app)
        .post('/api/v1/studies/draft-study-id/submit-irb')
        .set('Authorization', authToken)
        .send({
          reviewPath: 'EXPEDITED',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      // Error should indicate missing required documents or status
    });

    it('should require submit permissions', async () => {
      const response = await request(app)
        .post(`/api/v1/studies/${studyId}/submit-irb`)
        .set('Authorization', 'Bearer no-submit-token')
        .send({
          reviewPath: 'EXPEDITED',
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });
});