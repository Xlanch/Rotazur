import "server-only";
import engine from "./flight-sync.cjs";
export type { SyncedRoute, SyncedPricesData } from "./flight-sync.cjs";
export const getLatestSyncedPrices = () => engine.readCache();
export const getSyncedRoutePrice = (origin: string, destination: string, start: string, end: string) => engine.freshRoute(origin, destination, start, end);
export const isSyncStale = () => engine.isStale(engine.readCache());
let running: ReturnType<typeof engine.syncFlights> | null = null;
export function syncAllDailyPrices(force = false) {
  if (running) return running;
  const cache = engine.readCache();
  if (!force && cache && !engine.isStale(cache)) return Promise.resolve(cache);
  running = engine.syncFlights().finally(() => { running = null; });
  return running;
}
