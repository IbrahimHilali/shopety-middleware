// zaincash.service.ts
import { BadRequestException, HttpException, Injectable, NotFoundException, } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';

import {
  CreateTransactionDto,
  ProcessOtpDto,
  ProcessTransactionDto,
  Success,
  TransactionOTPResponse,
  TransactionProcessResponse,
  TransactionResponse,
  type ZainCashClientRequest,
  ZainCashError,
} from './zaincash.interface';
import { PaymentService } from '../payment/payment.service';

export interface ZainCashOptions {
  merchantId?: string;
  secret?: string;
  language?: 'en' | 'ar';
  production?: boolean;
}

@Injectable()
export class ZainCashService {
  private readonly merchantId: string;
  private readonly secret: string;
  private readonly language: 'en' | 'ar';
  private readonly production: boolean;

  constructor(
    private readonly http: HttpService,
    private readonly jwt: JwtService,
    private readonly paymentService: PaymentService,
    opts: ZainCashOptions = {},
  ) {
    // Defaults from your Dart code
    this.merchantId = opts.merchantId ?? '5ffacf6612b5777c6d44266f';
    this.secret =
      opts.secret ??
      '$2y$10$hBbAZo2GfSSvyqAyV2SaqOfYewgYpfR1O19gIh4SqyGWdmySZYPuS';
    this.language = opts.language ?? 'en';
    this.production = opts.production ?? false;
  }

  private get host(): string {
    return this.production ? 'api.zaincash.iq' : 'test.zaincash.iq';
  }

  private get initUrl(): string {
    return `https://${this.host}/transaction/init`;
  }

  private get processUrl(): string {
    return `https://${this.host}/transaction/processing`;
  }

  private get processOtpUrl(): string {
    return `https://${this.host}/transaction/processingOTP`;
  }

  private get cancelUrl(): string {
    return `https://${this.host}/transaction/cancel`;
  }

  payUrl(transactionId: string): string {
    const url = new URL(`https://${this.host}/transaction/pay`);
    url.searchParams.set('id', transactionId);
    return url.toString();
  }

  // Mirrors your Dart "createTransaction"
  async createTransaction(
    dto: ZainCashClientRequest,
  ): Promise<TransactionResponse | ZainCashError> {
    const { amount, serviceType, orderId, language, redirectUrl = '' } = dto;
    if (amount <= 1000) {
      throw new BadRequestException('amountIQD must be MORE THAN 1000 IQD');
    }
    const cfg = await this.paymentService.getZainCashConfig();

    if (!cfg) {
      throw new NotFoundException(
        'Zain Cash Payment Config does not exist, please contact support',
      );
    }
    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = nowSec + 60 * 60 * 4; // +4 hours

    const payload: CreateTransactionDto = {
      amount: amount,
      serviceType,
      msisdn: cfg.msisdn,
      orderId,
      redirectUrl,
      iat: nowSec,
      exp: expSec,
    };

    // HS256 sign with your shared secret
    const token = this.jwt.sign(payload, {
      secret: cfg.secret,
      algorithm: 'HS256',
    });

    // x-www-form-urlencoded body
    const form = new URLSearchParams();
    form.set('token', token);
    form.set('merchantId', cfg.merchantId);
    form.set('lang', language ?? 'en');

    const { data, status } = await firstValueFrom(
      this.http.post<TransactionResponse>(this.initUrl, form.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        validateStatus: () => true,
      }),
    );

    if (status !== 200) {
      throw new HttpException(
        `ZainCash init failed: ${status} ${JSON.stringify(data)}`,
        status,
      );
    }

    if (data && typeof data === 'object' && 'err' in data) {
      return { msg: data } as unknown as ZainCashError;
    }

    return data;
  }

  // First-step processing to obtain OTP
  async processTransaction(
    dto: ProcessTransactionDto,
  ): Promise<TransactionProcessResponse | Error> {
    const form = new URLSearchParams();
    form.set('id', dto.transactionId);
    form.set('phonenumber', dto.phoneNumber);
    form.set('pin', dto.pin);

    const { data, status } = await firstValueFrom(
      this.http.post<TransactionProcessResponse | Error>(
        this.processUrl,
        form.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          validateStatus: () => true,
        },
      ),
    );

    if (status !== 200) {
      throw new HttpException(
        `Obtaining OTP code failed: ${JSON.stringify(data)}`,
        status,
      );
    }

    return data;
  }

  async processOtpTransaction(
    dto: ProcessOtpDto,
  ): Promise<TransactionOTPResponse | Error> {
    const url = new URL(this.processOtpUrl);
    url.searchParams.set('type', dto.type ?? 'MERCHANT_PAYMENT');

    const form = new URLSearchParams();
    form.set('id', dto.transactionId);
    form.set('phonenumber', dto.phoneNumber);
    form.set('pin', dto.pin);
    form.set('otp', dto.otp);

    const { data, status } = await firstValueFrom(
      this.http.post<TransactionOTPResponse>(url.toString(), form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        validateStatus: () => true,
      }),
    );

    if (status !== 200) {
      throw new HttpException(
        `OTP code failed: ${JSON.stringify(data)}`,
        status,
      );
    }

    if (data.success === false) {
      return { msg: data['msg'] ?? '' } as unknown as Error;
    }

    return data;
  }

  async cancelTransaction(params: {
    transactionId: string;
    type?: 'MERCHANT_PAYMENT';
  }): Promise<void> {
    const form = new URLSearchParams();
    form.set('type', params.type ?? 'MERCHANT_PAYMENT');
    form.set('id', params.transactionId);

    const { data, status } = await firstValueFrom(
      this.http.post<Success>(this.cancelUrl, form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        validateStatus: () => true,
      }),
    );

    if (status !== 200) {
      throw new HttpException(
        `Canceling transaction failed: ${JSON.stringify(data)}`,
        status,
      );
    }
  }

  // Backend-friendly alternative to "launchPayment"
  // Return the URL so your controller/client can redirect/open it.
  getPaymentUrl(transactionId: string): string {
    return this.payUrl(transactionId);
  }
}
