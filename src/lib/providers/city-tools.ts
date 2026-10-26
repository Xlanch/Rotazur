import type { City } from "../types";
import type { Rates } from "./currency";
import { expandedCity, expandedPass, referenceCurrency } from "./expanded-guides";

export interface LocalCurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  perEur: number; // 1 EUR kaç yerel para birimi?
  rateSource?: "plan" | "reference";
  tippingRule: string;
  tippingPercent: number;
  atmWarning: string;
}

export interface CityPassInfo {
  estimated?: boolean;
  passName: string;
  durationLabel: string;
  priceEur: number;
  includes: string;
  transportCardName: string;
  transportPassPriceEur: number; // 72 saatlik / 3 günlük sınırsız ulaşım kartı
  singleTicketEur: number;
  freeMuseumTip: string;
  officialHint: string;
}

export interface FairPriceItem {
  id: "kahve" | "sokak" | "restoran" | "taksi" | "hediyelik";
  label: string;
  emoji: string;
  fairEurMin: number;
  fairEurMax: number;
}

const CURRENCY_MAP: Record<string, LocalCurrencyInfo> = {
  RSD: {
    code: "RSD",
    symbol: "дин",
    name: "Sırp Dinarı",
    perEur: 117.0,
    tippingRule: "Restoranlarda hesabı %5–10 yuvarlamak adettendir; kafelerde bozukluk bırakılır.",
    tippingPercent: 8,
    atmWarning: "Knez Mihailova'daki 'Menjačnica' döviz büroları komisyonsuzdur; ATM'de 'Without Conversion' seçin.",
  },
  BAM: {
    code: "BAM",
    symbol: "KM",
    name: "Bosna Konvertibl Markı",
    perEur: 1.955,
    tippingRule: "Başçarşı esnaf lokantalarında %5–10 bahşiş makbule geçer (sadece nakit KM geçer).",
    tippingPercent: 8,
    atmWarning: "1 EUR sabit olarak 1.955 KM'dir. Çarşıda Euro kabul edilse de para üstü düşük kurdan verilir, KM taşıyın.",
  },
  MKD: {
    code: "MKD",
    symbol: "ден",
    name: "Makedon Denarı",
    perEur: 61.5,
    tippingRule: "Geleneksel lokantalarda %5–10 bahşiş bırakılır.",
    tippingPercent: 8,
    atmWarning: "Eski Türk Çarşısı girişindeki döviz büroları en iyi kuru verir (1 EUR ≈ 61.5 MKD).",
  },
  ALL: {
    code: "ALL",
    symbol: "L",
    name: "Arnavutluk Leki",
    perEur: 99.0,
    tippingRule: "Kafe ve restoranlarda %5–10 nakit bahşiş yaygındır.",
    tippingPercent: 8,
    atmWarning: "Tiran'da 'Iliria 98' döviz büroları en güvenilir ve sıfır komisyonlu noktadır.",
  },
  GEL: {
    code: "GEL",
    symbol: "₾",
    name: "Gürcistan Larisi",
    perEur: 2.95,
    tippingRule: "Gürcistan'da çoğu restoranda adisyona %10–15 'Service Charge' otomatik eklenir! Fişi kontrol etmeden ekstra bahşiş bırakmayın.",
    tippingPercent: 0,
    atmWarning: "Bank of Georgia veya TBC Bank ATM'lerini kullanın; sokak döviz bürolarında tabeladaki 'Buy/Sell' farkına dikkat edin.",
  },
  AZN: {
    code: "AZN",
    symbol: "₼",
    name: "Azerbaycan Manatı",
    perEur: 1.85,
    tippingRule: "Restoranlarda %5–10 bahşiş veya servis ücreti yaygındır.",
    tippingPercent: 8,
    atmWarning: "ABB ve Kapital Bank ATM'leri güvenilirdir; Bolt takside kart tanımlayarak nakit derdinden kurtulun.",
  },
  HUF: {
    code: "HUF",
    symbol: "Ft",
    name: "Macar Forinti",
    perEur: 395.0,
    tippingRule: "Budapeşte'de restoranların %80'i adisyona %12.5 'Szervízdíj' (servis ücreti) ekler.",
    tippingPercent: 5,
    atmWarning: "Mavi-sarı 'Euronet' ATM'lerinden kesinlikle uzak durun (%15 komisyon keser). OTP Bank ATM'si kullanın.",
  },
  CZK: {
    code: "CZK",
    symbol: "Kč",
    name: "Çek Korunası",
    perEur: 25.2,
    tippingRule: "Prag'da masaya bırakılmaz; garsona ödeme yaparken 'Make it X CZK' diyerek %8–10 yuvarlanır.",
    tippingPercent: 8,
    atmWarning: "Sokakta para bozduran dolandırıcılara (Belarus rublesi verenlere) dikkat! Sadece dürüst döviz bürosu (Honest Guide onaylı) veya temassız kart kullanın.",
  },
  EGP: {
    code: "EGP",
    symbol: "E£",
    name: "Mısır Lirası",
    perEur: 53.0,
    tippingRule: "Mısır'da 'Bahşiş' (Baksheesh) kültürün parçasıdır; küçük hizmetler için cebinizde 20–50 EGP banknotlar bulundurun.",
    tippingPercent: 10,
    atmWarning: "Havalimanındaki resmi banka (Banque Misr / National Bank of Egypt) ATM'lerinden EGP çekin.",
  },
  UZS: {
    code: "UZS",
    symbol: "so'm",
    name: "Özbek Somu",
    perEur: 13800.0,
    tippingRule: "Çayhane ve restoranlarda adisyona %10–15 servis ücreti eklenir.",
    tippingPercent: 5,
    atmWarning: "Pazarlarda (Siyob Pazarı) sadece nakit Özbek Somu geçer; yanınızda temiz USD veya EUR banknot götürüp bankada bozdurun.",
  },
  MDL: {
    code: "MDL",
    symbol: "L",
    name: "Moldova Leyi",
    perEur: 19.3,
    tippingRule: "Restoranlarda %5–10 bahşiş bırakılır.",
    tippingPercent: 8,
    atmWarning: "Şehir merkezindeki resmi banka şubelerinden (MAIB) döviz bozdurun.",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "İngiliz Sterlini",
    perEur: 0.85,
    tippingRule: "Londra'da restoranlarda faturaya %12.5 'Optional Service Charge' eklenir; barlarda (pub) bahşiş verilmez.",
    tippingPercent: 0,
    atmWarning: "Londra %99 nakitsizdir (Cashless). Nakit çekmenize neredeyse hiç gerek yoktur, temassız kart yeterlidir.",
  },
  THB: {
    code: "THB",
    symbol: "฿",
    name: "Tayland Bahtı",
    perEur: 38.0,
    tippingRule: "Sokak tezgahlarında bahşiş beklenmez; masaj salonlarında 50–100 THB, restoranlarda %5–10 bırakılır.",
    tippingPercent: 5,
    atmWarning: "Tayland'da tüm ATM'ler çekim başına 220 THB (~300 ₺) sabit ücret alır! Bunun yerine 'SuperRich' gişelerinde nakit Euro/Dolar bozdurun.",
  },
  JPY: {
    code: "JPY",
    symbol: "¥",
    name: "Japon Yeni",
    perEur: 165.0,
    tippingRule: "Japonya'da ASLA bahşiş bırakmayın! Unuttuğunuz para sanıp arkanızdan koşarak iade ederler.",
    tippingPercent: 0,
    atmWarning: "En düşük komisyonla Japon Yeni çekmek için 7-Eleven marketlerindeki 'Seven Bank' ATM'lerini kullanın.",
  },
  IDR: {
    code: "IDR",
    symbol: "Rp",
    name: "Endonezya Rupiahı",
    perEur: 17200.0,
    tippingRule: "Kafe ve restoranlarda %5–10 servis + vergi eklenir; özel şoförlere günlük 50.000 Rp bahşiş verilir.",
    tippingPercent: 5,
    atmWarning: "Sadece yetkili 'BMC' veya 'Central Kuta' döviz bürolarını kullanın; yüksek kur yazan sokak kulübeleri el çabukluğuyla eksik para verir.",
  },
  AED: {
    code: "AED",
    symbol: "د.إ",
    name: "BAE Dirhemi",
    perEur: 4.0,
    tippingRule: "Restoranlarda %10 bahşiş veya yuvarlama yaygındır.",
    tippingPercent: 10,
    atmWarning: "Al Ansari Exchange gişeleri güvenilirdir; Dubai genelinde tüm ödemelerde temassız kart geçerlidir.",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    perEur: 1.0,
    tippingRule: "Avrupa'da hesap tutarını %5–10 yukarı yuvarlamak (İtalya'da Coperto varsa ekstra bırakmamak) standarttır.",
    tippingPercent: 7,
    atmWarning: "POS cihazı veya ATM 'TRY mi EUR mu?' diye sorarsa (DCC), kur farkı yememek için her zaman YEREL PARA (EUR) seçin!",
  },
};

