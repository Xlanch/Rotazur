
import { Localize } from "@/components/Localize";
import Link from "next/link";
import { ArrowLeft, Compass, MapPin, Search } from "lucide-react";

export default function NotFound() {
  const suggestedCities = [
    { id: "roma", name: "Roma", flag: "🇮🇹", country: "İtalya" },
    { id: "paris", name: "Paris", flag: "🇫🇷", country: "Fransa" },
    { id: "tokyo", name: "Tokyo", flag: "🇯🇵", country: "Japonya" },
    { id: "belgrad", name: "Belgrad", flag: "🇷🇸", country: "Sırbistan" },
    { id: "barselona", name: "Barselona", flag: "🇪🇸", country: "İspanya" },
  ];

  return (
    <Localize><main className="relative flex min-h-[90vh] items-center justify-center px-4 py-24 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 overflow-hidden">
        <div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-500/25 blur-[120px]" />
      </div>

      <div className="card w-full max-w-2xl p-8 sm:p-12 text-center border border-black/10 dark:border-white/10 shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-xs font-bold text-brand-600 dark:text-brand-300">
          <Compass className="h-4 w-4 animate-spin [animation-duration:8s]" />
          404 · Rota Bulunamadı
        </div>

        <h1 className="mt-6 text-4xl sm:text-6xl font-black tracking-tight">
          Kayboldun mu? <span className="text-gradient">Sorun Değil!</span>
        </h1>

        <p className="mx-auto mt-4 max-w-lg text-sm sm:text-base leading-relaxed text-black/60 dark:text-white/60">
          Aradığın sayfa veya gezi rotası mevcut değil ya da taşınmış olabilir. Bazen en güzel anılar planlanmamış yollara sapınca keşfedilir.
        </p>

        {/* Önerilen Popüler Rotalar */}
        <div className="mt-8 border-t border-b border-black/10 py-6 dark:border-white/10">
          <div className="text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/45 mb-3 flex items-center justify-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-brand-500" />
            Popüler Destinasyonlara Göz At
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {suggestedCities.map((c) => (
              <Link
                key={c.id}
                href={`/plan?dest=${c.id}`}
                className="chip text-xs hover:scale-105 transition-transform"
              >
                <span>{c.flag}</span>
                <span className="font-semibold">{c.name}</span>
                <span className="text-black/40 dark:text-white/40 text-[10px]">({c.country})</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="btn-primary w-full sm:w-auto text-xs font-bold gap-2">
            <ArrowLeft className="h-4 w-4" />
            Ana Sayfaya Dön
          </Link>
          <Link
            href="/discover"
            className="btn-ghost w-full sm:w-auto text-xs font-semibold gap-2 border border-black/10 dark:border-white/10"
          >
            <Compass className="h-4 w-4" />
            Tüm Şehirleri Keşfet
          </Link>
        </div>
      </div>
    </main></Localize>
  );
}
