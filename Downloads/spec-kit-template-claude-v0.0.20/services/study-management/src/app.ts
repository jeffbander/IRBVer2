import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createLogger } from '@research-study/shared';

const logger = createLogger('study-management');

export function createApp() {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3003'],
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    next();
  });

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      service: 'Mount Sinai Research Study Management API',
      version: '1.0.0',
      organization: 'Mount Sinai Health System',
      endpoints: {
        health: '/health',
        api: '/api/v1',
        auth: {
          login: 'POST /api/v1/auth/login',
          refresh: 'POST /api/v1/auth/refresh',
          logout: 'POST /api/v1/auth/logout',
        },
        studies: {
          list: 'GET /api/v1/studies',
          create: 'POST /api/v1/studies',
          get: 'GET /api/v1/studies/:studyId',
          update: 'PATCH /api/v1/studies/:studyId',
          participants: 'GET /api/v1/studies/:studyId/participants',
        },
      },
      testCredentials: {
        email: 'sarah.chen@mountsinai.org',
        password: 'Test123!',
      },
    });
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'study-management',
      timestamp: new Date().toISOString(),
      organization: 'Mount Sinai Health System',
    });
  });

  // API Routes
  const apiRouter = express.Router();

  // Auth routes (mock for now)
  apiRouter.post('/auth/login', (req, res) => {
    const { email, password } = req.body;

    // Mock authentication for testing
    if (email === 'sarah.chen@mountsinai.org' && password === 'Test123!') {
      res.json({
        accessToken: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
        user: {
          id: 'user-1',
          email: 'sarah.chen@mountsinai.org',
          firstName: 'Sarah',
          lastName: 'Chen',
          roles: ['PRINCIPAL_INVESTIGATOR'],
        },
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  apiRouter.post('/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken === 'mock-refresh-token') {
      res.json({
        accessToken: 'new-mock-jwt-token',
        refreshToken: 'new-mock-refresh-token',
        expiresIn: 3600,
      });
    } else {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  });

  apiRouter.post('/auth/logout', (_req, res) => {
    res.status(204).send();
  });

  // Studies routes (mock for now)
  const mockStudies = [
    {
      id: 'study-1',
      protocolNumber: 'MSH-2024-COVID-001',
      title: 'COVID-19 Long-term Effects Study',
      description: 'Observational study tracking long-term effects of COVID-19',
      type: 'OBSERVATIONAL',
      status: 'APPROVED',
      principalInvestigatorId: 'user-1',
      principalInvestigator: {
        id: 'user-1',
        firstName: 'Sarah',
        lastName: 'Chen',
      },
      startDate: '2024-01-01',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'study-2',
      protocolNumber: 'MSH-2024-ONC-002',
      title: 'Novel Cancer Immunotherapy Trial',
      description: 'Phase 2 trial of novel immunotherapy agent',
      type: 'DRUG_IND',
      status: 'ENROLLING',
      phase: 'PHASE_2',
      principalInvestigatorId: 'user-2',
      principalInvestigator: {
        id: 'user-2',
        firstName: 'Michael',
        lastName: 'Rodriguez',
      },
      startDate: '2024-02-01',
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-02-01T00:00:00Z',
    },
  ];

  apiRouter.get('/studies', (_req, res) => {
    res.json({
      data: mockStudies,
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      },
    });
  });

  apiRouter.post('/studies', (req, res) => {
    const newStudy = {
      id: `study-${Date.now()}`,
      ...req.body,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStudies.push(newStudy);
    res.status(201).json(newStudy);
  });

  apiRouter.get('/studies/:studyId', (req, res) => {
    const study = mockStudies.find(s => s.id === req.params.studyId);
    if (study) {
      res.json(study);
    } else {
      res.status(404).json({ error: 'Study not found' });
    }
  });

  apiRouter.patch('/studies/:studyId', (req, res) => {
    const study = mockStudies.find(s => s.id === req.params.studyId);
    if (study) {
      Object.assign(study, req.body, { updatedAt: new Date().toISOString() });
      res.json(study);
    } else {
      res.status(404).json({ error: 'Study not found' });
    }
  });

  // Participants routes (mock)
  const mockParticipants = [
    {
      id: 'participant-1',
      studyId: 'study-1',
      participantId: 'MSH-001-0001',
      status: 'ENROLLED',
      enrollmentDate: '2024-03-01',
      consentDate: '2024-03-01',
      consentVersion: '1.0',
    },
  ];

  apiRouter.get('/studies/:studyId/participants', (req, res) => {
    const participants = mockParticipants.filter(p => p.studyId === req.params.studyId);
    res.json(participants);
  });

  apiRouter.post('/studies/:studyId/participants', (req, res) => {
    const newParticipant = {
      id: `participant-${Date.now()}`,
      studyId: req.params.studyId,
      ...req.body,
      status: 'SCREENING',
      enrollmentDate: new Date().toISOString(),
    };
    mockParticipants.push(newParticipant);
    res.status(201).json(newParticipant);
  });

  // Mount API router
  app.use('/api/v1', apiRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  });

  return app;
}