import { localizedMetadata } from "@/lib/i18n/server";

import { Localize } from "@/components/Localize";
import type { Metadata } from "next";
import { OfflinePlansPage } from "@/components/OfflinePlansPage";

const baseMetadata: Metadata = { title: "Kayıtlı Rotalarım", robots: { index: false, follow: false } };

export default function OfflinePage() {
  return <Localize><OfflinePlansPage /></Localize>;
}

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata(baseMetadata);
}
