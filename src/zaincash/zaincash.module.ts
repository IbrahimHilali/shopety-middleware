// zaincash.module.ts (clean DI)
import {JwtModule, JwtService} from "@nestjs/jwt";
import {ZainCashService} from "./zaincash.service";
import {Module} from "@nestjs/common";
import {HttpModule, HttpService} from "@nestjs/axios";

@Module({
    imports: [HttpModule, JwtModule.register({})],
    providers: [
        {
            provide: 'ZAINCASH_OPTIONS',
            useValue: {
                merchantId: process.env.ZAINCASH_MERCHANT_ID,
                secret: process.env.ZAINCASH_SECRET,
                language: (process.env.ZAINCASH_LANG as 'en' | 'ar') ?? 'en',
                production: process.env.NODE_ENV === 'production',
            },
        },
        {
            provide: ZainCashService,
            useFactory: (http: HttpService, jwt: JwtService, opts: any) =>
                new ZainCashService(http, jwt, opts),
            inject: [HttpService, JwtService, 'ZAINCASH_OPTIONS'],
        },
    ],
    exports: [ZainCashService],
})
export class ZainCashModule {
}
