export interface PackingRecord {
  checked: Record<string, boolean>;
  customItems: { id: string; text: string }[];
}
export const emptyPackingRecord = (): PackingRecord => ({ checked: {}, customItems: [] });
export function isCheckedMap(value: unknown): value is Record<string, boolean> {
  return !!value && typeof value === "object" && !Array.isArray(value)
    && Object.entries(value).length <= 1000
    && Object.entries(value).every(([id, checked]) => /^[a-zA-Z0-9_-]{1,120}$/.test(id) && typeof checked === "boolean");
}
export function isCustomPackingTexts(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 100 && value.every((text) => typeof text === "string" && text.trim().length > 0 && text.length <= 160);
}
export function isPackingRecord(value: unknown): value is PackingRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as PackingRecord;
  return isCheckedMap(record.checked) && Array.isArray(record.customItems) && record.customItems.length <= 100
    && record.customItems.every((item) => item && /^custom-[a-zA-Z0-9-]{1,100}$/.test(item.id) && typeof item.text === "string" && item.text.trim().length > 0 && item.text.length <= 160)
    && new Set(record.customItems.map((item) => item.id)).size === record.customItems.length;
}
export function migratePackingRecord(checked: Record<string, boolean>, texts: string[]): PackingRecord {
  const customItems = texts.map((text, index) => ({ id: `custom-legacy-${index}`, text }));
  const result = { checked: { ...checked }, customItems };
  for (const [index, item] of customItems.entries()) {
    if (Object.hasOwn(checked, `custom-${index}`)) result.checked[item.id] = checked[`custom-${index}`];
    delete result.checked[`custom-${index}`];
  }
  return result;
}
export function removePackingItem(record: PackingRecord, id: string): PackingRecord {
  return { customItems: record.customItems.filter((item) => item.id !== id),
    checked: Object.fromEntries(Object.entries(record.checked).filter(([key]) => key !== id)) };
}
