// src/auth/auth.controller.ts
import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { type LoginTokenDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Request, Response } from 'express';
import { Roles } from './roles/roles.decorator';
import { RolesGuard } from './roles/roles.guard';

const REFRESH_COOKIE = 'rt';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('signup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async signup(@Body() dto: SignupDto) {
    await this.auth.createUser(dto.email, dto.password, dto.roles);
    return { message: 'User created' };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    //@Body() dto: LoginDto,
    @Body() dto: LoginTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    //const tokens = await this.auth.login(dto.email, dto.password);
    const tokens = await this.auth.loginToken(dto.token);
    this.setRefreshCookie(res, tokens.refreshToken);
    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = dto.refreshToken || (req.cookies?.[REFRESH_COOKIE] as string);
    const tokens = await this.auth.refresh(token);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] as string;
    await this.auth.logoutCurrentSession(token);
    this.clearRefreshCookie(res);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async logoutAll(@Req() req, @Res({ passthrough: true }) res: Response) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    await this.auth.logoutAll(req.user.userId);
    this.clearRefreshCookie(res);
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  }
}
