import { NextFunction, Request, Response } from "express";
import * as productService from "../services/product.service";
import { AppError } from "../utils/helpers";
import { logger } from "../utils/logger";

export async function listProducts(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const products = await productService.listActiveProducts();
    logger.info("Listed products", { count: products.length });
    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductBySlug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug) {
      throw new AppError("Product slug is required", 400);
    }

    const product = await productService.getProductBySlug(slug);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    logger.info("Fetched product by slug", {
      slug,
      productId: product.id,
      quantity: product.quantity,
    });

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
}
