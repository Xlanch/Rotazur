import { checkRateLimit } from "./rate-limit";
import { trustedClientAddress } from "./request-security";

/** Fixed operation keys keep forged forwarding headers and random identities from bypassing limits. */
export function limitPublicRequest(request: Request, operation: string, perAddress: number, shared: number, windowMs = 10 * 60_000): Response | null {
  const address = trustedClientAddress(request);
  const rate = checkRateLimit(`public:${operation}:${address || "shared"}`, address ? perAddress : shared, windowMs);
  if (rate.allowed) return null;
  return Response.json({ error: "Çok fazla istek gönderdiniz. Lütfen birkaç dakika sonra tekrar deneyin." }, {
    status: 429,
    headers: { "Retry-After": String(Math.max(1, Math.ceil(rate.resetInMs / 1000))), "Cache-Control": "no-store" },
  });
}

export function normalizedEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
