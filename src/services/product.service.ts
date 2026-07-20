import { Product, type IProduct } from "../models/Product";
import { seedProducts } from "../data/seedProducts";
import { AppError, roundMoney } from "../utils/helpers";
import { logger } from "../utils/logger";

export type PublicProduct = {
  id: string;
  title: string;
  slug: string;
  images: string[];
  price: number;
  quantity: number;
  description: string;
  shortDescription: string;
  details: { label: string; value: string }[];
  faqs: { question: string; answer: string }[];
  reviews: {
    id: string;
    name: string;
    rating: number;
    date: string;
    comment: string;
  }[];
};

export function toPublicProduct(product: IProduct): PublicProduct {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    images: product.images,
    price: product.price,
    quantity: product.quantity,
    description: product.description,
    shortDescription: product.shortDescription,
    details: product.details,
    faqs: product.faqs,
    reviews: product.reviews,
  };
}

export async function seedProductsIfNeeded(): Promise<void> {
  const count = await Product.countDocuments();
  if (count > 0) {
    logger.info("Products collection already seeded", { count });
    // Keep images/content in sync for the known seed product without resetting stock.
    for (const seed of seedProducts) {
      await Product.updateOne(
        { id: seed.id },
        {
          $set: {
            title: seed.title,
            slug: seed.slug,
            images: seed.images,
            price: seed.price,
            description: seed.description,
            shortDescription: seed.shortDescription,
            details: seed.details,
            faqs: seed.faqs,
            reviews: seed.reviews,
            isActive: true,
          },
          $setOnInsert: {
            quantity: seed.quantity,
          },
        },
        { upsert: true }
      );
    }
    return;
  }

  await Product.insertMany(
    seedProducts.map((product) => ({
      ...product,
      isActive: true,
    }))
  );

  logger.info("Seeded products collection", {
    count: seedProducts.length,
  });
}

export async function listActiveProducts(): Promise<PublicProduct[]> {
  const products = await Product.find({ isActive: true }).sort({ createdAt: 1 });
  return products.map(toPublicProduct);
}

export async function getProductBySlug(
  slug: string
): Promise<PublicProduct | null> {
  const product = await Product.findOne({ slug, isActive: true });
  return product ? toPublicProduct(product) : null;
}

export async function getProductById(
  productId: string
): Promise<IProduct | null> {
  return Product.findOne({ id: productId, isActive: true });
}

export async function getPublicProductById(
  productId: string
): Promise<PublicProduct | null> {
  const product = await getProductById(productId);
  return product ? toPublicProduct(product) : null;
}

export type StockLine = {
  productId: string;
  quantity: number;
};

export async function decrementStockForOrder(
  lines: StockLine[]
): Promise<void> {
  for (const line of lines) {
    const updated = await Product.findOneAndUpdate(
      {
        id: line.productId,
        quantity: { $gte: line.quantity },
      },
      {
        $inc: { quantity: -line.quantity },
      },
      { new: true }
    );

    if (!updated) {
      const current = await Product.findOne({ id: line.productId });
      logger.warn("Unable to fully decrement product stock", {
        productId: line.productId,
        requested: line.quantity,
        available: current?.quantity ?? null,
      });

      if (current && current.quantity > 0) {
        current.quantity = Math.max(0, current.quantity - line.quantity);
        await current.save();
      }
      continue;
    }

    logger.info("Product stock decremented", {
      productId: line.productId,
      purchased: line.quantity,
      remaining: updated.quantity,
    });
  }
}

export async function assertStockAvailable(
  productId: string,
  quantity: number
): Promise<{ id: string; title: string; price: number }> {
  const product = await getProductById(productId);
  if (!product) {
    throw new AppError(`Unknown product: ${productId}`, 400);
  }
  if (quantity > product.quantity) {
    throw new AppError(
      `Insufficient stock for ${product.title}. Available: ${product.quantity}`,
      400
    );
  }

  return {
    id: product.id,
    title: product.title,
    price: roundMoney(product.price),
  };
}
