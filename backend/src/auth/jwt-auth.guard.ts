import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC } from '../common/decorators';
import { ACCESS_COOKIE, LEGACY_COOKIE, AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwt: JwtService,
    private config: ConfigService,
    private auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization as string | undefined;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearer || req.cookies?.[ACCESS_COOKIE] || req.cookies?.[LEGACY_COOKIE];
    if (!token) throw new UnauthorizedException('Tizimga kiring.');
    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      });
      const user = await this.auth.validateUserId(String(payload.id || payload.sub));
      if (!user) throw new UnauthorizedException('Tizimga kiring.');
      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Tizimga kiring.');
    }
  }
}
