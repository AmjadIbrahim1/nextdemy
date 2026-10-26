"use client";

import type { CheckoutResponse } from "@workspace/shared-types";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  ArrowLeft,
  CreditCard,
  Info,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import PrivateRoute from "@/features/auth/components/private-route";
import StudentRoute from "@/features/auth/components/student-route";
import { useCartStore } from "@/features/cart/use-cart-store";
import {
  clearCheckoutSession,
  useCancelCheckout,
  useCreateCheckout,
  useVerifyPayment,
} from "@/features/payment/hooks/use-payment-mutations";
import { formatMinorUnits } from "@/lib/currency";

function CheckoutContent() {
  const router = useRouter();
  const { cart } = useCartStore();
  const courseIds = useMemo(() => cart.map((course) => course._id), [cart]);

  const createCheckout = useCreateCheckout();
  const verifyPayment = useVerifyPayment();
  const cancelCheckout = useCancelCheckout();

  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || courseIds.length === 0) return;
    started.current = true;

    createCheckout.mutate(courseIds, {
      onSuccess: (session) => setCheckout(session),
      onError: (mutationError: Error) =>
        setError(mutationError.message || "Could not start checkout"),
    });
    // The checkout must run once per mount; the idempotency key handles reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = () => {
    clearCheckoutSession(courseIds);
    setError(null);
    createCheckout.mutate(courseIds, {
      onSuccess: (session) => setCheckout(session),
      onError: (mutationError: Error) =>
        setError(mutationError.message || "Could not start checkout"),
    });
  };

  if (courseIds.length === 0) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-bold text-3xl">Your cart is empty</h1>
        <p className="max-w-md text-muted-foreground">
          Add a course to your cart before starting checkout.
        </p>
        <Button asChild size="lg">
          <Link href="/catalog">Browse courses</Link>
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-2xl py-16">
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Checkout could not start</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-6 flex gap-3">
          <Button onClick={retry}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/cart">Back to cart</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!checkout || createCheckout.isPending) {
    return (
      <div className="container max-w-5xl space-y-6 py-16">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-8 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const isPaid = checkout.status === "paid";

  return (
    <div className="container max-w-5xl space-y-8 py-12">
      <div className="space-y-2">
        <Button asChild className="-ml-3" size="sm" variant="ghost">
          <Link href="/dashboard/cart">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to cart
          </Link>
        </Button>
        <h1 className="font-bold text-3xl tracking-tight md:text-4xl">
          Checkout
        </h1>
        <p className="text-muted-foreground">
          Review your order, then confirm the demo payment.
        </p>
      </div>

      <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <Info className="h-4 w-4" />
        <AlertTitle>Demo checkout — no real money is charged</AlertTitle>
        <AlertDescription>
          This environment uses a mock payment provider. No card details are
          collected, stored, or sent anywhere, and no real transaction takes
          place. Course access is granted after the demo payment is verified by
          the server.
        </AlertDescription>
      </Alert>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Order summary
              {checkout.isDemo && <Badge variant="secondary">Demo</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkout.courses.map((course) => (
              <div className="flex items-center gap-4" key={course._id}>
                <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
                  {course.thumbnail ? (
                    <Image
                      alt={course.courseName}
                      className="object-cover"
                      fill
                      sizes="112px"
                      src={course.thumbnail}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium">
                    {course.courseName}
                  </p>
                  <p className="text-muted-foreground text-sm">Lifetime access</p>
                </div>
                <p className="font-semibold">
                  {course.price === 0
                    ? "Free"
                    : formatMinorUnits(course.price * 100)}
                </p>
              </div>
            ))}

            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payment provider</span>
              <span className="font-medium capitalize">{checkout.status === "paid" ? "Completed" : "Mock provider"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Order reference</span>
              <span className="font-mono text-xs">
                #{checkout.orderId.slice(-10)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Total</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-bold text-3xl">
              {formatMinorUnits(checkout.amount)}
            </p>
            <p className="text-muted-foreground text-sm">
              {checkout.currency} · one-time payment
            </p>
            <div className="flex items-center gap-2 pt-2 text-muted-foreground text-xs">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Server-verified pricing
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {isPaid ? (
              <Button asChild className="w-full" size="lg">
                <Link href="/dashboard/enrolled-courses">Go to my courses</Link>
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={verifyPayment.isPending || cancelCheckout.isPending}
                onClick={() => verifyPayment.mutate(checkout)}
                size="lg"
              >
                {verifyPayment.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying demo payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay {formatMinorUnits(checkout.amount)} (demo)
                  </>
                )}
              </Button>
            )}

            <Button
              className="w-full"
              disabled={verifyPayment.isPending || cancelCheckout.isPending}
              onClick={() => {
                cancelCheckout.mutate(checkout, {
                  onSuccess: () => {
                    clearCheckoutSession(courseIds);
                    router.push("/dashboard/cart");
                  },
                });
              }}
              variant="ghost"
            >
              Cancel checkout
            </Button>

            <p className="text-center text-muted-foreground text-xs">
              No card data is requested or stored.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <PrivateRoute>
      <StudentRoute>
        <div className="min-h-screen pt-16">
          <CheckoutContent />
        </div>
      </StudentRoute>
    </PrivateRoute>
  );
}
