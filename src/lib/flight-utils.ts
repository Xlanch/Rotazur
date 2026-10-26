import type { FlightOption } from "./types";
import { isIsoDate, timeMinutes } from "./travel-utils";

export function flightDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = value.slice(0, 10);
  return isIsoDate(date) ? date : null;
}

/** Keep provider-local dates/times. A missing time stays unknown, never fabricated. */
export function normalizeFlightTimestamp(value: unknown): string {
  const date = flightDate(value);
  if (!date || typeof value !== "string") return "";
  return timeMinutes(value) === null ? date : `${date} ${value.slice(11, 16)}`;
}

/** Only a positive round-trip offer for the requested departure dates can enter a plan. */
export function normalizeRoundTripFlights(options: FlightOption[], start: string, end: string): FlightOption[] {
  const now = Date.now();
  return options.filter((flight) => Number.isFinite(flight.priceTry) && flight.priceTry > 0
    && (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(flight.outbound?.departure || "") || Date.parse(flight.outbound.departure) >= now)
    && (!flight.expiresAt || (Number.isFinite(Date.parse(flight.expiresAt)) && Date.parse(flight.expiresAt) > now))
    && (!flight.foundAt || (Number.isFinite(Date.parse(flight.foundAt)) && now - Date.parse(flight.foundAt) >= -60_000 && now - Date.parse(flight.foundAt) <= 48 * 3600_000))
    && flightDate(flight.outbound?.departure) === start
    && flightDate(flight.inbound?.departure) === end)
    .map((flight) => {
      const normalizeLeg = (leg: FlightOption["outbound"]) => ({
        ...leg,
        departure: normalizeFlightTimestamp(leg.departure),
        arrival: normalizeFlightTimestamp(leg.arrival),
        durationMin: Number.isFinite(leg.durationMin) && leg.durationMin > 0 ? Math.round(leg.durationMin) : 0,
      });
      return { ...flight, outbound: normalizeLeg(flight.outbound), inbound: normalizeLeg(flight.inbound!) };
    })
    .sort((a, b) => a.priceTry - b.priceTry);
}
