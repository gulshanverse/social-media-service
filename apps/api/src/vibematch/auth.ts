import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../admin-auth';

export const VIBE_SESSION_COOKIE = 'vibe_session';
export const VIBE_GUEST_SESSION_COOKIE = 'vibe_guest_session';
export const VIBE_GUEST_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const VIBE_STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const hashValue = (value: string) => createHash('sha256').update(value).digest('hex');
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const emailHash = (email: string) => hashValue(normalizeEmail(email));
export const createToken = () => randomBytes(32).toString('base64url');

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
    path: '/vibematch',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

export function readCookie(header: string | undefined, name: string) {
  return header
    ?.split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function configuredWebOrigin(env: NodeJS.ProcessEnv = process.env) {
  return env.WEB_ORIGIN ?? (env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000');
}

export function isAllowedVibeOrigin(request: Request, env: NodeJS.ProcessEnv = process.env) {
  const configuredOrigin = configuredWebOrigin(env);
  if (!configuredOrigin) return false;
  const suppliedOrigin = request.headers.origin;
  const suppliedReferer = request.headers.referer;
  let requestOrigin: string | undefined;
  if (suppliedOrigin) requestOrigin = suppliedOrigin;
  else if (suppliedReferer) {
    try {
      requestOrigin = new URL(suppliedReferer).origin;
    } catch {
      return false;
    }
  }
  return requestOrigin === configuredOrigin;
}

export function assertVibeStateChangingOrigin(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (!VIBE_STATE_CHANGING_METHODS.has(request.method.toUpperCase())) return;
  if (!isAllowedVibeOrigin(request, env)) {
    throw new ForbiddenException('A valid VibeMatch request origin is required.');
  }
}

export type MagicLinkClaimArgs = {
  where: { id: string; usedAt: null; expiresAt: { gt: Date } };
  data: { usedAt: Date };
};

export async function atomicallyClaimMagicLink(
  updateMany: (args: MagicLinkClaimArgs) => Promise<{ count: number }>,
  id: string,
  claimedAt = new Date(),
) {
  const result = await updateMany({
    where: { id, usedAt: null, expiresAt: { gt: claimedAt } },
    data: { usedAt: claimedAt },
  });
  return result.count === 1;
}

export type VibeRequest = Request & { vibeIdentityId?: string; vibeGuestSessionId?: string };

export async function requireIdentity(request: VibeRequest) {
  const token = readCookie(request.headers.cookie, VIBE_SESSION_COOKIE);
  if (!token) throw new UnauthorizedException('VibeMatch sign-in required.');
  const session = await prisma.vibeIdentitySession.findUnique({
    where: { tokenHash: hashValue(token) },
    include: { identity: true },
  });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.identity.status !== 'ACTIVE'
  )
    throw new UnauthorizedException('VibeMatch sign-in required.');
  await prisma.vibeIdentitySession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  });
  request.vibeIdentityId = session.identityId;
  return session.identity;
}

export async function requireVibeSession(request: VibeRequest) {
  if (request.headers['x-vibematch-mode'] !== 'guest') {
    const identity = await requireIdentity(request);
    return { kind: 'identity' as const, identity };
  }
  const guestToken = readCookie(request.headers.cookie, VIBE_GUEST_SESSION_COOKIE);
  if (guestToken) {
    const guest = await prisma.vibeGuestSession.findUnique({
      where: { tokenHash: hashValue(guestToken) },
    });
    if (!guest || guest.revokedAt || guest.expiresAt <= new Date())
      throw new UnauthorizedException('This Quick Play session has expired. Start a new game.');
    await prisma.vibeGuestSession.update({
      where: { id: guest.id },
      data: { lastUsedAt: new Date() },
    });
    request.vibeGuestSessionId = guest.id;
    return { kind: 'guest' as const, guest };
  }
  throw new UnauthorizedException('This Quick Play session has expired. Start a new game.');
}

@Injectable()
export class VibeAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<VibeRequest>();
    await requireVibeSession(request);
    return true;
  }
}

@Injectable()
export class VibeCsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    assertVibeStateChangingOrigin(request);
    return true;
  }
}

export function setSessionCookie(response: Response, token: string) {
  response.cookie(VIBE_SESSION_COOKIE, token, cookieOptions());
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(VIBE_SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
}

export function setGuestSessionCookie(response: Response, token: string) {
  response.cookie(VIBE_GUEST_SESSION_COOKIE, token, {
    ...cookieOptions(),
    maxAge: VIBE_GUEST_SESSION_TTL_MS,
  });
}

export function clearGuestSessionCookie(response: Response) {
  response.clearCookie(VIBE_GUEST_SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
}
