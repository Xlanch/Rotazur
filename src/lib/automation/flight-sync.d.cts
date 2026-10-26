export interface SyncedRoute {
  origin: string; destIata: string; originAirport?: string; destinationAirport?: string; cityId?: string; cityName?: string; cityIds?: string[];
  priceRoundTripTry: number; departDate: string; returnDate: string;
  departure: string; returnDeparture: string; arrival: string; returnArrival: string;
  airline: string; carrier: string; flightNumber?: string;
  durationMin?: number; returnDurationMin?: number; stops?: number; returnStops?: number;
  deepLink: string; updatedAt: string; priceKind: 'indicative'; pricedAdults: 1;
  availabilityVerified: false; provider: string;
  foundAt?: string; expiresAt?: string;
}
export interface SyncedPricesData {
  version: 3; provider: string; startedAt: string; lastSync: string; nextScheduledSync: string;
  timeZone: string; priceKind: 'indicative'; rates: { EUR: number; USD: number } | null;
  routes: Record<string, SyncedRoute>; totalRoutes: number;
  stats: { planned: number; checked: number; updated: number; empty: number; errors: number; skipped: number };
}
declare const engine: {
  normalizeFare(fare: unknown, origin: string, destination: string, now?: number): SyncedRoute | null;
  freshRoute(origin: string, destination: string, start: string, end: string, root?: string, now?: number): SyncedRoute | null;
  readCache(root?: string): SyncedPricesData | null;
  isStale(data: SyncedPricesData | null, now?: number): boolean;
  nextScheduled(now?: number): string;
  syncFlights(options?: { root?: string; token?: string }): Promise<SyncedPricesData>;
};
export default engine;
