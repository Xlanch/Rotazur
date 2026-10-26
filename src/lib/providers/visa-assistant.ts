import type { City } from "../types";
import { departureFeeLabel } from "../departure-fee";
import { expandedCity } from "./expanded-guides";

export interface VisaDetails {
  passportValidityLabel?: string;
  category: "kimlik" | "vizesiz" | "schengen" | "vize";
  badgeTitle: string;
  badgeColor: string;
  summary: string;
  duration: string;
  passportRequirement: string;
  exitFee: string;
  essentialDocs: string[];
  borderControlTips: string;
}

export function getCityVisaDetails(city: Pick<City, "id" | "name" | "country" | "visaType" | "visa">, departureDate?: string): VisaDetails {
  const vType = city.visaType || "vizesiz";
  const exitFee = departureFeeLabel(departureDate);
  if (expandedCity(city.id)) return {
    category: vType, badgeTitle: vType === "schengen" ? "Schengen giriş koşulları" : vType === "vizesiz" ? "Vize muafiyeti · ek giriş şartlarını kontrol edin" : "Vize / elektronik izin koşullarını kontrol edin",
    badgeColor: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30", summary: city.visa,
    duration: "Pasaport ve izin türüne göre resmî kaynaktan doğrulayın", passportValidityLabel: "Ülke ve aktarma koşuluna göre",
    passportRequirement: "Pasaport geçerliliği, boş sayfa, aktarma vizesi ve varsa elektronik giriş kaydı koşullarını resmî makamdan kontrol edin.", exitFee,
    essentialDocs: ["Geçerli pasaport", "Gerekli vize / elektronik seyahat izni veya giriş kaydı", "Otel ve dönüş/ileri seyahat belgeleri", "Ülkenin istediği diğer giriş belgeleri"],
    borderControlTips: "Genel hazırlık bilgisidir. Pasaportunuza ve seyahat tarihinize göre güncel şartlar: https://www.mfa.gov.tr/turk-vatandaslarinin-tabi-oldugu-vize-uygulamalari.tr.mfa"
  };

  if (vType === "kimlik" || city.id === "tiflis" || city.id === "baku") {
    return {
      category: "kimlik",
      badgeTitle: "Sadece Çipli Kimlikle (Pasaportsuz)",
      badgeColor: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
      summary: `Türk vatandaşları ${city.country} ülkesine yeni nesil çipli T.C. kimlik kartıyla pasaporta ihtiyaç duymadan giriş yapabilir.`,
      duration: "90 güne kadar serbest dolaşım",
      passportRequirement: "Pasaport zorunlu DEĞİLDİR. Fotoğraflı ve çipli T.C. kimlik kartınız yeterlidir (eski mavi/pembe nüfus cüzdanları geçersizdir).",
      exitFee,
      essentialDocs: [
        "Yeni nesil çipli T.C. Kimlik Kartı",
        "Gidiş - Dönüş uçak bileti rezervasyonu",
        "Konaklanacak otel rezervasyonu çıktısı",
        "Girişte verilen küçük 'Giriş-Çıkış Formu' kağıdını seyahat boyunca kaybetmeyiniz",
      ],
      borderControlTips: "Pasaport kontrolünde polisin dönüş biletinizi ve otel rezervasyonunuzu sorma ihtimaline karşı telefonunuzdaki onay kodlarını hazır tutun.",
    };
  }

  if (vType === "vizesiz") {
    return {
      category: "vizesiz",
      badgeTitle: "Vizesiz Seyahat (Bordo Pasaport)",
      badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      summary: `Türk vatandaşları ${city.country} sınırına herhangi bir vize almadan, sadece standart bordo pasaport ile giriş yapabilir.`,
      duration: "180 gün içinde 90 güne kadar vizesiz",
      passportRequirement: "Seyahat bitiş tarihinden itibaren en az 6 ay geçerli pasaport ve en az 2 boş vize sayfası gereklidir.",
      exitFee,
      essentialDocs: [
        "En az 6 ay geçerli T.C. Pasaportu",
        "Onaylı dönüş uçak bileti",
        "Otel / konaklama rezervasyon çıktısı",
        "Seyahat Sağlık Sigortası (Tavsiye edilir)",
      ],
      borderControlTips: "Sırbistan, Bosna, Karadağ ve Makedonya sınır polisleri kalacağınız gün sayısı kadar makul bir nakit/kredi kartı bakiyesi ve otel adresi sorabilir.",
    };
  }

  if (vType === "schengen") {
    return {
      category: "schengen",
      badgeTitle: "Schengen Vizesi Gerekli",
      badgeColor: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
      summary: `Bordo (Umuma Mahsus) pasaport sahiplerinin ${city.country} seyahati için geçerli bir Schengen vizesi alması zorunludur. Yeşil (Hususi) pasaport sahipleri ise 90 güne kadar vizesiz seyahat edebilir.`,
      duration: "Vize üzerinde belirtilen gün sayısı kadar (Yeşil Pasaporta 90 gün)",
      passportRequirement: "Pasaportun son 10 yıl içinde alınmış olması, seyahat dönüşünden sonra en az 3 ay geçerli olması ve 2 boş sayfası bulunması şarttır.",
      exitFee,
      essentialDocs: [
        "Geçerli Schengen Vizesi veya Yeşil Pasaport",
        "En az 30.000 € teminatlı Seyahat Sağlık Sigortası",
        "Otel ve gidiş-dönüş uçuş rezervasyonları",
        "Maddi durumu gösteren banka hesap dökümü veya kredi kartı",
      ],
      borderControlTips: "İlk Schengen girişinizi vizeyi aldığınız ülkenin havalimanından yapmanız gelecekteki vize başvurularınız için büyük avantaj sağlar.",
    };
  }

  // Özel vize (İngiltere / ABD vb.)
  return {
    category: "vize",
    badgeTitle: "Özel Ülke Vizesi Gerekli",
    badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    summary: `${city.country} seyahati için ülkenin konsolosluğu veya vize merkezi üzerinden önceden vize alınması gerekmektedir.`,
    duration: "Vizenizde onaylanan süre kadar",
    passportRequirement: "En az 6 ay geçerli pasaport zorunludur.",
    exitFee,
    essentialDocs: [
      "Onaylı vize belgesi",
      "Gidiş-dönüş uçak biletleri",
      "Konaklama belgeleri",
      "Kapsamlı seyahat sigortası",
    ],
    borderControlTips: "Giriş kapısında seyahat amacınızı (turistik gezi) belirten evrakları el bagajınızda taşıyınız.",
  };
}
