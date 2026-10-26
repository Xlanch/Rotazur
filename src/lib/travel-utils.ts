/** Calendar and geometry helpers shared by server and browser. */
export function hasCoordinates(point: { lat?: number; lon?: number } | null | undefined): point is { lat: number; lon: number } {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lon)
    && point.lat! >= -90 && point.lat! <= 90 && point.lon! >= -180 && point.lon! <= 180;
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addDays(iso: string, days: number): string {
  if (!isIsoDate(iso) || !Number.isFinite(days)) throw new Error("Geçersiz tarih");
  const date = new Date(iso + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + Math.trunc(days));
  return date.toISOString().slice(0, 10);
}

export function nightsBetween(start: string, end: string): number {
  if (!isIsoDate(start) || !isIsoDate(end) || end <= start) throw new Error("Dönüş tarihi gidişten sonra olmalıdır.");
  return Math.round((Date.parse(end + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) / 86400000);
}

export function todayIso(): string {
  // The product's search calendar uses Turkey time, independently of server location.
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function daysUntilTrip(date: string, today = todayIso()): number {
  if (!isIsoDate(date) || !isIsoDate(today)) return 0;
  return Math.max(0, Math.round((Date.parse(date + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 86400000));
}

/** Read only a real local wall-clock time, never a date interpreted as hours. */
export function timeMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(?:\d{4}-\d{2}-\d{2}[T ])?(\d{2}):(\d{2})(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]), minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0 || minutes >= 1440) return "Saat bekleniyor";
  const rounded = Math.round(minutes);
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const x = Math.sin(radians(lat2 - lat1) / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(x)));
}
