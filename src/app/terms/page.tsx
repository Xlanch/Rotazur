import { localizedMetadata } from "@/lib/i18n/server";

import { Localize } from "@/components/Localize";
import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

const baseMetadata: Metadata = {
  title: "Kullanım Şartları — Rotazur",
  description: "Rotazur Kullanım Şartları, Hizmet Sözleşmesi ve Sorumluluk Beyanı.",
};

export default function TermsPage() {
  return (
    <Localize><main className="relative min-h-screen px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 overflow-hidden">
        <div className="absolute left-1/2 top-10 h-80 w-80 -translate-x-1/2 rounded-full bg-sky-500/20 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="btn-ghost inline-flex items-center gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" /> Ana Sayfa
          </Link>
        </div>

        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-4 py-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
            <FileText className="h-3.5 w-3.5" /> Kullanım Koşulları
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-black dark:text-white">
            Hizmet Şartları & Sözleşmesi
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-black/60 dark:text-white/60">
            Rotazur web sitesini ve servislerini kullanarak aşağıdaki şartları peşinen kabul etmiş sayılırsınız.
          </p>
        </div>

        <div className="card mt-10 p-8 sm:p-12 border border-black/10 dark:border-white/10 space-y-8 text-black/80 dark:text-white/80 leading-relaxed text-sm sm:text-base">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black dark:text-white">1. Hizmetin Tanımı & Kapsamı</h2>
            <p>
              Rotazur; bağımsız bir seyahat rota planlayıcısı, bütçe simülatörü ve fiyat karşılaştırma asistanıdır. Rotazur doğrudan bir havayolu şirketi, otel işletmecisi veya tur operatörü değildir.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" /> 2. Fiyat Dinamikleri ve Rezervasyon Sorumluluğu
            </h2>
            <p>
              Sitede sunulan uçak bileti, otel konaklama ve aktivite fiyatları; entegre veri sağlayıcılarımızdan (Booking.com, Agoda, Trip.com, Aviasales vb.) alınan anlık tahminlerdir.
            </p>
            <p>
              Hava yolu ve otel fiyatları arz-talep dengesine göre dakikalar içinde değişebilir. Kullanıcı, nihai ödeme ve satın alma işlemini bilet sağlayıcısının kendi güvenli sayfasında tamamlamadan önce bilet kurallarını, iptal şartlarını ve toplam tutarı kontrol etmekle bizzat yükümlüdür.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black dark:text-white">3. Fikri Mülkiyet Hakları</h2>
            <p>
              Rotazur markası, logosu, rota optimizasyon mantığı, arayüz tasarımları ve üretilen seyahat rehberi şablonları Rotazur&apos;un mülkiyetindedir. Ticari amaçla izinsiz kopyalanamaz veya otomatik botlarla (scraping) çekilemez.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black dark:text-white">4. İletişim & Uyuşmazlıklar</h2>
            <p>
              Kullanım koşulları Türkiye Cumhuriyeti yasalarına tabidir. Her türlü soru ve geri bildirim için <a href="mailto:destekrotazur@gmail.com" className="font-semibold text-brand-600 dark:text-brand-400 underline">destekrotazur@gmail.com</a> adresinden destek ekibimizle görüşebilirsiniz.
            </p>
          </section>
        </div>
      </div>
    </main></Localize>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata(baseMetadata);
}
