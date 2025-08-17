// zaincash.types.ts
export interface CreateTransactionDto {
    amountIQD: number;         // > 1000
    serviceType: string;
    msisdn: string;            // wallet phone number
    orderId: string;
    redirectUrl?: string;      // ZainCash will append ?token=...
}

export interface ProcessTransactionDto {
    transactionId: string;
    phoneNumber: string;
    pin: string;
}

export interface ProcessOtpDto extends ProcessTransactionDto {
    otp: string;
    type?: 'MERCHANT_PAYMENT';
}

