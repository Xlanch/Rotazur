import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync, backup } from "node:sqlite";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const MAGIC = Buffer.from("ROTABAK1");
const MAX_BYTES = 512 * 1024 * 1024;

function protectDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (process.platform === "win32") {
    const identity = execFileSync("whoami.exe", ["/user", "/fo", "csv", "/nh"], { encoding: "utf8", windowsHide: true });
    const sid = identity.match(/S-1-[0-9-]+/)?.[0];
    if (!sid) throw new Error("Yedek klasörü erişim izinleri doğrulanamadı.");
    execFileSync("icacls.exe", [directory, "/inheritance:r", "/grant:r", `*${sid}:(OI)(CI)F`, "/grant:r", "*S-1-5-18:(OI)(CI)F"], { stdio: "ignore", windowsHide: true });
  } else fs.chmodSync(directory, 0o700);
}

function keyFor(directory, create = false) {
  const file = path.join(directory, "backup-key.bin");
  if (create && !fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32), { mode: 0o600, flag: "wx" });
  const key = fs.readFileSync(file);
  if (key.length !== 32) throw new Error("Yedek anahtarı geçersiz.");
  return key;
}

// Verification restores into a disposable directory, never over the real database.
export function verifyEncryptedBackup(file, directory) {
  if (fs.statSync(file).size > MAX_BYTES + 64) throw new Error("Yedek doğrulama boyut sınırını aşıyor.");
  const stored = fs.readFileSync(file);
  if (stored.length < 36 || !stored.subarray(0, 8).equals(MAGIC)) throw new Error("Yedek biçimi geçersiz.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyFor(directory), stored.subarray(8, 20));
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(stored.subarray(20, 36));
  const restored = Buffer.concat([decipher.update(stored.subarray(36)), decipher.final()]);
  const temporary = fs.mkdtempSync(path.join(directory, "verify-"));
  let db;
  try {
    const filename = path.join(temporary, "restored.db");
    fs.writeFileSync(filename, restored, { mode: 0o600, flag: "wx" });
    db = new DatabaseSync(filename, { readOnly: true });
    const rows = db.prepare("PRAGMA integrity_check").all();
    if (rows.length !== 1 || Object.values(rows[0])[0] !== "ok") throw new Error("Geri yüklenen veritabanı bütünlük kontrolünden geçemedi.");
    return true;
  } finally {
    db?.close();
    restored.fill(0);
    if (path.dirname(temporary) !== path.resolve(directory)) throw new Error("Geçici yedek yolu geçersiz.");
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

export async function createEncryptedBackup({ source, directory }) {
  directory = path.resolve(directory);
  if (!fs.existsSync(source)) throw new Error("Yedeklenecek veritabanı bulunamadı.");
  protectDirectory(directory);
  const key = keyFor(directory, true);
  const temporary = fs.mkdtempSync(path.join(directory, "snapshot-"));
  let db;
  let snapshot;
  try {
    const snapshotFile = path.join(temporary, "snapshot.db");
    db = new DatabaseSync(source, { readOnly: true });
    // SQLite's backup API includes committed WAL data and remains consistent
    // while the application writes. Copying rota.db alone would lose WAL data.
    await backup(db, snapshotFile);
    db.close(); db = undefined;
    if (fs.statSync(snapshotFile).size > MAX_BYTES) throw new Error("Yedek 512 MiB sınırını aşıyor; akış tabanlı yedekleme gerekir.");
    snapshot = fs.readFileSync(snapshotFile);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(MAGIC);
    const encrypted = Buffer.concat([cipher.update(snapshot), cipher.final()]);
    const file = path.join(directory, `rota-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomBytes(4).toString("hex")}.rotabak`);
    fs.writeFileSync(file, Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted]), { mode: 0o600, flag: "wx" });
    verifyEncryptedBackup(file, directory);
    return file;
  } finally {
    db?.close(); snapshot?.fill(0); key.fill(0);
    if (path.dirname(temporary) !== directory) throw new Error("Geçici yedek yolu geçersiz.");
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const directory = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), ".local", "share"), "Rotazur", "database-backups");
  try {
    if (process.argv[2] === "--verify" && process.argv[3]) {
      verifyEncryptedBackup(path.resolve(process.argv[3]), directory);
      console.log("Şifreli yedek geçici veritabanına geri yüklenerek doğrulandı.");
    } else {
      const file = await createEncryptedBackup({ source: path.resolve("data", "rota.db"), directory });
      console.log(`Şifreli yedek oluşturuldu ve geri yüklenerek doğrulandı: ${file}`);
    }
  } catch {
    console.error("Yedekleme/doğrulama başarısız. Kaynak veritabanı değiştirilmedi; dosya ve klasör izinlerini kontrol edin.");
    process.exitCode = 1;
  }
}
