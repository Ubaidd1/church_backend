import mongoose, { Document, Model, Schema } from "mongoose";

export type ProductDetail = {
  label: string;
  value: string;
};

export type ProductFaq = {
  question: string;
  answer: string;
};

export type ProductReview = {
  id: string;
  name: string;
  rating: number;
  date: string;
  comment: string;
};

export interface IProduct extends Document {
  /** Stable cart/checkout ID (not Mongo _id). */
  id: string;
  title: string;
  slug: string;
  images: string[];
  price: number;
  quantity: number;
  description: string;
  shortDescription: string;
  details: ProductDetail[];
  faqs: ProductFaq[];
  reviews: ProductReview[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productDetailSchema = new Schema<ProductDetail>(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const productFaqSchema = new Schema<ProductFaq>(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false }
);

const productReviewSchema = new Schema<ProductReview>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    date: { type: String, required: true },
    comment: { type: String, required: true },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => Array.isArray(value) && value.length > 0,
        message: "Product must include at least one image",
      },
    },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true },
    details: { type: [productDetailSchema], default: [] },
    faqs: { type: [productFaqSchema], default: [] },
    reviews: { type: [productReviewSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", productSchema);
