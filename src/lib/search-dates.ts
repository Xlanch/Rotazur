import { addDays, isIsoDate, nightsBetween, todayIso } from "./travel-utils";

export function searchDateError(start: string, end: string, today = todayIso()): string | null {
  if (!isIsoDate(start) || !isIsoDate(end)) return "Lütfen geçerli gidiş ve dönüş tarihlerini seçin.";
  if (start < today) return "Gidiş tarihi geçmişte olamaz.";
  if (end <= start) return "Dönüş tarihi gidişten sonra olmalıdır.";
  if (nightsBetween(start, end) > 14) return "Bir seyahat en fazla 14 gece olabilir.";
  return null;
}

export function returnDateAfterDepartureChange(start: string, end: string): string {
  if (!isIsoDate(start)) return end;
  if (!isIsoDate(end) || end <= start) return addDays(start, 3);
  return end > addDays(start, 14) ? addDays(start, 14) : end;
}
