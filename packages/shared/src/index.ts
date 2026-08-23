export const APP_NAME = "LockGo";

export const PAYMENT_METHODS = ["promptpay", "card", "bank"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  promptpay: "พร้อมเพย์",
  card: "บัตรเดบิต / เครดิต",
  bank: "โอนผ่านธนาคาร",
};
