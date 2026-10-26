"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";
import { useLanguage } from "./LanguageContext";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  WifiOff,
  Check,
  Building2,
  Plane,
  PhoneCall,
  MapPin,
  Calendar,
  X,
  Copy,
} from "lucide-react";
import type { PlanResponse, SearchInput, FlightOption, HotelOption, SavedPlan } from "@/lib/types";
import { savedPlanUrl } from "@/lib/saved-plans";
import { fmtDate, timeOf } from "@/lib/format";

interface OfflinePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PlanResponse;
  input: SearchInput;
  selectedFlight?: FlightOption;
  selectedHotel?: HotelOption;
  onSave: () => Promise<SavedPlan>;
  offlineReady: boolean;
}

export function OfflinePlanModal({
  isOpen,
  onClose,
  data,
  input,
  selectedFlight,
  selectedHotel,
  onSave,
  offlineReady,
}: OfflinePlanModalProps) {
  const { translate } = useLanguage();
  const { timeOf, fmtDate } = useLocaleFormat();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const isSaved = offlineReady;

  useEffect(() => {
    if (isOpen) { setError(""); setSavedUrl(""); }
  }, [isOpen]);

  const handleSaveOffline = async () => {
    setSaving(true);
    setError("");
    try {
      setSavedUrl(savedPlanUrl(await onSave()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Çevrimdışı kayıt tamamlanamadı. Tekrar deneyin.");
    } finally { setSaving(false); }
  };

  const handleCopyEmergencyInfo = async () => {
    const flight = selectedFlight || data.flights[0];
    const hotel = selectedHotel || data.hotels[0];
    const outboundText = flight ? `🛫 GİDİŞ: ${flight.outbound.flightNumber || flight.airline} - Kalkış: ${timeOf(flight.outbound.departure)}` : "";
    const inboundText = flight?.inbound ? `🛬 DÖNÜŞ: ${flight.inbound.flightNumber || flight.airline} - Kalkış: ${timeOf(flight.inbound.departure)}` : "";

    const text = [
      `✈️ ${data.city.name.toUpperCase()} ACİL SEYAHAT KARTI (ROTAZUR)`,
      `---------------------------------`,
      `🏨 OTEL: ${hotel?.name || "Otel seçilmedi"}`,
      `📍 BÖLGE: ${hotel?.neighborhood || data.city.name + " Merkez"} (${data.city.country})`,
      `---------------------------------`,
      outboundText,
      inboundText,
      `---------------------------------`,
      `🚨 ACİL ÇAĞRI: ${data.city.emergencyPhone || "112"}`,
      `🇹🇷 TÜRKİYE KONSOLOSLUĞU: +90 312 292 29 29 (Konsolosluk Çağrı Merkezi)`,
    ].filter(Boolean).join("\n");

    try {
      await navigator.clipboard.writeText(translate(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { setError("Bilgiler kopyalanamadı. Tarayıcının pano iznini kontrol edin."); }
  };

  if (!isOpen) return null;

  const flight = selectedFlight || data.flights[0];
  const hotel = selectedHotel || data.hotels[0];

  return (
    <Localize><div className="fixed inset-0 z-[1200] grid place-items-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0d0c18] overflow-hidden"
      >
        {/* Üst Bar */}
        <div className="flex items-center justify-between border-b border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <WifiOff className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-black dark:text-white">
                  İnternetsiz Seyahat Modu
                </h3>
                {isSaved && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" /> Cihazda Kayıtlı
                  </span>
                )}
              </div>
              <p className="text-xs text-black/50 dark:text-white/50">
                Yurt dışında hattınız veya internetiniz kapalıyken bile kesintisiz erişim
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-black/40 hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Gövde */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5 text-xs sm:text-sm">
          {/* Çevrimdışı Kaydet Eylemi */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-brand-500/10 p-4 border border-brand-500/20">
            <div>
              <div className="font-bold text-brand-900 dark:text-brand-200">
                {isSaved ? "✅ Çevrimdışı erişim hazır" : "📱 Planı Çevrimdışı Hafızaya Kilitle"}
              </div>
              <div className="text-[11px] text-brand-700/80 dark:text-brand-300/80">
                Hazırlık tamamlandığında planınızı Rotalarım bölümünden internetsiz açabilirsiniz. Değişikliklerden sonra kaydı güncelleyin.
              </div>
            </div>

            <button
              onClick={handleSaveOffline}
              disabled={saving}
              className="btn-primary !py-2 !px-4 text-xs font-bold shrink-0 whitespace-nowrap"
            >
              {saving ? "Hazırlanıyor..." : isSaved ? "Hafızayı Güncelle" : "Çevrimdışı Sakla"}
            </button>
          </div>

          {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          {savedUrl && <a className="text-xs font-bold text-brand-600 underline dark:text-brand-400" href={savedUrl}>Kayıtlı planı aç</a>}
          <p className="text-[11px] text-black/50 dark:text-white/50">Günlük rota, seçili uçuş ve otel, bütçe ve kişisel duraklar bu tarayıcıda saklanır. Yeni aramalar, canlı veriler, harita zemini ve rezervasyonlar internet gerektirir. Tarayıcı verilerini silmek kayıtları da siler.</p>

          {/* 1. Taksi & Otel Kartı (Büyük Yerel Adres) */}
          <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold uppercase tracking-wider text-[11px] text-black/50 dark:text-white/50 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-pink-500" />
                Konaklama & Taksi Kartı
              </span>
              <span className="text-[10px] text-black/40 dark:text-white/40">Taksiye / polise gösterin</span>
            </div>
            <div className="font-extrabold text-base text-black dark:text-white">{hotel?.name || "Otel seçilmedi"}</div>
            <div className="mt-1 text-xs text-black/70 dark:text-white/70 flex items-start gap-1">
              <MapPin className="h-3.5 w-3.5 text-brand-500 shrink-0 mt-0.5" />
              <span>{hotel?.neighborhood ? `${hotel.neighborhood}, ${data.city.name} (${hotel.distanceKm} km merkeze)` : `${data.city.name} Şehir Merkezi (${data.city.country})`}</span>
            </div>
          </div>

          {/* 2. Uçuş Bilgileri */}
          <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02]">
            <span className="font-bold uppercase tracking-wider text-[11px] text-black/50 dark:text-white/50 flex items-center gap-1.5 mb-2">
              <Plane className="h-3.5 w-3.5 text-sky-500" />
              Gidiş - Dönüş Uçuş Özeti
            </span>
            {flight ? <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="font-bold text-sky-600 dark:text-sky-400">Gidiş: {flight.airline}</div>
                <div className="mt-1">Sefer: <b>{flight.outbound.flightNumber || (flight.airline + " Uçuşu")}</b></div>
                <div>Tarih: {fmtDate(input.startDate)} · Saat: <b>{timeOf(flight.outbound.departure)}</b></div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div className="font-bold text-sky-600 dark:text-sky-400">Dönüş: {flight.airline}</div>
                <div className="mt-1">Sefer: <b>{flight.inbound?.flightNumber || (flight.airline + " Dönüşü")}</b></div>
                <div>Tarih: {fmtDate(input.endDate)} · Saat: <b>{flight.inbound ? timeOf(flight.inbound.departure) : "Dönüş Planı"}</b></div>
              </div>
            </div> : <p className="text-xs">Uçuş seçilmedi.</p>}
          </div>

          {/* 3. Acil Numaralar & Konsolosluk */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <PhoneCall className="h-3.5 w-3.5 text-amber-600" />
                Önemli Numaralar
              </span>
              <button
                onClick={handleCopyEmergencyInfo}
                className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Kopyalandı!" : "Metin Olarak Kopyala"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-black/80 dark:text-white/80">
              <div>Yerel Acil Servis: <b>{data.city.emergencyPhone || "112"}</b></div>
              <div>TC Dışişleri Çağrı: <b>+90 312 292 29 29</b></div>
            </div>
          </div>

          {/* 4. Gün Gün Çevrimdışı Rota Başlıkları */}
          <div className="space-y-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-black/50 dark:text-white/50 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-brand-500" />
              Günlük Gezi Özeti ({data.days.length} Gün)
            </span>
            <div className="space-y-2">
              {data.days.map((day) => (
                <div
                  key={day.day}
                  className="p-3 rounded-xl border border-black/5 bg-black/[0.02] dark:border-white/5 dark:bg-white/[0.02]"
                >
                  <div className="font-bold text-xs text-brand-600 dark:text-brand-400 mb-1">
                    {day.day}. Gün · {day.title}
                  </div>
                  <div className="text-[11px] text-black/70 dark:text-white/70">
                    {day.activities.map((a) => a.title).join(" ➔ ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div></Localize>
  );
}
