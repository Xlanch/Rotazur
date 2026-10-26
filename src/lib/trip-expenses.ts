import type { SearchInput } from "./types";

export interface GroupExpenseItem {
  id: string;
  title: string;
  amountTry: number;
  paidBy: string;
  category: "ucus" | "otel" | "yemek" | "ulasim" | "diger";
  imported?: "flight" | "hotel" | "food" | "transport" | "activities";
}
export interface GroupLedger { members: string[]; expenses: GroupExpenseItem[] }
export interface WalletEntry {
  id: string; day: number; title: string;
  category: "yemek" | "ulasim" | "muze" | "alisveris" | "diger";
  originalAmount: number; originalCurrency: string; amountTry: number; amountEur: number;
}

/** Changing the price package must not move a real trip's expense ledger. */
export function tripScope(input: Pick<SearchInput, "destination" | "origin" | "startDate" | "endDate" | "travelers">): string {
  return encodeURIComponent([input.destination, input.origin, input.startDate, input.endDate, input.travelers].join("|"));
}

export function moneyCents(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0 || amount > 100_000_000) throw new Error("Tutar 0 ile 100.000.000 TL arasında olmalıdır.");
  const [mantissa, exponent = "0"] = amount.toString().split("e");
  return Math.round(Number(`${mantissa}e${Number(exponent) + 2}`));
}
export const roundMoney = (amount: number) => moneyCents(amount) / 100;

export function convertWalletAmount(amount: number, mode: "TRY" | "EUR" | "LOCAL", eurRate: number, local: { code: string; perEur: number }) {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(eurRate) || eurRate <= 0
    || !Number.isFinite(local.perEur) || local.perEur <= 0) throw new Error("Geçerli bir tutar ve döviz kuru gereklidir.");
  const amountEur = mode === "TRY" ? amount / eurRate : mode === "EUR" ? amount : amount / local.perEur;
  return { amountTry: roundMoney(mode === "TRY" ? amount : amountEur * eurRate),
    // Keep precision until the total is displayed; small expenses must accumulate.
    amountEur, code: mode === "LOCAL" ? local.code : mode };
}

export function isGroupLedger(value: unknown): value is GroupLedger {
  if (!value || typeof value !== "object") return false;
  const { members, expenses } = value as GroupLedger;
  return Array.isArray(members) && members.length > 0 && members.length <= 50
    && members.every((m) => typeof m === "string" && m.trim().length > 0 && m.length <= 80)
    && new Set(members).size === members.length && Array.isArray(expenses)
    && expenses.every((e) => e && typeof e.id === "string" && typeof e.title === "string"
      && Number.isFinite(e.amountTry) && e.amountTry >= 0 && e.amountTry <= 100_000_000
      && members.includes(e.paidBy) && ["ucus", "otel", "yemek", "ulasim", "diger"].includes(e.category));
}

export function isWalletEntries(value: unknown): value is WalletEntry[] {
  return Array.isArray(value) && value.every((e) => e && typeof e.id === "string" && typeof e.title === "string"
    && Number.isInteger(e.day) && e.day >= 1 && e.day <= 15 && typeof e.originalCurrency === "string"
    && [e.originalAmount, e.amountTry, e.amountEur].every((n) => Number.isFinite(n) && n >= 0 && n <= 100_000_000)
    && ["yemek", "ulasim", "muze", "alisveris", "diger"].includes(e.category));
}

/** Allocate the indivisible remaining kuruş deterministically; every balance sums to zero. */
export function settleGroup(ledger: GroupLedger) {
  if (!isGroupLedger(ledger)) throw new Error("Grup kaydı geçersiz. İsimleri ve harcamaları kontrol edin.");
  const { members, expenses } = ledger;
  const paid = new Map(members.map((m) => [m, 0]));
  for (const e of expenses) paid.set(e.paidBy, paid.get(e.paidBy)! + moneyCents(e.amountTry));
  const total = [...paid.values()].reduce((a, b) => a + b, 0);
  if (!Number.isSafeInteger(total)) throw new Error("Toplam harcama çok büyük.");
  const base = Math.floor(total / members.length), extra = total % members.length;
  const balances = members.map((name, i) => ({ name, amount: paid.get(name)! - base - (i < extra ? 1 : 0) }));
  const debtors = balances.filter((b) => b.amount < 0).map((b) => ({ ...b, amount: -b.amount }));
  const creditors = balances.filter((b) => b.amount > 0).map((b) => ({ ...b }));
  const settlements: { from: string; to: string; amountTry: number }[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    settlements.push({ from: debtors[i].name, to: creditors[j].name, amountTry: amount / 100 });
    debtors[i].amount -= amount; creditors[j].amount -= amount;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return { totalTry: total / 100, perPersonTry: total / members.length / 100,
    paidByMember: Object.fromEntries([...paid].map(([key, value]) => [key, value / 100])),
    netByMember: Object.fromEntries(balances.map((b) => [b.name, b.amount / 100])), settlements };
}

export function importPlanExpenses(ledger: GroupLedger, totals: Record<NonNullable<GroupExpenseItem["imported"]>, number>): GroupLedger {
  const keys = ["flight", "hotel", "food", "transport", "activities"] as const;
  const names = ["✈️ Gidiş-Dönüş Uçak Biletleri", "🏨 Otel Konaklama Toplamı", "🍽️ Ortak Restoran & Yeme-İçme Kasası", "🚇 Havalimanı Transfer & Şehir İçi Ulaşım", "🎟️ Müze & Aktivite Toplamı"];
  const categories = ["ucus", "otel", "yemek", "ulasim", "diger"] as const;
  const importedKey = (e: GroupExpenseItem) => e.imported ?? keys.find((k) => e.id.startsWith(`imp-${k === "transport" ? "trans" : k}-`));
  const imported = keys.map((key, index): GroupExpenseItem => {
    const previous = ledger.expenses.find((e) => importedKey(e) === key);
    return { id: previous?.id ?? `plan-${key}`, imported: key, title: names[index], amountTry: roundMoney(totals[key]),
      paidBy: previous?.paidBy ?? ledger.members[index % Math.min(2, ledger.members.length)], category: categories[index] };
  }).filter((e) => e.amountTry > 0);
  return { ...ledger, expenses: [...imported, ...ledger.expenses.filter((e) => !importedKey(e))] };
}
