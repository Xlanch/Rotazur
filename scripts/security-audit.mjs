import fs from "node:fs";
import path from "node:path";

const findings = [];
let inspected = 0;
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (/\.(?:[cm]?js|tsx?|html)$/.test(file)) {
      inspected++;
      const code = fs.readFileSync(file, "utf8");
      // Check public HTML and server scripts too; never print matching secret values.
      if (/(?:TOKEN|API_KEY|CLIENT_SECRET|APP_PASSWORD|YOUR_API_KEY_HERE)\s*=\s*["'][a-zA-Z0-9_-]{20,}["']/.test(code)
        || /process\.env\.[A-Z_]*(?:TOKEN|KEY|SECRET|PASSWORD)\s*\|\|\s*["'][a-zA-Z0-9_-]{20,}["']/.test(code)) {
        findings.push(`${file}: Kaynakta sabit gizli değer bulundu.`);
      }
    }
  }
}
for (const directory of ["src", "public", "scripts"]) scan(directory);
const google = fs.readFileSync("src/app/api/auth/google/route.ts", "utf8");
if (/createSession|INSERT INTO users/.test(google)) findings.push("Google girişi için gerçek token doğrulaması ayrıca denetlenmeli.");
const alerts = fs.readFileSync("src/app/api/price-alerts/route.ts", "utf8");
const alertStore = fs.readFileSync("src/lib/alert-store.cjs", "utf8");
if (!alerts.includes("getCurrentUser") || !alerts.includes(".list(user.id)") || !alerts.includes(".remove(user.id, id)")
  || !alertStore.includes("WHERE owner_id = ?") || !alertStore.includes("WHERE id = ? AND owner_id = ?")) findings.push("Alarm sahipliği kontrolü eksik.");
const auth = fs.readFileSync("src/lib/auth.ts", "utf8");
const passwords = fs.readFileSync("src/lib/passwords.ts", "utf8");
if (!auth.includes("s.auth_version = 1") || !auth.includes("sessionId(token)") || !passwords.includes("timingSafeEqual") || !passwords.includes("p: 5")) findings.push("Oturum/parola koruması eksik.");
for (const file of ["auth.ts", "auth-challenge.ts", "passwords.ts", "db.ts", "db-transaction.ts", "rate-limit.ts", "server-utils.ts", "provider-quota.ts", "booking-snapshots.ts", "providers/booking-serp.ts", "providers/flights.ts", "providers/hotels.ts", "providers/currency.ts"]) {
  if (!fs.readFileSync(path.join("src/lib", file), "utf8").includes('import "server-only"')) findings.push(`${file}: Sunucu sınırı eksik.`);
}
const middleware = fs.readFileSync("src/middleware.ts", "utf8");
const layout = fs.readFileSync("src/app/layout.tsx", "utf8");
if (!middleware.includes('headers.set("x-nonce", nonce)') || !middleware.includes('response.headers.set("Content-Security-Policy", policy)') || !layout.includes("nonce={nonce}")) findings.push("CSP/nonce bütünlüğü ayrıca denetlenmeli.");
const requestReader = fs.readFileSync("src/lib/request-security.ts", "utf8");
const itineraryMail = fs.readFileSync("src/app/api/plan/send-email/route.ts", "utf8");
if (!requestReader.includes("Promise.race([stopped, reader.read()])") || !requestReader.includes("timeoutMs = 10_000")
  || itineraryMail.includes("req.text()") || !itineraryMail.includes("readJsonObject(req, 64 * 1024)")) findings.push("İstek okuma boyut/süre sınırı eksik.");
for (const endpoint of ["send-code", "reset-password"]) {
  if (!fs.readFileSync(`src/app/api/auth/${endpoint}/route.ts`, "utf8").includes("passwordPolicyError(password)")) findings.push(`${endpoint}: Yeni şifre politikası eksik.`);
}
console.log(`${inspected} dosyada hedefli statik güvenlik kontrolleri tamamlandı.`);
if (findings.length) {
  for (const finding of findings) console.error(finding);
  process.exitCode = 1;
} else console.log("Kontrol edilen kurallar geçti. Bu sonuç kapsamlı güvenlik denetimi yerine geçmez.");
