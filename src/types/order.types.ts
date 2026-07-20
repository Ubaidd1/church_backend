export type CartItemInput = {
  productId: string;
  quantity: number;
};

export type CreateCheckoutSessionInput = {
  customerName: string;
  customerEmail: string;
  cartItems: CartItemInput[];
  /** Optional client hint; backend uses server SHIPPING_FEE. */
  shippingFee?: number;
};

export type OrderProductLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type PricedCart = {
  products: OrderProductLine[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
};

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "cancelled";
