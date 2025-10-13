// Environment configuration validation
// This ensures required environment variables are set and provides helpful error messages

function getRequiredEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;

  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    console.warn(`Warning: ${name} is not set. Using fallback value.`);
  }

  return value || '';
}

function getEnvVar(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

// JWT Configuration
export const JWT_SECRET = getRequiredEnvVar('JWT_SECRET',
  process.env.NODE_ENV === 'production'
    ? undefined
    : 'dev-secret-key-please-change-in-production'
);

export const JWT_EXPIRES_IN = getEnvVar('JWT_EXPIRES_IN', '7d');

// Database Configuration
export const DATABASE_URL = getRequiredEnvVar('DATABASE_URL');

// Application Configuration
export const NODE_ENV = getEnvVar('NODE_ENV', 'development');
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_TEST = NODE_ENV === 'test';

// API Configuration
export const API_BASE_URL = getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:3001');

// Security Configuration
export const BCRYPT_ROUNDS = parseInt(getEnvVar('BCRYPT_ROUNDS', '10'));
export const MAX_LOGIN_ATTEMPTS = parseInt(getEnvVar('MAX_LOGIN_ATTEMPTS', '5'));
export const LOCKOUT_DURATION_MINUTES = parseInt(getEnvVar('LOCKOUT_DURATION_MINUTES', '30'));

// Validate critical configuration on startup
if (IS_PRODUCTION && JWT_SECRET === 'dev-secret-key-please-change-in-production') {
  throw new Error('CRITICAL: JWT_SECRET must be set to a secure value in production!');
}

if (JWT_SECRET.length < 32 && IS_PRODUCTION) {
  console.warn('WARNING: JWT_SECRET should be at least 32 characters for security');
}

export const config = {
  jwt: {
    secret: JWT_SECRET,
    expiresIn: JWT_EXPIRES_IN,
  },
  database: {
    url: DATABASE_URL,
  },
  app: {
    env: NODE_ENV,
    isProduction: IS_PRODUCTION,
    isDevelopment: IS_DEVELOPMENT,
    isTest: IS_TEST,
    apiBaseUrl: API_BASE_URL,
  },
  security: {
    bcryptRounds: BCRYPT_ROUNDS,
    maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
    lockoutDurationMinutes: LOCKOUT_DURATION_MINUTES,
  },
};
