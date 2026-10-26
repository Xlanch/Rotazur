import { spawnSync } from "node:child_process";
import path from "node:path";

// No installs, provider queries, mail or deployment. Any failed check stops build.
const steps = [
  ["Hedefli güvenlik taraması", ["scripts/security-audit.mjs"]],
  ["TypeScript", ["node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"]],
  ["Regresyon testleri", ["--test", ...[
    "regressions", "security", "offline", "safety-finance", "commercial", "remaining",
    "deep", "navigation-network", "booking", "hotel-maps", "hardening", "security-inputs", "destinations", "flight-sync", "hotel-flight-audit", "i18n", "current-audit",
  ].map((name) => `scripts/test-${name}.cjs`)]],
  ["Bilinen bağımlılık açıkları", [process.env.npm_execpath || path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"), "audit", "--include=dev", "--audit-level=low"]],
];
for (const [label, args] of steps) {
  console.log(`\n[Yayın kontrolü] ${label}`);
  const child = spawnSync(process.execPath, args, { stdio: "inherit", windowsHide: true });
  if (child.error || child.status !== 0) {
    console.error(`[Yayın kontrolü] ${label} başarısız; derleme durduruldu.`);
    process.exit(child.status || 1);
  }
}
