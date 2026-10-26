const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");

/** One transactional store shared by API workers and the existing scheduler. No SMTP operations. */
function createAlertStore({ filename, legacyFile }) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA busy_timeout = 15000; PRAGMA journal_mode = WAL;");
  function transaction(operation) {
    database.exec("BEGIN IMMEDIATE");
    try { const result = operation(); database.exec("COMMIT"); return result; }
    catch (error) { database.exec("ROLLBACK"); throw error; }
  }
  try {
    transaction(() => {
      database.exec(`CREATE TABLE IF NOT EXISTS alert_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS alerts (
          id TEXT PRIMARY KEY, owner_id TEXT, city_id TEXT NOT NULL, origin TEXT NOT NULL,
          triggered INTEGER NOT NULL, created_at TEXT NOT NULL, data_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS alerts_owner ON alerts(owner_id, created_at);
        CREATE INDEX IF NOT EXISTS alerts_pending ON alerts(triggered, owner_id);`);
      if (!database.prepare("SELECT value FROM alert_meta WHERE key = 'legacy_import'").get()) {
        if (fs.existsSync(legacyFile)) {
          const legacy = JSON.parse(fs.readFileSync(legacyFile, "utf8"));
          if (!Array.isArray(legacy)) throw new Error("Eski alarm kaydı okunamadı; kaynak korunuyor.");
          const insert = database.prepare("INSERT OR IGNORE INTO alerts VALUES (?, ?, ?, ?, ?, ?, ?)");
          for (const alert of legacy) {
            if (!alert || typeof alert !== "object" || typeof alert.id !== "string" || typeof alert.cityId !== "string") throw new Error("Eski alarm kaydı geçersiz; kaynak korunuyor.");
            const owner = typeof alert.userId === "string" && alert.userId ? alert.userId : null;
            insert.run(alert.id, owner, alert.cityId, alert.origin || "IST", alert.triggered ? 1 : 0, alert.createdAt || "", JSON.stringify(alert));
          }
        }
        database.prepare("INSERT INTO alert_meta VALUES ('legacy_import', 'done')").run();
      }
    });
  } catch (error) { database.close(); throw error; }
  return {
    list(ownerId) {
      return database.prepare("SELECT data_json FROM alerts WHERE owner_id = ? ORDER BY created_at DESC, id DESC").all(ownerId).map((row) => JSON.parse(row.data_json));
    },
    save(alert) {
      if (!alert.userId || !alert.id) throw new Error("Alarm sahibi gereklidir.");
      return transaction(() => {
        database.prepare("DELETE FROM alerts WHERE owner_id = ? AND city_id = ? AND origin = ? AND triggered = 0").run(alert.userId, alert.cityId, alert.origin);
        database.prepare("INSERT INTO alerts VALUES (?, ?, ?, ?, 0, ?, ?)").run(alert.id, alert.userId, alert.cityId, alert.origin, alert.createdAt, JSON.stringify(alert));
        return alert;
      });
    },
    remove(ownerId, id) {
      return database.prepare("DELETE FROM alerts WHERE id = ? AND owner_id = ?").run(id, ownerId).changes > 0;
    },
    triggerPrices(routes) {
      return transaction(() => {
        const triggered = [];
        const rows = database.prepare("SELECT id, data_json FROM alerts WHERE triggered = 0 AND owner_id IS NOT NULL").all();
        for (const row of rows) {
          const alert = JSON.parse(row.data_json);
          const price = routes[(alert.origin || "IST") + "-" + alert.cityId]?.priceRoundTripTry;
          if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(alert.targetPriceTry) || alert.targetPriceTry <= 0 || price > alert.targetPriceTry) continue;
          const updated = { ...alert, triggered: true, triggeredAt: new Date().toISOString(), triggeredPrice: price };
          database.prepare("UPDATE alerts SET triggered = 1, data_json = ? WHERE id = ? AND triggered = 0").run(JSON.stringify(updated), row.id);
          triggered.push(updated);
        }
        return triggered;
      });
    },
    close: () => database.close(),
  };
}
const stores = new Map();
function getAlertStore(root = process.cwd()) {
  const key = path.resolve(root);
  if (!stores.has(key)) {
    const store = createAlertStore({ filename: path.join(key, "data", "price-alerts.sqlite"), legacyFile: path.join(key, "data", "price_alerts.json") });
    const close = store.close;
    store.close = () => { close(); stores.delete(key); };
    stores.set(key, store);
  }
  return stores.get(key);
}
module.exports = { createAlertStore, getAlertStore };
