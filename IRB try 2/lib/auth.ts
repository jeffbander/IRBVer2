import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { config } from './env';

const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRES_IN = config.jwt.expiresIn;
const BCRYPT_ROUNDS = config.security.bcryptRounds;

export interface TokenPayload {
  userId: string;
  email: string;
  role: {
    id: string;
    name: string;
    permissions: any;
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: TokenPayload): string {
  // @ts-ignore - JWT_EXPIRES_IN type inference issue with string literals
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export async function createUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
}) {
  const hashedPassword = await hashPassword(data.password);

  return prisma.user.create({
    data: {
      ...data,
      password: hashedPassword,
    },
    include: {
      role: true,
    },
  });
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user || !user.active) {
    return null;
  }

  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    return null;
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: {
      id: user.role.id,
      name: user.role.name,
      permissions: user.role.permissions,
    },
  });

  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

export async function logAuditEvent(data: {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: any;
  ipAddress?: string;
}) {
  return prisma.auditLog.create({
    data,
  });
}