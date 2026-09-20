import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  comparePassword,
  cookieOptions,
  hashToken,
  issueAccessToken,
  issueRefreshToken,
  JwtAuthGuard,
  loginRateLimiter,
  refreshRateLimiter,
  prisma,
  readCookie,
  recordAudit,
  requireUser,
  refreshCookieName,
  refreshSecret,
  safeAdmin,
  verifyToken,
} from './admin-auth';
import { LoginDto, RefreshDto } from './admin.dto';
import { increment, structuredLog } from './observability';

@Controller('admin/auth')
export class AdminAuthController {
  private setRetryAfter(response: Response, seconds: string) {
    if (typeof response.header === 'function') response.header('Retry-After', seconds);
    else response.setHeader?.('Retry-After', seconds);
  }

  @Post('login') async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (request.ip && !loginRateLimiter.check(request.ip)) {
      this.setRetryAfter(response, process.env.ADMIN_LOGIN_RATE_WINDOW_SECONDS ?? '900');
      throw new HttpException('Invalid email or password.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const admin = await prisma.adminUser.findUnique({
      where: { email: body.email.toLowerCase().trim() },
    });
    if (!admin || !admin.isActive || !(await comparePassword(body.password, admin.passwordHash))) {
      increment('auth_login_failures');
      structuredLog('warn', 'auth.login_failed', {
        requestId: request.header('x-request-id'),
        source: 'admin',
      });
      throw new HttpException('Invalid email or password.', HttpStatus.UNAUTHORIZED);
    }
    const sessionId = randomUUID();
    const identity = safeAdmin(admin, sessionId);
    const refreshToken = issueRefreshToken(identity, sessionId);
    await prisma.adminSession.create({
      data: {
        id: sessionId,
        adminId: admin.id,
        refreshTokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 604800000),
      },
    });
    response.cookie(refreshCookieName, refreshToken, cookieOptions());
    await recordAudit(admin.id, 'LOGIN', 'ADMIN_USER', admin.id);
    increment('auth_logins_total');
    return { admin: safeAdmin(admin), accessToken: issueAccessToken(identity) };
  }
  @Post('refresh') async refresh(
    @Body() _body: RefreshDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (request.ip && !refreshRateLimiter.check(request.ip)) {
      this.setRetryAfter(response, process.env.ADMIN_REFRESH_RATE_WINDOW_SECONDS ?? '900');
      throw new HttpException('Too many refresh attempts.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const token = readCookie(request.headers.cookie, refreshCookieName);
    try {
      if (!token) throw new Error();
      const payload = verifyToken(token, refreshSecret(), 'refresh');
      if (
        payload.type !== 'refresh' ||
        typeof payload.sub !== 'string' ||
        typeof payload.sid !== 'string'
      )
        throw new Error();
      const session = await prisma.adminSession.findUnique({
        where: { id: payload.sid },
        include: { admin: true },
      });
      if (
        !session ||
        session.revokedAt ||
        session.expiresAt <= new Date() ||
        session.refreshTokenHash !== hashToken(token) ||
        !session.admin.isActive
      )
        throw new Error();
      const identity = safeAdmin(session.admin, session.id);
      const replacement = issueRefreshToken(identity, session.id);
      const consumed = await prisma.adminSession.updateMany({
        where: {
          id: session.id,
          refreshTokenHash: session.refreshTokenHash,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { refreshTokenHash: hashToken(replacement), lastUsedAt: new Date() },
      });
      if (consumed.count !== 1) throw new Error();
      response.cookie(refreshCookieName, replacement, cookieOptions());
      return { accessToken: issueAccessToken(identity) };
    } catch {
      response.clearCookie(refreshCookieName, { ...cookieOptions(), maxAge: undefined });
      throw new HttpException('Invalid refresh token.', HttpStatus.UNAUTHORIZED);
    }
  }
  @UseGuards(JwtAuthGuard) @Post('logout') async logout(
    @Req() request: Request & { user?: ReturnType<typeof requireUser> },
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = requireUser(request);
    if (user.sessionId)
      await prisma.adminSession.updateMany({
        where: { id: user.sessionId, adminId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    response.clearCookie(refreshCookieName, { ...cookieOptions(), maxAge: undefined });
    await recordAudit(user.id, 'LOGOUT', 'ADMIN_USER', user.id);
    increment('auth_logouts_total');
    return { success: true };
  }
  @UseGuards(JwtAuthGuard) @Get('sessions') async sessions(
    @Req() request: Request & { user?: ReturnType<typeof requireUser> },
  ) {
    const user = requireUser(request);
    const items = await prisma.adminSession.findMany({
      where: { adminId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true },
    });
    return { items: items.map((item) => ({ ...item, current: item.id === user.sessionId })) };
  }
  @UseGuards(JwtAuthGuard) @Post('logout-all') async logoutAll(
    @Req() request: Request & { user?: ReturnType<typeof requireUser> },
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = requireUser(request);
    const result = await prisma.adminSession.updateMany({
      where: { adminId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    response.clearCookie(refreshCookieName, { ...cookieOptions(), maxAge: undefined });
    await recordAudit(user.id, 'LOGOUT_ALL', 'ADMIN_USER', user.id, { count: result.count });
    return { success: true, revoked: result.count };
  }
  @UseGuards(JwtAuthGuard) @Get('me') async me(
    @Req() request: Request & { user?: ReturnType<typeof requireUser> },
  ) {
    return safeAdmin(
      await prisma.adminUser.findUniqueOrThrow({ where: { id: requireUser(request).id } }),
    );
  }
}
