import crypto from "crypto";
import type {
  CheckoutSession,
  CreateCheckoutInput,
  PaymentProvider,
  ProviderVerification,
  VerifyPaymentInput,
} from "./payment-provider.interface";

export type MockOutcome = "success" | "failure" | "cancel";

interface MockProviderOptions {
  secret: string;
  outcome: MockOutcome;
}

const sign = (
  secret: string,
  providerOrderId: string,
  paymentId: string,
  amount: number,
  currency: string
) =>
  crypto
    .createHmac("sha256", secret)
    .update(`${providerOrderId}|${paymentId}|${amount}|${currency}`)
    .digest("hex");

/**
 * Simulates a hosted checkout. The signed session is created server-side; the
 * browser cannot decide that a payment succeeded by sending `success: true`.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  readonly isDemo = true;

  private readonly secret: string;
  private readonly outcome: MockOutcome;

  constructor({ secret, outcome }: MockProviderOptions) {
    this.secret = secret;
    this.outcome = outcome;
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    const providerOrderId = `mock_order_${crypto.randomUUID()}`;
    const paymentId = `mock_pay_${crypto.randomUUID()}`;

    return {
      providerOrderId,
      paymentId,
      signature: sign(
        this.secret,
        providerOrderId,
        paymentId,
        input.amount,
        input.currency
      ),
    };
  }

  async verifyPayment(
    input: VerifyPaymentInput
  ): Promise<ProviderVerification> {
    const expected = sign(
      this.secret,
      input.providerOrderId,
      input.paymentId,
      input.amount,
      input.currency
    );

    const expectedBuffer = Buffer.from(expected, "utf8");
    const receivedBuffer = Buffer.from(input.signature, "utf8");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return { status: "failed", reason: "Invalid demo payment signature" };
    }

    if (this.outcome === "failure") {
      return {
        status: "failed",
        reason:
          "Demo payment declined by the configured mock outcome. No money was charged.",
      };
    }

    if (this.outcome === "cancel") {
      return {
        status: "cancelled",
        reason: "Demo payment was cancelled by the configured mock outcome.",
      };
    }

    return { status: "succeeded" };
  }
}
