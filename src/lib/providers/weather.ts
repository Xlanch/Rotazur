import type { Weather } from "../types";
import { CITIES } from "../cities";
import { addDays } from "../server-utils";
import { getForecast, ZONES, dateInZone } from "../weather/met-client.cjs";

/** Commercial CC BY 4.0 forecasts; historical temperatures are never used as future forecasts. */
export async function getWeather(lat: number, lon: number, start: string, end: string): Promise<Weather | null> {
  const city = CITIES.find((c) => c.lat === lat && c.lon === lon);
  const zone = city ? ZONES[city.id] : undefined;
  const today = dateInZone(Date.now(), zone || "Europe/Istanbul");
  if (start < today || end > addDays(today, 9)) return null;
  try {
    const forecast = await getForecast(lat, lon, zone);
    const days = forecast.days.filter((day) => day.date >= start && day.date <= end);
    const expectedDays = (Date.parse(end) - Date.parse(start)) / 86400_000 + 1;
    if (days.length !== expectedDays || days[0]?.date !== start || days[days.length - 1]?.date !== end) return null;
    return { kind: "tahmin", source: forecast.source, days: days.map(({ date, max, min, code }) => ({ date, max, min, code })) };
  } catch {
    return null;
  }
}
