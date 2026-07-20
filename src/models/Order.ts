import mongoose, { Document, Schema, Model } from "mongoose";
import type {
  OrderProductLine,
  OrderStatus,
  PaymentStatus,
} from "../types/order.types";

export interface IOrder extends Document {
  customerName: string;
  customerEmail: string;
  products: OrderProductLine[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const orderProductSchema = new Schema<OrderProductLine>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    customerName: { type: String, required: true, trim: true },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    products: {
      type: [orderProductSchema],
      required: true,
      validate: {
        validator: (value: OrderProductLine[]) =>
          Array.isArray(value) && value.length > 0,
        message: "Order must include at least one product",
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, lowercase: true },
    stripeSessionId: { type: String, required: true, unique: true, index: true },
    stripePaymentIntentId: { type: String, index: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ["pending", "paid", "processing", "shipped", "cancelled"],
      default: "pending",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", orderSchema);
