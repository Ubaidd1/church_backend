import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/helpers";
import { logger } from "../utils/logger";

export function notFoundHandler(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(new AppError("Route not found", 404));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    logger.warn("Request failed", {
      method: req.method,
      path: req.originalUrl,
      statusCode: err.statusCode,
      message: err.message,
      details: err.details,
    });

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  logger.error("Unhandled error", {
    method: req.method,
    path: req.originalUrl,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  const message =
    err instanceof Error ? err.message : "Internal server error";

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : message,
  });
}
