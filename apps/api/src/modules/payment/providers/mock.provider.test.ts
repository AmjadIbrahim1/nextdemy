import { describe, expect, it } from "bun:test";
import { MockPaymentProvider } from "./mock.provider";

const input = {
  orderId: "order_1",
  amount: 149_900,
  currency: "EGP",
  customer: {
    id: "user_1",
    email: "student@example.com",
    firstName: "Test",
    lastName: "Student",
  },
  courses: [{ id: "course_1", name: "Course", price: 1499 }],
};

describe("MockPaymentProvider", () => {
  it("creates a signature that verifies for the same amount and currency", async () => {
    const provider = new MockPaymentProvider({
      secret: "unit-test-secret-0123456789",
      outcome: "success",
    });
    const session = await provider.createCheckout(input);

    const result = await provider.verifyPayment({
      providerOrderId: session.providerOrderId,
      paymentId: session.paymentId,
      signature: session.signature,
      amount: input.amount,
      currency: input.currency,
    });

    expect(result.status).toBe("succeeded");
  });

  it("rejects tampered signatures and amount changes", async () => {
    const provider = new MockPaymentProvider({
      secret: "unit-test-secret-0123456789",
      outcome: "success",
    });
    const session = await provider.createCheckout(input);

    const tampered = await provider.verifyPayment({
      providerOrderId: session.providerOrderId,
      paymentId: session.paymentId,
      signature: "not-the-signature",
      amount: input.amount,
      currency: input.currency,
    });
    expect(tampered.status).toBe("failed");

    const differentAmount = await provider.verifyPayment({
      providerOrderId: session.providerOrderId,
      paymentId: session.paymentId,
      signature: session.signature,
      amount: 1,
      currency: input.currency,
    });
    expect(differentAmount.status).toBe("failed");
  });

  it("honours the configured failure and cancel outcomes", async () => {
    const failure = new MockPaymentProvider({
      secret: "unit-test-secret-0123456789",
      outcome: "failure",
    });
    const failureSession = await failure.createCheckout(input);
    const failed = await failure.verifyPayment({
      providerOrderId: failureSession.providerOrderId,
      paymentId: failureSession.paymentId,
      signature: failureSession.signature,
      amount: input.amount,
      currency: input.currency,
    });
    expect(failed.status).toBe("failed");

    const cancel = new MockPaymentProvider({
      secret: "unit-test-secret-0123456789",
      outcome: "cancel",
    });
    const cancelSession = await cancel.createCheckout(input);
    const cancelled = await cancel.verifyPayment({
      providerOrderId: cancelSession.providerOrderId,
      paymentId: cancelSession.paymentId,
      signature: cancelSession.signature,
      amount: input.amount,
      currency: input.currency,
    });
    expect(cancelled.status).toBe("cancelled");
  });
});
