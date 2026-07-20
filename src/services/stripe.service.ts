import Stripe from "stripe";
import { env } from "../config/env";
import { stripe } from "../config/stripe";
import type { CreateCheckoutSessionInput, PricedCart } from "../types/order.types";
import { AppError, toCentsFromDollars } from "../utils/helpers";
import { priceCart } from "./order.service";

const METADATA_CART_MAX_LENGTH = 450;

function serializeCartForMetadata(pricedCart: PricedCart): string {
  const compact = pricedCart.products.map((line) => ({
    id: line.productId,
    n: line.productName,
    q: line.quantity,
    p: line.unitPrice,
    s: line.subtotal,
  }));

  const serialized = JSON.stringify(compact);
  if (serialized.length > METADATA_CART_MAX_LENGTH) {
    throw new AppError(
      "Cart is too large for checkout metadata. Reduce items and try again.",
      400
    );
  }
  return serialized;
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<{ checkoutUrl: string; sessionId: string }> {
  const pricedCart = priceCart(input.cartItems);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    pricedCart.products.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency: pricedCart.currency,
        unit_amount: toCentsFromDollars(line.unitPrice),
        product_data: {
          name: line.productName,
          metadata: {
            productId: line.productId,
          },
        },
      },
    }));

  if (pricedCart.shippingFee > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: pricedCart.currency,
        unit_amount: toCentsFromDollars(pricedCart.shippingFee),
        product_data: {
          name: "Shipping",
        },
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: input.customerEmail.toLowerCase(),
    client_reference_id: input.customerEmail.toLowerCase(),
    line_items: lineItems,
    success_url: `${env.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.frontendUrl}/checkout/cancel`,
    billing_address_collection: "auto",
    shipping_address_collection: {
      allowed_countries: ["US", "CA"],
    },
    // Guest checkout — no forced Stripe account.
    // Cards, Apple Pay, and Google Pay are enabled via Stripe Dashboard payment methods.
    customer_creation: "if_required",
    metadata: {
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.toLowerCase().trim(),
      shippingFee: String(pricedCart.shippingFee),
      subtotal: String(pricedCart.subtotal),
      totalAmount: String(pricedCart.totalAmount),
      currency: pricedCart.currency,
      cart: serializeCartForMetadata(pricedCart),
    },
    payment_intent_data: {
      metadata: {
        customerName: input.customerName.trim(),
        customerEmail: input.customerEmail.toLowerCase().trim(),
      },
    },
  });

  if (!session.url) {
    throw new AppError("Stripe did not return a checkout URL", 502);
  }

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
}

export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      env.stripeWebhookSecret.trim()
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid webhook signature";
    throw new AppError(`Webhook signature verification failed: ${message}`, 400);
  }
}

export type ParsedCheckoutMetadata = {
  customerName: string;
  customerEmail: string;
  shippingFee: number;
  subtotal: number;
  totalAmount: number;
  currency: string;
  products: PricedCart["products"];
};

export function parseCheckoutSessionMetadata(
  session: Stripe.Checkout.Session
): ParsedCheckoutMetadata {
  const metadata = session.metadata ?? {};

  const customerName =
    metadata.customerName?.trim() ||
    session.customer_details?.name?.trim() ||
    "Guest";
  const customerEmail =
    metadata.customerEmail?.trim().toLowerCase() ||
    session.customer_email?.trim().toLowerCase() ||
    session.customer_details?.email?.trim().toLowerCase();

  if (!customerEmail) {
    throw new AppError("Checkout session is missing customer email", 400);
  }

  let products: PricedCart["products"] = [];
  if (metadata.cart) {
    try {
      const parsed = JSON.parse(metadata.cart) as Array<{
        id: string;
        n: string;
        q: number;
        p: number;
        s: number;
      }>;
      products = parsed.map((item) => ({
        productId: item.id,
        productName: item.n,
        quantity: item.q,
        unitPrice: item.p,
        subtotal: item.s,
      }));
    } catch {
      throw new AppError("Failed to parse cart metadata from Stripe session", 400);
    }
  }

  if (products.length === 0) {
    throw new AppError("Checkout session metadata is missing cart items", 400);
  }

  const shippingFee = Number(metadata.shippingFee ?? 0);
  const subtotal = Number(
    metadata.subtotal ??
      products.reduce((sum, line) => sum + line.subtotal, 0)
  );
  const totalAmount = Number(
    metadata.totalAmount ??
      (session.amount_total != null
        ? session.amount_total / 100
        : subtotal + shippingFee)
  );
  const currency = (
    metadata.currency ||
    session.currency ||
    env.currency
  ).toLowerCase();

  return {
    customerName,
    customerEmail,
    shippingFee,
    subtotal,
    totalAmount,
    currency,
    products,
  };
}

export function getPaymentIntentId(
  session: Stripe.Checkout.Session
): string | undefined {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }
  if (session.payment_intent && typeof session.payment_intent === "object") {
    return session.payment_intent.id;
  }
  return undefined;
}
