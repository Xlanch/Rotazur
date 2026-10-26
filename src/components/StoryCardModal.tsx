"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";
import { useLanguage } from "./LanguageContext";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Check,
  Download,
  Image as ImageIcon,
  Palette,
  RefreshCw,
  Share2,
  Sparkles,
  Ticket,
  X,
} from "lucide-react";
import { fmtDate, tl } from "@/lib/format";
import type { FlightOption, HotelOption, PlanResponse, SearchInput } from "@/lib/types";
import { canvasPng } from "@/lib/story-export";

interface StoryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PlanResponse;
  input: SearchInput;
  totalTry: number;
  budgetTier: string;
  selectedFlight: FlightOption | null;
  selectedHotel: HotelOption | null;
}

type StoryLayout = "magazine" | "polaroid" | "boarding_pass";

export function StoryCardModal({
  isOpen,
  onClose,
  data,
  input,
  totalTry,
  budgetTier,
  selectedFlight,
  selectedHotel,
}: StoryCardModalProps) {
  const { translate, lang } = useLanguage();
  const { fmtDate, tl } = useLocaleFormat();
  const [layout, setLayout] = useState<StoryLayout>("magazine");
  const [tripQuote, setTripQuote] = useState<string>("Bavulları hazırlayın, gidiyoruz! ✈️🌍");
  const [showBudget, setShowBudget] = useState<boolean>(true);
  const [showFlightHotel, setShowFlightHotel] = useState<boolean>(true);
  const [showSpots, setShowSpots] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportRevision = useRef(0);

  // Şehir Görselini Proxy Üzerinden Önceden Yükle (CORS-Safe)
  useEffect(() => {
    if (!isOpen) return;
    exportRevision.current++;
    let active = true;
    let fallbackImg: HTMLImageElement | null = null;
    imageObjRef.current = null;
    setExportError(null);
    setCopied(false);
    setImageLoaded(false);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!active) return;
      imageObjRef.current = img;
      setImageLoaded(true);
    };

    img.onerror = () => {
      if (!active) return;
      // Fallback: Default placeholder
      fallbackImg = new Image();
      fallbackImg.crossOrigin = "anonymous";
      fallbackImg.onload = () => {
        if (!active) return;
        imageObjRef.current = fallbackImg;
        setImageLoaded(true);
      };
      // Keep the gradient card usable when both image sources are unavailable.
      fallbackImg.onerror = () => { if (active) setImageLoaded(true); };
      fallbackImg.src = "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80";
    };
    img.src = `/api/images/proxy?city=${encodeURIComponent(data.city.id)}`;
    return () => {
      active = false;
      exportRevision.current++;
      img.onload = null; img.onerror = null;
      if (fallbackImg) { fallbackImg.onload = null; fallbackImg.onerror = null; }
    };
  }, [isOpen, data.city.id]);

  // 1080x1920 Full HD Canvas Render Motoru
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const paintText = (text: string, x: number, y: number, maximumWidth?: number) => {
      const available = ctx.textAlign === "center" ? 920 : ctx.textAlign === "right" ? x - 60 : 1020 - x;
      ctx.direction = lang === "ar" ? "rtl" : "ltr";
      ctx.fillText(translate(text), x, y, maximumWidth ?? Math.max(100, available));
    };

    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    const img = imageObjRef.current;

    // Yardımcı: Yuvarlak Köşeli Dikdörtgen Çizici
    function drawRoundRect(
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      fill = true,
      stroke = false
    ) {
      ctx!.beginPath();
      ctx!.moveTo(x + r, y);
      ctx!.arcTo(x + w, y, x + w, y + h, r);
      ctx!.arcTo(x + w, y + h, x, y + h, r);
      ctx!.arcTo(x, y + h, x, y, r);
      ctx!.arcTo(x, y, x + w, y, r);
      ctx!.closePath();
      if (fill) ctx!.fill();
      if (stroke) ctx!.stroke();
    }

    // Yardımcı: Görseli Oranını Korumadan Kırparak Sığdırma (cover)
    function drawImageCover(
      targetImg: HTMLImageElement,
      x: number,
      y: number,
      w: number,
      h: number,
      radius = 0
    ) {
      ctx!.save();
      if (radius > 0) {
        ctx!.beginPath();
        drawRoundRect(x, y, w, h, radius, false, false);
        ctx!.clip();
      }

      const imgRatio = targetImg.naturalWidth / targetImg.naturalHeight;
      const targetRatio = w / h;
      let sX = 0,
        sY = 0,
        sW = targetImg.naturalWidth,
        sH = targetImg.naturalHeight;

      if (imgRatio > targetRatio) {
        sW = targetImg.naturalHeight * targetRatio;
        sX = (targetImg.naturalWidth - sW) / 2;
      } else {
        sH = targetImg.naturalWidth / targetRatio;
        sY = (targetImg.naturalHeight - sH) / 2;
      }

      ctx!.drawImage(targetImg, sX, sY, sW, sH, x, y, w, h);
      ctx!.restore();
    }

    // =========================================================================
    // DÜZEN 1: DERGİ KAPAĞI (VOGUE / LUXURY TRAVEL MAGAZINE)
    // =========================================================================
    if (layout === "magazine") {
      // 1. Arka Plan Şehir Fotoğrafı (Tüm ekranı kaplar)
      if (img) {
        drawImageCover(img, 0, 0, W, H);
      } else {
        // Görsel yüklenene kadar lüks koyu gradyan
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#0f172a");
        grad.addColorStop(1, "#020617");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // 2. Sinematik Karartma Gradyanları (Üst ve alt metinlerin kristal netliğinde okunması için)
      // Üst Karartma
      const topGrad = ctx.createLinearGradient(0, 0, 0, 450);
      topGrad.addColorStop(0, "rgba(0, 0, 0, 0.75)");
      topGrad.addColorStop(0.6, "rgba(0, 0, 0, 0.4)");
      topGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, 450);

      // Alt Karartma (Daha derin ve zengin)
      const botGrad = ctx.createLinearGradient(0, 600, 0, H);
      botGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
      botGrad.addColorStop(0.35, "rgba(3, 4, 10, 0.65)");
      botGrad.addColorStop(0.65, "rgba(3, 4, 10, 0.88)");
      botGrad.addColorStop(1, "rgba(3, 4, 10, 0.98)");
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, 600, W, H - 600);

      // 3. Üst Editöryal Başlık & Çerçeve
      ctx.textAlign = "left";
      ctx.font = "800 28px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      paintText("ROTAZUR TRAVEL MAGAZINE · ÖZEL GEZİ SAYISI", 80, 140);

      // Sağ Üst: Pasaport Damgası / Rozet
      ctx.save();
      ctx.translate(W - 170, 140);
      ctx.rotate(-0.08);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, Math.PI * 2);
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.font = "800 16px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      paintText("★ VERIFIED ★", 0, -25);
      ctx.font = "900 24px sans-serif";
      paintText("2026", 0, 4);
      ctx.font = "700 14px sans-serif";
      paintText("EXPLORER", 0, 28);
      ctx.restore();

      // 4. Şehir İsmi & Ülke (Devasa Tipografi)
      ctx.textAlign = "left";
      ctx.font = "900 120px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 30;
      paintText(`${data.city.name.toUpperCase()}`, 80, 310);
      ctx.shadowBlur = 0;

      ctx.font = "700 36px sans-serif";
      ctx.fillStyle = "#facc15"; // Sıcak altın sarısı
      paintText(`${data.city.flag} ${data.city.country.toUpperCase()} · ${data.city.tagline}`, 85, 375);

      // 5. Şık Cam (Frosted Glass) Slogan Kartı
      let currentY = 820;
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 2;
      drawRoundRect(80, currentY, W - 160, 110, 28, true, true);

      ctx.textAlign = "center";
      ctx.font = "italic 700 36px sans-serif";
      ctx.fillStyle = "#ffffff";
      paintText(`“${tripQuote}”`, W / 2, currentY + 68);
      currentY += 140;

      // 6. Tarih & Bütçe Modu Rozetleri (Yan Yana)
      const badgeW = (W - 190) / 2;
      // Sol Rozet: Tarihler
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      drawRoundRect(80, currentY, badgeW, 160, 28, true, true);
      ctx.textAlign = "left";
      ctx.font = "800 22px sans-serif";
      ctx.fillStyle = "#38bdf8"; // Açık mavi
      paintText("🗓️ TARİHLER & SÜRE", 115, currentY + 50);
      ctx.font = "900 36px sans-serif";
      ctx.fillStyle = "#ffffff";
      paintText(`${data.nights} Gece · ${data.nights + 1} Gün`, 115, currentY + 100);
      ctx.font = "600 24px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      paintText(`${fmtDate(input.startDate)} - ${fmtDate(input.endDate)}`, 115, currentY + 135);

      // Sağ Rozet: Yolcu & Mod
      drawRoundRect(80 + badgeW + 30, currentY, badgeW, 160, 28, true, true);
      ctx.font = "800 22px sans-serif";
      ctx.fillStyle = "#c084fc"; // Mor
      paintText("👥 YOLCU & STİL", 115 + badgeW + 30, currentY + 50);
      ctx.font = "900 36px sans-serif";
      ctx.fillStyle = "#ffffff";
      paintText(`${input.travelers} Kişi`, 115 + badgeW + 30, currentY + 100);
      ctx.font = "600 24px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      paintText(`${budgetTier.toUpperCase()} Mod`, 115 + badgeW + 30, currentY + 135);
      currentY += 190;

      // 7. Bütçe Kartı (Eğer Seçiliyse)
      if (showBudget) {
        ctx.fillStyle = "rgba(16, 185, 129, 0.15)"; // Zümrüt yeşili cam
        ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
        ctx.lineWidth = 2.5;
        drawRoundRect(80, currentY, W - 160, 180, 32, true, true);

        ctx.textAlign = "center";
        ctx.font = "800 24px sans-serif";
        ctx.fillStyle = "#34d399";
        paintText("💰 TOPLAM PLANLANAN BÜTÇE (HER ŞEY DAHİL)", W / 2, currentY + 52);

        ctx.font = "900 68px sans-serif";
        ctx.fillStyle = "#ffffff";
        paintText(tl(totalTry), W / 2, currentY + 120);

        ctx.font = "600 26px sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        paintText(`Kişi Başı ≈ ${tl(Math.round(totalTry / input.travelers))}`, W / 2, currentY + 158);
        currentY += 210;
      }

      // 8. Uçuş & Otel Bilgisi (Eğer Seçiliyse)
      if (showFlightHotel) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1.5;
        drawRoundRect(80, currentY, W - 160, 160, 28, true, true);

        ctx.textAlign = "left";
        ctx.font = "800 28px sans-serif";
        ctx.fillStyle = "#ffffff";
        paintText("✈️", 115, currentY + 58);
        ctx.font = "700 28px sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        const flightText = selectedFlight
          ? `${selectedFlight.airline} (${tl(selectedFlight.priceTry)} / kişi)`
          : "Direkt & Aktarmalı Uçuş Alternatifi";
        paintText(flightText.slice(0, 42), 165, currentY + 58);

        ctx.font = "800 28px sans-serif";
        paintText("🏨", 115, currentY + 118);
        ctx.font = "700 28px sans-serif";
        const hotelText = selectedHotel
          ? `${selectedHotel.name} (${selectedHotel.stars}★ · Gecelik ${tl(selectedHotel.pricePerNightTry)})`
          : "Merkezi Konumda Otel";
        paintText(hotelText.slice(0, 42), 165, currentY + 118);
        currentY += 190;
      }

      // 9. İkonik Rota Noktaları (Eğer Seçiliyse)
      if (showSpots) {
        const topSpots = data.days
          .flatMap((d) => d.activities)
          .filter((a) => a.kind === "gezi" || a.kind === "yemek")
          .slice(0, 3);

        if (topSpots.length > 0) {
          ctx.font = "800 24px sans-serif";
          ctx.fillStyle = "#facc15";
          paintText("✨ GÖRÜLECEK YERLER & LEZZETLER", 85, currentY + 20);
          currentY += 45;

          topSpots.forEach((spot, idx) => {
            ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.lineWidth = 1;
            drawRoundRect(80, currentY, W - 160, 75, 20, true, true);

            ctx.textAlign = "left";
            ctx.font = "800 28px sans-serif";
            ctx.fillStyle = "#ffffff";
            paintText(`${idx + 1}. ${spot.title.slice(0, 36)}`, 115, currentY + 48);

            ctx.textAlign = "right";
            ctx.font = "700 22px sans-serif";
            ctx.fillStyle = spot.kind === "yemek" ? "#fb923c" : "#38bdf8";
            paintText(spot.kind === "yemek" ? "🍽️ Gastronomi" : "🏛️ Keşif", W - 115, currentY + 48);
            currentY += 90;
          });
        }
      }

      // 10. Alt Marka İmzası
      ctx.textAlign = "center";
      ctx.font = "800 28px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      paintText("rotazur.com", W / 2, H - 75);
      ctx.font = "600 20px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      paintText("Yapay Zeka Destekli Akıllı Rota ve Canlı Bütçe Rehberi", W / 2, H - 42);
    }

    // =========================================================================
    // DÜZEN 2: RETRO POLAROID & FİLM ESTETİĞİ (SCRAPBOOK AESTHETIC)
    // =========================================================================
    else if (layout === "polaroid") {
      // 1. Zengin Koyu Arka Plan
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, "#181216");
      bgGrad.addColorStop(0.5, "#1f1828");
      bgGrad.addColorStop(1, "#0f172a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Üst Başlık
      ctx.textAlign = "center";
      ctx.font = "800 32px sans-serif";
      ctx.fillStyle = "#e2e8f0";
      paintText("📸 SEYAHAT GÜNLÜĞÜ · SOUVENIR EDITION", W / 2, 140);

      // 2. Polaroid Kartı (Ortada Devasa Fotoğraf)
      const polW = W - 160; // 920px
      const polH = 980;
      const polX = 80;
      const polY = 190;

      // Polaroid Gölgesi
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 20;

      // Polaroid Beyaz Çerçevesi
      ctx.fillStyle = "#ffffff";
      drawRoundRect(polX, polY, polW, polH, 24, true, false);
      ctx.shadowColor = "transparent";

      // Polaroid'in Üst Bandı (Masking Tape / Yapışkan Bant Efekti)
      ctx.save();
      ctx.translate(W / 2, polY);
      ctx.rotate(-0.02);
      ctx.fillStyle = "rgba(251, 191, 36, 0.75)"; // Sarı koli bandı
      drawRoundRect(-120, -25, 240, 50, 8, true, false);
      ctx.restore();

      // Polaroid İçi Şehir Fotoğrafı
      const photoMargin = 36;
      const photoW = polW - photoMargin * 2;
      const photoH = 720;
      if (img) {
        drawImageCover(img, polX + photoMargin, polY + photoMargin, photoW, photoH, 12);
      }

      // Polaroid Alt Açıklaması (El Yazısı Havası)
      ctx.textAlign = "left";
      ctx.font = "900 56px sans-serif";
      ctx.fillStyle = "#18181b";
      paintText(`${data.city.flag} ${data.city.name}, ${data.city.country}`, polX + photoMargin + 10, polY + 840);

      ctx.font = "700 30px sans-serif";
      ctx.fillStyle = "#71717a";
      paintText(`${fmtDate(input.startDate)} - ${fmtDate(input.endDate)} · ${data.nights} Gece`, polX + photoMargin + 10, polY + 900);

      // 3. Alt Gezi Kartı Kutusu
      let curY = polY + polH + 50;

      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      drawRoundRect(80, curY, W - 160, 110, 24, true, true);

      ctx.textAlign = "center";
      ctx.font = "italic 700 34px sans-serif";
      ctx.fillStyle = "#fef08a";
      paintText(`“${tripQuote}”`, W / 2, curY + 68);
      curY += 140;

      // 4. Bütçe & Uçuş Bandı
      if (showBudget) {
        ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
        ctx.strokeStyle = "rgba(52, 211, 153, 0.35)";
        drawRoundRect(80, curY, W - 160, 160, 28, true, true);

        ctx.textAlign = "center";
        ctx.font = "800 24px sans-serif";
        ctx.fillStyle = "#34d399";
        paintText("💰 TOPLAM TAHMİNİ BÜTÇE", W / 2, curY + 48);

        ctx.font = "900 64px sans-serif";
        ctx.fillStyle = "#ffffff";
        paintText(tl(totalTry), W / 2, curY + 115);

        ctx.font = "600 24px sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        paintText(`Kişi Başı: ${tl(Math.round(totalTry / input.travelers))} · ${input.travelers} Yolcu`, W / 2, curY + 148);
        curY += 190;
      }

      if (showFlightHotel) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        drawRoundRect(80, curY, W - 160, 130, 24, true, true);

        ctx.textAlign = "left";
        ctx.font = "700 28px sans-serif";
        ctx.fillStyle = "#ffffff";
        const fName = selectedFlight ? `${selectedFlight.airline} (${tl(selectedFlight.priceTry)})` : "Uçuş Hazır";
        const hName = selectedHotel ? `${selectedHotel.name} (${selectedHotel.stars}★)` : "Otel Hazır";
        paintText(`✈️ ${fName.slice(0, 40)}`, 115, curY + 52);
        paintText(`🏨 ${hName.slice(0, 40)}`, 115, curY + 102);
      }

      // Alt İmza
      ctx.textAlign = "center";
      ctx.font = "800 26px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      paintText("rotazur.com", W / 2, H - 75);
    }

    // =========================================================================
    // DÜZEN 3: MODERN BOARDING PASS & UÇUŞ BİLETİ
    // =========================================================================
    else {
      // 1. Şık Gece Arka Planı
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, W, H);

      // 2. Üst Bölüm: Canlı Şehir Fotoğrafı Kartı (Geniş Panoramik)
      const topH = 820;
      if (img) {
        drawImageCover(img, 60, 80, W - 120, topH, 36);
      }

      // Fotoğraf Üzerine Karartma & Şehir Etiketi
      const photoGrad = ctx.createLinearGradient(0, topH - 300, 0, topH + 80);
      photoGrad.addColorStop(0, "rgba(0,0,0,0)");
      photoGrad.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = photoGrad;
      drawRoundRect(60, topH - 220, W - 120, 300, 36, true, false);

      ctx.textAlign = "left";
      ctx.font = "900 80px sans-serif";
      ctx.fillStyle = "#ffffff";
      paintText(`${data.city.name.toUpperCase()}`, 110, topH);

      ctx.font = "700 32px sans-serif";
      ctx.fillStyle = "#38bdf8";
      paintText(`${data.city.flag} ${data.city.country.toUpperCase()} · ${data.city.tagline}`, 115, topH + 50);

      // 3. Alt Bölüm: Biniş Kartı (Boarding Pass) Tasarımı
      const ticketY = 940;
      const ticketH = 860;
      ctx.fillStyle = "#ffffff";
      drawRoundRect(60, ticketY, W - 120, ticketH, 36, true, false);

      // Bilet Çentikleri (Kupür kesim yuvarlakları)
      ctx.fillStyle = "#09090b";
      ctx.beginPath();
      ctx.arc(60, ticketY + 280, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(W - 60, ticketY + 280, 35, 0, Math.PI * 2);
      ctx.fill();

      // Kesikli Çizgi (Perfore ayırıcı)
      ctx.setLineDash([16, 12]);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(110, ticketY + 280);
      ctx.lineTo(W - 110, ticketY + 280);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bilet Başlığı: Rotazur Biniş Kartı
      ctx.textAlign = "left";
      ctx.font = "800 24px sans-serif";
      ctx.fillStyle = "#64748b";
      paintText("BOARDING PASS · ROTAZUR RESMİ SEYAHAT PLANI", 110, ticketY + 65);

      // Nereden -> Nereye (Büyük IATA Kodları)
      ctx.font = "900 80px sans-serif";
      ctx.fillStyle = "#0f172a";
      paintText(input.origin, 110, ticketY + 160);

      ctx.textAlign = "center";
      ctx.font = "900 48px sans-serif";
      ctx.fillStyle = "#3b82f6";
      paintText("✈️ ➔", W / 2, ticketY + 150);

      ctx.textAlign = "right";
      ctx.font = "900 80px sans-serif";
      ctx.fillStyle = "#0f172a";
      paintText(data.city.iata, W - 110, ticketY + 160);

      // Şehir İsimleri
      ctx.textAlign = "left";
      ctx.font = "700 28px sans-serif";
      ctx.fillStyle = "#64748b";
      paintText(input.origin === "IST" ? "İstanbul" : input.origin, 110, ticketY + 210);

      ctx.textAlign = "right";
      paintText(data.city.name, W - 110, ticketY + 210);

      // Bilet Alt Detayları (Perfore Altı)
      const detailY = ticketY + 350;
      ctx.textAlign = "left";

      // 1. Satır: Tarih & Yolcu
      ctx.font = "700 22px sans-serif";
      ctx.fillStyle = "#94a3b8";
      paintText("TARİHLER", 110, detailY);
      paintText("YOLCU SAYISI", 450, detailY);
      paintText("BÜTÇE STİLİ", 780, detailY);

      ctx.font = "900 32px sans-serif";
      ctx.fillStyle = "#0f172a";
      paintText(`${data.nights} Gece`, 110, detailY + 45);
      paintText(`${input.travelers} Kişi`, 450, detailY + 45);
      paintText(`${budgetTier.toUpperCase()}`, 780, detailY + 45);

      // 2. Satır: Uçuş & Otel
      ctx.font = "700 22px sans-serif";
      ctx.fillStyle = "#94a3b8";
      paintText("HAVAYOLU & BİLET", 110, detailY + 120);
      paintText("KONAKLAMA OTELİ", 550, detailY + 120);

      ctx.font = "800 28px sans-serif";
      ctx.fillStyle = "#0f172a";
      const fLine = selectedFlight ? selectedFlight.airline : "Doğrulanmış Uçuş";
      const hLine = selectedHotel ? selectedHotel.name : "Merkezi Otel";
      paintText(fLine.slice(0, 22), 110, detailY + 165);
      paintText(hLine.slice(0, 24), 550, detailY + 165);

      // 3. Satır: Toplam Bütçe Kutusu
      if (showBudget) {
        ctx.fillStyle = "#f0fdf4";
        ctx.strokeStyle = "#86efac";
        ctx.lineWidth = 2;
        drawRoundRect(110, detailY + 220, W - 220, 110, 20, true, true);

        ctx.textAlign = "left";
        ctx.font = "800 22px sans-serif";
        ctx.fillStyle = "#15803d";
        paintText("TOPLAM PLANLANAN BÜTÇE:", 145, detailY + 265);

        ctx.font = "900 48px sans-serif";
        ctx.fillStyle = "#166534";
        paintText(tl(totalTry), 145, detailY + 312);

        ctx.textAlign = "right";
        ctx.font = "700 24px sans-serif";
        ctx.fillStyle = "#15803d";
        paintText(`Kişi Başı: ${tl(Math.round(totalTry / input.travelers))}`, W - 145, detailY + 285);
      }

      // Alt Barkod Efekti (Sembolik Barcode)
      ctx.fillStyle = "#0f172a";
      const barY = ticketY + ticketH - 100;
      for (let i = 110; i < W - 110; i += 14) {
        const barW = (i % 3 === 0) ? 6 : (i % 5 === 0) ? 9 : 3;
        ctx.fillRect(i, barY, barW, 45);
      }

      ctx.textAlign = "center";
      ctx.font = "700 18px monospace";
      ctx.fillStyle = "#64748b";
      paintText(`ROTAZUR-${data.city.id.toUpperCase()}-${input.startDate.replace(/-/g, "")}`, W / 2, barY + 70);
    }
  }, [
    isOpen,
    layout,
    tripQuote,
    showBudget,
    showFlightHotel,
    showSpots,
    data,
    input,
    totalTry,
    budgetTier,
    selectedFlight,
    selectedHotel,
    imageLoaded,
    translate,
  ]);

  // 1080x1920 PNG Olarak İndirme
  const downloadStoryImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `rotazur-${data.city.id}-story.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setExportError("Görsel indirilemedi. Tekrar deneyin.");
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  // Telefonda Web Share API İle Doğrudan Paylaşma
  const shareStory = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setExportError(null);
    const revision = exportRevision.current;
    try {
      const blob = await canvasPng(canvas);
      if (revision !== exportRevision.current) return;
      const file = new File([blob], `${data.city.id}-story.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${data.city.name} Gezi Planım`,
          text: `${data.city.name} seyahatimi Rotazur ile planladım! ✈️`,
          files: [file],
        });
      } else {
        downloadStoryImage();
      }
    } catch (err) {
      // Cancelling the system share sheet is intentional and must not start a download.
      if (revision === exportRevision.current && (err as Error).name !== "AbortError") setExportError("Görsel paylaşılamadı. PNG indir seçeneğini kullanabilirsiniz.");
    }
  };

  const copyStoryImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setExportError(null); setCopied(false);
    const revision = exportRevision.current;
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": canvasPng(canvas) })]);
      if (revision !== exportRevision.current) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { if (revision === exportRevision.current) setExportError("Görsel kopyalanamadı. Pano iznini kontrol edin veya PNG olarak indirin."); }
  };

  if (!isOpen) return null;

  return (
    <Localize><AnimatePresence>
      <div role="dialog" aria-modal="true" aria-labelledby="story-title" className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="card relative max-h-[96vh] w-full max-w-5xl overflow-y-auto bg-white p-5 shadow-2xl dark:bg-[#11121d] sm:p-7"
        >
          {/* Kapat Butonu */}
          <button
            onClick={onClose}
            aria-label="Story kartını kapat"
            className="btn-ghost absolute right-4 top-4 !p-2 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Başlık */}
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 text-white shadow-lg shadow-pink-500/25">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                  Gerçek Şehir Fotoğraflı Story Kartı
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  1080x1920 Full HD
                </span>
              </div>
              <h2 id="story-title" className="text-xl font-extrabold">
                📸 {data.city.name} İçin Instagram Story / Reels Kartı
              </h2>
              <p className="text-xs text-black/55 dark:text-white/55">
                Şehrin gerçek ikonik fotoğraflarıyla süslenmiş estetik gezi kartınızı oluşturun ve paylaşın
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
            {/* SOL: Canlı Önizleme (Scaled Canvas 9:16) */}
            <div className="flex flex-col items-center justify-center rounded-3xl border border-black/10 bg-black/[0.04] p-4 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="relative aspect-[9/16] w-full max-w-[290px] overflow-hidden rounded-2xl shadow-2xl ring-4 ring-black/15 dark:ring-white/10">
                <canvas
                  ref={canvasRef}
                  className="h-full w-full object-contain"
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold opacity-65">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Canlı Önizleme (İndirirken 1080x1920 HD üretilir)</span>
              </div>
            </div>

            {/* SAĞ: Tasarım & Özelleştirme Kontrolleri */}
            <div className="flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                {/* 1. Şablon Seçici */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-black/70 dark:text-white/70">
                    <Palette className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Tasarım Stili Seç
                  </label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      {
                        id: "magazine" as StoryLayout,
                        label: "🌟 Dergi Kapağı",
                        sub: "Tam Fotoğraf & Lüks",
                      },
                      {
                        id: "polaroid" as StoryLayout,
                        label: "📸 Retro Polaroid",
                        sub: "Film & Hatıra",
                      },
                      {
                        id: "boarding_pass" as StoryLayout,
                        label: "🎫 Boarding Pass",
                        sub: "Uçuş & Biniş Kartı",
                      },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setLayout(t.id)}
                        className={`rounded-2xl border p-2.5 text-left transition ${
                          layout === t.id
                            ? "border-pink-500 bg-pink-500/10 ring-2 ring-pink-500/25 font-bold"
                            : "border-black/10 hover:border-brand-400 dark:border-white/10"
                        }`}
                      >
                        <div className="text-xs">{t.label}</div>
                        <div className="text-[10px] opacity-60">{t.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Slogan / Notun */}
                <div>
                  <label className="text-xs font-bold text-black/70 dark:text-white/70">
                    Kartın Üzerindeki Slogan / Sözün
                  </label>
                  <input
                    type="text"
                    value={tripQuote}
                    onChange={(e) => setTripQuote(e.target.value)}
                    maxLength={50}
                    placeholder="Örn: Bavulları hazırlayın, gidiyoruz!"
                    className="input-field mt-1.5 w-full text-xs font-semibold"
                  />
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[
                      "Bavulları hazırlayın, gidiyoruz! ✈️",
                      `${data.city.name} macerası başlıyor! 🏛️`,
                      "Rüya gibi bir kaçamak planlandı! 🌴✨",
                      "Kafa dinlemeye az kaldı! ☕🗺️",
                    ].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setTripQuote(q)}
                        className="rounded-lg bg-black/5 px-2 py-0.5 text-[10px] font-medium hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Görünüm Seçenekleri (Toggles) */}
                <div className="space-y-2 rounded-2xl border border-black/10 p-3 text-xs dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold">Toplam Bütçeyi Göster</span>
                      <span className="ml-1 opacity-60">({tl(totalTry)})</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showBudget}
                      onChange={(e) => setShowBudget(e.target.checked)}
                      className="rounded border-black/20 text-brand-600 focus:ring-brand-500"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-black/5 pt-2 dark:border-white/5">
                    <div>
                      <span className="font-bold">Uçuş & Otel Bilgisini Göster</span>
                      <span className="ml-1 opacity-60">({selectedFlight?.airline || "Uçuş"})</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showFlightHotel}
                      onChange={(e) => setShowFlightHotel(e.target.checked)}
                      className="rounded border-black/20 text-brand-600 focus:ring-brand-500"
                    />
                  </div>

                  {layout === "magazine" && (
                    <div className="flex items-center justify-between border-t border-black/5 pt-2 dark:border-white/5">
                      <div>
                        <span className="font-bold">Gezilecek Yerleri Göster</span>
                        <span className="ml-1 opacity-60">(İlk 3 İkonik Durak)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showSpots}
                        onChange={(e) => setShowSpots(e.target.checked)}
                        className="rounded border-black/20 text-brand-600 focus:ring-brand-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* İndirme & Paylaşma Butonları */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={downloadStoryImage}
                  disabled={downloading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-pink-500/25 transition hover:opacity-95"
                >
                  <Download className={`h-4 w-4 ${downloading ? "animate-bounce" : ""}`} />
                  <span>
                    {downloading
                      ? "Görsel Hazırlanıyor..."
                      : `1080x1920 HD ${data.city.name} Story İndir (PNG)`}
                  </span>
                </button>

                {exportError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{exportError}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={shareStory}
                    className="btn-ghost justify-center rounded-2xl border border-black/10 py-2.5 text-xs font-bold dark:border-white/10"
                  >
                    <Share2 className="h-4 w-4 text-emerald-500" />
                    <span>Telefonda Paylaş</span>
                  </button>

                  <button
                    type="button"
                    onClick={copyStoryImage}
                    className="btn-ghost justify-center rounded-2xl border border-black/10 py-2.5 text-xs font-bold dark:border-white/10"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-500" /> Kopyalandı ✓
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4" /> Panoya Kopyala
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence></Localize>
  );
}
