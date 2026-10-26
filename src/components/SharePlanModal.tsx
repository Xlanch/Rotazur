"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";
import { useLanguage } from "./LanguageContext";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  HelpCircle,
  Mail,
  MessageCircle,
  Printer,
  Send,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { fmtDate, tl } from "@/lib/format";
import { toQuery } from "@/lib/search";
import type { Comfort, FlightOption, HotelOption, PlanResponse, SearchInput } from "@/lib/types";
import { copyText } from "@/lib/clipboard";

interface SharePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PlanResponse;
  input: SearchInput;
  budgetTier: Comfort;
  totalTry: number;
  selectedFlight: FlightOption | null;
  selectedHotel: HotelOption | null;
  onOpenPdfGuide?: () => void;
}

export function SharePlanModal({
  isOpen,
  onClose,
  data,
  input,
  budgetTier,
  totalTry,
  selectedFlight,
  selectedHotel,
  onOpenPdfGuide,
}: SharePlanModalProps) {
  const { translate } = useLanguage();
  const { fmtDate, tl } = useLocaleFormat();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sentResult, setSentResult] = useState<{
    ok: boolean;
    realEmailSent: boolean;
    simulated?: boolean;
    html?: string;
    message?: string;
  } | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [showAppPasswordGuide, setShowAppPasswordGuide] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copyRevision = useRef(0);
  useEffect(() => {
    copyRevision.current++;
    setCopiedLink(false); setCopiedWa(false); setCopyError(null);
    return () => { copyRevision.current++; };
  }, [isOpen, input, budgetTier, selectedFlight, selectedHotel]);

  const copySummary = async (text: string, target: "link" | "summary") => {
    const revision = ++copyRevision.current;
    setCopyError(null); setCopiedLink(false); setCopiedWa(false);
    try {
      await copyText(target === "link" ? text : translate(text));
      if (revision !== copyRevision.current) return;
      const setCopied = target === "link" ? setCopiedLink : setCopiedWa;
      setCopied(true);
      setTimeout(() => { if (revision === copyRevision.current) setCopied(false); }, 2500);
    } catch (err) { if (revision === copyRevision.current) setCopyError((err as Error).message); }
  };

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  if (!isOpen) return null;

  const planUrl = typeof window !== "undefined" ? `${window.location.origin}/plan?${toQuery({ ...input, comfort: budgetTier })}` : "";
  const datesText = `${fmtDate(input.startDate)} – ${fmtDate(input.endDate)} (${data.nights} Gece)`;
  const flightSummary = selectedFlight
    ? `${selectedFlight.airline} (${tl(selectedFlight.priceTry)} / kişi)`
    : "Standart Uçuş";
  const hotelSummary = selectedHotel
    ? `${selectedHotel.name} (${selectedHotel.stars}★ · Gecelik ${tl(selectedHotel.pricePerNightTry)})`
    : "Merkezi Otel";

  const whatsappText = [
    `${data.city.flag} *${data.city.name} (${data.city.country}) Seyahat Planımız*`,
    `🗓️ Tarih: ${datesText}`,
    `👥 Yolcu: ${input.travelers} Kişi (${budgetTier.toUpperCase()} Bütçe Modu)`,
    `💰 Toplam Tahmini Bütçe: *${tl(totalTry)}* (Kişi başı: ${tl(Math.round(totalTry / input.travelers))})`,
    `✈️ Uçuş: ${flightSummary}`,
    `🏨 Otel: ${hotelSummary}`,
    `🍽️ Önerilen Mekanlar: ${(data.restaurants || []).slice(0, 3).map((r) => `${r.name} (~${r.avgPricePerPersonEur}€)`).join(", ")}`,
    ``,
    `🔗 Canlı Haritalı Rota: ${planUrl}`,
  ].join("\n");

  const buildPayload = (targetEmail: string) => ({
    toEmail: targetEmail.trim(),
    cityName: data.city.name,
    country: data.city.country,
    flag: data.city.flag,
    datesText,
    travelers: input.travelers,
    budgetTier,
    totalCostText: `${tl(totalTry)} (Kişi başı: ${tl(Math.round(totalTry / input.travelers))})`,
    flightSummary,
    hotelSummary,
    restaurantsSummary: (data.restaurants || []).slice(0, 4).map(
      (r) => `<b>${r.name}</b> (${r.cuisine} · ${r.neighborhood}) — Kişi başı ~${r.avgPricePerPersonEur} € (${tl(r.avgPricePerPersonTry)}) · <i>${r.signatureDish}</i>`
    ),
    daysSummary: data.days.map((d) => ({
      dayTitle: `Gün ${d.day} (${fmtDate(d.date)}) — ${d.title}`,
      items: d.activities.map((a) => `<b>${a.time}</b> · ${a.title} (${a.costTry === 0 ? "Ücretsiz" : tl(a.costTry)})`),
    })),
    planUrl,
  });

  const openHtmlInTab = (htmlContent: string) => {
    const win = window.open("", "_blank");
    if (win) {
      win.document.open();
      win.document.write(htmlContent);
      win.document.close();
    }
  };

  const handlePreviewOnly = async () => {
    setPreviewing(true);
    setSendErr(null);
    try {
      const payload = buildPayload(email || "misafir@rotaplanlayicisi.com");
      const res = await fetch("/api/plan/preview-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Önizleme oluşturulamadı.");
      const html = await res.text();
      openHtmlInTab(html);
    } catch (err) {
      setSendErr((err as Error).message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendErr(null);
    setSentResult(null);

    try {
      const payload = buildPayload(email);
      const res = await fetch("/api/plan/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "E-posta gönderilemedi");
      setSentResult(json);
    } catch (err) {
      setSendErr((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Localize><AnimatePresence>
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="card relative max-h-[90vh] w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-[#11121c] sm:p-8"
        >
          <button
            onClick={onClose}
            aria-label="Paylaşım penceresini kapat"
            className="btn-ghost absolute right-4 top-4 !p-2 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-500 text-white shadow-lg">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              <h2 id="share-title" className="text-xl font-extrabold">Cep Rehberi Gönder & Paylaş</h2>
              <p className="text-xs text-black/55 dark:text-white/55">
                {data.city.name} rotanızı Gmail adresinize gönderin veya WhatsApp grubunda paylaşın
              </p>
            </div>
          </div>

          {/* 1. GMAİL'E TAM PLAN GÖNDER */}
          <form onSubmit={handleSendEmail} className="mt-6 rounded-2xl border border-brand-500/30 bg-brand-500/[0.04] p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-300">
              <Mail className="h-4 w-4" /> Gmail / E-Posta Adresinize Cep Rehberi Gönderin
            </div>
            <p className="text-xs text-black/65 dark:text-white/65">
              Seçili uçuş, otel, restoran önerileri ve gün gün gezi programı şık bir özet tablo halinde e-postanıza gelir.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                placeholder="ornek@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field flex-1 text-sm"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePreviewOnly}
                  disabled={previewing || sending}
                  className="btn-ghost shrink-0 justify-center text-xs px-3.5 py-2.5 border border-black/10 dark:border-white/10"
                  title="E-posta tasarımını yeni sekmede önizle"
                >
                  <Eye className="h-4 w-4" />
                  <span>{previewing ? "Açılıyor..." : "Önizle"}</span>
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="btn-primary shrink-0 justify-center text-xs px-4 py-2.5"
                >
                  <Send className="h-4 w-4" />
                  <span>{sending ? "Gönderiliyor..." : "E-Postama Gönder"}</span>
                </button>
              </div>
            </div>

            {/* GERÇEK GÖNDERİM BAŞARILI */}
            {sentResult?.realEmailSent && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>Harika! {data.city.name} cep rehberiniz <b>{email}</b> adresine başarıyla gönderildi!</span>
                </div>
                {sentResult.html && (
                  <button
                    type="button"
                    onClick={() => openHtmlInTab(sentResult.html!)}
                    className="ml-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600/20 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-600/30 shrink-0"
                  >
                    <Eye className="h-3 w-3" /> Önizle
                  </button>
                )}
              </div>
            )}

            {/* SİMÜLASYON MODU / ÖNİZLEME */}
            {sentResult?.simulated && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-800 dark:text-sky-300">
                  <Sparkles className="h-4 w-4 shrink-0 text-sky-500" />
                  <span>E-Posta Şablonunuz Hazırlandı! (Önizleme Modu)</span>
                </div>
                <p className="text-[12px] text-black/75 dark:text-white/75 leading-relaxed">
                  E-posta sunucusu (.env.local) henüz yapılandırılmadığı için e-posta sanal modda başarıyla hazırlandı. Aşağıdaki butonla oluşturulan e-postayı tarayıcınızda açıp inceleyebilirsiniz.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {sentResult.html && (
                    <button
                      type="button"
                      onClick={() => openHtmlInTab(sentResult.html!)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-extrabold text-white shadow hover:bg-sky-700 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> E-Postayı Yeni Sekmede Gör
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* HATA BİLDİRİMİ */}
            {sendErr && (
              <div className="rounded-xl bg-rose-500/15 p-3 text-xs font-bold text-rose-600 dark:text-rose-300 space-y-1">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 shrink-0" />
                  <span>{sendErr}</span>
                </div>
              </div>
            )}
          </form>

          {/* 2. WHATSAPP GRUBUNDA PAYLAŞ */}
          {copyError && <p role="alert" className="mt-4 text-xs text-rose-600 dark:text-rose-400">{copyError}</p>}
          <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                <MessageCircle className="h-4 w-4" /> WhatsApp Arkadaş / Aile Özeti
              </span>
              <button
                type="button"
                onClick={() => copySummary(whatsappText, "summary")}
                className="text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {copiedWa ? "Metin Kopyalandı ✓" : "Metni Kopyala"}
              </button>
            </div>

            <pre className="whitespace-pre-wrap rounded-xl bg-black/[0.04] p-3 text-[11px] font-sans text-black/80 dark:bg-white/[0.04] dark:text-white/80">
              {whatsappText}
            </pre>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-white shadow hover:bg-emerald-600 transition"
            >
              <ExternalLink className="h-4 w-4" /> WhatsApp Üzerinden Direkt Gönder
            </a>
          </div>

          {/* 3. LİNK KOPYALA & YAZDIR */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => copySummary(planUrl, "link")}
              className="btn-ghost justify-center rounded-xl border border-black/10 py-2.5 text-xs font-bold dark:border-white/10"
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span>{copiedLink ? "Bağlantı Kopyalandı ✓" : "Plan Linkini Kopyala"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenPdfGuide) {
                  onOpenPdfGuide();
                } else {
                  setTimeout(() => window.print(), 200);
                }
              }}
              className="btn-ghost justify-center rounded-xl border border-black/10 py-2.5 text-xs font-bold dark:border-white/10"
              title="Resmi Seyahat Rehberini PDF Olarak Kaydet veya Yazdır"
            >
              <Printer className="h-4 w-4" />
              <span>PDF Rehber / Yazdır</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence></Localize>
  );
}
