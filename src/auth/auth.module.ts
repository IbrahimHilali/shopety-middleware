import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {AuthService} from './auth.service';
import {AuthController} from './auth.controller';
import {JwtStrategy} from './jwt.strategy';
import {PrismaService} from '../prisma/prisma.service';
import {PrismaModule} from "../prisma/prisma.module";

@Module({
    imports: [
        PrismaModule,
        JwtModule.register({}), // we’ll pass secrets per call
    ],
    providers: [AuthService, JwtStrategy, PrismaService],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {
}
