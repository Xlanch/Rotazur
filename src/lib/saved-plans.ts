import type { SavedPlan, SavedPlanSnapshot, SearchInput } from "./types";
import { isIsoDate } from "./travel-utils";
import { isHotelQuote } from "./hotel-data";
import { hotelLocationRecord } from "./hotel-location";
import { CURRENCY_CODES, validExchangeRate } from "./currency-rates";

export const SAVED_PLANS_KEY = "rota_saved_plans_v1";
export const SAVED_PLANS_EVENT = "rota:saved-plans";

export function planIdentity(input: SearchInput): string {
  return JSON.stringify([input.destination, input.origin, input.startDate, input.endDate,
    input.travelers, input.budget, input.comfort, [...input.interests].sort()]);
}

export function savedPlanUrl(plan: SavedPlan): string {
  if (plan.snapshot) return `/offline?saved=${encodeURIComponent(plan.id)}`;
  // Old records contain only a search URL. Never follow imported external/script URLs.
  return /^\/plan\?(?!.*[\r\n])/.test(plan.url) ? plan.url : "/";
}

function object(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isSavedSnapshot(value: unknown): value is SavedPlanSnapshot {
  if (!object(value) || value.version !== 2 || !object(value.data)) return false;
  const d = value.data, i = d.input;
  return object(i) && typeof i.origin === "string" && typeof i.destination === "string"
    && isIsoDate(i.startDate) && isIsoDate(i.endDate) && i.endDate > i.startDate
    && Number.isInteger(i.travelers) && i.travelers >= 1 && i.travelers <= 9
    && Number.isFinite(i.budget) && i.budget > 0 && Array.isArray(i.interests)
    && [i.comfort, value.budgetTier].every((t) => ["tasarruflu", "dengeli", "konforlu"].includes(t))
    && object(d.city) && d.city.id === i.destination && typeof d.city.name === "string"
    && Array.isArray(d.city.tags) && Number.isFinite(d.city.lat) && Number.isFinite(d.city.lon)
    && Number.isInteger(d.nights) && d.nights >= 1 && d.nights <= 14
    && Number.isFinite(d.rooms) && object(d.rates) && validExchangeRate(d.rates.EUR) && validExchangeRate(d.rates.USD)
    && (d.rates.TRY === undefined || d.rates.TRY === 1)
    && CURRENCY_CODES.every(code => d.rates[code] === undefined || validExchangeRate(d.rates[code]))
    && [d.flights, d.hotels, d.restaurants, d.attractions, d.flexDates, d.tips].every(Array.isArray)
    && d.flights.every((f: any) => object(f) && typeof f.id === "string" && object(f.outbound) && Number.isFinite(f.priceTry))
    && d.hotels.every((h: any) => object(h) && typeof h.id === "string" && typeof h.name === "string" && Number.isFinite(h.pricePerNightTry)
      && (h.bookingQuote === undefined || (isHotelQuote(h.bookingQuote) && h.bookingQuote.checkin === i.startDate && h.bookingQuote.checkout === i.endDate && h.bookingQuote.adults === i.travelers))
      && (h.hotelLocation === undefined || (!!hotelLocationRecord(h as any) && h.hotelLocation.cityId === i.destination)))
    && (d.selectedFlightId === null || d.flights.some((f: any) => f.id === d.selectedFlightId))
    && (d.selectedHotelId === null || d.hotels.some((h: any) => h.id === d.selectedHotelId))
    && object(d.budget) && Number.isFinite(d.budget.total) && object(d.budgetGuide) && object(d.budgetGuide.mealCosts)
    && [d.dailyFoodTry, d.dailyTransportTry, d.airportTransferTry].every((n) => Number.isFinite(n) && n >= 0)
    && object(d.sources) && (d.weather === null || (object(d.weather) && Array.isArray(d.weather.days)))
    && Array.isArray(d.days) && d.days.length > 0 && d.days.length <= 15
    && d.days.every((day: any) => object(day) && Number.isInteger(day.day) && isIsoDate(day.date)
      && typeof day.title === "string" && Array.isArray(day.activities) && day.activities.every(validActivity))
    && object(value.customActs) && Object.entries(value.customActs).every(([key, acts]) => /^\d+$/.test(key)
      && Array.isArray(acts) && acts.every(validActivity))
    && object(value.checkedActs) && Object.values(value.checkedActs).every((v) => typeof v === "boolean")
    && Array.isArray(value.cheapPlaces) && Number.isInteger(value.activeDay);
}

function validActivity(a: unknown): boolean {
  return object(a) && typeof a.title === "string" && typeof a.description === "string"
    && typeof a.time === "string" && Number.isFinite(a.costTry) && a.costTry >= 0
    && ["ulasim", "gezi", "yemek", "otel", "serbest"].includes(a.kind);
}

/** Keep valid legacy summaries; never mistake them for restorable full plans. */
export function parseSavedPlans(raw: string | null): SavedPlan[] {
  if (!raw) return [];
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { throw new Error("Kayıtlı plan verisi okunamadı. Mevcut kayıtlar korunuyor."); }
  if (!Array.isArray(value)) throw new Error("Kayıtlı plan verisi okunamadı. Mevcut kayıtlar korunuyor.");
  if (!value.every((p) => object(p) && typeof p.id === "string"
    && typeof p.cityId === "string" && typeof p.cityName === "string"
    && isIsoDate(p.startDate) && isIsoDate(p.endDate) && typeof p.url === "string"
    && (p.snapshot === undefined || isSavedSnapshot(p.snapshot)))) {
    throw new Error("Kayıtlı planlardan biri okunamadı. Mevcut kayıtlar korunuyor.");
  }
  return value as SavedPlan[];
}

export function getSavedPlans(): SavedPlan[] {
  if (typeof window === "undefined") return [];
  let raw: string | null;
  try { raw = localStorage.getItem(SAVED_PLANS_KEY); }
  catch { throw new Error("Tarayıcı kayıtlarına erişilemiyor. Depolama iznini kontrol edin; mevcut kayıtlarınız korunuyor."); }
  return parseSavedPlans(raw);
}

function writePlans(plans: SavedPlan[]): void {
  try {
    localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(plans));
  } catch {
    throw new Error("Plan kaydedilemedi. Tarayıcı depolama iznini ve boş alanını kontrol edin; mevcut kayıtlarınız korunuyor.");
  }
  window.dispatchEvent(new Event(SAVED_PLANS_EVENT));
}

