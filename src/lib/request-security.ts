import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

/** Reject browser requests explicitly made by a different origin. */
export function isSameOriginRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true; // CLI jobs and server clients do not send Origin.
  try {
    const allowed = new Set([new URL(request.url).origin]);
    if (process.env.NEXT_PUBLIC_SITE_URL) allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

/** Only the configured scheduler may force a global, potentially costly sync. */
export function isAuthorizedSyncRequest(request: Request): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret || secret.length < 32) return false;
  const actual = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Trust forwarding headers only when the deployment explicitly declares its proxy chain. */
export function trustedClientAddress(request: Request): string | null {
  const hops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(hops) || hops < 1 || hops > 10) return null;
  const chain = (request.headers.get("x-forwarded-for") || "").split(",").map((part) => part.trim());
  const address = chain[chain.length - hops];
  return address && isIP(address) ? address : null;
}

export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Bound actual streamed bytes too; Content-Length can be absent or incorrect. */
export async function readJsonObject(request: Request, maxBytes = 16_384, timeoutMs = 10_000): Promise<Record<string, unknown>> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || !Number.isFinite(timeoutMs) || timeoutMs < 1) throw new Error("Geçersiz gövde okuma sınırı.");
  if (Number(request.headers.get("content-length")) > maxBytes) {
    void request.body?.cancel().catch(() => {});
    throw new RequestError("İstek çok büyük.", 413);
  }
  if (request.signal.aborted) throw new RequestError("İstek iptal edildi.", 400);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("Geçerli bir JSON isteği gönderin.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  let rejectStop: (error: RequestError) => void;
  const stopped = new Promise<never>((_, reject) => { rejectStop = reject; });
  const cancel = () => { void reader.cancel().catch(() => {}); };
  const stop = (error: RequestError) => { rejectStop(error); cancel(); };
  const abort = () => stop(new RequestError("İstek iptal edildi.", 400));
  // One total deadline; it does not restart when another chunk arrives.
  const timer = setTimeout(() => stop(new RequestError("İstek gövdesi zamanında tamamlanmadı.", 408)), timeoutMs);
  request.signal.addEventListener("abort", abort, { once: true });
  try {
    if (request.signal.aborted) abort();
    while (true) {
      const { done, value } = await Promise.race([stopped, reader.read()]);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { cancel(); throw new RequestError("İstek çok büyük.", 413); }
      chunks.push(value);
    }
  } catch (error) {
    cancel();
    if (error instanceof RequestError) throw error;
    throw new RequestError("İstek gövdesi okunamadı.");
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
  try {
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new RequestError("Geçerli bir JSON nesnesi gönderin."); }
}
