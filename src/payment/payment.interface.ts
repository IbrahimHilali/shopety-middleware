export type PaymentConfig = ZainCashConfig | PayPalConfig;

export interface Payment {
  id: number;
  type: string;
  active: boolean;
  config: PaymentConfig;
}
export interface ZainCashConfig {
  msisdn: string;
  secret: string;
  merchantId: string;
}
export interface PayPalConfig {
  clientId: string;
  secret: string;
}

export type CreatePayment = Omit<Payment, 'id'>;
