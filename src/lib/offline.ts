let registration: Promise<ServiceWorkerRegistration> | undefined;

export function registerOfflineWorker(): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || !window.isSecureContext) {
    return Promise.reject(new Error("Bu tarayıcıda çevrimdışı erişim kullanılamıyor. HTTPS bağlantısıyla tekrar deneyin."));
  }
  if (!registration) {
    registration = navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => { registration = undefined; throw err; });
  }
  return registration;
}

export async function prepareOfflineAccess(): Promise<void> {
  const reg = await registerOfflineWorker();
  await new Promise<void>((resolve, reject) => {
    if (reg.active) { resolve(); return; }
    const worker = reg.installing || reg.waiting;
    if (!worker) { reject(new Error("Çevrimdışı erişim başlatılamadı.")); return; }
    const timer = setTimeout(() => { cleanup(); reject(new Error("Çevrimdışı hazırlık zaman aşımına uğradı. Tekrar deneyin.")); }, 15000);
    const cleanup = () => { clearTimeout(timer); worker.removeEventListener("statechange", change); };
    const change = () => {
      if (worker.state === "activated") { cleanup(); resolve(); }
      if (worker.state === "redundant") { cleanup(); reject(new Error("Çevrimdışı erişim başlatılamadı.")); }
    };
    worker.addEventListener("statechange", change);
    change();
  });
  const assets = [...new Set(performance.getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((name) => name.startsWith(location.origin + "/_next/static/")))];
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      reject(new Error("Plan bu cihaza kaydedildi; çevrimdışı paket tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin."));
    }, 45000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer); channel.port1.close();
      if (event.data?.ready) resolve();
      else reject(new Error("Plan bu cihaza kaydedildi; çevrimdışı paket tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin."));
    };
    reg.active!.postMessage({ type: "PREPARE_OFFLINE", assets }, [channel.port2]);
  });
}
