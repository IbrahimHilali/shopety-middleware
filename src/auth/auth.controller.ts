import {Body, Controller, HttpCode, HttpStatus, Post} from '@nestjs/common';
import {AuthService} from './auth.service';
import {RefreshDto} from './dto/refresh.dto';
import {LoginDto} from "./dto/loginDto.dto";

@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) {
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto) {
        return this.auth.login(dto.email, dto.password);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() dto: RefreshDto) {
        return this.auth.refresh(dto.refresh_token);
    }

}
