import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ZainCashService } from './zaincash.service';
import type {
  EncryptTransactionRequest,
  ProcessOtpDto,
  ProcessTransactionDto,
  ZainCashClientRequest,
} from './zaincash.interface';
import { PaymentService } from '../payment/payment.service';
import { JwtService } from '@nestjs/jwt';

@Controller('transaction')
export class ZainCashController {
  constructor(
    private readonly zaincash: ZainCashService,
    private readonly paymentService: PaymentService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Flutter → create transaction
   * No secret is sent from client; server adds it.
   */
  @Post('init')
  @HttpCode(HttpStatus.OK)
  async createTransaction(@Body() body: EncryptTransactionRequest) {
    const paymentConfig = await this.paymentService.findByType('zaincash');
    if (paymentConfig) {
      return {
        success: false,
        error:
          'ZainCash payment failed. Config not found, please contact shop owner',
      };
    }
    const req = this.jwt.verify<ZainCashClientRequest>(body.token, {
      secret: process.env.JWT_MOBILE_SECRET,
      algorithms: ['HS256'],
    });
    const result = await this.zaincash.createTransaction(req);
    if ('msg' in result) {
      return result;
    }
    // const payUrl = this.zaincash.getPaymentUrl(result.id);

    return result;
  }

  /**
   * Flutter → process transaction to get OTP
   */
  @Post('process')
  @HttpCode(HttpStatus.OK)
  async processTransaction(@Body() body: ProcessTransactionDto) {
    const data = await this.zaincash.processTransaction(body);
    return { success: true, data };
  }

  /**
   * Flutter → submit OTP
   */
  @Post('otp')
  @HttpCode(HttpStatus.OK)
  async processOtp(@Body() body: ProcessOtpDto) {
    const result = await this.zaincash.processOtpTransaction(body);
    if ('msg' in result) {
      return result;
    }
    return result;
  }
}
