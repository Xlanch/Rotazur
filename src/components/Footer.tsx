"use client";

import { Localize } from "@/components/Localize";

import { useState } from "react";
import Link from "next/link";
import { LegalModal, LegalDocType } from "./LegalModal";
import { ShieldCheck, Mail, Sparkles, Compass, CheckCircle2, Clock, MapPin, Heart } from "lucide-react";

export function Footer() {
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<LegalDocType>("about");

  const openDoc = (doc: LegalDocType) => {
    setActiveDoc(doc);
    setLegalModalOpen(true);
  };

  return (
    <Localize><>
      <footer className="mt-24 border-t border-black/10 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-black/60 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
            {/* 1. Kolon: Marka & Misyon */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 p-0.5 shadow-md shadow-brand-500/20">
                  <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-black overflow-hidden">
                    <img src="/logo.png" alt="Rotazur" className="h-7 w-7 object-contain" />
                  </div>
                </div>
                <div>
                  <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-brand-600 via-sky-500 to-indigo-600 bg-clip-text text-transparent">
                    ROTAZUR
                  </span>
                  <div className="text-[10px] font-semibold tracking-wider text-black/50 dark:text-white/45 uppercase">
                    Your Travel Route
                  </div>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-black/60 dark:text-white/60">
                Bütçenize uygun seyahat rotaları, gösterge uçuş fiyatları, koşulları belirtilen otel seçenekleri ve hava tahminleri sunan seyahat asistanınız.
              </p>

              <div className="pt-2 flex flex-col gap-1.5 text-[11px] text-black/50 dark:text-white/45">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  SSL 256-Bit Şifreli & Güvenli Bağlantı
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-brand-500" />
                  Güncellenen fiyatlar & hava tahminleri
                </span>
              </div>
            </div>

            {/* 2. Kolon: Popüler Rotalar & İlham */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-black/90 dark:text-white/90 flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-brand-500" />
                Popüler Rotalar
              </h4>
              <ul className="space-y-2 text-xs text-black/65 dark:text-white/65">
                <li>
                  <Link href="/plan?dest=roma" className="hover:text-brand-500 transition-colors inline-flex items-center gap-1.5">
                    <span>🇮🇹 Roma Kültür & Tarih Turu</span>
                  </Link>
                </li>
                <li>
                  <Link href="/plan?dest=paris" className="hover:text-brand-500 transition-colors inline-flex items-center gap-1.5">
                    <span>🇫🇷 Paris Romantik Hafta Sonu</span>
                  </Link>
                </li>
                <li>
                  <Link href="/plan?dest=tokyo" className="hover:text-brand-500 transition-colors inline-flex items-center gap-1.5">
                    <span>🇯🇵 Tokyo Teknoloji & Gastronomi</span>
                  </Link>
                </li>
                <li>
                  <Link href="/plan?dest=saraybosna" className="hover:text-brand-500 transition-colors inline-flex items-center gap-1.5">
                    <span>🇧🇦 Vizesiz Balkan Rotaları</span>
                  </Link>
                </li>
                <li>
                  <Link href="/plan?dest=barselona" className="hover:text-brand-500 transition-colors inline-flex items-center gap-1.5">
                    <span>🇪🇸 Barselona Mimari & Sahil</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* 3. Kolon: Kurumsal & Yasal */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-black/90 dark:text-white/90 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Yasal & Şeffaflık
              </h4>
              <ul className="space-y-2 text-xs text-black/65 dark:text-white/65">
                <li>
                  <Link
                    href="/about"
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey) {
                        e.preventDefault();
                        openDoc("about");
                      }
                    }}
                    className="hover:text-brand-500 transition-colors text-left inline-block"
                  >
                    Hakkımızda & Misyonumuz
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey) {
                        e.preventDefault();
                        openDoc("privacy");
                      }
                    }}
                    className="hover:text-brand-500 transition-colors text-left inline-block"
                  >
                    Gizlilik & KVKK Politikası
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey) {
                        e.preventDefault();
                        openDoc("terms");
                      }
                    }}
                    className="hover:text-brand-500 transition-colors text-left inline-block"
                  >
                    Kullanım Şartları & Sözleşmesi
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => openDoc("cookies")}
                    className="hover:text-brand-500 transition-colors text-left"
                  >
                    Çerez (Cookie) Tercihleri
                  </button>
                </li>
                <li><Link href="/image-credits" className="hover:text-brand-500 transition-colors text-left inline-block">Şehir Görselleri & Kaynaklar</Link></li>
                <li className="pt-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> %100 Ücretsiz Hizmet
                  </span>
                </li>
              </ul>
            </div>

            {/* 4. Kolon: İletişim & Sağlayıcılar */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-black/90 dark:text-white/90 flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-sky-500" />
                İletişim & Destek
              </h4>
              <p className="text-xs leading-relaxed text-black/60 dark:text-white/60">
                Sorularınız, önerileriniz veya iş birliği talepleriniz için bize 7/24 ulaşabilirsiniz:
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="mailto:destekrotazur@gmail.com"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" />
                  destekrotazur@gmail.com
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  ✉️ İletişim & Geri Bildirim Formu →
                </Link>
              </div>

              <div className="pt-2 border-t border-black/5 dark:border-white/5">
                <div className="text-[10px] font-medium text-black/50 dark:text-white/45 mb-1.5">
                  Rezervasyon & Fiyat Sağlayıcıları:
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-black/70 dark:text-white/70">
                  <span className="rounded-md bg-black/5 px-2 py-0.5 dark:bg-white/10">Booking.com</span>
                  <span className="rounded-md bg-black/5 px-2 py-0.5 dark:bg-white/10">Agoda</span>
                  <span className="rounded-md bg-black/5 px-2 py-0.5 dark:bg-white/10">Trip.com</span>
                  <span className="rounded-md bg-black/5 px-2 py-0.5 dark:bg-white/10">Aviasales</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-black/55 dark:text-white/50">
            <span>Hava: <a href="https://api.met.no/" target="_blank" rel="noopener noreferrer" className="underline">MET Norway</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline">CC BY 4.0</a> (günlük özet)</span>
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline">Rates By Exchange Rate API</a>
            <a href="https://frankfurter.dev/" target="_blank" rel="noopener noreferrer" className="underline">Frankfurter</a>
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">© OpenStreetMap contributors</a>
          </div>

          {/* Alt Şerit: Telif & Sorumluluk Reddi */}
          <div className="mt-12 pt-6 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-[11px] text-black/50 dark:text-white/40">
            <div>
              © {new Date().getFullYear()} <strong>Rotazur</strong> (Your Travel Route). Tüm hakları saklıdır.
            </div>
            <div className="max-w-xl text-[10px] leading-tight text-black/45 dark:text-white/35">
              Rotazur bağımsız bir seyahat planlama ve rota arama motorudur. Rezervasyonlar yönlendirilen resmi sağlayıcılar (Booking.com, Agoda, Trip.com vb.) üzerinden güvenceyle yapılır.
            </div>
          </div>
        </div>
      </footer>

      {/* Yasal Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        type={activeDoc}
      />
    </></Localize>
  );
}
