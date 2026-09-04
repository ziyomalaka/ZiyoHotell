import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PERMS_KEY } from '../common/decorators';
import { normalizeRole, parsePermissions } from '../common/roles';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    const perms = this.reflector.getAllAndOverride<string[]>(PERMS_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length && !perms?.length) return true;
    const req = context.switchToHttp().getRequest();
    const user = req.user as { id: string; role: string };
    if (!user) throw new ForbiddenException();
    const role = normalizeRole(user.role);
    if (roles?.length) {
      const allowed = roles.map(normalizeRole);
      if (!allowed.includes(role)) {
        throw new ForbiddenException('Ushbu amalni bajarish uchun ruxsatingiz yo‘q.');
      }
    }
    if (perms?.length) {
      if (role === 'SYSTEM_ADMIN') return true;
      const row = await this.prisma.role.findUnique({ where: { code: role } });
      const have = parsePermissions(row?.permissions);
      if (!perms.every((p) => have.includes(p))) {
        throw new ForbiddenException('Ushbu amalni bajarish uchun ruxsatingiz yo‘q.');
      }
    }
    return true;
  }
}
