"use client";

import { Localize } from "@/components/Localize";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hatayı logla (isteğe bağlı hata izleme servisi eklenebilir)
    console.error("Uygulama İçi Hata Yakalandı:", error);
  }, [error]);

  return (
    <Localize><main className="relative flex min-h-[85vh] items-center justify-center px-4 py-24 sm:px-6">
      {/* Arka plan aurora ışıltısı */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-rose-500/20 blur-[100px]" />
      </div>

      <div className="card max-w-lg w-full p-8 sm:p-10 text-center border border-black/10 dark:border-white/10 shadow-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-rose-500/10 text-rose-500 dark:bg-rose-500/20">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <h1 className="mt-6 text-2xl sm:text-3xl font-black tracking-tight text-black dark:text-white">
          Ufak Bir Aksaklık Oldu
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-black/60 dark:text-white/60">
          İstediğin seyahat rotasını işlerken geçici bir veri uyuşmazlığı yaşandı. Merak etme, hiçbir verin kaybolmadı.
        </p>

        {error.digest && (
          <div className="mt-4 rounded-xl bg-black/[0.03] p-2.5 font-mono text-[11px] text-black/45 dark:bg-white/[0.04] dark:text-white/45">
            Hata Referansı: <span className="select-all font-semibold">{error.digest}</span>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="btn-primary w-full sm:w-auto text-xs font-bold gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Yeniden Dene
          </button>

          <Link
            href="/"
            className="btn-ghost w-full sm:w-auto text-xs font-semibold gap-2 border border-black/10 dark:border-white/10"
          >
            <Home className="h-4 w-4" />
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </main></Localize>
  );
}
