import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminRole, PrismaClient } from '@prisma/client';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';

export type AdminIdentity = {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  sessionId?: string;
};
export const Roles = (...roles: AdminRole[]) => SetMetadata('roles', roles);
export const prisma = new PrismaClient();
const secret = (name: string, fallback: string) => {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') return '';
  return fallback;
};
export const accessSecret = () => secret('JWT_SECRET', 'phase3-development-access-secret');
export const refreshSecret = () =>
  secret('JWT_REFRESH_SECRET', 'phase3-development-refresh-secret');
export const refreshCookieName = 'admin_refresh';
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const decode = (value: string) =>
  JSON.parse(Buffer.from(value, 'base64url').toString()) as Record<string, unknown>;
function sign(payload: object, key: string) {
  if (!key) throw new UnauthorizedException('Authentication is unavailable.');
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  return `${body}.${createHmac('sha256', key).update(body).digest('base64url')}`;
}
export function verifyToken(token: string, key = accessSecret()) {
  if (!key) throw new UnauthorizedException('Authentication is unavailable.');
  const parts = token.split('.');
  if (parts.length !== 3) throw new UnauthorizedException('Invalid token.');
  const [head, body, signature] = parts;
  if (!head || !body || !signature) throw new UnauthorizedException('Invalid token.');
  const expected = createHmac('sha256', key).update(`${head}.${body}`).digest('base64url');
  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  )
    throw new UnauthorizedException('Invalid token.');
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = decode(head);
    payload = decode(body);
  } catch {
    throw new UnauthorizedException('Invalid token.');
  }
  if (header.alg !== 'HS256' || header.typ !== 'JWT' || !payload || typeof payload !== 'object')
    throw new UnauthorizedException('Invalid token.');
  if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000))
    throw new UnauthorizedException('Token expired.');
  return payload;
}
export function issueAccessToken(admin: AdminIdentity) {
  return sign(
    {
      sub: admin.id,
      type: 'access',
      role: admin.role,
      sid: admin.sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
      jti: randomUUID(),
    },
    accessSecret(),
  );
}
export function issueRefreshToken(admin: AdminIdentity, sessionId: string) {
  return sign(
    {
      sub: admin.id,
      sid: sessionId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 604800,
      jti: randomUUID(),
    },
    refreshSecret(),
  );
}
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const comparePassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export function safeAdmin(
  admin: { id: string; email: string; name?: string | null; role: AdminRole },
  sessionId?: string,
): AdminIdentity {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name ?? null,
    role: admin.role,
    ...(sessionId ? { sessionId } : {}),
  };
}
export function readCookie(header: string | undefined, name: string) {
  return header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/admin/auth',
    maxAge: 604800000,
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: AdminIdentity }>();
    const value = request.headers.authorization;
    if (!value?.startsWith('Bearer ')) throw new UnauthorizedException('Authentication required.');
    const payload = verifyToken(value.slice(7));
    if (
      payload.type !== 'access' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string'
    )
      throw new UnauthorizedException('Invalid token.');
    const session = await prisma.adminSession.findUnique({ where: { id: payload.sid } });
    if (
      !session ||
      session.adminId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    )
      throw new UnauthorizedException('Authentication required.');
    const admin = await prisma.adminUser.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.isActive) throw new UnauthorizedException('Authentication required.');
    request.user = safeAdmin(admin, typeof payload.sid === 'string' ? payload.sid : undefined);
    return true;
  }
}
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: { get<T>(key: string, target: object): T | undefined }) {}
  canActivate(context: ExecutionContext) {
    const roles =
      this.reflector.get<AdminRole[]>('roles', context.getHandler()) ??
      this.reflector.get<AdminRole[]>('roles', context.getClass()) ??
      [];
    if (!roles.length) return true;
    const user = context.switchToHttp().getRequest<{ user?: AdminIdentity }>().user;
    if (!user || !roles.includes(user.role))
      throw new ForbiddenException('You do not have permission for this operation.');
    return true;
  }
}
export async function recordAudit(
  actorId: string | undefined,
  action: string,
  entity: string,
  entityId: string,
  metadata?: object,
) {
  await prisma.auditLog.create({ data: { actorId, action, entity, entityId, metadata } });
}
export class LoginRateLimiter {
  private readonly attempts = new Map<string, number[]>();
  check(key: string) {
    const now = Date.now();
    const windowMs = Number(process.env.ADMIN_LOGIN_RATE_WINDOW_SECONDS ?? 900) * 1000;
    const limit = Number(process.env.ADMIN_LOGIN_RATE_LIMIT ?? 5);
    const current = (this.attempts.get(key) ?? []).filter((stamp) => stamp > now - windowMs);
    if (current.length >= limit) return false;
    current.push(now);
    this.attempts.set(key, current);
    return true;
  }
}
export const loginRateLimiter = new LoginRateLimiter();
export function requireUser(request: { user?: AdminIdentity }) {
  if (!request.user) throw new UnauthorizedException('Authentication required.');
  return request.user;
}
