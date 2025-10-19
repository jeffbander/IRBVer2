import { config } from 'dotenv';

config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseList = (value: string | undefined): string[] => {
  if (!value) return [];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
};

const corsOrigins = parseList(process.env.CORS_ORIGIN);
if (!corsOrigins.length) {
  corsOrigins.push('http://localhost:5173');
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseNumber(process.env.PORT, 4000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5442/research_study',
  corsOrigins,
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    accessKey: process.env.S3_ACCESS_KEY ?? 'local-minio',
    secretKey: process.env.S3_SECRET_KEY ?? 'local-minio-secret',
    bucket: process.env.S3_BUCKET ?? 'research-documents',
  },
  oidc: {
    issuer: process.env.OIDC_ISSUER,
    audiences: parseList(process.env.OIDC_AUDIENCE),
  },
};

export const isProduction = env.nodeEnv === 'production';
