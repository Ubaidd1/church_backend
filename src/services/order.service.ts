import { env } from "../config/env";
import { getCatalogProductById } from "../data/products";
import type {
  CartItemInput,
  OrderProductLine,
  PricedCart,
} from "../types/order.types";
import { AppError, roundMoney } from "../utils/helpers";
import { Order, type IOrder } from "../models/Order";

export function priceCart(cartItems: CartItemInput[]): PricedCart {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new AppError("Cart must contain at least one item", 400);
  }

  const merged = new Map<string, number>();

  for (const item of cartItems) {
    const quantity = Number(item.quantity);
    if (!item.productId || !Number.isInteger(quantity) || quantity < 1) {
      throw new AppError("Each cart item needs a valid productId and quantity", 400);
    }
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + quantity);
  }

  const products: OrderProductLine[] = [];

  for (const [productId, quantity] of merged.entries()) {
    const catalogProduct = getCatalogProductById(productId);
    if (!catalogProduct) {
      throw new AppError(`Unknown product: ${productId}`, 400);
    }
    if (quantity > catalogProduct.stock) {
      throw new AppError(
        `Insufficient stock for ${catalogProduct.name}. Available: ${catalogProduct.stock}`,
        400
      );
    }

    const unitPrice = roundMoney(catalogProduct.unitPrice);
    const subtotal = roundMoney(unitPrice * quantity);

    products.push({
      productId: catalogProduct.id,
      productName: catalogProduct.name,
      quantity,
      unitPrice,
      subtotal,
    });
  }

  const subtotal = roundMoney(
    products.reduce((sum, line) => sum + line.subtotal, 0)
  );
  const shippingFee = roundMoney(env.shippingFee);
  const totalAmount = roundMoney(subtotal + shippingFee);

  return {
    products,
    subtotal,
    shippingFee,
    totalAmount,
    currency: env.currency,
  };
}

export type CreatePaidOrderInput = {
  customerName: string;
  customerEmail: string;
  products: OrderProductLine[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
};

export async function findOrderBySessionId(
  stripeSessionId: string
): Promise<IOrder | null> {
  return Order.findOne({ stripeSessionId });
}

export async function createPaidOrder(
  input: CreatePaidOrderInput
): Promise<IOrder> {
  const existing = await findOrderBySessionId(input.stripeSessionId);
  if (existing) {
    return existing;
  }

  try {
    return await Order.create({
      customerName: input.customerName,
      customerEmail: input.customerEmail.toLowerCase(),
      products: input.products,
      subtotal: input.subtotal,
      shippingFee: input.shippingFee,
      totalAmount: input.totalAmount,
      currency: input.currency.toLowerCase(),
      stripeSessionId: input.stripeSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      paymentStatus: "paid",
      orderStatus: "paid",
    });
  } catch (error: unknown) {
    // Handle concurrent webhook deliveries for the same session.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      const duplicate = await findOrderBySessionId(input.stripeSessionId);
      if (duplicate) {
        return duplicate;
      }
    }
    throw error;
  }
}
