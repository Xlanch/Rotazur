import { getCity } from "./cities";
import { isIsoDate, nightsBetween } from "./travel-utils";
import { isSavedSnapshot } from "./saved-plans";
import { toQuery } from "./search";
import { RequestError } from "./request-security";

export function normalizeTripRecord(body: Record<string, unknown>) {
  if (body.snapshot !== undefined && !isSavedSnapshot(body.snapshot)) throw new RequestError("Plan kaydı eksik veya geçersiz.");
  const snapshot = isSavedSnapshot(body.snapshot) ? body.snapshot : undefined;
  const input = snapshot?.data.input;
  const city = getCity(String(input?.destination ?? body.cityId ?? ""));
  const startDate = input?.startDate ?? body.startDate, endDate = input?.endDate ?? body.endDate;
  const travelers = input?.travelers ?? body.travelers;
  const totalCostTry = snapshot?.data.budget.total ?? body.totalCostTry;
  const budgetTry = input?.budget ?? body.budgetTry ?? 0;
  if (!city || !isIsoDate(startDate) || !isIsoDate(endDate) || endDate <= startDate
    || nightsBetween(startDate, endDate) > 14 || !Number.isInteger(travelers)
    || typeof travelers !== "number" || travelers < 1 || travelers > 9
    || typeof totalCostTry !== "number" || !Number.isFinite(totalCostTry) || totalCostTry < 0 || totalCostTry > 100_000_000
    || typeof budgetTry !== "number" || !Number.isFinite(budgetTry) || budgetTry < 0 || budgetTry > 100_000_000) {
    throw new RequestError("Şehir, seyahat tarihleri, yolcu sayısı veya bütçe geçersiz.");
  }
  if (body.id !== undefined && (typeof body.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.id))) throw new RequestError("Geçersiz plan kimliği.");
  const url = input ? `/plan?${toQuery(input)}`
    : typeof body.url === "string" && body.url.length <= 2000 && /^\/plan\?[^\r\n]*$/.test(body.url) ? body.url
    : `/plan?${new URLSearchParams({ dest: city.id, start: startDate, end: endDate, travelers: String(travelers) })}`;
  return { id: body.id as string | undefined, city, startDate, endDate, travelers,
    totalCostTry, extra: { budgetTry, url, ...(snapshot ? { snapshot } : {}), savedAt: new Date().toISOString() } };
}
