"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";

import { useMemo, useState } from "react";
import { Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useLocalRecord } from "@/lib/use-local-record";
import { tripScope, isWalletEntries, roundMoney, moneyCents, convertWalletAmount, type WalletEntry } from "@/lib/trip-expenses";
import type { CurrencyCode } from "@/lib/format";
import { getCityCurrencyInfo } from "@/lib/providers/city-tools";
import type { Comfort, PlanResponse } from "@/lib/types";

interface LiveTravelWalletProps {
  data: PlanResponse;
  cur: CurrencyCode;
  budgetTier: Comfort;
  plannedPocketTry: number; // Yemek + Ulaşım + Gezi toplam planlanan bütçe
  travelers: number;
}

const CAT_LABELS: Record<WalletEntry["category"], { label: string; emoji: string }> = {
  yemek: { label: "Yeme & İçme", emoji: "🍽️" },
  ulasim: { label: "Ulaşım & Taksi", emoji: "🚕" },
  muze: { label: "Müze & Etkinlik", emoji: "🎟️" },
  alisveris: { label: "Hediyelik & Alışveriş", emoji: "🛍️" },
  diger: { label: "Diğer", emoji: "✨" },
};

export function LiveTravelWallet({
  data,
  cur,
  budgetTier,
  plannedPocketTry,
  travelers,
}: LiveTravelWalletProps) {
  const { fmtMoney: fmtCur, locale } = useLocaleFormat();
  const { city, rates, nights } = data;
  const totalDays = nights + 1;
  const curInfo = useMemo(() => getCityCurrencyInfo(city, rates), [city, rates]);

  const storageKey = "rota_live_wallet_v2_" + tripScope(data.input);
  const { value: entries, update, error, legacyAvailable, importLegacy } = useLocalRecord(
    storageKey, () => [] as WalletEntry[], isWalletEntries, "rota_live_wallet_" + city.id,
  );
  const [day, setDay] = useState<number>(1);
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<WalletEntry["category"]>("yemek");
  const [amountInput, setAmountInput] = useState<string>("");
  const [inputCurrency, setInputCurrency] = useState<"LOCAL" | "EUR" | "TRY">(
    curInfo.code !== "EUR" ? "LOCAL" : "EUR"
  );

  const convertToTryAndEur = (val: number, mode: "LOCAL" | "EUR" | "TRY") => {
    return convertWalletAmount(val, mode, rates.EUR, curInfo);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = update((current) => {
      const num = Number(amountInput);
      if (!title.trim() || !Number.isFinite(num) || num <= 0) throw new Error('Harcama adı ve geçerli bir pozitif tutar girin.');
      const conv = convertToTryAndEur(num, inputCurrency);
      if (conv.amountTry <= 0) throw new Error("Harcama tutarı en az bir kuruş olmalıdır.");
      const item: WalletEntry = { id: 'wallet-' + crypto.randomUUID(), day, title: title.trim(), category,
        originalAmount: num, originalCurrency: conv.code, amountTry: conv.amountTry, amountEur: conv.amountEur };
      return [item, ...current];
    });
    if (saved) { setTitle(''); setAmountInput(''); }
  };

  const handleQuickAdd = (preset: { title: string; category: WalletEntry['category']; eur: number }) => update((current) => {
    const item: WalletEntry = { id: 'wallet-' + crypto.randomUUID(), day, title: preset.title, category: preset.category,
      originalAmount: roundMoney(preset.eur * curInfo.perEur), originalCurrency: curInfo.code,
      amountTry: roundMoney(preset.eur * rates.EUR), amountEur: roundMoney(preset.eur) };
    return [item, ...current];
  });

  const handleRemove = (id: string) => update((current) => current.filter((x) => x.id !== id));

  const totalSpentTry = useMemo(() => entries.reduce((s, x) => s + moneyCents(x.amountTry), 0) / 100, [entries]);
  const totalSpentEur = useMemo(
    () => Math.round(entries.reduce((s, x) => s + x.amountEur, 0) * 100) / 100,
    [entries]
  );

  const plannedDailyTry = Math.round(plannedPocketTry / Math.max(1, totalDays));
  const diffTry = Math.round((plannedPocketTry - totalSpentTry) * 100) / 100;
  const usedPercent = Math.round((totalSpentTry / Math.max(1, plannedPocketTry)) * 100);

  return (
    <Localize><div className="card border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.03] via-brand-500/[0.02] to-purple-500/[0.03] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Wallet className="h-4 w-4" /> Canlı Seyahat Cüzdanı & Harcama Günlüğü
          </span>
          <h2 className="mt-1 text-xl font-extrabold">
            📓 Planlanan Bütçe vs Gerçekleşen Harcama Takibi ({budgetTier.toUpperCase()} Mod)
          </h2>
          <p className="mt-0.5 text-xs text-black/60 dark:text-white/60">
            Gezi sırasında yaptığınız harcamaları yerel para ({curInfo.code}), Euro veya TL olarak girin; planlanan cep harçlığı limitinizle canlı kıyaslayın.
          </p>
        </div>

        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => update(() => [])}
            className="self-start rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
          >
            Cüzdanı Sıfırla
          </button>
        )}
      </div>

      {/* Üst Özet Kartları */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-white/5">
          <div className="text-[11px] font-semibold opacity-60">
            Planlanan Cep Harçlığı ({totalDays} Gün, {travelers} Kişi)
          </div>
          <div className="mt-1 text-xl font-black">{fmtCur(plannedPocketTry, cur, rates)}</div>
          <div className="mt-0.5 text-[11px] opacity-65">
            Günlük Limit: <b>{fmtCur(plannedDailyTry, cur, rates)}</b> (Yemek+Ulaşım+Gezi)
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-white/5">
          <div className="text-[11px] font-semibold opacity-60">Gerçekleşen Toplam Harcama</div>
          <div className="mt-1 text-xl font-black text-gradient">
            {fmtCur(totalSpentTry, cur, rates)}
          </div>
          <div className="mt-0.5 text-[11px] opacity-65">
            ~{totalSpentEur} € · {entries.length} harcama kaydı
          </div>
        </div>

        <div
          className={`rounded-2xl p-4 shadow-sm ${
            diffTry >= 0
              ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
              : "bg-rose-500/10 text-rose-900 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            {diffTry >= 0 ? (
              <>
                <TrendingDown className="h-4 w-4 text-emerald-600" />
                <span>Planlanan Bütçenin Altındasınız!</span>
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 text-rose-600" />
                <span>Cep Harçlığı Limitini Aştınız</span>
              </>
            )}
          </div>
          <div className="mt-1 text-xl font-black">
            {diffTry >= 0
              ? `${fmtCur(diffTry, cur, rates)} Kaldı`
              : `+${fmtCur(Math.abs(diffTry), cur, rates)} Aşım`}
          </div>
          <div className="mt-0.5 text-[11px] opacity-80">
            Kullanım Oranı: <b>%{usedPercent}</b>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      {legacyAvailable && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Bu şehir için eski bir harcama kaydı var. <button type="button" onClick={importLegacy} className="font-bold underline">Eski kaydı bu geziye aktar</button></p>}
      {/* Canlı Bütçe Çubuğu */}
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div
          className={`h-full transition-all duration-300 ${
            usedPercent > 100
              ? "bg-rose-500"
              : usedPercent > 80
              ? "bg-amber-500"
              : "bg-gradient-to-r from-emerald-500 to-brand-500"
          }`}
          style={{ width: `${Math.min(100, usedPercent)}%` }}
        />
      </div>

      {/* Tek Tıkla Hızlı Harcama Ekleme Çipleri */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold opacity-65">⚡ Hızlı Ekle (1 Kişi):</span>
        {[
          { title: "☕ Kahve & Kruvasan", category: "yemek" as const, eur: 3.5 },
          { title: "🥙 Sokak Lezzeti / Öğle", category: "yemek" as const, eur: Math.round(city.foodEur * 0.35) },
          { title: "🍽️ Akşam Restoran Yemeği", category: "yemek" as const, eur: Math.round(city.foodEur * 0.7) },
          { title: "🚇 Günlük Metro / Otobüs", category: "ulasim" as const, eur: city.transportEur },
          { title: "🎟️ Müze / Ören Yeri Girişi", category: "muze" as const, eur: 12 },
          { title: "🧲 Hediyelik Magnet & Kahve", category: "alisveris" as const, eur: 6 },
        ].map((p) => (
          <button
            key={p.title}
            type="button"
            onClick={() => handleQuickAdd(p)}
            className="rounded-xl border border-black/10 bg-white px-2.5 py-1 text-[11px] font-bold transition hover:border-brand-400 dark:border-white/10 dark:bg-white/5"
          >
            + {p.title} (~{p.eur}€)
          </button>
        ))}
      </div>

      {/* Manuel Harcama Ekleme Formu */}
      <form onSubmit={handleAdd} className="mt-4 grid gap-2 sm:grid-cols-[95px_1.5fr_130px_110px_95px_auto]">
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="input-field text-xs font-bold"
        >
          {Array.from({ length: totalDays }).map((_, i) => (
            <option key={i + 1} value={i + 1}>
              Gün {i + 1}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Harcama adı (Örn: Ćevapi, Taksi, Müze...)"
          className="input-field text-xs"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as WalletEntry["category"])}
          className="input-field text-xs font-semibold"
        >
          {Object.entries(CAT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.emoji} {v.label}
            </option>
          ))}
        </select>

        <input
          type="number"
          step="any"
          min={0}
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder="Tutar"
          className="input-field text-xs font-bold"
        />

        <select
          value={inputCurrency}
          onChange={(e) => setInputCurrency(e.target.value as "LOCAL" | "EUR" | "TRY")}
          className="input-field text-xs font-bold"
        >
          {curInfo.code !== "EUR" && <option value="LOCAL">{curInfo.code}</option>}
          <option value="EUR">€ EUR</option>
          <option value="TRY">₺ TRY</option>
        </select>

        <button type="submit" className="btn-primary rounded-xl px-4 py-2 text-xs font-extrabold">
          <Plus className="h-4 w-4" /> Ekle
        </button>
      </form>
      {curInfo.rateSource === "reference" && inputCurrency === "LOCAL" && <p className="mt-2 text-[11px] text-black/55 dark:text-white/50">{curInfo.code} dönüşümü yaklaşık referans kurla hesaplanır.</p>}

      {/* Harcama Listesi */}
      {entries.length > 0 && (
        <div className="mt-4 max-h-60 space-y-2 overflow-y-auto pr-1 scroll-thin">
          {entries.map((item) => {
            const cat = CAT_LABELS[item.category];
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-black/5 bg-white px-3.5 py-2.5 text-xs shadow-sm dark:border-white/5 dark:bg-white/5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="rounded-lg bg-brand-500/10 px-2 py-0.5 text-[10px] font-extrabold text-brand-600 dark:text-brand-300">
                    Gün {item.day}
                  </span>
                  <span>{cat.emoji}</span>
                  <div>
                    <div className="font-bold">{item.title}</div>
                    <div className="text-[10px] opacity-55">
                      {cat.label} · Girilen: {item.originalAmount} {item.originalCurrency}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-extrabold">{fmtCur(item.amountTry, "TRY", rates)}</div>
                    <div className="text-[10px] opacity-60">~{item.amountEur.toLocaleString(locale, { maximumFractionDigits: 2 })} €</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="rounded-lg p-1 text-black/40 hover:bg-rose-500/10 hover:text-rose-500 dark:text-white/40"
                    title="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div></Localize>
  );
}
