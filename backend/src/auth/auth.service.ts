import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors';
import { homePath, normalizeRole, ROLES } from '../common/roles';
import { Prisma } from '@prisma/client';

export const ACCESS_COOKIE = 'zh_access';
export const REFRESH_COOKIE = 'zh_refresh';
export const LEGACY_COOKIE = 'reception_token';

export type SessionUser = {
  id: string;
  login: string;
  username: string;
  fullName: string;
  role: string;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  hashPassword(password: string) {
    return bcrypt.hash(password, 12);
  }

  verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private cookieOpts(maxAge: number) {
    const isProd = this.config.get('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: isProd,
      path: '/',
      maxAge,
    };
  }

  setAuthCookies(res: Response, access: string, refresh: string) {
    const accessMs = 12 * 60 * 60 * 1000;
    const refreshMs = 7 * 24 * 60 * 60 * 1000;
    res.cookie(ACCESS_COOKIE, access, this.cookieOpts(accessMs));
    res.cookie(LEGACY_COOKIE, access, this.cookieOpts(accessMs));
    res.cookie(REFRESH_COOKIE, refresh, this.cookieOpts(refreshMs));
  }

  clearAuthCookies(res: Response) {
    const base = this.cookieOpts(0);
    res.cookie(ACCESS_COOKIE, '', { ...base, maxAge: 0 });
    res.cookie(LEGACY_COOKIE, '', { ...base, maxAge: 0 });
    res.cookie(REFRESH_COOKIE, '', { ...base, maxAge: 0 });
  }

  async signAccess(user: SessionUser) {
    return this.jwt.signAsync(
      { id: user.id, login: user.login, fullName: user.fullName, role: user.role, sub: user.id },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: (this.config.get('JWT_ACCESS_EXPIRES_IN') || '12h') as `${number}h` | `${number}m`,
      },
    );
  }

  async issueRefresh(userId: string) {
    const raw = randomBytes(48).toString('hex');
    const days = 7;
    const expiresAt = new Date(Date.now() + days * 86400000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: this.hashToken(raw), expiresAt },
    });
    return raw;
  }

  private blockedMessage(role: string) {
    const r = normalizeRole(role);
    if (r === 'SYSTEM_ADMIN') return 'Ushbu akkaunt bloklangan.';
    if (r === 'MANAGER') return 'Ushbu akkaunt faol emas.';
    return 'Ushbu akkaunt faol emas. Dasturiy adminga murojaat qiling.';
  }

  private toSession(user: { id: string; login: string; fullName: string; role: string }): SessionUser {
    const role = normalizeRole(user.role);
    return { id: user.id, login: user.login, username: user.login, fullName: user.fullName, role };
  }

  async login(loginOrPhone: string, password: string, res: Response) {
    const login = loginOrPhone.trim();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ login }, { phone: login }] },
    });
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      if (user) {
        await this.prisma.auditLog.create({
          data: { userId: user.id, action: 'LOGIN_FAILED', entity: 'User', entityId: user.id },
        }).catch(() => null);
      }
      throw new AppError('Login yoki parol noto‘g‘ri.', 401, 'INVALID_CREDENTIALS');
    }
    if (!user.isActive || user.workStatus === 'BLOCKED' || user.workStatus === 'TERMINATED' || user.workStatus === 'FIRED') {
      throw new AppError(this.blockedMessage(user.role), 403, 'ACCOUNT_BLOCKED');
    }
    const session = this.toSession(user);
    const accessToken = await this.signAccess(session);
    const refreshToken = await this.issueRefresh(user.id);
    this.setAuthCookies(res, accessToken, refreshToken);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id },
    });
    return {
      id: session.id,
      login: session.login,
      username: session.username,
      fullName: session.fullName,
      role: session.role,
      home: homePath(session.role),
      accessToken,
      refreshToken,
    };
  }

  async refresh(raw: string, res: Response) {
    if (!raw) throw new UnauthorizedException('Tizimga kiring.');
    const tokenHash = this.hashToken(raw);
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!row || row.revokedAt || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Tizimga kiring.');
    }
    const user = row.user;
    if (!user.isActive || user.workStatus === 'BLOCKED') {
      throw new UnauthorizedException('Tizimga kiring.');
    }
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    const session = this.toSession(user);
    const accessToken = await this.signAccess(session);
    const refreshToken = await this.issueRefresh(user.id);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { accessToken, refreshToken, role: session.role, home: homePath(session.role) };
  }

  async logout(raw: string | undefined, res: Response, userId?: string) {
    if (raw) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: this.hashToken(raw) },
        data: { revokedAt: new Date() },
      });
    } else if (userId) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    this.clearAuthCookies(res);
    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('Tizimga kiring.');
    const session = this.toSession(user);
    const roleRow = await this.prisma.role.findUnique({ where: { code: session.role } });
    return {
      ...session,
      home: homePath(session.role),
      permissions: roleRow ? JSON.parse(roleRow.permissions || '[]') : [],
    };
  }

  async changePassword(userId: string, current: string, next: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await this.verifyPassword(current, user.passwordHash))) {
      throw new AppError('Login yoki parol noto‘g‘ri.', 400, 'INVALID_CREDENTIALS');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.hashPassword(next), mustChangePassword: false },
    });
    return { ok: true };
  }

  async validateUserId(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive || user.workStatus === 'BLOCKED' || user.workStatus === 'TERMINATED' || user.workStatus === 'FIRED') {
      return null;
    }
    return this.toSession(user);
  }
}

export type { Prisma };
