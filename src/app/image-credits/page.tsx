import { localizedMetadata } from "@/lib/i18n/server";

import { Localize } from "@/components/Localize";
import Link from "next/link";
import type { Metadata } from "next";
import images from "@/lib/data/city-images.json";

const baseMetadata: Metadata = { title: "Şehir Görselleri ve Kaynaklar | Rotazur" };
export default function ImageCreditsPage() {
  return <Localize><main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
    <Link href="/" className="text-brand-500 underline">← Rotazur’a dön</Link>
    <h1 className="mt-6 text-3xl font-bold">Şehir görselleri ve kaynaklar</h1>
    <p className="mt-4 text-sm opacity-75">Yeni destinasyon görselleri Wikimedia Commons kaynaklıdır. Fotoğrafçılar, dosya kaynakları ve kullanım lisansları aşağıdadır. Görseller kartlarda boyutlandırılarak/kırpılarak gösterilebilir. Her fotoğraf kendi lisansına tabidir.</p>
    <p className="mt-3 text-sm opacity-75">Mevcut destinasyonların Unsplash görselleri <a className="underline" href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash lisansı</a> ile kullanılır. Şehir/gezi noktası koordinatları Wikipedia ve Wikidata; havalimanı kayıtları <a className="underline" href="https://ourairports.com/data/" target="_blank" rel="noopener noreferrer">OurAirports açık verisi</a> ile hazırlanmıştır. Şehir seçimi <a className="underline" href="https://www.booking.com/city.en-gb.html" target="_blank" rel="noopener noreferrer">Booking popüler şehirler sayfasını</a> temel alır; resmî bir dünya ilk 100 sıralaması değildir.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {Object.entries(images).map(([id, image]) => <article key={id} className="card p-4 text-sm">
        <h2 className="font-bold">{image.city}</h2>
        <p className="mt-2 break-words">Fotoğraf: {image.author}</p>
        <p className="mt-1 break-words opacity-70">{image.credit}</p>
        <p className="mt-2"><a className="underline" href={image.source} target="_blank" rel="noopener noreferrer">Orijinal dosya ve kaynak</a> · <a className="underline" href={image.licenseUrl} target="_blank" rel="noopener noreferrer">{image.license}</a></p>
      </article>)}
    </div>
  </main></Localize>;
}

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata(baseMetadata);
}
