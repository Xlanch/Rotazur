import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const require = createRequire(import.meta.url);

export function productionProblems(env) {
  const problems = [];
  try {
    const site = new URL(env.NEXT_PUBLIC_SITE_URL || "");
    if (site.protocol !== "https:" || site.username || site.password || site.pathname !== "/" || site.search || site.hash) throw new Error();
  } catch { problems.push("NEXT_PUBLIC_SITE_URL, https://alanadiniz.com biçiminde ayarlanmalı."); }
  const hops = Number(env.TRUST_PROXY_HOPS || "0");
  if (!Number.isInteger(hops) || hops < 0 || hops > 10) problems.push("TRUST_PROXY_HOPS, gerçek proxy zincirine uygun 0–10 arasında tam sayı olmalı.");
  if (env.SYNC_SECRET && env.SYNC_SECRET.length < 32) problems.push("SYNC_SECRET kullanılıyorsa en az 32 karakter olmalı.");
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  // Match Next's production env-file precedence; never print secret values.
  require("@next/env").loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
  const problems = productionProblems(process.env);
  if (problems.length) {
    for (const problem of problems) console.error(`[Üretim ayarı] ${problem}`);
    process.exitCode = 1;
  } else console.log("Üretim ortamı ayarları kontrol edildi. HTTPS sertifikası ve proxy güveni sunucuda ayrıca doğrulanmalıdır.");
}
