export interface ProviderCourse {
  id: string;
  name: string;
  price: number;
}

export interface ProviderCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface CreateCheckoutInput {
  orderId: string;
  amount: number;
  currency: string;
  customer: ProviderCustomer;
  courses: ProviderCourse[];
}

export interface CheckoutSession {
  providerOrderId: string;
  paymentId: string;
  signature: string;
}

export interface VerifyPaymentInput {
  providerOrderId: string;
  paymentId: string;
  signature: string;
  amount: number;
  currency: string;
}

export type ProviderVerification =
  | { status: "succeeded" }
  | { status: "failed"; reason: string }
  | { status: "cancelled"; reason: string };

/**
 * Contract every payment gateway adapter must implement. The order, pricing,
 * enrollment, and idempotency logic stay in the payment service so a future
 * provider (Paymob, Stripe, etc.) can be added without rewriting them.
 */
export interface PaymentProvider {
  readonly name: string;
  readonly isDemo: boolean;
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>;
  verifyPayment(input: VerifyPaymentInput): Promise<ProviderVerification>;
}
