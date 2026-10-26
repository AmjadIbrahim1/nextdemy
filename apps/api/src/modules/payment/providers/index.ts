import env from "@/configs/env";
import { ApiError } from "@/shared/utils/api-error";
import { MockPaymentProvider } from "./mock.provider";
import type { PaymentProvider } from "./payment-provider.interface";

const providers: Record<string, PaymentProvider> = {
  mock: new MockPaymentProvider({
    secret: env.PAYMENT_MOCK_SECRET,
    outcome: env.PAYMENT_MOCK_OUTCOME,
  }),
};

export const getPaymentProvider = (): PaymentProvider => {
  if (env.PAYMENT_MODE !== "mock") {
    // env.ts already blocks `live`; this guard keeps the invariant close to the
    // place where a provider would be selected.
    throw ApiError.serviceUnavailable(
      "Live payments are not enabled. Configure and review a real provider first."
    );
  }

  const provider = providers[env.PAYMENT_MODE];
  if (!provider) {
    throw ApiError.serviceUnavailable("Payment provider is not configured");
  }

  return provider;
};

export type {
  CheckoutSession,
  CreateCheckoutInput,
  PaymentProvider,
  ProviderVerification,
  VerifyPaymentInput,
} from "./payment-provider.interface";