export function savePlanToStorage(snapshot: SavedPlanSnapshot, id?: string): SavedPlan {
  if (!isSavedSnapshot(snapshot)) throw new Error("Plan verisi eksik; kayıt tamamlanamadı.");
  const list = getSavedPlans();
  const input = snapshot.data.input, city = snapshot.data.city;
  const existing = (id ? list.find((p) => p.id === id) : undefined)
    ?? list.find((p) => p.snapshot && planIdentity(p.snapshot.data.input) === planIdentity(input));
  const plan: SavedPlan = {
    id: existing?.id ?? `plan_${typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`}`,
    cityId: city.id, cityName: city.name, cityFlag: city.flag, country: city.country,
    startDate: input.startDate, endDate: input.endDate, totalCostTry: snapshot.data.budget.total,
    budgetTry: input.budget, travelers: input.travelers, savedAt: new Date().toISOString(),
    url: "", snapshot: JSON.parse(JSON.stringify(snapshot)),
    offlineReadyAt: existing?.offlineReadyAt,
  };
  plan.url = savedPlanUrl(plan);
  writePlans([plan, ...list.filter((p) => p.id !== plan.id)]);
  return plan;
}

export function markPlanOfflineReady(id: string): SavedPlan | undefined {
  const list = getSavedPlans();
  const plan = list.find((p) => p.id === id);
  if (!plan?.snapshot) return undefined; // A deletion during preparation must stay deleted.
  plan.offlineReadyAt = new Date().toISOString();
  writePlans(list);
  return plan;
}

export function removeSavedPlan(id: string): void {
  writePlans(getSavedPlans().filter((p) => p.id !== id));
}