const CITY_PASS_MAP: Record<string, CityPassInfo> = {
  roma: {
    passName: "Roma Pass (72 Saat)",
    durationLabel: "72 Saat",
    priceEur: 58.5,
    includes: "İlk 2 müze ücretsiz (Kolezyum + Borghese veya Capitolini dahil) + 72 saat sınırsız metro/otobüs + diğer müzelerde indirim.",
    transportCardName: "ATAC Roma 72h Bilet",
    transportPassPriceEur: 18,
    singleTicketEur: 1.5,
    freeMuseumTip: "Her ayın ilk Pazar günü Kolezyum ve devlet müzeleri tamamen ücretsizdir; Vatikan Müzeleri ise her ayın son Pazar günü ücretsizdir.",
    officialHint: "Kolezyum ve Borghese Galerisi'ne girecekseniz Roma Pass 72h hem sıra bekletmez hem de ~14 € kâr ettirir.",
  },
  paris: {
    passName: "Paris Museum Pass (48 Saat)",
    durationLabel: "48 Saat",
    priceEur: 70,
    includes: "Louvre, Orsay, Versay Sarayı, Zafer Takı ve Sainte-Chapelle dahil 50+ müzeye ücretsiz ve öncelikli giriş.",
    transportCardName: "Navigo Easy / Günlük Mobilis",
    transportPassPriceEur: 22,
    singleTicketEur: 2.15,
    freeMuseumTip: "Her ayın ilk Pazar günü Louvre hariç birçok devlet müzesi ücretsizdir. 26 yaş altı AB/öğrenci kartlılara çoğu müze ücretsiz.",
    officialHint: "En az 4 büyük müzeye (Louvre + Orsay + Versay + Zafer Takı) girecekseniz Museum Pass tekil biletten daha avantajlıdır.",
  },
  barselona: {
    passName: "Barcelona Card Express / Articket",
    durationLabel: "48–72 Saat",
    priceEur: 38,
    includes: "6 büyük sanat müzesine (Picasso, MNAC, Joan Miró, MACBA) tek biletle %45 indirimli giriş.",
    transportCardName: "T-Casual (10 Biniş) / Hola BCN",
    transportPassPriceEur: 12.15,
    singleTicketEur: 2.55,
    freeMuseumTip: "Pazar günleri saat 15:00'ten sonra Picasso Müzesi (ön kayıtla), MNAC ve Barselona Kalesi ücretsizdir.",
    officialHint: "Sagrada Familia ve Park Güell şehir kartlarına dahil değildir; onları resmi sitelerinden en az 1 hafta önce tekil alın, ulaşımda ise 12.15 €'luk T-Casual (10 biniş) kullanın.",
  },
  amsterdam: {
    passName: "I amsterdam City Card (48 Saat)",
    durationLabel: "48 Saat",
    priceEur: 90,
    includes: "Rijksmuseum, Moco, NEMO + Ücretsiz Kanal Turu + 48 saat GVB tramvay/metro + Bisiklet kiralama.",
    transportCardName: "GVB 48h / 72h Sınırsız Kart",
    transportPassPriceEur: 21.5,
    singleTicketEur: 3.4,
    freeMuseumTip: "Van Gogh Müzesi artık I amsterdam kartına dahil değildir, biletini ayrı almalısınız.",
    officialHint: "Sadece 1-2 müzeye girecekseniz City Card pahalıya gelir; onun yerine GVB ulaşım kartı (21.5 €) + tekil kanal turu (16 €) almak 40 € tasarruf sağlar.",
  },
  viyana: {
    passName: "Vienna Pass / Sisi Ticket",
    durationLabel: "Kombi Bilet",
    priceEur: 51,
    includes: "Schönbrunn Sarayı + Hofburg İmparatorluk Daireleri + Sisi Müzesi birleşik indirimli giriş.",
    transportCardName: "Wiener Linien 72h Kart",
    transportPassPriceEur: 17.1,
    singleTicketEur: 2.4,
    freeMuseumTip: "Belvedere Sarayı'nın bahçeleri, Aziz Stephan Katedrali'nin ana nefi ve Rathauspark tamamen ücretsizdir.",
    officialHint: "Tam Vienna Pass (99 €) yerine sadece 'Sisi Ticket' (51 €) + 'Wiener Linien 72 Saat Ulaşım Kartı' (17.10 €) almak en akıllı fiyat/performans çözümüdür.",
  },
  prag: {
    passName: "Prague CoolPass / Kale Kombine",
    durationLabel: "48 Saat",
    priceEur: 62,
    includes: "Prag Kalesi, Yahudi Mahallesi, Nehir Turu ve 60+ noktaya giriş.",
    transportCardName: "PID Lítačka 72 Saatlik Bilet",
    transportPassPriceEur: 13.2,
    singleTicketEur: 1.3,
    freeMuseumTip: "Prag Kalesi'nin avlularını ve Aziz Vitus Katedrali'nin giriş bölümünü gezmek tamamen ücretsizdir!",
    officialHint: "Çoğu gezgin için CoolPass yerine sadece Prag Kalesi Ana Devre Bileti (18 €) + 72 Saatlik PID Ulaşım Kartı (13.2 €) almak yarı yarıya daha ekonomiktir.",
  },
  budapeste: {
    passName: "Budapest Card (72 Saat)",
    durationLabel: "72 Saat",
    priceEur: 56,
    includes: "Sınırsız BKK toplu taşıma + Lukács Termal Hamamı ücretsiz giriş + 20+ müze ve Buda Kalesi füniküleri.",
    transportCardName: "BKK 72 Saat Travelcard",
    transportPassPriceEur: 14,
    singleTicketEur: 1.2,
    freeMuseumTip: "Balıkçı Tabyası'nın alt terasları 24 saat, üst kuleleri ise sabah 09:00 öncesi ve akşam 19:00 sonrası ücretsizdir.",
    officialHint: "Sadece ulaşım için 'Budapest GO' uygulamasından 14 €'luk 72 saatlik BKK kartı almak ve Széchenyi Hamamı biletini ayrı almak daha hesaplıdır.",
  },
  atina: {
    passName: "Akropolis & 6 Antik Alan Kombi Bilet",
    durationLabel: "5 Gün Geçerli",
    priceEur: 30,
    includes: "Akropolis + Antik Agora + Roma Agorası + Olimpos Zeus Tapınağı + Kerameikos + Hadrian Kütüphanesi.",
    transportCardName: "OASA 3 Günlük Turist Kartı",
    transportPassPriceEur: 20,
    singleTicketEur: 1.2,
    freeMuseumTip: "Kasım–Mart arası her ayın ilk Pazar günü Akropolis dahil tüm devlet ören yerleri ücretsizdir.",
    officialHint: "Tek başına Akropolis bileti 20 € iken, 30 €'luk resmi kombi bilet 6 antik alanı kapsar ve %50 tasarruf ettirir.",
  },
  londra: {
    passName: "The London Pass (2 Gün)",
    durationLabel: "48 Saat",
    priceEur: 115,
    includes: "Tower of London, Westminster Abbey, The Shard, Thames Nehir Turu ve Tower Bridge sergisi.",
    transportCardName: "Oyster / Temassız Kart (Daily Cap)",
    transportPassPriceEur: 29,
    singleTicketEur: 3.3,
    freeMuseumTip: "British Museum, National Gallery, Tate Modern, Natural History Museum ve Victoria & Albert Müzesi %100 ÜCRETSİZDİR!",
    officialHint: "Londra'da en büyük müzeler zaten ücretsiz olduğu için London Pass almanıza gerek yoktur; sadece girmek istediğiniz 1-2 ücretli yere (örn. Tower of London) tekil bilet alın.",
  },
  berlin: {
    passName: "Museum Pass Berlin (3 Gün)",
    durationLabel: "72 Saat",
    priceEur: 32,
    includes: "Müzeler Adası'ndaki 5 büyük müze (Neues Museum, Alte Nationalgalerie, Bode) dahil 30+ müzeye sınırsız giriş.",
    transportCardName: "Berlin WelcomeCard / BVG AB",
    transportPassPriceEur: 28,
    singleTicketEur: 3.5,
    freeMuseumTip: "Reichstag Cam Kubbesi, Doğu Yakası Galerisi (Berlin Duvarı) ve Terörün Topografyası Müzesi tamamen ücretsizdir.",
    officialHint: "32 €'luk Museum Pass Berlin, Avrupa'nın en kârlı müze kartlarından biridir; sadece Müzeler Adası'ndaki 2 müzeye girseniz bile parasını çıkarır.",
  },
  lizbon: {
    passName: "Lisboa Card (48 Saat)",
    durationLabel: "48 Saat",
    priceEur: 44,
    includes: "Jerónimos Manastırı, Belém Kulesi, Santa Justa Asansörü + Sınırsız Metro/Tramvay 28 + Sintra Treni!",
    transportCardName: "Navegante 24h Ulaşım Kartı",
    transportPassPriceEur: 20.4,
    singleTicketEur: 1.8,
    freeMuseumTip: "Lisboa Card hem Sintra trenini hem de Santa Justa asansörünü (tek binişi 6 €) ücretsiz kapsar.",
    officialHint: "Lizbon'da 'Lisboa Card' kesinlikle alınmalıdır: Ulaşım + Sintra treni + Jerónimos Manastırı toplamı tek başına kart fiyatını geçmektedir.",
  },
  dubai: {
    passName: "Go City Dubai Explorer Pass (3 Seçim)",
    durationLabel: "60 Gün Geçerli",
    priceEur: 125,
    includes: "Burj Khalifa At The Top + Çöl Safarisi + Dubai Frame veya The View at The Palm.",
    transportCardName: "RTA Silver Nol Card",
    transportPassPriceEur: 12,
    singleTicketEur: 1.5,
    freeMuseumTip: "Dubai Mall Çeşme Şovları, Al Fahidi Tarihi Mahallesi ve JBR Plajı tamamen ücretsizdir.",
    officialHint: "Burj Khalifa + Çöl Safarisi + Aquarium yapacaksanız 3'lü Explorer Pass veya Klook paketleri gişe fiyatına göre %35 tasarruf sağlar.",
  },
  tokyo: {
    passName: "Tokyo Subway Ticket (72 Saat)",
    durationLabel: "72 Saat",
    priceEur: 9.5,
    includes: "Tüm Tokyo Metro ve Toei Metro hatlarında 72 saat boyunca sınırsız biniş (sadece turist pasaportuyla alınır).",
    transportCardName: "Tokyo Subway 72h + Suica IC",
    transportPassPriceEur: 9.5,
    singleTicketEur: 1.3,
    freeMuseumTip: "Tokyo Büyükşehir Hükümet Binası (Shinjuku) 45. kat gözlem terası, Senso-ji ve Meiji Tapınağı tamamen ücretsizdir!",
    officialHint: "1.500 Yen (~9.5 €) değerindeki 72 Saatlik Tokyo Metro Bileti dünyanın en kârlı ulaşım kartıdır; günde 3 binişte bile kendini amorti eder.",
  },
};

