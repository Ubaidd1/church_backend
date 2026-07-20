type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): LogLevel {
  const configured = (process.env.LOG_LEVEL || "").toLowerCase();
  if (configured === "debug" || configured === "info" || configured === "warn" || configured === "error") {
    return configured;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel()];
}

function formatMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) {
    return "";
  }
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return " [meta:unserializable]";
  }
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!shouldLog(level)) {
    return;
  }

  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${formatMeta(meta)}`;

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    write("debug", message, meta);
  },
  info(message: string, meta?: Record<string, unknown>): void {
    write("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    write("warn", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>): void {
    write("error", message, meta);
  },
};

/** Safe preview of webhook secret for debugging (never logs the full secret). */
export function webhookSecretPreview(secret: string): Record<string, unknown> {
  const trimmed = secret.trim();
  return {
    prefix: trimmed.slice(0, 6),
    length: trimmed.length,
    looksLikeStripeSecret: trimmed.startsWith("whsec_"),
    isPlaceholder:
      trimmed.includes("replace_me") ||
      trimmed.includes("...") ||
      trimmed === "whsec_",
  };
}
