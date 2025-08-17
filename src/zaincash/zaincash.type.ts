export type Result<T> =
    | { ok: true; data: T }
    | { ok: false; error: any };

// Shape depends on ZainCash API; keep generic if you don't have exact models yet.
export type ZainCashInitResponse = Record<string, any>;
export type ZainCashProcessResponse = Record<string, any>;
export type ZainCashOtpResponse = { success?: number } & Record<string, any>;
