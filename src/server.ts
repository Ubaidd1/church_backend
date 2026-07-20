import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { assertEnvReady, env } from "./config/env";
import { logger, webhookSecretPreview } from "./utils/logger";

async function bootstrap(): Promise<void> {
  assertEnvReady();

  await connectDatabase();

  const app = createApp();

  app.listen(env.port, () => {
    logger.info("church_backend listening", {
      port: env.port,
      frontendUrl: env.frontendUrl,
      nodeEnv: env.nodeEnv,
      webhookSecret: webhookSecretPreview(env.stripeWebhookSecret),
    });
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
