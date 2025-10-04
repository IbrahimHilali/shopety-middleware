// src/auth/roles/roles.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { user } = ctx.switchToHttp().getRequest();
    const dbUser = await this.prisma.user.findUnique({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
      where: { id: user.userId },
      select: {
        roles: { select: { name: true } }, // adjust to your schema
      },
    });

    const userRoles: string[] = dbUser?.roles?.map((r) => r.name) ?? [];
    return required.some((r) => userRoles.includes(r));
  }
}
