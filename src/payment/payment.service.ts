import {Injectable, Logger} from '@nestjs/common';
import {EncryptionService} from "../encryption/encryption.service";
import {PrismaService} from "../prisma/prisma.service";
import {CreatePayment, Payment} from "./payment.interface";

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        private prisma: PrismaService,
        private encryption: EncryptionService,
    ) {
    }

    public async upsert(creditPayment: CreatePayment) {
        const payment = await this.prisma.payment.upsert({
            create: {
                type: creditPayment.type,
                active: creditPayment.active ?? false,
                config: this.encryption.encrypt(JSON.stringify(creditPayment.config)),
            },
            update: {
                config: this.encryption.encrypt(JSON.stringify(creditPayment.config)),
                active: creditPayment.active ?? false,
            },
            where: {
                type: creditPayment.type,
            }
        })
        this.logger.log('Upsert {} Payment', creditPayment.type);
        return payment;
    }

    public async getStatus(type: string): Promise<boolean | null> {
        const payment = await this.findByType(type);
        if (!payment) {
            return null;
        }
        this.logger.log(`${payment.type} status is ${payment.active}`);
        return payment.active;
    }

    public async findByType(type: string): Promise<Payment | null> {
        return await this.prisma.payment.findFirst({
            where: {
                type: type
            }
        }) as Payment | null;
    }
}
