// src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtPayload = {
  sub: string;
  email: string;
  roles: string[]; // e.g., ['admin'] or ['member']
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET,
      ignoreExpiration: false,
    } as any);
  }
  validate(payload: JwtPayload) {
    // This object becomes req.user
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload,
    };
  }
}
