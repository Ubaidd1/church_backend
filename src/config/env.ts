import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    return fallback;
  }
  return value.trim();
}

const shippingFeeDollars = Number(optionalEnv("SHIPPING_FEE", "5.99"));

if (Number.isNaN(shippingFeeDollars) || shippingFeeDollars < 0) {
  throw new Error("SHIPPING_FEE must be a non-negative number");
}

export const env = {
  nodeEnv: optionalEnv("NODE_ENV", "development"),
  port: Number(optionalEnv("PORT", "4000")),
  mongodbUri: requireEnv("MONGODB_URI"),
  stripeSecretKey: requireEnv("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: requireEnv("STRIPE_WEBHOOK_SECRET"),
  frontendUrl: optionalEnv("FRONTEND_URL", "http://localhost:3000").replace(
    /\/$/,
    ""
  ),
  currency: optionalEnv("CURRENCY", "usd").toLowerCase(),
  /** Flat shipping fee in dollars (server-authoritative). */
  shippingFee: shippingFeeDollars,
};

export function assertEnvReady(): void {
  if (Number.isNaN(env.port) || env.port <= 0) {
    throw new Error("PORT must be a positive number");
  }
}
