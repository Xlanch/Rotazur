"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";
import { useLanguage } from "./LanguageContext";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  Maximize2,
  Plane,
  Plus,
  ShoppingBag,
  Sparkles,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { fmtCur, tl, type CurrencyCode } from "@/lib/format";
import {
  getAirportTransfers,
  getCityPhrasebook,
  getPhotoSpots,
  getShoppingAndTaxFree,
  type PhraseCategory,
  type PhotoSpot,
  type SurvivalPhrase,
} from "@/lib/providers/city-discovery";
import type { Comfort, PlanResponse } from "@/lib/types";
import { copyText } from "@/lib/clipboard";

interface CityDiscoveryHubProps {
  data: PlanResponse;
  cur: CurrencyCode;
  budgetTier: Comfort;
  travelers: number;
  activeDay: number;
  onFocusMap: (coords: [number, number]) => void;
  onAddPhotoSpotToDay: (spot: PhotoSpot) => void;
}

export function CityDiscoveryHub({
  data,
  cur,
  budgetTier,
  travelers,
  activeDay,
  onFocusMap,
  onAddPhotoSpotToDay,
}: CityDiscoveryHubProps) {
  const { currentMeta, translate } = useLanguage();
  const { fmtCur, tl } = useLocaleFormat();
  const { city, rates } = data;

  const phrasebook = useMemo(() => getCityPhrasebook(city), [city]);
  const transfers = useMemo(() => getAirportTransfers(city), [city]);
  const shopping = useMemo(() => getShoppingAndTaxFree(city), [city]);
  const photoSpots = useMemo(() => getPhotoSpots(city), [city]);

  // 1. Konuşma Kartları State
  const [phraseCat, setPhraseCat] = useState<"all" | PhraseCategory>("all");
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fullscreenPhrase, setFullscreenPhrase] = useState<SurvivalPhrase | null>(null);
  const copyRevision = useRef(0);
  useEffect(() => {
    copyRevision.current++;
    setCopiedId(null);
    return () => { copyRevision.current++; };
  }, [city.id]);

  // 3. Alışveriş & Tax-Free State
  const [souvenirTier, setSouvenirTier] = useState<"all" | Comfort>("all");
  const [spendEurInput, setSpendEurInput] = useState<string>("120");

  // Sesli Telaffuz (Web Speech API)
  const speakPhrase = (phrase: SurvivalPhrase) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const textToRead = phrase.local.split(" (")[0];
      const utter = new SpeechSynthesisUtterance(textToRead);
      utter.lang = phrasebook.speechLang;
      utter.rate = 0.88;
      utter.onstart = () => setSpeakingId(phrase.id);
      utter.onend = () => setSpeakingId(null);
      utter.onerror = () => setSpeakingId(null);
      window.speechSynthesis.speak(utter);
    } catch {
      setSpeakingId(null);
    }
  };

  const copyPhrase = async (phrase: SurvivalPhrase) => {
    const revision = ++copyRevision.current;
    setCopiedId(null);
    try {
      await copyText(`${phrase.local}\n(${phrase.en})`);
      if (revision !== copyRevision.current) return;
      setCopiedId(phrase.id);
      setTimeout(() => { if (revision === copyRevision.current) setCopiedId(null); }, 2000);
    } catch (error) {
      if (revision === copyRevision.current) window.alert(translate((error as Error).message));
    }
  };

  const filteredPhrases = useMemo(
    () => phrasebook.phrases.filter((p) => phraseCat === "all" || p.category === phraseCat),
    [phrasebook.phrases, phraseCat]
  );

  const filteredSouvenirs = useMemo(
    () => shopping.souvenirs.filter((s) => souvenirTier === "all" || s.tier === souvenirTier),
    [shopping.souvenirs, souvenirTier]
  );

  // Tax-Free Hesaplama
  const spendEur = Math.max(0, Number(spendEurInput) || 0);
  const spendTry = Math.round(spendEur * rates.EUR);
  const qualifiesTaxFree = shopping.taxFree.available && spendEur >= shopping.taxFree.minSpendEur;
  const refundEur = qualifiesTaxFree
    ? Math.round(spendEur * (shopping.taxFree.netRefundPercent / 100) * 10) / 10
    : 0;
  const refundTry = Math.round(refundEur * rates.EUR);

  // Havalimanı Grup Hesabı Analizi
  const groupTransferComparison = useMemo(() => {
    const expressOpt = transfers.options.find((o) => o.tier === "dengeli") || transfers.options[0];
    const taxiOpt = transfers.options.find((o) => o.tier === "konforlu") || transfers.options[transfers.options.length - 1];

    const expressGroupEur =
      expressOpt.pricingModel === "per_person" ? expressOpt.priceEur * travelers : expressOpt.priceEur;
    const taxiGroupEur =
      taxiOpt.pricingModel === "per_vehicle"
        ? taxiOpt.priceEur * Math.ceil(travelers / 4)
        : taxiOpt.priceEur * travelers;

    return {
      expressName: expressOpt.name,
      taxiName: taxiOpt.name,
      expressGroupEur: Math.round(expressGroupEur * 10) / 10,
      taxiGroupEur: Math.round(taxiGroupEur * 10) / 10,
      taxiPerPersonEur: Math.round((taxiGroupEur / Math.max(1, travelers)) * 10) / 10,
      taxiIsCompetitive: taxiGroupEur <= expressGroupEur * 1.35,
    };
  }, [transfers.options, travelers]);

  return (
    <Localize><div className="space-y-8">
      {/* MODÜL 1: SESLİ TELAFFUZLU "SOKAKTA & RESTORANDA HAYATTA KALMA" KONUŞMA KARTLARI */}
      <div className="card border-brand-500/30 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              <Volume2 className="h-4 w-4" /> Sesli Telaffuz & Garsona Göster Modu
            </span>
            <h2 className="mt-1 text-xl font-extrabold">
              🗣️ {city.name} ({phrasebook.languageName}) Hayatta Kalma & Hassasiyet Kartları
            </h2>
            <p className="mt-0.5 text-xs text-black/60 dark:text-white/60">
              Domuz eti/alkol hassasiyetinizi, taksi ve alışveriş cümlelerini yerel dilde sesli dinleyin veya tam ekran açıp garsona gösterin.
            </p>
          </div>
          <span className="shrink-0 rounded-xl bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-700 dark:text-brand-300">
            🔊 Dil: {phrasebook.languageName}
          </span>
        </div>

        {/* Kategori Seçici */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {[
            { id: "all", label: "🌟 Tüm Kartlar (12)" },
            { id: "restoran", label: "🍽️ Restoran, Domuz Eti & Alerji" },
            { id: "ulasim", label: "🚕 Ulaşım, Taksi & Bilet" },
            { id: "alisveris", label: "🛍️ Alışveriş, Pazarlık & Tax-Free" },
            { id: "acil", label: "🚨 Eczane & Acil Durum" },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setPhraseCat(c.id as "all" | PhraseCategory)}
              className={`chip text-xs ${phraseCat === c.id ? "chip-on font-bold" : ""}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Konuşma Kartları Grid */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filteredPhrases.map((p) => {
            const isDietary = p.id === "no-pork" || p.id === "no-alcohol" || p.id === "allergy";
            return (
              <div
                key={p.id}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                  isDietary
                    ? "border-rose-500/30 bg-rose-500/[0.03] dark:border-rose-500/25 dark:bg-rose-500/[0.04]"
                    : "border-black/10 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.02]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-0.5 text-[11px] font-extrabold dark:bg-white/10">
                      <span>{p.icon}</span>
                      <span>{p.badge}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => speakPhrase(p)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                          speakingId === p.id
                            ? "bg-brand-600 text-white shadow"
                            : "bg-brand-500/10 text-brand-700 hover:bg-brand-500/20 dark:text-brand-300"
                        }`}
                        title="Sesli Telaffuzu Dinle"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        <span>{speakingId === p.id ? "Okunuyor..." : "Sesli Dinle"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFullscreenPhrase(p)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300"
                        title="Tam Ekran Açıp Garsona / Görevliye Göster"
                      >
                        <Maximize2 className="h-3 w-3" />
                        <span>Göster</span>
                      </button>
                    </div>
                  </div>

                  {/* Türkçe Anlamı */}
                  <div className="mt-2.5 text-xs font-semibold text-black/65 dark:text-white/65">
                    {currentMeta.flag} {p.tr}
                  </div>

                  {/* Yerel Dilde Yazılışı */}
                  <div className="mt-2 rounded-xl bg-white p-3 shadow-sm dark:bg-white/5">
                    <div translate="no" className="text-sm font-black leading-snug text-black dark:text-white">
                      {p.local}
                    </div>
                    <div className="mt-1.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                      🗣️ Okunuşu: &ldquo;<span translate="no">{p.phonetic}</span>&rdquo;
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-black/50 dark:text-white/50">
                  <span translate="no" className="truncate">🇬🇧 {p.en}</span>
                  <button
                    type="button"
                    onClick={() => copyPhrase(p)}
                    className="ml-2 inline-flex shrink-0 items-center gap-1 font-semibold hover:text-black dark:hover:text-white"
                  >
                    {copiedId === p.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" /> Kopyalandı
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Kopyala
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODÜL 2: HAVALİMANI -> ŞEHİR MERKEZİ TRANSFER KARŞILAŞTIRICISI */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              <Plane className="h-4 w-4" /> Havalimanı → Şehir Merkezi Ulaşım Rehberi
            </span>
            <h2 className="mt-1 text-xl font-extrabold">
              ✈️ {transfers.airportName} ({transfers.airportCode}) → Merkez Transfer Karşılaştırması
            </h2>
            <p className="mt-0.5 text-xs text-black/60 dark:text-white/60">
              Merkeze uzaklık: ~{transfers.distanceKm} km {transfers.estimated ? "kuş uçuşu · süre ve ücretler bütçe tahminidir" : "· 3 farklı bütçe seviyesine göre ulaşım alternatifleri"}
            </p>
          </div>
        </div>

        {/* 3 Transfer Seçeneği Kartları */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {transfers.options.map((opt) => {
            const isSelectedTier = opt.tier === budgetTier;
            const totalForGroupEur =
              opt.pricingModel === "per_person"
                ? opt.priceEur * travelers
                : opt.priceEur * Math.ceil(travelers / 4);
            const singleTry = Math.round(opt.priceEur * rates.EUR);
            const groupTry = Math.round(totalForGroupEur * rates.EUR);

            const badgeCls =
              opt.tier === "tasarruflu"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : opt.tier === "dengeli"
                ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                : "bg-purple-500/15 text-purple-700 dark:text-purple-300";

            return (
              <div
                key={opt.tier}
                className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                  isSelectedTier
                    ? "border-brand-500 bg-brand-500/[0.04] ring-2 ring-brand-500/20"
                    : "border-black/10 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.02]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${badgeCls}`}>
                      {opt.tier === "tasarruflu"
                        ? "💚 Tasarruflu"
                        : opt.tier === "dengeli"
                        ? "💙 Dengeli"
                        : "💜 Konforlu"}
                    </span>
                    <span className="text-xs font-bold text-black/55 dark:text-white/55">
                      ⏱️ ~{opt.durationMin} dk
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-bold text-brand-600 dark:text-brand-400">{opt.mode}</div>
                  <h3 className="mt-0.5 text-sm font-extrabold">{opt.name}</h3>

                  <div className="mt-3 rounded-xl bg-white p-3 shadow-sm dark:bg-white/5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] opacity-65">
                        {opt.pricingModel === "per_person" ? "Kişi Başı Ücret:" : "Araç Başı (1-4 Kişi):"}
                      </span>
                      <span className="text-lg font-black text-gradient">
                        {opt.priceEur === 0 ? "ÜCRETSİZ (0 €)" : fmtCur(singleTry, cur, rates)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between border-t border-black/5 pt-1 text-[11px] dark:border-white/5">
                      <span className="opacity-65">{travelers} Kişi Toplam Maliyet:</span>
                      <span className="font-extrabold">
                        {opt.priceEur === 0
                          ? "0 ₺ (Ücretsiz)"
                          : `${fmtCur(groupTry, cur, rates)} (~${Math.round(totalForGroupEur * 10) / 10} €)`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-black/70 dark:text-white/70">
                    <div>
                      🔄 <b>Sefer Sıklığı:</b> {opt.frequency}
                    </div>
                    <div>
                      🎫 <b>Nereden Alınır:</b> {opt.whereToBuy}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-amber-500/10 p-2.5 text-[11px] text-amber-950 dark:text-amber-200">
                  💡 <b>Tüyo:</b> {opt.proTip}
                </div>
              </div>
            );
          })}
        </div>

        {/* Akıllı Grup Hesabı Kutusu */}
        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-xs">
              <div className="font-extrabold text-emerald-900 dark:text-emerald-200">
                🧮 {travelers} Kişilik Akıllı Grup Transfer Analizi
              </div>
              <p className="mt-0.5 text-black/75 dark:text-white/75">
                {travelers} kişi için ekspres otobüs/tren toplam{" "}
                <b>
                  {tl(groupTransferComparison.expressGroupEur * rates.EUR)} (~{groupTransferComparison.expressGroupEur} €)
                </b>{" "}
                tutarken, resmi Taksi/Bolt toplam{" "}
                <b>
                  {tl(groupTransferComparison.taxiGroupEur * rates.EUR)} (~{groupTransferComparison.taxiGroupEur} € — kişi başı{" "}
                  {groupTransferComparison.taxiPerPersonEur} €)
                </b>{" "}
                tutmaktadır.{" "}
                {groupTransferComparison.taxiIsCompetitive
                  ? "Grup olduğunuz için doğrudan Taksi/Bolt tercih etmek hem çok daha konforlu hem de kişi başı neredeyse aynı fiyata gelir!"
                  : "Bütçe tasarrufu için belediye otobüsü veya ekspres hattı tercih etmek grupça ciddi avantaj sağlar."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODÜL 3: "BURADAN NE ALINIR?" HEDİYELİK REHBERİ & CANLI TAX-FREE HESAPLAYICISI */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
              <ShoppingBag className="h-4 w-4" /> 3 Bütçeli Hediyelik Rehberi & Vergi İadesi (Tax-Free)
            </span>
            <h2 className="mt-1 text-xl font-extrabold">
              🛍️ {city.name} Seyahatinden Ne Alınır? & Canlı Tax-Free Hesaplayıcısı
            </h2>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "Tümü" },
              { id: "tasarruflu", label: "💚 Tasarruflu (Market)" },
              { id: "dengeli", label: "💙 Dengeli (Zanaat)" },
              { id: "konforlu", label: "💜 Konforlu (Gurme/Moda)" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSouvenirTier(f.id as "all" | Comfort)}
                className={`chip text-xs ${souvenirTier === f.id ? "chip-on font-bold" : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hediyelik Eşya Kartları */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSouvenirs.map((item) => {
            const itemTry = Math.round(item.avgEur * rates.EUR);
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-black/10 bg-black/[0.015] p-4 dark:border-white/10 dark:bg-white/[0.02]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      {item.category}
                    </span>
                    <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
                      {fmtCur(itemTry, cur, rates)} (~{item.avgEur} €)
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-extrabold">{item.name}</h3>
                  <p className="mt-1 text-xs text-black/65 dark:text-white/65 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="mt-3 border-t border-black/5 pt-2 text-[11px] font-semibold text-black/55 dark:border-white/5 dark:text-white/55">
                  📍 <b>Nereden Alınır:</b> {item.whereToBuy}
                </div>
              </div>
            );
          })}
        </div>

        {/* Canlı Tax-Free (KDV İadesi) Hesaplayıcı */}
        <div className="mt-6 rounded-2xl border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500/[0.05] via-brand-500/[0.04] to-emerald-500/[0.05] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400">
                <Sparkles className="h-4 w-4" /> {shopping.taxFree.verified === false ? "Vergi İadesi Koşulları" : "Tax-Free (Havalimanı Vergi İadesi) Hesaplayıcısı"}
              </div>
              <h3 className="mt-1 text-base font-extrabold">
                🛂 {city.country} Alışverişinizden Havalimanında Kaç Euro / TL Geri Alacaksınız?
              </h3>
              <p className="mt-1 text-xs text-black/65 dark:text-white/65">
                {shopping.taxFree.verified === false ? shopping.taxFree.customsTip : <><b>Resmi Alt Limit:</b> {shopping.taxFree.minSpendLocalLabel} (~{shopping.taxFree.minSpendEur} €) · <b>KDV Oranı:</b> %{shopping.taxFree.vatRatePercent} · <b>Net İade:</b> ~%{shopping.taxFree.netRefundPercent}</>}
              </p>
            </div>

            {/* Hızlı Tutar Seçici Butonlar */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[50, 80, 150, 300, 500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSpendEurInput(String(val))}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    Number(spendEurInput) === val
                      ? "bg-brand-600 text-white shadow"
                      : "bg-white/80 hover:bg-white dark:bg-white/10"
                  }`}
                >
                  {val} €
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-xl bg-white p-3.5 shadow-sm dark:bg-white/5">
              <label className="text-xs font-bold text-black/60 dark:text-white/60">
                Mağazada Yaptığınız / Planladığınız Alışveriş Tutarı (€ EUR)
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="number"
                  value={spendEurInput}
                  onChange={(e) => setSpendEurInput(e.target.value)}
                  className="input-field w-full text-lg font-black"
                  min={0}
                />
                <span className="shrink-0 rounded-xl bg-black/5 px-3 py-2 text-xs font-bold dark:bg-white/10">
                  ≈ {tl(spendTry)}
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl bg-white p-3.5 shadow-sm dark:bg-white/5">
              {qualifiesTaxFree ? (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
                      ✅ Tax-Free İadesine Hak Kazanıyor!
                    </span>
                    <span className="text-xs font-bold opacity-60">Net ~%{shopping.taxFree.netRefundPercent} İade</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xs font-bold">Havalimanında Geri Alacağınız Nakit:</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      +{tl(refundTry)} (~{refundEur} €)
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-700 dark:text-amber-300">
                    {shopping.taxFree.verified === false ? "Vergi iadesi oranı / uygunluğu doğrulanmadı" : `⚠️ Alt Limitin Altında (${shopping.taxFree.minSpendEur} € Gerekli)`}
                  </span>
                  <p className="mt-1.5 text-xs text-black/70 dark:text-white/70">
                    {shopping.taxFree.verified === false ? "Alışveriş tutarınızı çevirebilirsiniz; güncel resmî koşullar olmadan iade tutarı hesaplanmaz." : <>Vergi iadesi alabilmek için aynı mağazadan aynı gün içinde{" "}
                    <b>
                      {Math.max(0, Math.ceil(shopping.taxFree.minSpendEur - spendEur))} € (
                      {tl(Math.max(0, (shopping.taxFree.minSpendEur - spendEur) * rates.EUR))})
                    </b>{" "}
                    daha alışveriş yapmanız gerekir. Mağazanın belge ve uygunluk koşullarını ayrıca kontrol edin.</>}
                  </p>
                </div>
              )}

              <div className="mt-2 border-t border-black/5 pt-2 text-[11px] text-black/60 dark:border-white/5 dark:text-white/60">
                🛂 <b>Gümrük İpucu:</b> {shopping.taxFree.customsTip}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODÜL 4: INSTAGRAM / EN İYİ FOTOĞRAF NOKTALARI & ALTIN SAAT (GOLDEN HOUR) REHBERİ */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <Camera className="h-4 w-4" /> Instagram & Golden Hour Çekim Rehberi
            </span>
            <h2 className="mt-1 text-xl font-extrabold">
              📸 {city.name} En İyi Fotoğraf Noktaları & Doğru Işık Saatleri
            </h2>
            <p className="mt-0.5 text-xs text-black/60 dark:text-white/60">
              Turist kalabalığına yakalanmadan en etkileyici kareleri çekebileceğiniz noktalar ve kadraj tüyoları
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {photoSpots.map((spot) => {
            const costTry = Math.round(spot.costEur * rates.EUR);
            const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${spot.name} ${city.name}`
            )}`;

            return (
              <div
                key={spot.id}
                className="flex flex-col justify-between rounded-2xl border border-black/10 bg-black/[0.015] p-4 transition hover:border-amber-500/50 dark:border-white/10 dark:bg-white/[0.02]"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800 dark:text-amber-300">
                      {spot.bestTime}
                    </span>
                    <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      {spot.costEur === 0 ? "Ücretsiz Giriş" : `${fmtCur(costTry, cur, rates)} (~${spot.costEur} €)`}
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    {spot.vibe}
                  </div>
                  <h3 className="mt-0.5 text-base font-extrabold">{spot.name}</h3>

                  <p className="mt-2 rounded-xl bg-white p-3 text-xs text-black/75 shadow-sm dark:bg-white/5 dark:text-white/75 leading-relaxed">
                    📷 <b>Kadraj & Açı Tüyosu:</b> {spot.angleTip}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3 dark:border-white/5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onFocusMap([spot.lat, spot.lon])}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-500/10 px-2.5 py-1 text-[11px] font-bold text-brand-600 hover:bg-brand-500/20 dark:text-brand-300"
                    >
                      <MapPin className="h-3 w-3" /> Haritada Gör
                    </button>
                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                    >
                      <ExternalLink className="h-3 w-3" /> Konum
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddPhotoSpotToDay(spot)}
                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm hover:opacity-95"
                  >
                    <Plus className="h-3 w-3" /> Gün {activeDay} Rotasına Ekle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TAM EKRAN "GARSONA / GÖREVLİYE GÖSTER" KART MODALI */}
      {fullscreenPhrase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          onClick={() => setFullscreenPhrase(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl bg-white p-6 text-center text-black shadow-2xl sm:p-10 dark:bg-zinc-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setFullscreenPhrase(null)}
              className="absolute right-4 top-4 rounded-full bg-black/10 p-2 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto mb-3 text-5xl">{fullscreenPhrase.icon}</div>
            <div className="inline-block rounded-full bg-brand-500/15 px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-300">
              📱 Lütfen Bu Ekranı Garsona / Görevliye Gösterin ({phrasebook.languageName})
            </div>

            {fullscreenPhrase.waiterNote && (
              <div className="mt-4 rounded-2xl bg-rose-500 px-4 py-2 text-sm font-black uppercase tracking-wide text-white">
                ⚠️ {fullscreenPhrase.waiterNote}
              </div>
            )}

            <div className="mt-6 rounded-3xl border-2 border-brand-500/40 bg-brand-500/[0.05] p-6 sm:p-8">
              <p translate="no" className="text-2xl font-black leading-snug sm:text-4xl">
                {fullscreenPhrase.local}
              </p>
            </div>

            <div className="mt-4 text-base font-bold text-brand-600 dark:text-brand-400">
              🗣️ Okunuşu: &ldquo;<span translate="no">{fullscreenPhrase.phonetic}</span>&rdquo;
            </div>

            <div translate="no" className="mt-3 text-sm opacity-75">
              🇬🇧 {fullscreenPhrase.en}
            </div>
            <div className="mt-1 text-xs opacity-60">
              {currentMeta.flag} {fullscreenPhrase.tr}
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => speakPhrase(fullscreenPhrase)}
                className="btn-primary rounded-2xl px-6 py-3 text-sm font-extrabold"
              >
                <Volume2 className="h-5 w-5" /> Sesli Oku ({phrasebook.languageName})
              </button>
              <button
                type="button"
                onClick={() => setFullscreenPhrase(null)}
                className="rounded-2xl bg-black/10 px-6 py-3 text-sm font-bold hover:bg-black/15 dark:bg-white/10"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div></Localize>
  );
}
