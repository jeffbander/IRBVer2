import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { HttpError } from './errorHandler';
import type { AuthenticatedUser } from '../types/auth';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

const ensureConfig = () => {
  if (!env.oidc.issuer) {
    throw new HttpError(500, 'OIDC issuer is not configured');
  }

  if (!jwks) {
    const issuer = env.oidc.issuer.replace(/\/?$/, '/');
    const jwksUrl = new URL('protocol/openid-connect/certs', issuer);
    jwks = createRemoteJWKSet(jwksUrl);
  }

  return jwks;
};

const extractRoles = (payload: JWTPayload): string[] => {
  const roles = new Set<string>();
  const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
  if (realmAccess?.roles) {
    realmAccess.roles.forEach((role) => roles.add(role));
  }

  const resourceAccess = payload.resource_access as Record<string, { roles?: string[] }> | undefined;
  if (resourceAccess) {
    Object.values(resourceAccess).forEach((resource) => {
      resource.roles?.forEach((role) => roles.add(role));
    });
  }

  const scope = typeof payload.scope === 'string' ? payload.scope.split(' ') : [];
  scope.filter(Boolean).forEach((entry) => roles.add(entry));

  return Array.from(roles);
};

const buildUser = (payload: JWTPayload): AuthenticatedUser => {
  const roles = extractRoles(payload);
  if (!roles.length) {
    roles.push('viewer');
  }

  const user: AuthenticatedUser = {
    id: typeof payload.sub === 'string' ? payload.sub : 'unknown',
    roles,
    raw: payload as Record<string, unknown>,
  };

  if (typeof payload.email === 'string') {
    user.email = payload.email;
  }

  if (typeof payload.name === 'string') {
    user.name = payload.name;
  }

  return user;
};

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (req.method === 'OPTIONS') {
      return next();
    }

    if (!env.oidc.issuer) {
      // Allow development usage without auth configuration.
      req.user = {
        id: 'dev-user',
        roles: ['pi', 'coordinator', 'regulatory', 'dept_admin', 'finance', 'irb_liaison', 'viewer'],
        name: 'Development User',
      };
      return next();
    }

    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new HttpError(401, 'Missing bearer token');
    }

    const token = authorization.slice(7).trim();
    const verifyOptions: { issuer: string; audience?: string | string[] } = {
      issuer: env.oidc.issuer,
    };

    if (env.oidc.audiences.length > 0) {
      const audiences = env.oidc.audiences;
      verifyOptions.audience = audiences.length === 1 ? audiences[0]! : audiences;
    }

    const { payload } = await jwtVerify(token, ensureConfig(), verifyOptions);

    req.user = buildUser(payload);
    return next();
  } catch (error) {
    if (error instanceof HttpError) {
      return next(error);
    }
    return next(new HttpError(401, 'Invalid or expired token', error));
  }
};
