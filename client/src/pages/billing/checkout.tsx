import { createFileRoute } from "@tanstack/react-router";
import { valibotValidator } from "@tanstack/valibot-adapter";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { object, optional, string } from "valibot";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components";
import { getPaddle } from "@/entities/billing";
import { parsePaddleTransactionId } from "@/entities/billing/lib/parse-paddle-transaction-id";
import * as m from "@/i18n/messages";

const billingCheckoutSearchSchema = object({
  _ptxn: optional(string()),
});

type CheckoutState = "opening" | "opened" | "error";

export const Route = createFileRoute("/billing/checkout")({
  validateSearch: valibotValidator(billingCheckoutSearchSchema),
  component: BillingCheckoutPage,
});

function BillingCheckoutPage() {
  const { _ptxn } = Route.useSearch();
  const transactionId = useMemo(() => parsePaddleTransactionId(_ptxn), [_ptxn]);
  const hasOpenedCheckoutRef = useRef(false);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("opening");

  const openCheckout = useCallback(async () => {
    if (!transactionId || hasOpenedCheckoutRef.current) {
      return;
    }

    hasOpenedCheckoutRef.current = true;
    setCheckoutState("opening");

    try {
      const paddle = await getPaddle();
      paddle.Checkout.open({ transactionId });
      setCheckoutState("opened");
    } catch (error) {
      console.error("Failed to open Paddle checkout", error);
      hasOpenedCheckoutRef.current = false;
      setCheckoutState("error");
    }
  }, [transactionId]);

  useEffect(() => {
    void openCheckout();
  }, [openCheckout]);

  const handleRetry = () => {
    hasOpenedCheckoutRef.current = false;
    void openCheckout();
  };

  if (!transactionId) {
    return (
      <CheckoutContainer>
        <Card>
          <CardHeader>
            <CardTitle>{m.billing_checkout_invalid_title()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {m.billing_checkout_invalid_description()}
            </p>
          </CardContent>
        </Card>
      </CheckoutContainer>
    );
  }

  if (checkoutState === "error") {
    return (
      <CheckoutContainer>
        <Card>
          <CardHeader>
            <CardTitle>{m.billing_checkout_error_title()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {m.billing_checkout_error_description()}
            </p>
            <Button onClick={handleRetry}>{m.billing_checkout_retry()}</Button>
          </CardContent>
        </Card>
      </CheckoutContainer>
    );
  }

  return (
    <CheckoutContainer>
      <Card>
        <CardHeader>
          <CardTitle>{m.billing_checkout_title()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">
            {checkoutState === "opened"
              ? m.billing_checkout_opened()
              : m.billing_checkout_opening()}
          </p>
          <Button variant="outline" onClick={handleRetry}>
            {m.billing_checkout_retry()}
          </Button>
        </CardContent>
      </Card>
    </CheckoutContainer>
  );
}

function CheckoutContainer({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted/20 flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
