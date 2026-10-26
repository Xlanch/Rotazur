export const LOCAL_RECORD_EVENT = "rota:local-record";

export function readLocalRecord<T>(key: string, fallback: () => T, validate: (value: unknown) => value is T): T {
  let raw: string | null;
  try { raw = localStorage.getItem(key); }
  catch { throw new Error("Tarayıcı kayıtlarına erişilemiyor. Depolama iznini kontrol edin."); }
  if (raw === null) return fallback();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validate(parsed)) return parsed;
  } catch {}
  throw new Error("Bu gezinin kaydı okunamadı. Mevcut veriler korunuyor; kayıt üzerine yazılmadı.");
}

export function writeLocalRecord<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { throw new Error("Değişiklik kaydedilemedi. Tarayıcının depolama iznini ve boş alanını kontrol edin."); }
  window.dispatchEvent(new CustomEvent(LOCAL_RECORD_EVENT, { detail: key }));
}
