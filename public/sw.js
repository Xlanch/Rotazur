/* Only the public offline shell and static assets are cached. Never cache APIs or user pages. */
const CACHE = "rotazur-offline-v2";
const SHELL = "/offline";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("rotazur-offline-") && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

function staticAsset(url) {
  return url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/")
    || /^\/i18n\/(?:en|de|ru|zh|es|fr|ar)\.json$/.test(url.pathname)
    || ["/favicon.png", "/icon-192.png", "/logo.png", "/rotazur-logo.png"].includes(url.pathname));
}

async function download(url, cache) {
  try {
    const response = await fetch(url, { cache: "no-cache", credentials: "same-origin" });
    if (!response.ok) throw new Error("Asset unavailable");
    return response;
  } catch (error) {
    const cached = await cache.match(url);
    if (cached) return cached;
    throw error;
  }
}

async function network(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try { return await fetch(request, { signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function prepare(assets) {
  const cache = await caches.open(CACHE);
  const shell = await download(SHELL, cache);
  if (!(shell.headers.get("content-type") || "").includes("text/html")) throw new Error("Invalid shell");
  const html = await shell.clone().text();
  const urls = new Set(["/favicon.png", "/icon-192.png", "/logo.png", "/rotazur-logo.png"]);
  for (const language of ["en", "de", "ru", "zh", "es", "fr", "ar"]) urls.add(`/i18n/${language}.json?v=20261024-1`);
  // Next emits route JS, CSS and font preloads in the static offline document.
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = new URL(match[1].replaceAll("&amp;", "&"), self.location.origin);
    if (staticAsset(url)) urls.add(url.href);
  }
  for (const item of Array.isArray(assets) ? assets.slice(0, 300) : []) {
    const url = new URL(item, self.location.origin);
    if (staticAsset(url)) urls.add(url.href);
  }
  if (![...urls].some((url) => new URL(url, self.location.origin).pathname.endsWith(".js"))) throw new Error("Missing scripts");
  // Publish the shell only after every dependency has been stored successfully.
  const queue = [...urls];
  const seen = new Set();
  while (queue.length) {
    const batch = queue.splice(0, 6).filter((url) => !seen.has(url));
    await Promise.all(batch.map(async (item) => {
      seen.add(item);
      const url = new URL(item, self.location.origin);
      const response = await download(url.href, cache);
      if (url.pathname.endsWith(".css")) {
        for (const match of (await response.clone().text()).matchAll(/url\(["']?([^\s)'";]+)["']?\)/g)) {
          const child = new URL(match[1], url);
          if (staticAsset(child) && !seen.has(child.href)) queue.push(child.href);
        }
      }
      await cache.put(url.href, response);
    }));
  }
  await cache.put(SHELL, shell);
}

let preparation;
self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREPARE_OFFLINE" || !event.ports[0]) return;
  event.waitUntil((async () => {
    try {
      if (!preparation) preparation = prepare(event.data.assets).finally(() => { preparation = undefined; });
      await preparation;
      event.ports[0].postMessage({ ready: true });
    } catch {
      event.ports[0].postMessage({ ready: false });
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const shell = await (await caches.open(CACHE)).match(SHELL);
      try {
        // A first visit has no usable fallback: allow slow pages/cold starts to finish.
        const response = shell ? await network(request) : await fetch(request);
        if (response.status >= 500 && shell) return shell;
        return response;
      } catch {
        return shell
          || new Response("Kayıtlı planlar için önce internet bağlantısıyla Çevrimdışı Sakla düğmesini kullanın.",
            { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
  } else if (staticAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const fallback = await cache.match(request);
      // A saved build keeps its hashed assets; dev assets remain fresh while online.
      try {
        const response = fallback ? await network(request) : await fetch(request);
        if (!response.ok) throw new Error("Asset unavailable");
        if (url.pathname.startsWith("/i18n/")) await cache.put(request, response.clone());
        return response;
      }
      catch { return fallback || Response.error(); }
    })());
  }
});
