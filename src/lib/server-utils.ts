import "server-only";
type Entry = { value: unknown; expires: number };
const store = new Map<string, Entry>();
const pending = new Map<string, Promise<unknown>>();

/** Basit bellek içi önbellek: aynı istek tekrarlandığında dış API'ye gitmez. */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = ttlMs > 0 ? store.get(key) : undefined;
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const running = pending.get(key);
  if (running) return running as Promise<T>;
  const operation = Promise.resolve().then(fn).then((value) => {
    if (ttlMs > 0) store.set(key, { value, expires: Date.now() + ttlMs });
    if (store.size > 500) {
      const first = store.keys().next().value;
      if (first) store.delete(first);
    }
    return value;
  }).finally(() => { pending.delete(key); });
  pending.set(key, operation);
  return operation;
}

import https from "node:https";
import http from "node:http";

export class ProviderResponseError extends Error {}

/** Limit decoded bytes too: Content-Length can be absent or refer to compressed data. */
export async function readResponseBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (Number(response.headers.get("content-length")) > maxBytes) {
    await response.body?.cancel();
    throw new ProviderResponseError("Servis yanıtı boyut sınırını aştı.");
  }
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ProviderResponseError("Servis yanıtı boyut sınırını aştı.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}

const MAX_JSON_BYTES = 8 * 1024 * 1024;
function parseProviderJson<T>(bytes: Uint8Array): T {
  try { return JSON.parse(Buffer.from(bytes).toString("utf8")) as T; }
  catch { throw new ProviderResponseError("Servis geçerli JSON döndürmedi."); }
}

function nodeHttpsGet<T>(urlStr: string, headers: Headers, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const parsed = new URL(urlStr);
    const lib = parsed.protocol === "http:" ? http : https;
    const req = lib.get(
      urlStr,
      {
        family: 4,
        signal,
        headers: Object.fromEntries(headers.entries()),
      },
      (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.destroy();
          return reject(new ProviderResponseError(`HTTP ${res.statusCode}`));
        }
        if (Number(res.headers["content-length"]) > MAX_JSON_BYTES) {
          res.destroy();
          reject(new ProviderResponseError("Servis yanıtı boyut sınırını aştı."));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("error", reject);
        res.on("data", (chunk: Buffer) => {
          size += chunk.byteLength;
          if (size > MAX_JSON_BYTES) {
            reject(new ProviderResponseError("Servis yanıtı boyut sınırını aştı."));
            res.destroy();
          } else chunks.push(chunk);
        });
        res.on("end", () => {
          try {
            resolve(parseProviderJson<T>(Buffer.concat(chunks, size)));
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
  });
}

export async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 10000): Promise<T> {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new ProviderResponseError("Geçersiz servis adresi.");
  const isSerpSearch = parsed.hostname === "serpapi.com" && ["/search", "/search.json"].includes(parsed.pathname);
  if (isSerpSearch) {
    const { reserveSerpApiSearch } = await import("./provider-quota");
    reserveSerpApiSearch();
  }
  const ctrl = new AbortController();
  const abort = () => ctrl.abort(init?.signal?.reason);
  if (init?.signal?.aborted) abort();
  else init?.signal?.addEventListener("abort", abort, { once: true });
  // All transports and response-body reads share one total deadline.
  const t = setTimeout(() => ctrl.abort(new Error("Servis zaman aşımı.")), timeoutMs);
  const headers = new Headers(init?.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (!headers.has("user-agent")) headers.set("user-agent", "RotaPlanlayicisi/0.1");
  headers.set("accept-encoding", "identity");
  const canUseNative = (init?.method || "GET").toUpperCase() === "GET" && !init?.body;
  const preferNative = canUseNative && (isSerpSearch || parsed.hostname === "travelpayouts.com" || parsed.hostname.endsWith(".travelpayouts.com"));
  const native = () => nodeHttpsGet<T>(url, headers, ctrl.signal);
  const standard = async () => {
    const res = await fetch(url, { ...init, headers, signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) {
      await res.body?.cancel();
      throw new ProviderResponseError(`HTTP ${res.status}`);
    }
    return parseProviderJson<T>(await readResponseBytes(res, MAX_JSON_BYTES));
  };
  try {
    try { return await (preferNative ? native() : standard()); }
    catch (err) {
      // A different transport may help a connection failure; repeating a paid HTTP
      // error, invalid JSON or an oversized response cannot help and may incur cost.
      if (isSerpSearch || !canUseNative || ctrl.signal.aborted || err instanceof ProviderResponseError) throw err;
      return await (preferNative ? standard() : native());
    }
  } finally {
    clearTimeout(t);
    ctrl.abort();
    init?.signal?.removeEventListener("abort", abort);
  }
}

/** Tekrarlanabilir sözde rastgele sayı üreteci (örnek veriler her seferinde aynı çıksın) */
export function seeded(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { haversineKm, addDays, nightsBetween } from "./travel-utils";