export function getCityCurrencyInfo(city: Pick<City, "id" | "currencyCode">, rates?: Partial<Rates>): LocalCurrencyInfo {
  const code = city.currencyCode || "EUR";
  const info = CURRENCY_MAP[code] || referenceCurrency(code);
  const local = rates?.localPerEur?.[info.code];
  if (typeof local === "number" && Number.isFinite(local) && local > 0) return { ...info, perEur: local, rateSource: "plan" };
  if (info.code === "EUR") return { ...info, perEur: 1, rateSource: "plan" };
  const inTry = rates?.[info.code as keyof Rates];
  if (typeof inTry === "number" && inTry > 0 && Number.isFinite(inTry) && typeof rates?.EUR === "number" && Number.isFinite(rates.EUR) && rates.EUR > 0) {
    return { ...info, perEur: rates.EUR / inTry, rateSource: "plan" };
  }
  return { ...info, rateSource: "reference" };
}

export function getCityPassInfo(city: Pick<City, "id" | "name" | "transportEur">): CityPassInfo {
  const expanded = expandedCity(city.id);
  if (expanded) return expandedPass(expanded);
  if (CITY_PASS_MAP[city.id]) {
    return CITY_PASS_MAP[city.id];
  }
  return {
    passName: `${city.name} Müze & Kültür Kombine Bileti`,
    durationLabel: "48–72 Saat",
    priceEur: 22,
    includes: `${city.name} merkezindeki ana ulusal müze, kale ve kültür noktalarına indirimli giriş.`,
    transportCardName: `${city.name} Günlük / 72 Saatlik Toplu Taşıma Kartı`,
    transportPassPriceEur: Math.round(city.transportEur * 2.6 * 10) / 10,
    singleTicketEur: Math.max(0.7, Math.round((city.transportEur / 3) * 10) / 10),
    freeMuseumTip: `${city.name} eski şehir meydanı, tarihi ibadethaneler, nehir/sahil yürüyüş hatları ve seyir tepeleri tamamen ücretsizdir.`,
    officialHint: `Merkezdeki noktalar birbirine yürüme mesafesinde olduğundan tam şehir kartı yerine sadece 24/72 saatlik toplu taşıma kartı ve gireceğiniz 1-2 müzeye tekil bilet almak daha ekonomiktir.`,
  };
}

