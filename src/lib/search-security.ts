import { checkRateLimit } from "./rate-limit";
import { trustedClientAddress } from "./request-security";

/** Bound anonymous provider/AI traffic even when no trusted client IP is available. */
export function limitSearchRequest(request: Request, operation: string): Response | null {
  const address = trustedClientAddress(request);
  const key = address ? `search:${operation}:${address}` : `search:${operation}:shared`;
  const limit = checkRateLimit(key, address ? 30 : 200, 10 * 60_000);
  if (limit.allowed) return null;
  return Response.json({ error: "Çok fazla arama isteği. Lütfen birkaç dakika sonra tekrar deneyin." }, {
    status: 429,
    headers: { "Retry-After": String(Math.max(1, Math.ceil(limit.resetInMs / 1000))), "Cache-Control": "no-store" },
  });
}
