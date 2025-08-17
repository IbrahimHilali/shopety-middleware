// src/auth/dto/refresh.dto.ts
import {IsString, MinLength} from 'class-validator';

export class RefreshDto {
    @IsString()
    @MinLength(20)
    refresh_token!: string;
}
