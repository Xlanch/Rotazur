import { todayIso } from "./travel-utils";

export const DEPARTURE_FEE_SOURCE = "https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fonceki-dokumanlar%2F2026_Yurt_Disina_Cikis_Harci.pdf";
export const DEPARTURE_FEE_CHECKED_AT = "2026-10-23";

/** Only publish an amount for the year verified from GİB; do not project future revaluations. */
export function departureFeeLabel(departureDate = todayIso()): string {
  const year = departureDate.slice(0, 4);
  return year === "2026" ? "1.250 ₺ (2026 · muaf olmayan kişi başı)" : year + " tutarını GİB’den doğrulayın";
}
