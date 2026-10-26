import { INTERESTS, ORIGINS } from "./cities";
import { addDays, isIsoDate, nightsBetween, todayIso } from "./travel-utils";
import type { Comfort, Interest, SearchInput } from "./types";

/** Normalize calendar values before comparing dates or calculating nights. */
export function parseSearch(p: Record<string, string | undefined>): SearchInput {
  const today = todayIso();
  let startDate = isIsoDate(p.start) ? p.start : addDays(today, 30);
  if (startDate < today) startDate = addDays(today, 1);
  let endDate = isIsoDate(p.end) ? p.end : addDays(startDate, 3);
  if (endDate <= startDate) endDate = addDays(startDate, 3);
  if (nightsBetween(startDate, endDate) > 14) endDate = addDays(startDate, 14);
  const valid = new Set(INTERESTS.map((interest) => interest.id));
  const comfort = (["tasarruflu", "dengeli", "konforlu"].includes(p.comfort ?? "") ? p.comfort : "dengeli") as Comfort;
  const rawDest = p.dest || p.destination || p.city;
  const origin = ORIGINS.find((item) => item.code === p.origin?.toUpperCase())?.code ?? "IST";
  const travelers = Number(p.travelers), budget = Number(p.budget);
  return {
    origin,
    destination: rawDest && rawDest !== "any" ? rawDest : undefined,
    startDate,
    endDate,
    travelers: Number.isFinite(travelers) && travelers > 0 ? Math.min(9, Math.max(1, Math.trunc(travelers))) : 1,
    budget: Number.isFinite(budget) && budget > 0 ? Math.min(10_000_000, Math.max(1000, Math.round(budget))) : 30000,
    comfort,
    interests: [...new Set((p.interests ?? "").split(",").filter((item): item is Interest => valid.has(item as Interest)))],
  };
}

export function toQuery(input: SearchInput & { destination?: string }) {
  const query = new URLSearchParams({
    origin: input.origin, start: input.startDate, end: input.endDate,
    travelers: String(input.travelers), budget: String(input.budget),
    comfort: input.comfort, interests: input.interests.join(","),
  });
  if (input.destination) query.set("dest", input.destination);
  return query.toString();
}
