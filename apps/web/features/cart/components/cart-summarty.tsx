"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/features/cart/use-cart-store";
import { formatCurrency } from "@/lib/currency";

export default function CartSummary() {
  const { total, cart } = useCartStore();
  const router = useRouter();

  const handleBuyCourse = () => {
    if (cart.length > 0) {
      router.push("/checkout");
    }
  };

  return (
    <Card className="overflow-hidden border-muted/60 shadow-lg">
      <CardHeader className="bg-muted/30 pb-4">
        <CardTitle className="font-medium text-lg text-muted-foreground">
          Summary
        </CardTitle>
        <div className="pt-2">
          <span className="font-bold text-3xl text-foreground">
            {formatCurrency(total)}
          </span>
          <span className="mt-1 block font-medium text-muted-foreground text-xs">
            One-time payment · lifetime access
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* Promo Code UI (Visual Only) */}
        {/* <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Coupon Code" className="pl-9 bg-background" />
            </div>
            <Button variant="outline">Apply</Button>
          </div>
        </div>

        <Separator /> */}

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Courses</span>
            <span className="font-medium">{cart.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(total)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t pt-3">
            <span className="font-bold text-base">Total</span>
            <span className="font-bold text-base">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 p-6 pt-0">
        <Button
          animation="swap"
          className="h-11 w-full font-semibold text-base shadow-md"
          onClick={handleBuyCourse}
          size="lg"
        >
          Proceed to Checkout
        </Button>

        <div className="flex w-full items-center justify-center gap-2 rounded-md bg-muted/30 p-2 text-muted-foreground text-xs">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Demo checkout · no real money is charged</span>
        </div>
      </CardFooter>
    </Card>
  );
}
