import { env } from "../config/env";
import type {
  CartItemInput,
  OrderProductLine,
  PricedCart,
} from "../types/order.types";
import { AppError, roundMoney } from "../utils/helpers";
import { Order, type IOrder } from "../models/Order";
import * as productService from "./product.service";

export async function priceCart(cartItems: CartItemInput[]): Promise<PricedCart> {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new AppError("Cart must contain at least one item", 400);
  }

  const merged = new Map<string, number>();

  for (const item of cartItems) {
    const quantity = Number(item.quantity);
    if (!item.productId || !Number.isInteger(quantity) || quantity < 1) {
      throw new AppError(
        "Each cart item needs a valid productId and quantity",
        400
      );
    }
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + quantity);
  }

  const products: OrderProductLine[] = [];

  for (const [productId, quantity] of merged.entries()) {
    const catalogProduct = await productService.assertStockAvailable(
      productId,
      quantity
    );

    const unitPrice = roundMoney(catalogProduct.price);
    const subtotal = roundMoney(unitPrice * quantity);

    products.push({
      productId: catalogProduct.id,
      productName: catalogProduct.title,
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

export type PublicOrder = {
  id: string;
  customerName: string;
  customerEmail: string;
  products: OrderProductLine[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
};

export function toPublicOrder(order: IOrder): PublicOrder {
  return {
    id: String(order._id),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    products: order.products.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      subtotal: line.subtotal,
    })),
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    totalAmount: order.totalAmount,
    currency: order.currency,
    stripeSessionId: order.stripeSessionId,
    stripePaymentIntentId: order.stripePaymentIntentId,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt.toISOString(),
  };
}

export async function getPublicOrderBySessionId(
  stripeSessionId: string
): Promise<PublicOrder | null> {
  const order = await findOrderBySessionId(stripeSessionId);
  if (!order) {
    return null;
  }
  return toPublicOrder(order);
}

export type CreatePaidOrderResult = {
  order: IOrder;
  created: boolean;
};

export async function createPaidOrder(
  input: CreatePaidOrderInput
): Promise<CreatePaidOrderResult> {
  const existing = await findOrderBySessionId(input.stripeSessionId);
  if (existing) {
    return { order: existing, created: false };
  }

  try {
    const order = await Order.create({
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

    return { order, created: true };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      const duplicate = await findOrderBySessionId(input.stripeSessionId);
      if (duplicate) {
        return { order: duplicate, created: false };
      }
    }
    throw error;
  }
}
