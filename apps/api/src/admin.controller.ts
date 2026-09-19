import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  comparePassword,
  issueAccessToken,
  issueRefreshToken,
  JwtAuthGuard,
  loginRateLimiter,
  prisma,
  recordAudit,
  requireUser,
  safeAdmin,
  verifyToken,
} from './admin-auth';

@Controller('admin/auth')
export class AdminAuthController {
  @Post('login') async login(
    @Body() body: { email?: string; password?: string },
    @Headers('x-forwarded-for') ip?: string,
  ) {
    if (!loginRateLimiter.check(ip ?? 'admin'))
      throw new HttpException('Invalid email or password.', HttpStatus.TOO_MANY_REQUESTS);
    const admin = body.email
      ? await prisma.adminUser.findUnique({ where: { email: body.email.toLowerCase().trim() } })
      : null;
    if (!admin || !body.password || !(await comparePassword(body.password, admin.passwordHash)))
      throw new HttpException('Invalid email or password.', HttpStatus.UNAUTHORIZED);
    const identity = safeAdmin(admin);
    await recordAudit(admin.id, 'LOGIN', 'ADMIN_USER', admin.id);
    return {
      admin: identity,
      accessToken: issueAccessToken(identity),
      refreshToken: issueRefreshToken(identity),
    };
  }
  @Post('refresh') async refresh(@Body() body: { refreshToken?: string }) {
    try {
      if (!body.refreshToken) throw new Error();
      const payload = verifyToken(
        body.refreshToken,
        process.env.JWT_REFRESH_SECRET ??
          (process.env.NODE_ENV === 'production' ? '' : 'phase3-development-refresh-secret'),
      );
      if (payload.type !== 'refresh' || typeof payload.sub !== 'string') throw new Error();
      const admin = await prisma.adminUser.findUnique({ where: { id: payload.sub } });
      if (!admin) throw new Error();
      const identity = safeAdmin(admin);
      return { accessToken: issueAccessToken(identity) };
    } catch {
      throw new HttpException('Invalid refresh token.', HttpStatus.UNAUTHORIZED);
    }
  }
  @UseGuards(JwtAuthGuard) @Post('logout') async logout(
    @Req() request: { user?: ReturnType<typeof requireUser> },
  ) {
    const user = requireUser(request);
    await recordAudit(user.id, 'LOGOUT', 'ADMIN_USER', user.id);
    return { success: true };
  }
  @UseGuards(JwtAuthGuard) @Get('me') async me(
    @Req() request: { user?: ReturnType<typeof requireUser> },
  ) {
    const user = requireUser(request);
    const admin = await prisma.adminUser.findUnique({ where: { id: user.id } });
    if (!admin) throw new HttpException('Authentication required.', HttpStatus.UNAUTHORIZED);
    return safeAdmin(admin);
  }
}
