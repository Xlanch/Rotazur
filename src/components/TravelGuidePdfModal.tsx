"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";
import { useLanguage } from "./LanguageContext";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Printer,
  X,
  FileText,
  Plane,
  Building2,
  Calendar,
  Utensils,
  Check,
  Copy,
  PhoneCall,
  DollarSign,
} from "lucide-react";
import type {
  Comfort,
  FlightOption,
  HotelOption,
  PlanActivity,
  PlanDay,
  PlanResponse,
  SearchInput,
} from "@/lib/types";
import { CurrencyCode, fmtCur, fmtMoney, fmtDate, fmtDuration } from "@/lib/format";
import { hotelCoordinates, hotelTotal } from "@/lib/hotel-data";
import { buildTravelGuideText, guideActivityTime } from "@/lib/travel-guide";

interface TravelGuidePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PlanResponse;
  input: SearchInput;
  budgetTier: Comfort;
  totalTry: number;
  selectedFlight?: FlightOption;
  selectedHotel?: HotelOption;
  cur?: CurrencyCode;
  rates?: Partial<Record<CurrencyCode, number>>;
}

export function TravelGuidePdfModal({
  isOpen,
  onClose,
  data,
  input,
  budgetTier,
  totalTry,
  selectedFlight,
  selectedHotel,
  cur = "TRY",
  rates: suppliedRates,
}: TravelGuidePdfModalProps) {
  const { translate, locale: guideLocale } = useLanguage();
  const { fmtCur, fmtDate, fmtDuration, fmtMoney, locale } = useLocaleFormat();
  const [includeFlightHotel, setIncludeFlightHotel] = useState(true);
  const [includeFood, setIncludeFood] = useState(true);
  const [includeTips, setIncludeTips] = useState(true);
  const [includeBudget, setIncludeBudget] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  if (!isOpen) return null;

  const city = data.city;
  const rates = suppliedRates || data.rates;
  const flight = selectedFlight || data.flights[0];
  const hotel = selectedHotel || data.hotels[0];
  const nights = data.nights || Math.max(1, data.days.length - 1);
  const totalHotelTry = hotelTotal(hotel, nights);

  // Yazdırma işlemi
  const handlePrint = () => {
    document.body.classList.add("printing-rotazur-guide");
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove("printing-rotazur-guide");
      }, 500);
    }, 150);
  };

  // WhatsApp veya Notlar İçin Metin Olarak Kopyalama
  const handleCopyText = async () => {
    setCopyError("");
    setCopied(false);
    try {
      await navigator.clipboard.writeText(buildTravelGuideText({ data, input, budgetTier, totalTry, selectedFlight, selectedHotel,
        cur, rates, includeFlightHotel, includeFood, includeTips, includeBudget, locale: guideLocale, translate }));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError("Metin kopyalanamadı. Tarayıcınızın pano iznini kontrol edin.");
    }
  };

  return (
    <Localize><AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Arka Plan Karartması */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Gövdesi */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0c0d19] overflow-hidden"
        >
          {/* Üst Bar / Kontroller */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02] sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-black dark:text-white sm:text-lg">
                  Resmi Seyahat Rehberi (PDF & Yazdır)
                </h3>
                <p className="text-xs text-black/55 dark:text-white/55">
                  Tüm günleri, uçuşu, oteli ve önerileri tek bir dergi çıktısında toplayın.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="btn-ghost flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-xs font-bold text-black/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                title="WhatsApp veya Notlar için metni kopyala"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? "Kopyalandı!" : "Metin Kopyala"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-lg shadow-brand-500/25"
              >
                <Printer className="h-4 w-4" />
                <span>PDF Olarak Kaydet / Yazdır</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Rehberi kapat"
                className="grid h-8 w-8 place-items-center rounded-full text-black/40 hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {copyError && <p role="alert" className="px-6 py-2 text-xs text-rose-600 dark:text-rose-400">{copyError}</p>}

          {/* Filtreleme / Dahil Edilecekler Çubuğu */}
          <div className="flex flex-wrap items-center gap-4 border-b border-black/5 bg-black/[0.01] px-6 py-2.5 text-xs font-semibold text-black/70 dark:border-white/5 dark:bg-white/[0.01] dark:text-white/70">
            <span className="text-black/45 dark:text-white/45">Çıktıya Ekle:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeFlightHotel}
                onChange={(e) => setIncludeFlightHotel(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span>Uçuş & Otel</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeFood}
                onChange={(e) => setIncludeFood(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span>Restoranlar</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeBudget}
                onChange={(e) => setIncludeBudget(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span>Bütçe Dağılımı</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTips}
                onChange={(e) => setIncludeTips(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span>Acil Numaralar & Vize</span>
            </label>
          </div>

          {/* DOKÜMAN ÖNİZLEME ALANI (A4 SAYFA FORMATINDA) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-100 dark:bg-black/50 scroll-thin">
            <div
              id="rotazur-print-guide"
              className="mx-auto max-w-[800px] bg-white text-slate-900 shadow-xl rounded-2xl p-6 sm:p-10 border border-black/5 leading-relaxed font-sans"
            >
              {/* Doküman Başlığı & Logo */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5">
                <div className="flex items-center gap-3">
                  <img src="/logo.png" alt="Rotazur" className="h-12 w-12 object-contain" />
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                      ROTAZUR <span className="text-brand-600">TRAVEL</span>
                    </h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Official Travel Itinerary & Pocket Guide
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400">PLAN NO</div>
                  <div className="font-mono text-sm font-extrabold text-slate-800">
                    RZ-{city.iata}-{input.startDate.replace(/-/g, "").slice(2)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date().toLocaleDateString(locale)} Tarihinde Üretildi
                  </div>
                </div>
              </div>

              {/* Şehir & Gezi Özeti Başlığı */}
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4 bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-brand-600">
                    {city.country} {city.flag}
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mt-0.5">
                    {city.name} Gezi Rehberi
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 max-w-md">
                    {city.tagline}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-500 font-medium">Tahmini Toplam Bütçe</div>
                  <div className="text-2xl font-black text-slate-900">
                    {fmtCur(totalTry, cur, rates)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {input.travelers} Kişi · {data.days.length} Gün · {budgetTier.toUpperCase()} Mod
                  </div>
                </div>
              </div>

              {/* Hızlı Bilgiler Çubuğu */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">TARİHLER</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {fmtDate(input.startDate)} - {fmtDate(input.endDate)}
                  </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">ROTA</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {input.origin} ➔ {city.iata}
                  </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">VİZE DURUMU</div>
                  <div className="font-bold text-slate-800 mt-0.5">{city.visa}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">PARA BİRİMİ</div>
                  <div className="font-bold text-slate-800 mt-0.5">{city.currencyCode || "EUR"}</div>
                </div>
              </div>

              {/* UÇUŞ VE OTEL BÖLÜMÜ */}
              {includeFlightHotel && (
                <div className="mt-6 border-t border-slate-200 pt-5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Plane className="h-3.5 w-3.5 text-brand-600" /> ULAŞIM & KONAKLAMA BİLGİLERİ
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {flight && (
                      <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <Plane className="h-4 w-4 text-sky-600" /> {flight.airline}
                          </span>
                          <span className="text-brand-600">
                            {fmtCur(flight.priceTry * input.travelers, cur, rates)}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-600">
                          {input.origin} ➔ {city.iata} · Gidiş-Dönüş Uçuş
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400">
                          {flight.outbound.stopsDetail || (flight.outbound.stops === 0
                            ? "Aktarmasız Direkt Uçuş"
                            : `${flight.outbound.stops} Aktarma`)}{" "}
                          · Süre: {fmtDuration(flight.outbound.durationMin)}
                        </div>
                      </div>
                    )}

                    {hotel && (
                      <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-amber-600" /> {hotel.name}
                          </span>
                          <span className="text-amber-600">{"★".repeat(hotel.stars)}</span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-600">
                          {hotel.neighborhood || "Bölge sağlayıcıda doğrulanmalı"} · {hotelCoordinates(hotel) ? `${hotel.distanceKm} km merkeze uzaklık` : "Otel konumu doğrulanmadı"}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400">
                          Ortalama gecelik: {hotel.bookingQuote ? fmtMoney(hotel.pricePerNightTry, cur, rates) : fmtCur(hotel.pricePerNightTry, cur, rates)} · {hotel.bookingQuote ? "Bilinen toplam" : "Tahmini toplam"}: {hotel.bookingQuote ? fmtMoney(totalHotelTry, cur, rates) : fmtCur(totalHotelTry, cur, rates)}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400">{hotel.bookingQuote ? `Booking arama kaydı · Kontrol: ${hotel.bookingQuote.checkedAt}. Kesin fiyat ve aynı oda koşulları Booking’de doğrulanır; bu teklif sabitlenmemiştir.` : "Bütçe tahmini; fiyat ve müsaitlik sağlayıcıda doğrulanmalıdır."}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* GÜNLÜK ROTA ÇİZELGESİ (TIMELINE) */}
              <div className="mt-7 border-t border-slate-200 pt-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-brand-600" /> GÜN GÜN DETAYLI SEYAHAT PROGRAMI
                </h3>

                <div className="space-y-6">
                  {data.days.map((d: PlanDay) => (
                    <div
                      key={d.day}
                      className="rounded-xl border border-slate-200 overflow-hidden break-inside-avoid"
                    >
                      <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                        <div className="font-extrabold text-sm tracking-wide">
                          GÜN {d.day} · {fmtDate(d.date)}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {d.activities.length} Planlanan Aktivite
                        </div>
                      </div>

                      <div className="p-4 space-y-3 bg-white">
                        {d.activities.map((item: PlanActivity, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 border-b border-slate-100 last:border-none pb-2.5 last:pb-0"
                          >
                            <div className="shrink-0 w-14 text-[11px] font-bold text-brand-600 pt-0.5">
                              {guideActivityTime(item.time)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline justify-between">
                                <span className="font-bold text-xs text-slate-900">
                                  {item.title}
                                </span>
                                {item.costTry > 0 ? (
                                  <span className="text-[11px] font-semibold text-emerald-600">
                                    {fmtCur(item.costTry, cur, rates)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold uppercase text-slate-400">
                                    Ücretsiz
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RESTORANLAR VE GASTRONOMİ REHBERİ */}
              {includeFood && data.restaurants && data.restaurants.length > 0 && (
                <div className="mt-7 border-t border-slate-200 pt-5 break-inside-avoid">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Utensils className="h-3.5 w-3.5 text-brand-600" /> TAVSİYE EDİLEN RESTORANLAR & LEZZETLER
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.restaurants.slice(0, 4).map((r, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span>{r.name}</span>
                          <span className="text-amber-600 text-[11px]">
                            {fmtCur(r.avgPricePerPersonTry, cur, rates)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          {r.cuisine} · {r.neighborhood}
                        </div>
                        {r.signatureDish && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            İmza Lezzet: {r.signatureDish}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BÜTÇE DAĞILIMI ÖZETİ */}
              {includeBudget && data.budget && (
                <div className="mt-7 border-t border-slate-200 pt-5 break-inside-avoid">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-brand-600" /> TAHMİNİ BÜTÇE DAĞILIMI
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[10px] text-slate-400 font-bold block">UÇUŞ</span>
                      <span className="font-extrabold text-slate-900">
                        {fmtCur(data.budget.flight, cur, rates)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[10px] text-slate-400 font-bold block">OTEL</span>
                      <span className="font-extrabold text-slate-900">
                        {fmtCur(data.budget.hotel, cur, rates)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[10px] text-slate-400 font-bold block">YEMEK & İÇMEK</span>
                      <span className="font-extrabold text-slate-900">
                        {fmtCur(data.budget.food, cur, rates)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[10px] text-slate-400 font-bold block">ULAŞIM & MÜZELER</span>
                      <span className="font-extrabold text-slate-900">
                        {fmtCur((data.budget.transport || 0) + (data.budget.activities || 0), cur, rates)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ACİL DURUM VE İPUÇLARI */}
              {includeTips && (
                <div className="mt-7 border-t border-slate-200 pt-5 break-inside-avoid">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <PhoneCall className="h-3.5 w-3.5 text-brand-600" /> ACİL DURUM VE PRATİK İPUÇLARI
                  </h3>
                  <div className="rounded-xl border border-slate-200 bg-amber-50/50 p-3.5 text-xs text-slate-700 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">🚨 Acil Durum / Ambulans / Polis:</span>
                      <span className="font-mono font-bold text-red-600">
                        {city.emergencyPhone || "112 (Avrupa Genel Acil Çağrı)"}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">💡 Tavsiye:</span> Pasaportunuzun ve sigortanızın dijital bir kopyasını telefonunuzda ve e-postanızda offline saklayın.
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">🌐 Web:</span> Planınıza online erişmek ve canlı fiyatları kontrol etmek için <b>rotazur.com</b> adresini ziyaret edebilirsiniz.
                    </div>
                  </div>
                </div>
              )}

              {/* Doküman Alt İmzası (Footer) */}
              <p className="mt-6 text-[10px] text-slate-500">
                <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline">Rates By Exchange Rate API</a>
                {" · "}<a href="https://frankfurter.dev/" target="_blank" rel="noopener noreferrer" className="underline">Frankfurter</a>
              </p>
              <div className="mt-10 border-t-2 border-slate-900 pt-4 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Rotazur" className="h-5 w-5 object-contain" />
                  <span className="font-bold text-slate-800">Rotazur</span>
                  <span>· Akıllı Seyahat & Rota Asistanı (rotazur.com)</span>
                </div>
                <div>İyi yolculuklar dileriz! ✈️</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence></Localize>
  );
}
