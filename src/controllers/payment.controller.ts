import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { AppError } from "../utils/helpers";
import * as stripeService from "../services/stripe.service";
import * as orderService from "../services/order.service";
import * as productService from "../services/product.service";
import { logger, webhookSecretPreview } from "../utils/logger";
import { env } from "../config/env";

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

    logger.info("Creating checkout session", {
      customerEmail,
      itemCount: Array.isArray(cartItems) ? cartItems.length : 0,
    });

    const result = await stripeService.createCheckoutSession({
      customerName,
      customerEmail,
      cartItems,
      shippingFee,
    });

    logger.info("Checkout session created", {
      sessionId: result.sessionId,
    });

    res.status(200).json({
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderBySession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = String(req.params.sessionId || "").trim();

    if (!sessionId || !sessionId.startsWith("cs_")) {
      throw new AppError("Valid Stripe session ID is required", 400);
    }

    logger.info("Fetching order by session", { sessionId });

    const order = await orderService.getPublicOrderBySessionId(sessionId);

    if (!order) {
      logger.warn("Order not found for session yet", { sessionId });
      res.status(404).json({
        success: false,
        message: "Order not found yet. Payment may still be processing.",
      });
      return;
    }

    logger.info("Order found for session", {
      sessionId,
      orderId: order.id,
      totalAmount: order.totalAmount,
    });

    res.status(200).json({
      success: true,
      order,
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
  const signatureHeader = req.headers["stripe-signature"];
  const contentType = req.headers["content-type"];

  try {
    logger.info("Stripe webhook received", {
      contentType,
      bodyIsBuffer: Buffer.isBuffer(req.body),
      bodyType: req.body === null ? "null" : typeof req.body,
      bodyByteLength: Buffer.isBuffer(req.body)
        ? req.body.byteLength
        : typeof req.body === "string"
          ? Buffer.byteLength(req.body)
          : undefined,
      hasSignature: Boolean(signatureHeader),
      signatureType: typeof signatureHeader,
      webhookSecret: webhookSecretPreview(env.stripeWebhookSecret),
    });

    if (!signatureHeader || typeof signatureHeader !== "string") {
      logger.error("Webhook missing Stripe-Signature header", {
        signatureHeader,
      });
      throw new AppError("Missing Stripe-Signature header", 400);
    }

    const payload = normalizeWebhookPayload(req.body);

    if (!payload) {
      logger.error("Webhook body is not raw", {
        bodyType: req.body === null ? "null" : typeof req.body,
        isBuffer: Buffer.isBuffer(req.body),
        hint: "express.json() may have parsed the body before the webhook handler. Raw body is required for signature verification.",
      });
      throw new AppError(
        "Webhook requires raw request body for signature verification",
        400
      );
    }

    if (payload.byteLength === 0) {
      logger.error("Webhook body is empty");
      throw new AppError("Webhook body is empty", 400);
    }

    let event;
    try {
      event = stripeService.constructWebhookEvent(payload, signatureHeader);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid webhook signature";

      logger.error("Webhook signature verification failed", {
        message,
        bodyByteLength: payload.byteLength,
        bodyPreview: payload.toString("utf8").slice(0, 120),
        webhookSecret: webhookSecretPreview(env.stripeWebhookSecret),
        hint: "If you use `stripe listen`, copy the whsec_... printed by the CLI into STRIPE_WEBHOOK_SECRET (Dashboard endpoint secrets will not work with the CLI). Restart the server after updating .env.",
      });

      throw error instanceof AppError
        ? error
        : new AppError(`Webhook signature verification failed: ${message}`, 400);
    }

    logger.info("Webhook event verified", {
      eventId: event.id,
      eventType: event.type,
      livemode: event.livemode,
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      logger.info("Processing checkout.session.completed", {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        status: session.status,
      });
      await persistPaidOrderFromSession(session);
    } else {
      logger.debug("Ignoring unhandled webhook event type", {
        eventType: event.type,
      });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error("Webhook handler failed", {
      message: error instanceof Error ? error.message : String(error),
      statusCode: error instanceof AppError ? error.statusCode : 500,
    });
    next(error);
  }
}

function normalizeWebhookPayload(body: unknown): Buffer | null {
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (typeof body === "string") {
    return Buffer.from(body, "utf8");
  }
  return null;
}

async function persistPaidOrderFromSession(
  session: import("stripe").Stripe.Checkout.Session
): Promise<void> {
  if (session.payment_status !== "paid" && session.status !== "complete") {
    logger.warn("Skipping order save — session not paid/complete", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      status: session.status,
    });
    return;
  }

  const existing = await orderService.findOrderBySessionId(session.id);
  if (existing) {
    logger.info("Order already exists for session — idempotent skip", {
      sessionId: session.id,
      orderId: String(existing._id),
    });
    return;
  }

  const parsed = stripeService.parseCheckoutSessionMetadata(session);
  const paymentIntentId = stripeService.getPaymentIntentId(session);

  logger.debug("Parsed checkout metadata", {
    sessionId: session.id,
    customerEmail: parsed.customerEmail,
    productCount: parsed.products.length,
    totalAmount: parsed.totalAmount,
    currency: parsed.currency,
  });

  const { order, created } = await orderService.createPaidOrder({
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

  if (created) {
    await productService.decrementStockForOrder(
      parsed.products.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      }))
    );
  }

  logger.info("Order saved from webhook", {
    orderId: String(order._id),
    sessionId: session.id,
    paymentIntentId,
    totalAmount: order.totalAmount,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    stockDecremented: created,
  });
}
