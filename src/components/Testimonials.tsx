"use client";

import { Localize } from "@/components/Localize";

import { motion } from "framer-motion";
import { CITIES } from "@/lib/cities";
import { Star, ShieldCheck, Heart, ThumbsUp, Users, CheckCircle } from "lucide-react";

const REVIEWS = [
  {
    name: "Elif & Mert K.",
    city: "İstanbul",
    trip: "🇮🇹 Roma · 4 Günlük Çift Tatili",
    avatar: "👩‍❤️‍👨",
    rating: 5,
    comment:
      "Normalde Excel'de günlerce otel ve uçak arardık. Rotazur bütçemizi Trastevere'deki butik otele ve Colosseum turuna göre paylaştırdı. A4 PDF rehberinin çıktısını alıp gezdik, tek bir dakika bile kaybetmedik!",
    date: "14 Nisan 2026",
  },
  {
    name: "Canberk Y.",
    city: "İzmir",
    trip: "🇧🇦 Belgrad & Saraybosna · Vizesiz Rota",
    avatar: "🎒",
    rating: 5,
    comment:
      "Booking ile alternatif otel fiyatlarını yan yana görmek harikaydı. Uçuşların en ucuz gününü esnek tarihlerle tespit etti ve 4.200 ₺ tasarruf ettim. 7 günlük canlı hava durumu tahmini de birebir tuttu.",
    date: "28 Mart 2026",
  },
  {
    name: "Selin D.",
    city: "Ankara",
    trip: "🇫🇷 Paris · Sanat & Gastronomi",
    avatar: "🎨",
    rating: 5,
    comment:
      "Tavsiye ettiği lokal kruvasancılar ve sokak lezzetleri klasik turist tuzaklarından çok uzaktı. Rota birbirine yürüme mesafesindeki yerleri aynı güne topladığı için hiç yorulmadan şehri keşfettik.",
    date: "02 Nisan 2026",
  },
];

export function Testimonials() {
  return (
    <Localize><section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      {/* İstatistik Rozetleri */}
      <div className="mb-14 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5 text-center border border-black/5 dark:border-white/10">
          <div className="text-3xl font-extrabold text-brand-600 dark:text-brand-400">15.000+</div>
          <div className="text-xs text-black/60 dark:text-white/60 font-medium mt-1">Oluşturulan Rota</div>
        </div>
        <div className="card p-5 text-center border border-black/5 dark:border-white/10">
          <div className="text-3xl font-extrabold text-aqua-600 dark:text-aqua-400">4.9 / 5</div>
          <div className="text-xs text-black/60 dark:text-white/60 font-medium mt-1">Gezgin Memnuniyeti</div>
        </div>
        <div className="card p-5 text-center border border-black/5 dark:border-white/10">
          <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{CITIES.length} Şehir</div>
          <div className="text-xs text-black/60 dark:text-white/60 font-medium mt-1">Canlı Fiyat & Hava</div>
        </div>
        <div className="card p-5 text-center border border-black/5 dark:border-white/10">
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">%100</div>
          <div className="text-xs text-black/60 dark:text-white/60 font-medium mt-1">Ücretsiz & Tarafsız</div>
        </div>
      </div>

      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-aqua-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-aqua-600 dark:text-aqua-400">
          <Heart className="h-3.5 w-3.5 fill-aqua-500" /> Gezgin Yorumları
        </span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
          Rotazur ile Yola Çıkanlar <span className="text-gradient">Ne Diyor?</span>
        </h2>
        <p className="mt-3 text-sm sm:text-base text-black/60 dark:text-white/60">
          Binlerce gezgin Rotazur akıllı algoritmasıyla zamandan ve bütçeden tasarruf etti.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {REVIEWS.map((rev, idx) => (
          <motion.div
            key={rev.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="card p-7 border border-black/5 dark:border-white/10 flex flex-col justify-between hover:shadow-xl transition-all"
          >
            <div>
              {/* Yıldızlar ve Doğrulanmış Gezgin Rozeti */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle className="h-3 w-3" /> Doğrulanmış
                </span>
              </div>

              {/* Rota Etiketi */}
              <div className="text-xs font-bold text-brand-600 dark:text-brand-400 mb-2">
                {rev.trip}
              </div>

              {/* Yorum */}
              <p className="text-sm leading-relaxed text-black/75 dark:text-white/75 italic">
                "{rev.comment}"
              </p>
            </div>

            {/* Gezgin Profili */}
            <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-xl select-none">
                {rev.avatar}
              </div>
              <div>
                <div className="text-sm font-bold text-black dark:text-white">{rev.name}</div>
                <div className="text-[11px] text-black/50 dark:text-white/45">
                  {rev.city} · {rev.date}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section></Localize>
  );
}
