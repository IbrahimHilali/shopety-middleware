import {Module} from '@nestjs/common';
import {PaymentModule} from './payment/payment.module';
import {ZainCashModule} from "./zaincash/zaincash.module";


@Module({
    imports: [PaymentModule, ZainCashModule]
})
export class AppModule {
}
