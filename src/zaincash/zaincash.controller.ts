import {Body, Controller, HttpCode, HttpStatus, Post} from '@nestjs/common';
import {ZainCashService} from './zaincash.service';
import type {CreateTransactionDto, ProcessOtpDto, ProcessTransactionDto} from "./zaincash.interface";


@Controller('zaincash')
export class ZainCashController {
    constructor(private readonly zaincash: ZainCashService) {
    }

    /**
     * Flutter → create transaction
     * No secret is sent from client; server adds it.
     */
    @Post('create')
    @HttpCode(HttpStatus.OK)
    async createTransaction(@Body() body: CreateTransactionDto) {
        const result = await this.zaincash.createTransaction(body);
        if (!result.ok) {
            return {success: false, error: result.error};
        }

        // Build a payment URL and return it to Flutter
        const txnId = (result.data as any)?.id || (result.data as any)?.transactionId;
        const payUrl = this.zaincash.getPaymentUrl(txnId);

        return {success: true, transactionId: txnId, payUrl};
    }

    /**
     * Flutter → process transaction to get OTP
     */
    @Post('process')
    @HttpCode(HttpStatus.OK)
    async processTransaction(@Body() body: ProcessTransactionDto) {
        const data = await this.zaincash.processTransaction(body);
        return {success: true, data};
    }

    /**
     * Flutter → submit OTP
     */
    @Post('otp')
    @HttpCode(HttpStatus.OK)
    async processOtp(@Body() body: ProcessOtpDto) {
        const result = await this.zaincash.processOtpTransaction(body);
        if (!result.ok) {
            return {success: false, error: result.error};
        }
        return {success: true, data: result.data};
    }
}
