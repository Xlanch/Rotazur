"use client";

import { Localize } from "@/components/Localize";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BellRing, CalendarRange, CheckCircle2, Mail, Map, PiggyBank, Plane, Send, Sparkles, Store } from "lucide-react";
import { SearchForm } from "@/components/SearchForm";
import { CityImage, useCityImages } from "@/components/CityImage";
import { HowItWorks } from "@/components/HowItWorks";
import { Testimonials } from "@/components/Testimonials";
import { FaqSection } from "@/components/FaqSection";
import { PriceAlertModal } from "@/components/PriceAlertModal";
import { CITIES } from "@/lib/cities";
import { toQuery } from "@/lib/search";
import { useLanguage } from "@/components/LanguageContext";

const FEATURES = [
  { icon: PiggyBank, title: "Bütçeden plana", text: "Toplam bütçeni gir; uçuş, otel, yemek ve aktiviteleri buna göre dağıtalım." },
  { icon: Plane, title: "Uçuş bütçeni karşılaştır", text: "Aviasales gösterge fiyatları ve tarihine uygun uçuş arama bağlantıları." },
  { icon: Sparkles, title: "Yapay zekâ ile gün gün plan", text: "İlgi alanlarına göre yakın yerleri aynı güne gruplayan akıllı rota." },
  { icon: Map, title: "Canlı harita", text: "Otelin, gezilecek yerler ve günlük rotan tek haritada." },
  { icon: Store, title: "Ucuz mekânlar", text: "Sokak lezzetleri, yerel pazarlar ve ikinci el dükkanlar." },
  { icon: CalendarRange, title: "Hava & döviz", text: "Gezi günlerinin hava tahmini ve anlık kurla ₺ fiyatlar." },
];

const POPULAR = ["belgrad", "tiflis", "roma", "budapeste", "prag", "barselona"];

