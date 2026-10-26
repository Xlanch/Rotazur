export const SOURCE: "MET Norway";
export const SOURCE_URL: string;
export const LICENSE_URL: string;
export const USER_AGENT: string;
export const ZONES: Record<string, string>;
export interface MetForecast {
  source: "MET Norway"; sourceUrl: string; licenseUrl: string;
  generatedAt: string; expiresAt: number; timeZone: string;
  current: { temp: number; weatherCode: number; windSpeed: number | null; isDay: boolean | null; validAt: string };
  days: { date: string; min: number; max: number; code: number; rainProb: number | null }[];
}
export function dateInZone(instant: number | string, timeZone: string): string;
export function weatherCode(symbol: string): number;
export function summarize(data: unknown, timeZone: string, now?: number): Omit<MetForecast, "expiresAt">;
export function atomicWrite(filename: string, value: unknown): void;
export function createMetClient(options?: { cacheDir?: string; fetchImpl?: typeof fetch; now?: () => number }): { getForecast: typeof getForecast };
export function getForecast(lat: number, lon: number, timeZone?: string): Promise<MetForecast>;
