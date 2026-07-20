import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/helpers";

export function notFoundHandler(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(new AppError("Route not found", 404));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  console.error("Unhandled error:", err);

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
