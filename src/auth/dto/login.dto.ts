// src/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
export interface LoginTokenDto {
  token: string;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
