import {ForbiddenException, Injectable, UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import * as argon2 from 'argon2';
import {add} from 'date-fns';
import {v4 as uuid} from 'uuid';
import * as bcrypt from 'bcrypt';
import {PrismaService} from "src/prisma/prisma.service";

type JwtUser = { id: string; email: string; roles: string[] };

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
    ) {
    }

    // Issue both tokens and rotate refresh (parent revocation handled here)
    async issueTokens(user: JwtUser, parentTokenId?: string) {
        const jti = uuid();

        const accessToken = await this.jwt.signAsync(
            {sub: user.id, email: user.email, roles: user.roles},
            {
                secret: process.env.JWT_ACCESS_SECRET!,
                expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
            },
        );

        const rawRefreshToken = await this.jwt.signAsync(
            {sub: user.id, jti},
            {
                secret: process.env.JWT_REFRESH_SECRET!,
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
            },
        );

        const tokenHash = await argon2.hash(rawRefreshToken);
        const expiresAt = this.computeExpiry(process.env.JWT_REFRESH_EXPIRES_IN ?? '30d');

        const created = await this.prisma.refreshToken.create({
            data: {
                tokenHash,
                jti,
                userId: user.id,
                parentId: parentTokenId ?? null,
                expiresAt,
            },
        });

        if (parentTokenId) {
            await this.prisma.refreshToken.update({
                where: {id: parentTokenId},
                data: {
                    replacedById: created.id,
                    revokedAt: new Date(),
                    revokedReason: 'rotated',
                },
            });
        }

        return {access_token: accessToken, refresh_token: rawRefreshToken};
    }

    // Core refresh flow (validates JWT, verifies hash in DB, loads roles, rotates)
    async refresh(rawRefreshToken: string) {
        let payload: { sub: string; jti: string; iat: number; exp: number };

        try {
            payload = await this.jwt.verifyAsync(rawRefreshToken, {
                secret: process.env.JWT_REFRESH_SECRET!,
            });
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // Find DB record by jti and include user roles
        const record = await this.prisma.refreshToken.findUnique({
            where: {jti: payload.jti},
            include: {
                user: {
                    include: {roles: true}, // UserRole[]
                },
            },
        });

        if (!record) {
            throw new ForbiddenException('Refresh token reuse detected');
        }

        if (record.revokedAt) {
            throw new ForbiddenException('Refresh token already used or revoked');
        }

        if (record.expiresAt <= new Date()) {
            throw new UnauthorizedException('Refresh token expired');
        }

        const validHash = await argon2.verify(record.tokenHash, rawRefreshToken);
        if (!validHash) {
            await this.prisma.refreshToken.update({
                where: {id: record.id},
                data: {revokedAt: new Date(), revokedReason: 'hash_mismatch'},
            });
            throw new ForbiddenException('Refresh token reuse detected');
        }

        const roles = (record.user.roles ?? []).map((r) => r.name);
        const user: JwtUser = {
            id: record.user.id,
            email: record.user.email,
            roles,
        };

        return this.issueTokens(user, record.id);
    }

    async login(email: string, password: string) {
        // 1. Verify credentials (compare password hash, etc.)
        const dbUser = await this.prisma.user.findUnique({
            where: {email: email},
            include: {roles: true}, // load related UserRole[]
        });

        if (!dbUser) throw new UnauthorizedException('Invalid credentials');

        const isValid = await bcrypt.compare(password, dbUser.password);
        if (!isValid) throw new UnauthorizedException('Invalid credentials');

        // 2. Map role names
        const roles = (dbUser.roles ?? []).map((r) => r.name);

        // 3. Issue tokens
        return this.issueTokens({
            id: dbUser.id,
            email: dbUser.email,
            roles,
        });
    }

    // Helper: compute expiry from strings like "30d", "12h", "15m"
    private computeExpiry(spec: string): Date {
        const m = spec.match(/^(\d+)([dhm])$/i);
        if (!m) {
            return add(new Date(), {days: 30});
        }
        const n = parseInt(m[1], 10);
        const unit = m[2].toLowerCase();
        if (unit === 'd') return add(new Date(), {days: n});
        if (unit === 'h') return add(new Date(), {hours: n});
        return add(new Date(), {minutes: n});
    }

}
