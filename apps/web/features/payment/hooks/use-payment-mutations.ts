"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CheckoutResponse,
  VerifyPaymentResponse,
} from "@workspace/shared-types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCartStore } from "@/features/cart/use-cart-store";
import { apiCall } from "@/lib/api-call";
import { studentEndpoints } from "@/lib/apis";
import { queryKeys } from "@/lib/query-keys";

const newIdempotencyKey = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const checkoutStorageKey = (courseIds: string[]) =>
  `nextdemy-checkout:${[...courseIds].sort().join(",")}`;

const readCheckoutKey = (courseIds: string[]): string => {
  const key = checkoutStorageKey(courseIds);
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;

  const created = newIdempotencyKey();
  sessionStorage.setItem(key, created);
  return created;
};

const clearCheckoutKey = (courseIds: string[]) => {
  sessionStorage.removeItem(checkoutStorageKey(courseIds));
};

export const clearCheckoutSession = (courseIds: string[]) => {
  clearCheckoutKey(courseIds);
};

/** Creates (or reuses) a server-priced demo order for the given courses. */
export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (courseIds: string[]): Promise<CheckoutResponse> => {
      const result = await apiCall<CheckoutResponse>(
        "POST",
        studentEndpoints.COURSE_CHECKOUT_API,
        { courses: courseIds },
        { "Idempotency-Key": readCheckoutKey(courseIds) }
      );
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not start checkout");
    },
  });
}

/** Verifies the signed demo session and enrolls the student exactly once. */
export function useVerifyPayment() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (
      checkout: CheckoutResponse
    ): Promise<VerifyPaymentResponse> => {
      const result = await apiCall<VerifyPaymentResponse>(
        "POST",
        studentEndpoints.COURSE_VERIFY_API,
        {
          orderId: checkout.orderId,
          providerOrderId: checkout.providerOrderId,
          paymentId: checkout.paymentId,
          signature: checkout.signature,
        }
      );
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_data, checkout) => {
      clearCheckoutKey(checkout.courses.map((course) => course._id));
      useCartStore.getState().resetCart();
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.enrolledCourses(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.payment.all });
      toast.success("Demo payment successful — courses unlocked");
      router.push("/dashboard/enrolled-courses");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Demo payment failed");
    },
  });
}

/** Cancels a pending order without granting course access. */
export function useCancelCheckout() {
  return useMutation({
    mutationFn: async (checkout: CheckoutResponse) => {
      const result = await apiCall<void>(
        "POST",
        studentEndpoints.COURSE_CANCEL_API,
        { orderId: checkout.orderId }
      );
      if (!result.ok) throw new Error(result.error);
    },
  });
}
