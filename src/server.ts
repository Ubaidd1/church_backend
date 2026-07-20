import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { assertEnvReady, env } from "./config/env";

async function bootstrap(): Promise<void> {
  assertEnvReady();

  await connectDatabase();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`church_backend listening on port ${env.port}`);
    console.log(`Frontend CORS origin: ${env.frontendUrl}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