export default function Home() {
  const imgs = useCityImages();
  const { t, lang } = useLanguage();
  const [priceAlertOpen, setPriceAlertOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [newsletterMsg, setNewsletterMsg] = useState("");

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterStatus("loading");
    setNewsletterMsg("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsletterEmail, locale: lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kayıt yapılamadı.");
      setNewsletterStatus("success");
      setNewsletterMsg(data.message || "Başarıyla kaydoldunuz!");
      setNewsletterEmail("");
    } catch (err: unknown) {
      setNewsletterStatus("error");
      setNewsletterMsg(err instanceof Error ? err.message : "Bir hata oluştu.");
    }
  };

  const dates = (() => {
    const s = new Date(); s.setDate(s.getDate() + 30);
    const e = new Date(s); e.setDate(e.getDate() + 3);
    return { startDate: s.toISOString().slice(0, 10), endDate: e.toISOString().slice(0, 10) };
  })();

  return (
    <Localize><main className="relative overflow-hidden">
      {/* Aurora arka plan */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[620px] w-[620px] animate-aurora rounded-full bg-brand-500/35 blur-[120px]" />
        <div className="absolute right-[-10%] top-10 h-[520px] w-[520px] animate-aurora rounded-full bg-aqua-500/25 blur-[120px] [animation-delay:-6s]" />
        <div className="absolute left-1/3 top-72 h-[420px] w-[420px] animate-aurora rounded-full bg-fuchsia-500/25 blur-[120px] [animation-delay:-12s]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(124,77,255,0.12)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-32 sm:px-6 sm:pt-40">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="mx-auto max-w-3xl text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aqua-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-aqua-500" /></span>
            {t.heroBadge}
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">
            {t.heroTitle1}<br /><span className="text-gradient">{t.heroTitle2}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-black/60 dark:text-white/60">
            {t.heroSubtitle}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }} className="mx-auto mt-12 max-w-6xl">
          <SearchForm />
        </motion.div>
      </section>

      {/* Nasıl Çalışır? */}
      <HowItWorks />

      {/* Popüler rotalar */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.popularRoutes}</h2>
            <p className="mt-2 text-black/55 dark:text-white/55">{t.popularRoutesDesc}</p>
          </div>
          <Link href="/discover" className="btn-ghost hidden sm:inline-flex">{t.viewAll} <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {POPULAR.map((id, i) => {
            const c = CITIES.find((x) => x.id === id)!;
            const q = toQuery({ origin: "IST", destination: id, ...dates, travelers: 2, budget: 50000, comfort: "dengeli", interests: c.tags });
            return (
              <motion.div key={id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                <Link href={`/plan?${q}`} className="group relative block h-80 overflow-hidden rounded-3xl">
                  <CityImage src={imgs[id]} alt={c.name} className="absolute inset-0 transition duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <div className="text-sm opacity-80">{c.flag} {c.country}</div>
                    <div className="text-3xl font-bold">{c.name}</div>
                    <p className="mt-1 text-sm opacity-80">{c.tagline}</p>
                    <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur transition group-hover:bg-white group-hover:text-black">
                      {t.viewPlan} <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Gezgin Yorumları / Sosyal Kanıt */}
      <Testimonials />

      {/* Özellikler */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Gezi planlamanın <span className="text-gradient">akıllı yolu</span></h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              whileHover={{ y: -6 }} className="card group p-7">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-aqua-500 text-white shadow-lg shadow-brand-500/25 transition group-hover:rotate-6">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-black/55 dark:text-white/55">{f.text}</p>
            </motion.div>
          ))}
        </div>
        {/* Canlı Fiyat Takip & Alarmı Aktif Kartı */}
        <div className="card mt-10 flex flex-col items-center justify-between gap-6 p-7 sm:flex-row border border-brand-500/20 bg-gradient-to-r from-brand-500/[0.05] via-transparent to-aqua-500/[0.05]">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-400 shrink-0">
              <BellRing className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">Fiyat Alarmı & Takip</span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                  ● TERCİH KAYDI
                </span>
              </div>
              <div className="mt-1 text-xs sm:text-sm text-black/60 dark:text-white/60">
                İlgilendiğin rotayı kaydet. E-posta bildirimleri henüz etkin değil.
              </div>
            </div>
          </div>
          <button
            onClick={() => setPriceAlertOpen(true)}
            className="btn-primary shrink-0 text-xs font-bold gap-2 !py-2.5 !px-5"
          >
            <BellRing className="h-4 w-4" />
            Fiyat Alarmı Kur
          </button>
        </div>
      </section>

      {/* Gezgin E-Bülteni (Lead Generation) */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="card relative overflow-hidden p-8 sm:p-12 border border-black/10 dark:border-white/10 bg-gradient-to-br from-brand-600/[0.08] via-transparent to-purple-600/[0.08]">
          <div className="pointer-events-none absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-brand-500/15 blur-[80px]" />
          
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1 text-xs font-bold text-brand-600 dark:text-brand-300">
              <Sparkles className="h-3.5 w-3.5" /> Haftalık Fırsatlar
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight text-black dark:text-white">
              En Uygun Uçuş & Rota Fırsatlarını <span className="text-gradient">Kaçırma</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base text-black/65 dark:text-white/65">
              Seyahat bülteni için ilgini kaydedebilirsin. E-posta gönderimleri henüz etkin değil; indirim veya bildirim garantisi verilmez.
            </p>

            <form onSubmit={handleNewsletterSubmit} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md">
              <div className="relative flex-1">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="E-posta adresinizi girin..."
                  className="field !py-3 !pl-10 !text-sm"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 dark:text-white/40" />
              </div>
              <button
                type="submit"
                disabled={newsletterStatus === "loading"}
                className="btn-primary text-xs font-bold gap-2 shrink-0 !py-3 !px-6"
              >
                {newsletterStatus === "loading" ? "Kaydediliyor..." : (
                  <>
                    <Send className="h-4 w-4" />
                    Bültene Katıl
                  </>
                )}
              </button>
            </form>

            {newsletterStatus === "success" && (
              <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                {newsletterMsg}
              </div>
            )}
            {newsletterStatus === "error" && (
              <div className="mt-3 text-xs font-semibold text-rose-500">
                {newsletterMsg}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SSS / FAQ */}
      <FaqSection />

      {/* Ana Sayfa Fiyat Alarmı Modalı */}
      <PriceAlertModal
        isOpen={priceAlertOpen}
        onClose={() => setPriceAlertOpen(false)}
        cityId="roma"
        cityName="Roma"
        currentPrice={3200}
      />
    </main></Localize>
  );
}
