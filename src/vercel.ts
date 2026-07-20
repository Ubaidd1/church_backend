import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { assertEnvReady } from "./config/env";
import { seedProductsIfNeeded } from "./services/product.service";
import { logger } from "./utils/logger";

assertEnvReady();

const app = createApp();

let ready: Promise<void> | null = null;

function ensureReady(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await connectDatabase();
      await seedProductsIfNeeded();
    })().catch((error) => {
      ready = null;
      logger.error("Failed to initialize serverless app", {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    });
  }
  return ready;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  await ensureReady();
  app(req, res);
}
