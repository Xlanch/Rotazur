import { localizedMetadata } from "@/lib/i18n/server";
import type { Metadata, Viewport } from "next";
import { headers, cookies } from "next/headers";
import { initialLanguage } from "@/lib/i18n/server";
import { Plus_Jakarta_Sans } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import { AuthProvider } from "@/components/AuthContext";
import { CurrencyProvider } from "@/components/CurrencyContext";
import { LanguageProvider } from "@/components/LanguageContext";
import { OfflineRegistration } from "@/components/OfflineRegistration";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-jakarta", display: "swap" });

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
};

const baseMetadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://rotazur.com"),
  title: {
    default: "Rotazur — Bütçene Göre Akıllı Gezi & Rota Rehberi",
    template: "%s | Rotazur",
  },
  description: "Rotazur ile bütçeni söyle; en ucuz uçuş, otel, canlı hava durumu ve gün gün gezi planını akıllıca çıkaralım.",
  applicationName: "Rotazur",
  authors: [{ name: "Rotazur Team" }],
  keywords: [
    "rota planlayıcı",
    "akıllı seyahat rehberi",
    "ucuz uçak bileti",
    "bütçeye göre tatil",
    "vizesiz ülkeler",
    "günlük gezi programı",
    "booking otel karşılaştırma",
    "travel route planner",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rotazur",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "Rotazur — Your Travel Route",
    description: "Bütçene göre akıllı gezi planı ve seyahat asistanı.",
    siteName: "Rotazur",
    images: [{ url: "/rotazur-logo.png", width: 1024, height: 572, alt: "Rotazur Logo" }],
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rotazur — Bütçene Göre Akıllı Gezi & Rota Rehberi",
    description: "Bütçene göre akıllı gezi planı, en ucuz uçuşlar ve gün gün rota.",
    images: ["/rotazur-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://rotazur.com/#organization",
      name: "Rotazur",
      url: "https://rotazur.com",
      logo: "https://rotazur.com/logo.png",
      email: "destekrotazur@gmail.com",
      description: "Bütçenize göre akıllı seyahat ve rota planlama platformu.",
    },
    {
      "@type": "WebSite",
      "@id": "https://rotazur.com/#website",
      url: "https://rotazur.com",
      name: "Rotazur",
      publisher: {
        "@id": "https://rotazur.com/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://rotazur.com/plan?destination={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light')document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  const selected = await initialLanguage((await cookies()).get("rotazur_lang")?.value);
  return (
    <html lang={selected.language} dir={selected.language === "ar" ? "rtl" : "ltr"} className={jakarta.variable} suppressHydrationWarning>
      <head>
        {/* Browsers hide nonce attributes after parsing; the script's .nonce stays intact. */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen font-sans">
        <AuthProvider>
          <LanguageProvider initialLanguage={selected.language} initialCatalog={selected.catalog}>
            <CurrencyProvider>
              <OfflineRegistration />
              <Navbar />
              {children}
              <Footer />
              <CookieBanner />
            </CurrencyProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata(baseMetadata);
}
