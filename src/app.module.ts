import {Module} from '@nestjs/common';
import {PaymentModule} from './payment/payment.module';
import {ZainCashModule} from "./zaincash/zaincash.module";
import {AuthModule} from './auth/auth.module';
import {PrismaModule} from "./prisma/prisma.module";


@Module({
    imports: [PaymentModule, ZainCashModule, AuthModule, PrismaModule]
})
export class AppModule {
}
