export interface Payment {
    id: number;
    type: string
    active: boolean;
    config: JSON;
}

export interface CreatePayment extends Omit<Payment, 'id'> {
}
