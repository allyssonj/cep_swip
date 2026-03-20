import { env } from "../config/env";

type RateLimitState = {
  count: number;
  windowStart: number;
};

const WINDOW_IN_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 40;
const requestCounters = new Map<string, RateLimitState>();
type ApiKeyRateLimitContext = {
  headers: Record<string, string | undefined>;
  request: Request;
  set: { status?: unknown; headers?: unknown };
};

const getClientIp = (request: Request): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
};

const clearExpiredEntries = (now: number): void => {
  for (const [ip, state] of requestCounters.entries()) {
    if (now - state.windowStart >= WINDOW_IN_MS * 2) {
      requestCounters.delete(ip);
    }
  }
};

const applyRateLimitHeaders = ({
  set,
  remaining,
  resetInMs,
}: {
  set: { headers?: unknown };
  remaining: number;
  resetInMs: number;
}): void => {
  const currentHeaders = (set.headers ?? {}) as Record<string, string>;
  set.headers = {
    ...currentHeaders,
    "x-ratelimit-limit": String(MAX_REQUESTS_PER_WINDOW),
    "x-ratelimit-remaining": String(Math.max(0, remaining)),
    "x-ratelimit-reset": String(Math.max(0, Math.ceil(resetInMs / 1000))),
  };
};

export const apiKeyRateLimit = ({
  headers,
  request,
  set,
}: ApiKeyRateLimitContext) => {
  const providedApiKey = headers["x-api-key"]?.trim();

  if (providedApiKey === env.APIKEY) {
    return;
  }

  const now = Date.now();
  const clientIp = getClientIp(request);
  const currentState = requestCounters.get(clientIp);

  if (!currentState || now - currentState.windowStart >= WINDOW_IN_MS) {
    requestCounters.set(clientIp, {
      count: 1,
      windowStart: now,
    });
    applyRateLimitHeaders({
      set,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetInMs: WINDOW_IN_MS,
    });
    clearExpiredEntries(now);
    return;
  }

  currentState.count += 1;
  const elapsedInMs = now - currentState.windowStart;
  const resetInMs = WINDOW_IN_MS - elapsedInMs;
  const remaining = MAX_REQUESTS_PER_WINDOW - currentState.count;

  applyRateLimitHeaders({
    set,
    remaining,
    resetInMs,
  });

  if (currentState.count > MAX_REQUESTS_PER_WINDOW) {
    set.status = 429;
    const currentHeaders = (set.headers ?? {}) as Record<string, string>;
    set.headers = {
      ...currentHeaders,
      "retry-after": String(Math.max(1, Math.ceil(resetInMs / 1000))),
    };
    return {
      message:
        "Limite de 40 requisições por minuto atingido. Tente novamente em 1 minuto.",
    };
  }
};
