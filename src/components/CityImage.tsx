"use client";

import { Localize } from "@/components/Localize";

import { useState } from "react";
import { CITY_IMAGE_MAP, DEFAULT_CITY_IMAGE } from "@/lib/providers/images";

/** Tüm 26 şehir görselini anında (0ms gecikmeyle) döndürür */
export function useCityImages(): Record<string, string> {
  return CITY_IMAGE_MAP;
}

export function CityImage({
  src,
  alt,
  className = "",
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [err, setErr] = useState(false);

  // Eğer dışarıdan 'absolute' veya 'fixed' sınıfı verilmişse 'relative' ekleyip ezmesini önle!
  const hasPosition = /\b(absolute|fixed|sticky)\b/.test(className);
  const positionCls = hasPosition ? "" : "relative";
  const resolvedSrc = !err && src ? src : DEFAULT_CITY_IMAGE;

  return (
    <Localize><div
      className={`${positionCls} overflow-hidden bg-gradient-to-br from-brand-600/40 via-fuchsia-600/30 to-aqua-500/40 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc}
        alt={alt}
        loading="lazy"
        onError={() => {
          if (!err) setErr(true);
        }}
        className="h-full w-full object-cover transition duration-700"
      />
    </div></Localize>
  );
}
