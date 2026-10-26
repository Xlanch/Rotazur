import type { HotelOption, PlanDay } from "./types";
import { isIsoDate } from "./travel-utils";
import { hotelLocationRecord } from "./hotel-location";

export function isHotelQuote(value: unknown): value is NonNullable<HotelOption["bookingQuote"]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const q = value as Record<string, any>;
  return (q.kind === undefined || q.kind === "snapshot") && Number.isSafeInteger(q.hotelId) && q.hotelId > 0 && isIsoDate(q.checkin) && isIsoDate(q.checkout) && q.checkout > q.checkin
    && Number.isInteger(q.adults) && q.adults >= 1 && q.adults <= 9 && Number.isInteger(q.rooms) && q.rooms >= 1 && q.rooms <= q.adults
    && q.currency === "TRY" && Number.isFinite(q.displayTotalTry) && q.displayTotalTry > 0
    && (q.displayNightlyTry === undefined || (Number.isFinite(q.displayNightlyTry) && q.displayNightlyTry > 0))
    && (q.excludedTaxesTry === null || (Number.isFinite(q.excludedTaxesTry) && q.excludedTaxesTry >= 0))
    && Number.isFinite(q.knownTotalTry) && Math.round(q.knownTotalTry * 100) === Math.round((q.displayTotalTry + (q.excludedTaxesTry || 0)) * 100)
    && (q.device === undefined || ["desktop", "mobile", "tablet"].includes(q.device))
    && (q.roomOffers === undefined || (Array.isArray(q.roomOffers) && q.roomOffers.length <= 9 && q.roomOffers.every((r: any) => r && typeof r.name === "string" && r.name.length <= 150
      && (r.quantity === undefined || (Number.isInteger(r.quantity) && r.quantity >= 1 && r.quantity <= 30)) && (r.unitType === undefined || typeof r.unitType === "string"))))
    && (q.freeCancellation === undefined || typeof q.freeCancellation === "boolean")
    && (q.noPrepayment === undefined || typeof q.noPrepayment === "boolean")
    && (q.freeCancellationUntil === undefined || (typeof q.freeCancellationUntil === "string" && Number.isFinite(Date.parse(q.freeCancellationUntil))))
    && (q.mealPlan === undefined || typeof q.mealPlan === "string")
    && (q.deals === undefined || (Array.isArray(q.deals) && q.deals.length <= 10 && q.deals.every((d: unknown) => typeof d === "string")))
    && typeof q.checkedAt === "string" && Number.isFinite(Date.parse(q.checkedAt)) && (q.disclaimer === undefined || typeof q.disclaimer === "string");
}

export function hotelQuoteIsFresh(hotel: HotelOption, now = Date.now()): boolean {
  const quote = hotel.bookingQuote;
  if (!isHotelQuote(quote)) return false;
  if (quote.kind === "snapshot") return false;
  const age = now - Date.parse(quote.checkedAt);
  return age >= -60_000 && age <= 10 * 60_000;
}

/** Consistent nightly average of the budget amount, independent of Booking's advertised nightly field. */
export function hotelNightlyTotal(hotel: HotelOption, nights: number): number {
  return hotelTotal(hotel, nights) / Math.max(1, nights);
}

/** Estimated and legacy catalogue positions are never a hotel location. */
export function hotelCoordinates(hotel?: HotelOption | null): { lat: number; lon: number } | null {
  const location = hotelLocationRecord(hotel);
  return location ? { lat: location.lat, lon: location.lon } : null;
}

export function hotelTotal(hotel: HotelOption | null | undefined, nights: number): number {
  if (!hotel) return 0;
  const quote = hotel.bookingQuote;
  return isHotelQuote(quote)
    ? quote.knownTotalTry : hotel.pricePerNightTry * nights;
}

export function applyHotelCoordinates(days: PlanDay[], hotel: HotelOption | null): PlanDay[] {
  const point = hotelCoordinates(hotel);
  return days.map((day) => ({ ...day, activities: day.activities.map((activity) => activity.kind === "otel"
    ? { ...activity, lat: point?.lat, lon: point?.lon } : activity) }));
}

/** Imported/old check-in coordinates never override the currently selected property's source record. */
export function hotelNavigationActivities(activities: PlanDay["activities"], hotel: HotelOption | null): PlanDay["activities"] {
  const point = hotelCoordinates(hotel);
  return activities.flatMap((activity) => activity.kind === "otel"
    ? point ? [{ ...activity, lat: point.lat, lon: point.lon }] : [] : [activity]);
}
