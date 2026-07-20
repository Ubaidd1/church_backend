import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { AppError } from "../utils/helpers";
import * as stripeService from "../services/stripe.service";
import * as orderService from "../services/order.service";

export function validateRequest(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(
      new AppError("Validation failed", 400, {
        errors: errors.array(),
      })
    );
    return;
  }
  next();
}

export async function createCheckoutSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { customerName, customerEmail, cartItems, shippingFee } = req.body;

    const result = await stripeService.createCheckoutSession({
      customerName,
      customerEmail,
      cartItems,
      shippingFee,
    });

    res.status(200).json({
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleStripeWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers["stripe-signature"];

    if (!signature || typeof signature !== "string") {
      throw new AppError("Missing Stripe-Signature header", 400);
    }

    if (!Buffer.isBuffer(req.body)) {
      throw new AppError(
        "Webhook requires raw request body for signature verification",
        400
      );
    }

    const event = stripeService.constructWebhookEvent(req.body, signature);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await persistPaidOrderFromSession(session);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
}

async function persistPaidOrderFromSession(
  session: import("stripe").Stripe.Checkout.Session
): Promise<void> {
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return;
  }

  const existing = await orderService.findOrderBySessionId(session.id);
  if (existing) {
    return;
  }

  const parsed = stripeService.parseCheckoutSessionMetadata(session);
  const paymentIntentId = stripeService.getPaymentIntentId(session);

  await orderService.createPaidOrder({
    customerName: parsed.customerName,
    customerEmail: parsed.customerEmail,
    products: parsed.products,
    subtotal: parsed.subtotal,
    shippingFee: parsed.shippingFee,
    totalAmount: parsed.totalAmount,
    currency: parsed.currency,
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
  });
}
