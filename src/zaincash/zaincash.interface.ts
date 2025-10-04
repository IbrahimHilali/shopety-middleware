export interface EncryptTransactionRequest {
  token: string;
  merchantId: string;
  lang: string;
}

export interface ZainCashClientRequest {
  amount: number; // > 1000
  serviceType: string;
  language: string;
  orderId: string;
  redirectUrl?: string; // ZainCash will append ?token=...
}

export interface Success {
  success: boolean;
}
export interface CreateTransactionDto
  extends Omit<ZainCashClientRequest, 'language'> {
  msisdn: string;
  iat: number;
  exp: number;
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

export interface ZainCashError {
  msg: string;
}

enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface CurrencyConversion {
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  originalAmount: number;
  convertedAmount: number;
  timestamp: Date;
}

export interface TransactionResponse {
  id: string;
  source: string;
  type: string;
  amount: number;
  to: string;
  serviceType: string;
  lang: string;
  orderId: string;
  currencyConversion?: CurrencyConversion;
  referenceNumber: string;
  credit: boolean;
  status: TransactionStatus;
  reversed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionProcessResponse extends Success {
  transactionId: string;
  initialAmount_: string;
  totalFees: number;
  total: string;
}

export interface TransactionOTPResponse extends Success {
  url?: string;
  msg?: string;
}
