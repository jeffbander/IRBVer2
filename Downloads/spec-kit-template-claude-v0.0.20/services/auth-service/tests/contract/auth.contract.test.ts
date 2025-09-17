import request from 'supertest';
import { Express } from 'express';
import { UserRole } from '@research-platform/shared';

// Contract tests define the API contract - what endpoints exist and their expected behavior
// These tests are written first to define the interface before implementation

describe('Authentication API Contract', () => {
  let app: Express;

  beforeAll(async () => {
    // App will be created in implementation phase
    // This is a placeholder that will be replaced
    app = {} as Express;
  });

  afterAll(async () => {
    // Cleanup connections
  });

  describe('POST /auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        email: 'researcher@mountsinai.org',
        password: 'SecurePass123!',
        firstName: 'Dr. Jane',
        lastName: 'Smith',
        role: UserRole.PRINCIPAL_INVESTIGATOR,
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: expect.any(String),
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            active: true,
            isEmailVerified: false,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresIn: expect.any(Number),
        },
      });

      // Ensure password is not returned
      expect(response.body.data.user.passwordHash).toBeUndefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('email'),
        },
      });
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'researcher@mountsinai.org',
        password: 'weak',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('password'),
        },
      });
    });

    it('should reject registration with duplicate email', async () => {
      const userData = {
        email: 'duplicate@mountsinai.org',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      // First registration
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: expect.stringContaining('already exists'),
        },
      });
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Register a test user for login tests
      const userData = {
        email: 'logintest@mountsinai.org',
        password: 'SecurePass123!',
        firstName: 'Login',
        lastName: 'Test',
      };

      await request(app)
        .post('/auth/register')
        .send(userData);
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'logintest@mountsinai.org',
        password: 'SecurePass123!',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: expect.any(String),
            email: loginData.email,
            firstName: 'Login',
            lastName: 'Test',
            role: expect.any(String),
            active: true,
          },
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresIn: expect.any(Number),
        },
      });

      // Ensure password is not returned
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@mountsinai.org',
        password: 'SecurePass123!',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: expect.stringContaining('Invalid'),
        },
      });
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'logintest@mountsinai.org',
        password: 'WrongPassword123!',
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: expect.stringContaining('Invalid'),
        },
      });
    });

    it('should handle remember me option', async () => {
      const loginData = {
        email: 'logintest@mountsinai.org',
        password: 'SecurePass123!',
        rememberMe: true,
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      // When remember me is true, refresh token should have longer expiration
      expect(response.body.data.refreshToken).toBeDefined();
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Get a refresh token from login
      const userData = {
        email: 'refreshtest@mountsinai.org',
        password: 'SecurePass123!',
        firstName: 'Refresh',
        lastName: 'Test',
      };

      await request(app)
        .post('/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresIn: expect.any(Number),
        },
      });

      // New tokens should be different from the old ones
      expect(response.body.data.accessToken).not.toBe('');
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: expect.stringContaining('Invalid'),
        },
      });
    });

    it('should reject expired refresh token', async () => {
      // This would need to be tested with a mock or by setting a very short expiration
      // For now, we define the contract expectation
      const expiredToken = 'expired.refresh.token';

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'EXPIRED_REFRESH_TOKEN',
          message: expect.stringContaining('expired'),
        },
      });
    });
  });

  describe('POST /auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Get tokens from login
      const userData = {
        email: 'logouttest@mountsinai.org',
        password: 'SecurePass123!',
        firstName: 'Logout',
        lastName: 'Test',
      };

      await request(app)
        .post('/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      accessToken = loginResponse.body.data.accessToken;
      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should logout successfully with valid tokens', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('logged out'),
      });
    });

    it('should logout from all devices', async () => {
      const response = await request(app)
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('all devices'),
      });
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('token'),
        },
      });
    });
  });

  describe('GET /auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const userData = {
        email: 'profiletest@mountsinai.org',
        password: 'SecurePass123!',
        firstName: 'Profile',
        lastName: 'Test',
        role: UserRole.STUDY_COORDINATOR,
      };

      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData);

      accessToken = registerResponse.body.data.accessToken;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: expect.any(String),
            email: 'profiletest@mountsinai.org',
            firstName: 'Profile',
            lastName: 'Test',
            role: UserRole.STUDY_COORDINATOR,
            active: true,
            isEmailVerified: false,
          },
        },
      });

      // Ensure sensitive data is not returned
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('token'),
        },
      });
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: expect.stringContaining('Invalid'),
        },
      });
    });
  });

  describe('POST /auth/change-password', () => {
    let accessToken: string;

    beforeEach(async () => {
      const userData = {
        email: 'passwordtest@mountsinai.org',
        password: 'SecurePass123!',
        firstName: 'Password',
        lastName: 'Test',
      };

      const registerResponse = await request(app)
        .post('/auth/register')
        .send(userData);

      accessToken = registerResponse.body.data.accessToken;
    });

    it('should change password with valid current password', async () => {
      const changeData = {
        currentPassword: 'SecurePass123!',
        newPassword: 'NewSecurePass456!',
      };

      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(changeData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('changed'),
      });
    });

    it('should reject password change with wrong current password', async () => {
      const changeData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewSecurePass456!',
      };

      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(changeData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: expect.stringContaining('current password'),
        },
      });
    });

    it('should reject weak new password', async () => {
      const changeData = {
        currentPassword: 'SecurePass123!',
        newPassword: 'weak',
      };

      const response = await request(app)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(changeData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('password'),
        },
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const loginData = {
        email: 'nonexistent@mountsinai.org',
        password: 'WrongPassword123!',
      };

      // Make multiple failed attempts
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);

      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate limited response should have proper structure
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body).toMatchObject({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: expect.stringContaining('rate limit'),
          },
        });
      }
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401); // Will fail auth but should have headers

      expect(response.headers).toMatchObject({
        'x-content-type-options': 'nosniff',
        'x-frame-options': expect.any(String),
        'x-xss-protection': expect.any(String),
      });
    });
  });
});