export function getCityFairPrices(city: Pick<City, "id" | "foodEur" | "transportEur">): FairPriceItem[] {
  const f = city.foodEur;
  return [
    {
      id: "kahve",
      label: "Kahve / Cappuccino / Su",
      emoji: "☕",
      fairEurMin: Math.max(1.2, Math.round(f * 0.1 * 10) / 10),
      fairEurMax: Math.max(2.5, Math.round(f * 0.22 * 10) / 10),
    },
    {
      id: "sokak",
      label: "Sokak Lezzeti / Börek / Atıştırmalık",
      emoji: "🥙",
      fairEurMin: Math.max(2.5, Math.round(f * 0.22 * 10) / 10),
      fairEurMax: Math.max(5.5, Math.round(f * 0.45 * 10) / 10),
    },
    {
      id: "restoran",
      label: "Restoranda 1 Kişi Ana Yemek + İçecek",
      emoji: "🍽️",
      fairEurMin: Math.max(7, Math.round(f * 0.55)),
      fairEurMax: Math.max(15, Math.round(f * 1.15)),
    },
    {
      id: "taksi",
      label: "Şehir İçi Taksi / Bolt / Uber (5 km)",
      emoji: "🚕",
      fairEurMin: Math.max(3, Math.round(city.transportEur * 1.2)),
      fairEurMax: Math.max(8, Math.round(city.transportEur * 3.2)),
    },
    {
      id: "hediyelik",
      label: "Magnet / Küçük Yerel Hediyelik",
      emoji: "🧲",
      fairEurMin: 1.5,
      fairEurMax: Math.max(4, Math.round(f * 0.25)),
    },
  ];
}

