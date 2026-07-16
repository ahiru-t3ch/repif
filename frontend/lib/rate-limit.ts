import type { NextRequest } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Bucket>();

const PREDICT_LIMIT = Number(process.env.RATE_LIMIT_PREDICT_PER_MIN ?? 10);
const PREDICTIONS_LIMIT = Number(process.env.RATE_LIMIT_PREDICTIONS_PER_MIN ?? 60);
const SUGGEST_LIMIT = Number(process.env.RATE_LIMIT_SUGGEST_PER_MIN ?? 60);
const METRICS_LIMIT = Number(process.env.RATE_LIMIT_METRICS_PER_MIN ?? 60);
const WINDOW_MS = 60_000;

export function getClientIp(request: NextRequest | Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

function checkLimit(key: string, limit: number): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { ok: true };
}

export function enforceRateLimit(
  request: NextRequest,
  kind: "predict" | "predictions" | "suggest" | "metrics",
): { ok: true } | { ok: false; retryAfter: number } {
  const limit =
    kind === "predict"
      ? PREDICT_LIMIT
      : kind === "predictions"
        ? PREDICTIONS_LIMIT
        : kind === "suggest"
          ? SUGGEST_LIMIT
          : METRICS_LIMIT;
  const ip = getClientIp(request);
  return checkLimit(`${kind}:${ip}`, limit);
}
