import { localizedMetadata } from "@/lib/i18n/server";

import { Localize } from "@/components/Localize";
import type { Metadata } from "next";
import Link from "next/link";
import { Info, ShieldCheck, Sparkles, Compass, CheckCircle2, ArrowRight, Heart } from "lucide-react";

const baseMetadata: Metadata = {
  title: "Hakkımızda & Misyonumuz — Rotazur",
  description: "Rotazur, gezginlerin bütçelerine göre en akıllı, ekonomik ve keyifli gezi rotalarını oluşturan bağımsız seyahat teknolojisi platformudur.",
};

export default function AboutPage() {
  return (
    <Localize><main className="relative min-h-screen px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 overflow-hidden">
        <div className="absolute left-1/2 top-10 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl">
        {/* Başlık & Rozet */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-4 py-1.5 text-xs font-bold text-brand-600 dark:text-brand-300">
            <Info className="h-3.5 w-3.5" /> Kurumsal Bilgiler
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight text-black dark:text-white">
            Geleceğin Akıllı <span className="text-gradient">Seyahat Asistanı</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-black/60 dark:text-white/60">
            Rotazur, seyahat planlamadaki gereksiz karmaşayı, fahiş acente komisyonlarını ve saatler süren araştırmaları ortadan kaldırmak için kuruldu.
          </p>
        </div>

        {/* Ana İçerik Kartı */}
        <div className="card mt-12 p-8 sm:p-12 border border-black/10 dark:border-white/10 space-y-8 text-black/80 dark:text-white/80 leading-relaxed text-sm sm:text-base">
          <div>
            <h2 className="text-2xl font-black text-black dark:text-white mb-3">Biz Kimiz?</h2>
            <p>
              <strong>Rotazur</strong> (Your Travel Route), gezginlerin toplam bütçelerine, kişisel ilgi alanlarına ve seyahat tarihlerine göre saniyeler içinde uçuş, otel, günlük gezi rotası ve harita optimizasyonu sunan bağımsız bir seyahat teknolojisi (TravelTech) platformudur.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 pt-2">
            <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-6 dark:border-white/5 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-3 text-brand-600 dark:text-brand-400 font-bold text-lg">
                <Sparkles className="h-5 w-5" /> Misyonumuz
              </div>
              <p className="text-sm text-black/65 dark:text-white/65">
                Kullanıcılarımıza Aviasales gösterge uçuş fiyatları, arama koşulları ve kontrol zamanı belirtilen otel fiyatları, hava tahminleri ve birbirine yakın yerleri gruplayan günlük rotaları tek ekranda sunmaktır. Satın alma fiyatı ve müsaitlik ilgili sağlayıcıda doğrulanır.
              </p>
            </div>

            <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-6 dark:border-white/5 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-3 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                <ShieldCheck className="h-5 w-5" /> Şeffaflık & Tarafsızlık
              </div>
              <p className="text-sm text-black/65 dark:text-white/65">
                Rotazur rota oluşturmak için ücret almaz. Oteller SerpApi Booking arama sonuçlarından, gösterge uçuş fiyatları Aviasales Data API üzerinden alınır. Saklanan sonuçlar ve bütçe tahminleri ayrıca belirtilir.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-black dark:text-white mb-3">Neden Rotazur?</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Bütçe Odaklı Algoritma:</strong> Önce nereye gideceğinizi değil, ne kadar bütçeniz olduğunu söylersiniz. Sistem paranızın yettiği en iyi şehirleri ve otelleri sizin için eler.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Zaman Kazandıran Günlük Plan:</strong> Şehir içinde bir uçtan bir uca koşturmak yerine, yürüyüş mesafesindeki yerleri aynı güne planlayan akıllı gruplama.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                <div>
                  <strong>8 Dil & 8 Canlı Para Birimi:</strong> Dünyanın dört bir yanından gezginler için anlık döviz kurlarıyla yerelleştirilmiş deneyim.
                </div>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-brand-500/10 p-6 border border-brand-500/20 text-xs sm:text-sm">
            <h3 className="font-bold text-base text-brand-600 dark:text-brand-300 mb-2">Merkez & İletişim</h3>
            <p className="text-black/70 dark:text-white/70">
              Rotazur Digital Travel Technologies · E-posta: <a href="mailto:destekrotazur@gmail.com" className="font-bold text-brand-600 dark:text-brand-400 underline">destekrotazur@gmail.com</a>
            </p>
          </div>
        </div>

        {/* Aksiyon */}
        <div className="mt-10 text-center">
          <Link href="/" className="btn-primary">
            Hemen Rota Oluşturmaya Başla <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main></Localize>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata(baseMetadata);
}
