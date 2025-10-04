// src/auth/auth.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as argon2 from 'argon2';
import { LoginDto, LoginResponseDto } from './dto/login.dto';

const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '10m';
const REFRESH_TTL = process.env.REFRESH_TOKEN_TTL || '7d';

@Injectable()
export class AuthService {
  constructor(
    private users: UserService,
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async createUser(
    email: string,
    password: string,
    roles: string[] | undefined,
  ) {
    roles = roles ?? ['member'];
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await argon2.hash(password);
    await this.prisma.user.create({
      data: {
        email,
        password: passwordHash,
        roles: {
          create: roles.map((r) => ({ name: r })),
        },
      },
    });
  }

  async loginToken(token: string): Promise<LoginResponseDto> {
    try {
      const login = this.jwt.verify<LoginDto>(token, {
        secret: process.env.JWT_MOBILE_SECRET,
        algorithms: ['HS256'],
      });
      return await this.login(login.email, login.password);
    } catch (e) {
      throw new BadRequestException(`Invalid or expired token ${e}`);
    }
  }
  async login(email: string, password: string): Promise<LoginResponseDto> {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await this.users.validatePassword(user.password, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    // Pull role names as strings
    const roles = user.roles.map((r) => r.name);
    return await this.issueLoginTokens(user.id, user.email, roles, null);
  }

  async refresh(currentRefreshToken: string) {
    // Verify signature and decode payload (won't trust yet)
    let decoded: any;
    try {
      decoded = await this.jwt.verifyAsync(currentRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const {
      sub: userId,
      email,
      roles,
      jti,
    } = decoded as { sub: string; email: string; roles: string[]; jti: string };

    // Lookup stored refresh token by jti
    const stored = await this.prisma.refreshToken.findUnique({
      where: { jti },
    });
    if (!stored) throw new UnauthorizedException('Refresh token not found');

    // Check not revoked and not expired
    if (stored.revokedAt)
      throw new UnauthorizedException('Refresh token revoked');
    if (new Date() > stored.expiresAt)
      throw new UnauthorizedException('Refresh token expired');

    // Verify hash match
    const matches = await argon2.verify(stored.tokenHash, currentRefreshToken);
    if (!matches) throw new UnauthorizedException('Refresh token mismatch');

    // Rotate: revoke old, create new
    const newTokens = await this.rotateRefreshTokenAndIssue(
      userId,
      email,
      roles,
      stored.id,
      stored.jti,
    );
    return newTokens;
  }

  async logoutCurrentSession(currentRefreshToken: string) {
    // Gracefully handle missing token: nothing to revoke
    if (!currentRefreshToken) return;

    try {
      const decoded: any = await this.jwt.verifyAsync(currentRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
        ignoreExpiration: true, // still allow revocation even if expired now
      });
      const { jti } = decoded;
      await this.revokeByJti(jti, 'User logout');
    } catch {
      // ignore errors on logout
    }
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'User logout all' },
    });
  }

  // ============ Internals ============

  private async issueLoginTokens(
    userId: string,
    email: string,
    roles: string[],
    parentId: string | null,
  ) {
    const accessToken = await this.signAccessToken(userId, email, roles);
    const { refreshToken, record } = await this.createRefreshToken(
      userId,
      email,
      parentId,
    );

    // Link parent if any
    if (parentId) {
      await this.prisma.refreshToken.update({
        where: { id: parentId },
        data: {
          replacedById: record.id,
          revokedAt: new Date(),
          revokedReason: 'Rotated',
        },
      });
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TTL,
    };
  }

  private async rotateRefreshTokenAndIssue(
    userId: string,
    email: string,
    roles: string[],
    parentId: string,
    parentJti: string,
  ) {
    // Create new child token, revoke parent
    const tokens = await this.issueLoginTokens(userId, email, roles, parentId);
    return tokens;
  }

  private async createRefreshToken(
    userId: string,
    email: string,
    parentId: string | null,
  ) {
    const jti = uuidv4();
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, email, jti },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: REFRESH_TTL,
      },
    );

    const expiresAt = new Date(Date.now() + this.parseMillis(REFRESH_TTL));
    const tokenHash = await argon2.hash(refreshToken);

    const record = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        jti,
        parentId,
        expiresAt,
      },
    });

    return { refreshToken, record };
  }

  private async signAccessToken(
    userId: string,
    email: string,
    roles: string[],
  ) {
    return this.jwt.signAsync(
      { sub: userId, email: email, roles: roles },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: ACCESS_TTL,
      },
    );
  }

  private async revokeByJti(jti: string, reason: string) {
    if (!jti) return;
    await this.prisma.refreshToken.updateMany({
      where: { jti, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  private parseMillis(ttl: string): number {
    // Supports s, m, h, d (e.g., "10m", "7d")
    const m = ttl.match(/^(\d+)([smhd])$/);
    if (!m) return Number(ttl) || 0;
    const n = Number(m[1]);
    const unit = m[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    };
    return n * multipliers[unit];
  }
}
