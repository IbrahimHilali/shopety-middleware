import {Body, Controller, Get, HttpCode, HttpStatus, Param, Post} from '@nestjs/common';
import {PaymentService} from "./payment.service";
import type {CreatePayment} from "./payment.interface";

@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) {
    }

    @Post()
    @HttpCode(HttpStatus.OK) // override default 201
    public async upsert(@Body() creatPayment: CreatePayment) {
        await this.paymentService.upsert(creatPayment);
        return {message: 'Payment saved successfully'};
    }

    @Get()
    async getStatus(@Param('type') type: string) {
        const status = await this.paymentService.getStatus(type);
        return {
            status: status
        }
    }
}
