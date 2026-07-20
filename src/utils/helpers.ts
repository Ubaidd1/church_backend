export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function toDollarsFromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function toCentsFromDollars(dollars: number): number {
  return Math.round(dollars * 100);
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
