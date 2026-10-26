import { localizedMetadata } from "@/lib/i18n/server";

import { Localize } from "@/components/Localize";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, EyeOff, Server, ArrowLeft } from "lucide-react";

const baseMetadata: Metadata = {
  title: "Gizlilik & KVKK Politikası — Rotazur",
  description: "Rotazur Gizlilik ve Kişisel Verilerin Korunması (KVKK/GDPR) Politikası. Verilerinizin nasıl korunduğunu öğrenin.",
};

export default function PrivacyPage() {
  return (
    <Localize><main className="relative min-h-screen px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 overflow-hidden">
        <div className="absolute left-1/2 top-10 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="btn-ghost inline-flex items-center gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" /> Ana Sayfa
          </Link>
        </div>

        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" /> KVKK & GDPR Uyumlu
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-black dark:text-white">
            Gizlilik & KVKK Politikası
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-black/60 dark:text-white/60">
            Son Güncelleme: 21 Ekim 2026 · Rotazur olarak verilerinizin güvenliğine en üst düzeyde önem veriyoruz.
          </p>
        </div>

        <div className="card mt-10 p-8 sm:p-12 border border-black/10 dark:border-white/10 space-y-8 text-black/80 dark:text-white/80 leading-relaxed text-sm sm:text-base">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-emerald-500" /> 1. Hangi Verileri Topluyoruz?
            </h2>
            <p>
              Rotazur platformunu kullanırken deneyiminizi iyileştirmek amacıyla aşağıdaki veriler işlenmektedir:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-black/70 dark:text-white/70">
              <li><strong>Arama Tercihleri:</strong> Gidiş-dönüş tarihleri, kalkış ve varış şehirleri, seyahat bütçeniz ve ilgi alanlarınız (Yalnızca seyahat planı derlemek için geçici olarak işlenir).</li>
              <li><strong>Hesap Bilgileri:</strong> Kayıt olduğunuz takdirde adınız ve e-posta adresiniz. Şifreleriniz asla düz metin olarak görülmez; tuzlanmış <code>scrypt</code> algoritmalarıyla şifrelenir.</li>
              <li><strong>Teknik Veriler:</strong> Sitemizi ziyaret ettiğinizde IP adresiniz (yalnızca brute-force ve spam koruması için geçici hafızada rate-limiting amacıyla) ve tercih ettiğiniz para birimi/dil çerezleri.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-500" /> 2. Veri Güvenliği & Kriptografi
            </h2>
            <p>
              Tüm veri transferleri <strong>SSL / TLS 256-Bit</strong> şifrelemeyle korunur. Next.js sunucularımızda güvenlik başlıkları (HSTS, X-Frame-Options, X-Content-Type-Options) aktif olarak çalışır. Veritabanımızda SQL Injection saldırılarına karşı %100 Prepared Statements mimarisi uygulanmaktadır.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-emerald-500" /> 3. Üçüncü Taraflarla Paylaşım
            </h2>
            <p>
              Rotazur, kullanıcılarının kişisel bilgilerini veya e-posta adreslerini üçüncü taraflara pazarlama amacıyla <strong>kesinlikle satmaz veya kiralamaz</strong>.
            </p>
            <p>
              Otel veya uçak yönlendirmelerinde, kullanıcı "Rezervasyon Yap" veya "Otele Git" butonuna tıkladığında yalnızca seçilen arama kriterleri (tarih, kişi sayısı) anlaşmalı rezervasyon sağlayıcısına (Booking.com, Agoda, Aviasales vb.) aktarılır.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-black dark:text-white">4. KVKK ve GDPR Kapsamındaki Haklarınız</h2>
            <p>
              6698 sayılı KVKK ve Avrupa Genel Veri Koruma Tüzüğü (GDPR) kapsamında her an verilerinizin silinmesini, güncellenmesini veya tarafınıza raporlanmasını talep edebilirsiniz. Talepleriniz için <a href="mailto:destekrotazur@gmail.com" className="font-semibold text-brand-600 dark:text-brand-400 underline">destekrotazur@gmail.com</a> adresine e-posta göndermeniz yeterlidir.
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