export interface PreTripStep {
  id: string;
  phase: "Uçuş Öncesi Resmi İşlemler" | "Son 7 Gün Hazırlığı" | "Son 24 Saat Kontrolü";
  title: string;
  detail: string;
  critical?: boolean;
}

export function getPreTripChecklist(city: Pick<City, "id" | "name" | "country" | "visaType" | "visa" | "currencyCode">): PreTripStep[] {
  const steps: PreTripStep[] = [];

  if (expandedCity(city.id)) {
    steps.push({ id: "entry-check", phase: "Uçuş Öncesi Resmi İşlemler", title: "Pasaport ve giriş izni kontrolü", detail: city.visa + " Pasaport geçerliliği, aktarma ve elektronik giriş kaydı koşullarını ayrıca doğrulayın.", critical: true });
  } else if (city.visaType === "kimlik") {
    steps.push({
      id: "id-card",
      phase: "Uçuş Öncesi Resmi İşlemler",
      title: "Yeni Tip Çipli T.C. Kimlik Kartı veya Pasaport Kontrolü",
      detail: `${city.country} seyahatinde yeni tip fotoğraflı T.C. Kimlik Kartı ile vizesiz geçiş yapabilirsiniz. Havalimanında verilen küçük giriş formunu dönüş uçuşuna kadar kaybetmeyin.`,
      critical: true,
    });
  } else if (city.visaType === "vizesiz") {
    steps.push({
      id: "passport-val",
      phase: "Uçuş Öncesi Resmi İşlemler",
      title: "Pasaport Geçerlilik Süresi (En Az 6 Ay)",
      detail: `${city.country} Türk vatandaşlarına vizesizdir (${city.visa}), ancak dönüş tarihinizden itibaren pasaportunuzun en az 6 ay geçerli olduğundan emin olun.`,
      critical: true,
    });
  } else if (city.visaType === "vize") {
    steps.push({
      id: "evisa-check",
      phase: "Uçuş Öncesi Resmi İşlemler",
      title: "Vize / E-Vize Onayı & Otel Rezervasyon Çıktısı",
      detail: `${city.country} için (${city.visa}) seyahat öncesi vize/e-vize onayınızı ve otel/dönüş bileti çıktılarınızı hazırlayın.`,
      critical: true,
    });
  } else {
    steps.push({
      id: "schengen-visa",
      phase: "Uçuş Öncesi Resmi İşlemler",
      title: "Schengen Vize Onayı & Pasaport Geçerlilik Kontrolü",
      detail: `${city.country} seyahati için geçerli Schengen vizenizi, seyahat sağlık sigortası poliçenizi ve gidiş-dönüş uçak/otel rezervasyon belgelerinizi kontrol edin.`,
      critical: true,
    });
  }

  steps.push(
    {
      id: "harç-pulu",
      phase: "Uçuş Öncesi Resmi İşlemler",
      title: "Yurt Dışı Çıkış Harcı Ödemesi (Dijital Vergi Dairesi)",
      detail: "Havalimanında sıra beklememek için Yurt Dışı Çıkış Harcını Gelir İdaresi Başkanlığı (GİB) mobil uygulamasından veya internet bankacılığından uçuş öncesi online ödeyin.",
      critical: true,
    },
    {
      id: "health-ins",
      phase: "Son 7 Gün Hazırlığı",
      title: "Yurt Dışı Seyahat Sağlık Sigortası / SGK Provizyon",
      detail: "Vizesiz ülke olsa dahi olası acil sağlık giderlerine karşı 30.000 € teminatlı seyahat sağlık sigortası yaptırın.",
    },
    {
      id: "esim-roaming",
      phase: "Son 7 Gün Hazırlığı",
      title: "E-SIM (Airalo / Mobimatter) veya Yurt Dışı Paketi Kurulumu",
      detail: `${city.name} havalimanına indiğiniz anda harita ve ulaşım uygulamalarını kullanabilmek için E-SIM QR kodunuzu Türkiye'deyken Wi-Fi ile telefonunuza tanımlayın.`,
    },
    {
      id: "bank-dcc",
      phase: "Son 7 Gün Hazırlığı",
      title: "Banka Kartı Yurt Dışı & Döviz Hesabı Açılışı",
      detail: `Kartınızın mobil bankacılıktan 'Yurt Dışı Kullanım'a açık olduğunu kontrol edin. Yerel para birimi: ${city.currencyCode || "EUR"}.`,
    },
    {
      id: "online-checkin",
      phase: "Son 24 Saat Kontrolü",
      title: "Uçuş Online Check-In & Mobil Biniş Kartı",
      detail: "Uçuştan 24 saat önce havayolunun uygulamasından online check-in yapıp biniş kartınızı (Boarding Pass) telefon cüzdanınıza kaydedin.",
      critical: true,
    },
    {
      id: "offline-maps",
      phase: "Son 24 Saat Kontrolü",
      title: `${city.name} Çevrimdışı Harita & Belge Yedeği`,
      detail: `Google Maps üzerinden '${city.name}' bölgesini çevrimdışı indirin; pasaport ve rezervasyonlarınızın fotoğrafını telefonunuzda 'Favoriler'e ekleyin.`,
    }
  );

  return steps;
}
