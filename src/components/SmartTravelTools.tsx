"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";

import { useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2, Circle, ShieldAlert, Sparkles, Ticket, Wifi } from "lucide-react";
import { fmtCur, tl, type CurrencyCode } from "@/lib/format";
import {
  getCityCurrencyInfo,
  getCityFairPrices,
  getCityPassInfo,
  getPreTripChecklist,
  type FairPriceItem,
} from "@/lib/providers/city-tools";
import { getConnectivityInfo } from "@/lib/providers/city-discovery";
import type { PlanResponse } from "@/lib/types";
import { daysUntilTrip as tripCountdown } from "@/lib/travel-utils";
import { useLocalRecord } from "@/lib/use-local-record";
import { tripScope } from "@/lib/trip-expenses";
import { isCheckedMap } from "@/lib/travel-checklists";

interface SmartTravelToolsProps {
  data: PlanResponse;
  cur: CurrencyCode;
  startDate: string;
  travelers: number;
}

export function SmartTravelTools({ data, cur, startDate, travelers }: SmartTravelToolsProps) {
  const { tl, fmtCur, locale } = useLocaleFormat();
  const { city, rates, nights } = data;
  const curInfo = useMemo(() => getCityCurrencyInfo(city, rates), [city, rates]);
  const passInfo = useMemo(() => getCityPassInfo(city), [city]);
  const fairItems = useMemo(() => getCityFairPrices(city), [city]);
  const checklist = useMemo(() => getPreTripChecklist(city), [city]);
  const connInfo = useMemo(() => getConnectivityInfo(city), [city]);

  // 1. Kasada Hızlı Kur & "Bu Fiyat Normal mi?" State
  const [selectedItem, setSelectedItem] = useState<FairPriceItem["id"]>("restoran");
  const [localAmount, setLocalAmount] = useState<string>(() =>
    String(Math.round(city.foodEur * 0.85 * curInfo.perEur))
  );

  // Şehir değiştiğinde varsayılan tutarı güncelle
  useEffect(() => {
    setLocalAmount(String(Math.round(city.foodEur * 0.85 * curInfo.perEur)));
  }, [city.id, city.foodEur, curInfo.perEur]);

  // 2. Seyahat Öncesi Hazırlık Checklist State (localStorage)
  const checkKey = `rota_pretrip_v2_${tripScope(data.input)}`;
  const { value: doneSteps, update: updateSteps, error: checklistError, legacyAvailable, importLegacy } = useLocalRecord(
    checkKey, () => ({} as Record<string, boolean>), isCheckedMap, `rota_pretrip_${city.id}`,
  );

  const toggleStep = (id: string) => {
    updateSteps((previous) => ({ ...previous, [id]: !previous[id] }));
  };

  // Uçuşa kalan gün hesabı
  const daysUntilTrip = useMemo(() => {
    return tripCountdown(startDate);
  }, [startDate]);

  // Kur ve Normal Fiyat Analizi
  const parsedLocal = Number(localAmount);
  const numLocal = Number.isFinite(parsedLocal) ? Math.min(100_000_000, Math.max(0, parsedLocal)) : 0;
  const priceInEur = numLocal / Math.max(curInfo.perEur, 0.0001);
  const priceInTry = Math.round(priceInEur * rates.EUR);
  const tipInTry = Math.round((priceInTry * curInfo.tippingPercent) / 100);
  const activeFair = fairItems.find((f) => f.id === selectedItem) || fairItems[0];

  const priceVerdict = useMemo(() => {
    if (numLocal <= 0) return null;
    if (priceInEur <= activeFair.fairEurMin * 1.05) {
      return {
        badge: "🟢 Harika Fiyat (Yerel Esnaf İşi)",
        cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
        desc: `Bu fiyat ${city.name} ortalamasının altında veya tam taban fiyatta. Gönül rahatlığıyla alabilirsiniz!`,
      };
    }
    if (priceInEur <= activeFair.fairEurMax * 1.15) {
      return {
        badge: "🔵 Normal Piyasa Fiyatı (Standart)",
        cls: "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200",
        desc: `Bu tutar ${city.name} merkezindeki standart piyasa aralığında (${activeFair.fairEurMin}€ – ${activeFair.fairEurMax}€).`,
      };
    }
    return {
      badge: "🔴 DİKKAT: Turist Tuzağı / Pahalı!",
      cls: "border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200",
      desc: `Bu ürün için ${city.name} normal fiyatı ${activeFair.fairEurMin}€ – ${activeFair.fairEurMax}€ (${tl(activeFair.fairEurMin * rates.EUR)} – ${tl(activeFair.fairEurMax * rates.EUR)}) aralığındadır. Yan sokaklardaki yerel mekanları tercih edin!`,
    };
  }, [numLocal, priceInEur, activeFair, city.name, rates.EUR]);

  // Müze & Ulaşım Kartı Karşılaştırma Hesabı
  const passAnalysis = useMemo(() => {
    const plannedMuseumsTry =
      data.days
        .flatMap((d) => d.activities)
        .filter((a) => a.kind === "gezi")
        .reduce((s, a) => s + a.costTry, 0) / Math.max(1, travelers);

    const singleTransportTotalEur = passInfo.singleTicketEur * 4 * (nights + 1); // günde 4 biniş
    const transportSavingEur = Math.max(0, singleTransportTotalEur - passInfo.transportPassPriceEur);
    const transportSavingTry = Math.round(transportSavingEur * rates.EUR);

    const passTotalTry = Math.round(passInfo.priceEur * rates.EUR);
    const singleCombinedTry = Math.round(plannedMuseumsTry + passInfo.transportPassPriceEur * rates.EUR);
    const passWorthIt = singleCombinedTry > passTotalTry;

    return {
      plannedMuseumsTry: Math.round(plannedMuseumsTry),
      passTotalTry,
      singleCombinedTry,
      passWorthIt,
      transportPassTry: Math.round(passInfo.transportPassPriceEur * rates.EUR),
      singleTransportTotalTry: Math.round(singleTransportTotalEur * rates.EUR),
      transportSavingTry,
    };
  }, [data.days, travelers, nights, passInfo, rates.EUR]);

  const completedChecklistCount = checklist.filter((s) => doneSteps[s.id]).length;

  return (
    <Localize><div className="space-y-6">
      {/* ARAÇ 1: KASADA HIZLI KUR ÇEVİRİCİ & "BU FİYAT NORMAL Mİ?" DEDEKTÖRÜ */}
      <div className="card border-brand-500/30 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              <Calculator className="h-4 w-4" /> Kasada Hızlı Kur & Turist Tuzağı Dedektörü
            </span>
            <h3 className="mt-1 text-lg font-extrabold">
              💱 {city.name} Yerel Para Çevirici ({curInfo.code}) & &ldquo;Bu Fiyat Normal mi?&rdquo;
            </h3>
          </div>
          <span className="rounded-xl bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-700 dark:text-brand-300">
            1 EUR ≈ {curInfo.perEur.toLocaleString(locale, { maximumFractionDigits: 4 })} {curInfo.code} ({curInfo.name}){curInfo.rateSource === "reference" ? " · Yaklaşık referans kur" : ""}
          </span>
        </div>

        {/* Ürün Kategorisi Seçimi */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {fairItems.map((fi) => (
            <button
              key={fi.id}
              type="button"
              onClick={() => {
                setSelectedItem(fi.id);
                const avgEur = (fi.fairEurMin + fi.fairEurMax) / 2;
                setLocalAmount(String(Math.round(avgEur * curInfo.perEur * 10) / 10));
              }}
              className={`chip text-xs ${selectedItem === fi.id ? "chip-on font-bold" : ""}`}
            >
              <span>{fi.emoji}</span>
              <span>{fi.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          {/* Sol: Tutar Girişi & Karşılıkları */}
          <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <label className="text-xs font-bold text-black/65 dark:text-white/65">
              Menüde / Etikette Gördüğünüz Tutar ({curInfo.code} - {curInfo.symbol})
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                step="any"
                value={localAmount}
                onChange={(e) => setLocalAmount(e.target.value)}
                className="input-field w-full text-lg font-black"
                placeholder={`Örn: ${Math.round(10 * curInfo.perEur)}`}
              />
              <span className="shrink-0 rounded-xl bg-black/10 px-3 py-2.5 text-sm font-extrabold dark:bg-white/10">
                {curInfo.code}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-white/5">
                <div className="text-[11px] opacity-60">Türk Lirası Karşılığı</div>
                <div className="text-xl font-black text-gradient">{tl(priceInTry)}</div>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-white/5">
                <div className="text-[11px] opacity-60">Euro Karşılığı</div>
                <div className="text-xl font-black">~{priceInEur.toFixed(1)} €</div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-black/65 dark:text-white/65">
              💁 <b>Bahşiş Hesabı (%{curInfo.tippingPercent}):</b>{" "}
              {curInfo.tippingPercent > 0
                ? `+${tl(tipInTry)} (Bahşiş dahil toplam: ${tl(priceInTry + tipInTry)})`
                : "Ekstra bahşiş bırakmanıza gerek yoktur."}
            </div>
          </div>

          {/* Sağ: Fiyat Dedektörü Sonucu & ATM/Bahşiş Kuralları */}
          <div className="flex flex-col justify-between space-y-3">
            {priceVerdict && (
              <div className={`rounded-2xl border p-4 ${priceVerdict.cls}`}>
                <div className="text-sm font-extrabold">{priceVerdict.badge}</div>
                <p className="mt-1 text-xs leading-relaxed opacity-90">{priceVerdict.desc}</p>
                <div className="mt-2 text-[11px] font-bold opacity-80">
                  📌 {city.name} Adil Piyasa Aralığı ({activeFair.label}): {activeFair.fairEurMin}€ – {activeFair.fairEurMax}€ (
                  {tl(activeFair.fairEurMin * rates.EUR)} – {tl(activeFair.fairEurMax * rates.EUR)})
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-black/[0.03] p-3.5 text-xs space-y-1.5 dark:bg-white/[0.03]">
              <div>
                <span className="font-bold text-brand-600 dark:text-brand-400">🏧 ATM & Kur Uyarısı: </span>
                <span className="text-black/75 dark:text-white/75">{curInfo.atmWarning}</span>
              </div>
              <div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">🍽️ Bahşiş Kuralı: </span>
                <span className="text-black/75 dark:text-white/75">{curInfo.tippingRule}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ARAÇ 2: MÜZE, ETKİNLİK & ULAŞIM KARTI (CITY PASS) KARŞILAŞTIRICISI */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              <Ticket className="h-4 w-4" /> Şehir Kartı & Ulaşım Bilet Hesaplayıcısı
            </span>
            <h3 className="mt-1 text-lg font-extrabold">
              🎟️ {city.name} City Pass & Toplu Taşıma Kartı Almak Mantıklı mı?
            </h3>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-extrabold ${
              passAnalysis.passWorthIt
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            }`}
          >
            {passInfo.estimated ? "Tahmini bütçe karşılaştırması" : passAnalysis.passWorthIt
              ? "✅ Şehir Kartı Almak Kârlı!"
              : "💡 Ulaşım Kartı + Tekil Bilet Daha Ekonomik"}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Sol: Müze / Şehir Kartı */}
          <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase text-purple-600 dark:text-purple-400">
                  {passInfo.estimated ? "Müze bütçe örneği · tarife değildir" : "Resmi Turist & Müze Kartı"}
                </span>
                <h4 className="text-base font-extrabold">{passInfo.passName}</h4>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-gradient">
                  {fmtCur(passAnalysis.passTotalTry, cur, rates)}
                </div>
                <div className="text-[10px] opacity-60">~{passInfo.priceEur} € / kişi</div>
              </div>
            </div>
            <p className="mt-2 text-xs text-black/70 dark:text-white/70 leading-relaxed">{passInfo.includes}</p>
            <div className="mt-3 rounded-xl bg-purple-500/10 p-2.5 text-[11px] text-purple-900 dark:text-purple-200">
              <b>Rotanızdaki Müzeler + Ulaşım Karşılaştırması:</b> Tek tek alırsanız kişi başı{" "}
              <b>{fmtCur(passAnalysis.singleCombinedTry, cur, rates)}</b> tutuyor.{" "}
              {passInfo.estimated ? "Bu karşılaştırma tahmini bütçelerle hazırlanmıştır; gerçek kart/bilet fiyatları ve kapsamı ayrıca doğrulanmalıdır." : passAnalysis.passWorthIt
                ? `Kart alarak kişi başı ${fmtCur(passAnalysis.singleCombinedTry - passAnalysis.passTotalTry, cur, rates)} tasarruf edersiniz!`
                : `Rotanızdaki çoğu nokta ücretsiz/uygun olduğu için tam City Pass yerine tekil bilet almanız ${fmtCur(passAnalysis.passTotalTry - passAnalysis.singleCombinedTry, cur, rates)} cebinizde bırakır.`}
            </div>
          </div>

          {/* Sağ: Toplu Taşıma Kartı vs Tek Bilet */}
          <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  Önerilen Toplu Taşıma Kartı
                </span>
                <h4 className="text-base font-extrabold">{passInfo.transportCardName}</h4>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {fmtCur(passAnalysis.transportPassTry, cur, rates)}
                </div>
                <div className="text-[10px] opacity-60">~{passInfo.transportPassPriceEur} € ({passInfo.estimated ? "Bütçe tahmini" : "Sınırsız/Paket"})</div>
              </div>
            </div>

            <div className="mt-2.5 space-y-1.5 text-xs text-black/70 dark:text-white/70">
              <div>
                • <b>Tek Biniş Ücreti:</b> ~{passInfo.singleTicketEur} € ({tl(passInfo.singleTicketEur * rates.EUR)})
              </div>
              <div>
                • <b>Ücretsiz Müze Günleri:</b> {passInfo.freeMuseumTip}
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-emerald-500/10 p-2.5 text-[11px] text-emerald-900 dark:text-emerald-200">
              💡 <b>Uzman Tavsiyesi:</b> {passInfo.officialHint}
            </div>
          </div>
        </div>
      </div>

      {/* ARAÇ 3: VİZE, PASAPORT & SEYAHAT ÖNCESİ HAZIRLIK TAKVİMİ (COUNTDOWN CHECKLIST) */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <Sparkles className="h-4 w-4" /> Uçuşa {daysUntilTrip} Gün Kaldı · Adım Adım Kontrol Listesi
            </span>
            <h3 className="mt-1 text-lg font-extrabold">
              🛂 {city.name} ({city.country}) Vize, Harç & Seyahat Öncesi Hazırlık Takvimi
            </h3>
          </div>
          <span className="rounded-xl bg-black/5 px-3 py-1.5 text-xs font-bold dark:bg-white/10">
            Tamamlanan: {completedChecklistCount} / {checklist.length}
          </span>
        </div>

        {checklistError && <p role="alert" className="mt-3 text-xs text-rose-600 dark:text-rose-400">{checklistError}</p>}
        {legacyAvailable && <button type="button" onClick={importLegacy} className="btn-ghost mt-3 text-xs">Önceki hazırlık listesini bu geziye kopyala</button>}

        {/* İlerleme Çubuğu */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${Math.round((completedChecklistCount / checklist.length) * 100)}%` }}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {checklist.map((step) => {
            const done = !!doneSteps[step.id];
            return (
              <div
                key={step.id}
                onClick={() => toggleStep(step.id)}
                className={`cursor-pointer rounded-2xl border p-3.5 transition ${
                  done
                    ? "border-emerald-500/30 bg-emerald-500/[0.04] opacity-75"
                    : "border-black/10 bg-black/[0.015] hover:border-brand-400 dark:border-white/10 dark:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <button type="button" aria-label={step.title} aria-pressed={done} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 opacity-50" />
                    )}
                  </button>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                        {step.phase}
                      </span>
                      {step.critical && !done && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/15 px-1.5 py-0.2 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          <ShieldAlert className="h-2.5 w-2.5" /> Önemli
                        </span>
                      )}
                    </div>
                    <h4 className={`mt-0.5 text-xs font-extrabold ${done ? "line-through" : ""}`}>
                      {step.title}
                    </h4>
                    <p className="mt-1 text-[11px] text-black/65 dark:text-white/65 leading-relaxed">
                      {step.detail}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ARAÇ 4: eSIM, YEREL SIM & TÜRK OPERATÖR İNTERNET HESAPLAYICISI + PRİZ & MUSLUK SUYU */}
      <div className="card border-sky-500/30 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              <Wifi className="h-4 w-4" /> Yurt Dışı İnternet (eSIM / SIM) & Altyapı Rehberi
            </span>
            <h3 className="mt-1 text-lg font-extrabold">
              📶 {city.name} ({nights + 1} Gün) En Ucuz İnternet Çözümü, Priz & İçme Suyu
            </h3>
          </div>
          <span className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
            {connInfo.estimated ? "İnternet bütçe örneği · paket fiyatı değildir" : <>💰 Roaming Yerine eSIM/SIM İle{" "}
            {tl(
              Math.max(
                0,
                connInfo.trRoamingDailyTry * (nights + 1) -
                  Math.min(connInfo.esimPriceEur, connInfo.localSimPriceEur) * rates.EUR
              )
            )}{" "}
            Tasarruf!</>}
          </span>
        </div>

        {/* 3 İnternet Seçeneği Kıyaslaması */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {/* 1. eSIM */}
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.04] p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-emerald-500 text-white px-2.5 py-0.5 text-[10px] font-extrabold">
                🏆 En Pratik (Uçaktan İnince Hazır)
              </span>
              <span className="text-xs font-bold opacity-70">{connInfo.esimDataLabel}</span>
            </div>
            <h4 className="mt-2 text-sm font-extrabold">{connInfo.esimName}</h4>
            <div className="mt-2 text-xl font-black text-emerald-600 dark:text-emerald-400">
              {fmtCur(Math.round(connInfo.esimPriceEur * rates.EUR), cur, rates)}{" "}
              <span className="text-xs font-normal opacity-70">(~{connInfo.esimPriceEur} €)</span>
            </div>
            <p className="mt-1.5 text-[11px] text-black/65 dark:text-white/65">
              Fiziksel kart değiştirmeden Türkiye&apos;deyken QR kod ile 2 dakikada kurulur.
            </p>
          </div>

          {/* 2. Yerel Turist SIM */}
          <div className="rounded-2xl border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-sky-700 dark:text-sky-300">
                📱 Yüksek GB / Yerel Hat
              </span>
              <span className="text-xs font-bold opacity-70">{connInfo.localSimDataLabel}</span>
            </div>
            <h4 className="mt-2 text-sm font-extrabold">{connInfo.localSimName}</h4>
            <div className="mt-2 text-xl font-black">
              {fmtCur(Math.round(connInfo.localSimPriceEur * rates.EUR), cur, rates)}{" "}
              <span className="text-xs font-normal opacity-70">(~{connInfo.localSimPriceEur} €)</span>
            </div>
            <p className="mt-1.5 text-[11px] text-black/65 dark:text-white/65">
              📍 {connInfo.whereToBuySim}
            </p>
          </div>

          {/* 3. Türk Operatör Yurt Dışı Günlük Paket */}
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.03] p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-700 dark:text-rose-300">
                ⚠️ En Pahalı Seçenek
              </span>
              <span className="text-xs font-bold opacity-70">{connInfo.estimated ? "Operatör tarifenizi kontrol edin" : `Günlük ${tl(connInfo.trRoamingDailyTry)}`}</span>
            </div>
            <h4 className="mt-2 text-sm font-extrabold">Türk Operatör Yurt Dışı Paketi</h4>
            <div className="mt-2 text-xl font-black text-rose-600 dark:text-rose-400">
              {connInfo.estimated ? "Tarifeye göre değişir" : fmtCur(connInfo.trRoamingDailyTry * (nights + 1), cur, rates)}{" "}
              <span className="text-xs font-normal opacity-70">({nights + 1} gün toplam)</span>
            </div>
            <p className="mt-1.5 text-[11px] text-black/65 dark:text-white/65">
              Turkcell / Vodafone / Türk Telekom günlük yurt dışı kullanım ücreti {nights + 1} günde bütçeyi zorlar.
            </p>
          </div>
        </div>

        {/* Musluk Suyu, Priz Tipi & İndirilmesi Gereken Uygulamalar */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-black/[0.03] p-3.5 text-xs dark:bg-white/[0.03]">
            <div className="font-extrabold text-emerald-700 dark:text-emerald-400">
              🚰 {connInfo.tapWater.statusLabel}
            </div>
            <p className="mt-1 text-[11px] text-black/70 dark:text-white/70 leading-relaxed">
              {connInfo.tapWater.detail}
            </p>
          </div>

          <div className="rounded-2xl bg-black/[0.03] p-3.5 text-xs dark:bg-white/[0.03]">
            <div className="font-extrabold text-brand-600 dark:text-brand-400">
              🔌 Priz: {connInfo.plug.types} ({connInfo.plug.voltage})
            </div>
            <p className="mt-1 text-[11px] text-black/70 dark:text-white/70 leading-relaxed">
              {connInfo.plug.detail}
            </p>
          </div>

          <div className="rounded-2xl bg-black/[0.03] p-3.5 text-xs dark:bg-white/[0.03]">
            <div className="font-extrabold text-purple-700 dark:text-purple-400">
              📲 Gitmeden İndirmeniz Gereken Uygulamalar
            </div>
            <ul className="mt-1 space-y-1 text-[11px] text-black/75 dark:text-white/75">
              {connInfo.essentialApps.map((app) => (
                <li key={app.name}>
                  • <b>{app.name}:</b> {app.purpose}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div></Localize>
  );
}
