import {Module} from '@nestjs/common';
import {PaymentController} from './payment.controller';
import {EncryptionService} from '../encryption/encryption.service';
import {PaymentService} from './payment.service';
import {PrismaModule} from "../prisma/prisma.module";

@Module({
    imports: [PaymentModule, PrismaModule],
    controllers: [PaymentController],
    providers: [EncryptionService, PaymentService]
})
export class PaymentModule {
}
