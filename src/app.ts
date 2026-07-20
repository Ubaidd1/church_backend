import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import paymentRoutes from "./routes/payment.routes";
import webhookRoutes from "./routes/webhook.routes";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware";
import { logger } from "./utils/logger";

export function createApp(): Application {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendUrl,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Stripe-Signature"],
    })
  );
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  /**
   * Stripe webhook MUST receive the unmodified raw body.
   * Register this route before any JSON body parser.
   * Use app.use (not app.post) so the router path `/` matches correctly.
   */
  app.use(
    "/stripe/webhook",
    express.raw({ type: "application/json" }),
    webhookRoutes
  );

  app.use(
    express.json({
      limit: "1mb",
    })
  );
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => {
    res.status(200).json({
      success: true,
      message: "OK",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/payment", paymentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info("Express app configured", {
    webhookPath: "POST /stripe/webhook",
    paymentPath: "/api/payment",
    frontendUrl: env.frontendUrl,
  });

  return app;
}
