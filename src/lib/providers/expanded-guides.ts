import { getCity } from "../cities";
import type { City, RestaurantOption } from "../types";
import { haversineKm } from "../travel-utils";
import airports from "../data/airports.json";
import trips from "../data/day-trips.json";
import currencyReference from "../data/currency-reference.json";
import type { CityAirportTransferGuide, CityConnectivityGuide, CityShoppingGuide, NearbyDayTrip, PhotoSpot, SpontaneousIdea } from "./city-discovery";
import type { CityPassInfo, LocalCurrencyInfo } from "./city-tools";
import type { ClimateProfile } from "../weather/city-climate";

export function expandedCity(id: string): City | undefined {
  const city = getCity(id);
  return city?.guideSource ? city : undefined;
}

/** Reference prices are editorial budgets, never merchant quotes or live tariffs. */
export function expandedRestaurants(city: City, eur: number): RestaurantOption[] {
  const area = city.foodArea!;
  return (["tasarruflu", "dengeli", "konforlu"] as const).map((tier, i) => {
    const amount = Math.round(city.foodEur * [0.3, 0.55, 1][i]);
    return { id: `${city.id}-food-area-${tier}`, name: `${area.name} çevresinde ${["uygun bütçeli yemek", "yerel restoran", "özel akşam yemeği"][i]}`,
      tier, category: i === 0 ? "sokak-lezzeti" : i === 1 ? "yerel-lokanta" : "gurme", neighborhood: area.name,
      cuisine: `${city.country} mutfağı · bölge önerisi`, signatureDish: "Menü ve yemek seçeneklerini işletmede inceleyin",
      avgPricePerPersonEur: amount, avgPricePerPersonTry: Math.round(amount * eur), rating: 0, reviews: 0,
      lat: area.lat, lon: area.lon, tip: "Bu bir yemek bölgesi önerisidir. İşletme puanı/yorumu doğrulanmadı; tutar kişi başı bütçe tahminidir, menü fiyatı değildir.",
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`restaurants near ${area.name}, ${city.name}`)}`,
      tripadvisorUrl: `https://www.tripadvisor.com.tr/Search?q=${encodeURIComponent(`${city.name} restaurants`)}` };
  });
}

export function expandedTransfers(city: City): CityAirportTransferGuide {
  const airport = airports.find(a => a.iata_code === city.iata)!;
  const distance = haversineKm(city.lat, city.lon, Number(airport.latitude_deg), Number(airport.longitude_deg));
  return { airportName: airport.name, airportCode: city.iata, distanceKm: Math.round(distance), estimated: true,
    options: (["tasarruflu", "dengeli", "konforlu"] as const).map((tier, i) => ({ tier,
      mode: ["🚌 Toplu taşıma seçeneklerini kontrol edin", "🚐 Resmî servis / transfer seçenekleri", "🚕 Resmî taksi veya önceden rezervasyon"][i],
      name: `${airport.name} → ${city.name}`, durationMin: Math.max(20, Math.round(distance * [2.1, 1.7, 1.4][i])),
      frequency: "Güncel tarife ve çalışma saatleri havalimanı sitesinde kontrol edilmelidir.",
      priceEur: Math.max(i === 2 ? 20 : 3, Math.round(city.transportEur * [1, 2, 6][i] + distance * [0.08, 0.15, 0.4][i])),
      pricingModel: i === 2 ? "per_vehicle" : "per_person", whereToBuy: airport.home_link || "Havalimanının resmî ulaşım sayfası",
      proTip: "Süre ve ücret planlama tahminidir; bir hat, sefer veya fiyat garantisi değildir. Mesafe kuş uçuşudur. Araç/hat kapasitesini ve varsa aktarmaları doğrulayın." })) };
}

export function expandedPhotos(city: City): PhotoSpot[] {
  return city.attractions.map((a, i) => ({ id: `${city.id}-photo-${i}`, name: a.name,
    bestTime: i === 0 ? "🌅 Sabah Erken (Kalabalıksız)" : i === 1 ? "🌇 Altın Saat / Gün Batımı" : "🌃 Mavi Saat & Gece",
    costEur: a.priceEur, angleTip: `${a.name} çevresinde kamusal alandan kadraj oluşturun. Özel alanlara giriş ve fotoğraf izinlerini ayrıca kontrol edin.`,
    vibe: city.tagline, lat: a.lat, lon: a.lon }));
}

export function expandedIdeas(city: City): SpontaneousIdea[] {
  const area = city.foodArea!;
  const a = city.attractions;
  return (["kahve", "yagmur", "sokak-lezzeti", "manzara", "gizli-kesif"] as const).map((mood, i) => {
    const place = i === 0 || i === 2 ? area : a[(i - 1) % a.length];
    return { id: `${city.id}-idea-${mood}`, mood, title: `${place.name} · ${["kahve molası", "kültür çevresi keşfi", "yemek bölgesi", "fotoğraf yürüyüşü", "yürüyerek keşif"][i]}`,
      duration: "Yaklaşık 1–2 saat", costEur: i === 0 ? Math.round(city.foodEur * 0.12) : i === 2 ? Math.round(city.foodEur * 0.3) : 0,
      neighborhood: place.name, description: i === 1 ? "Yağışlı havada yakınınızdaki kapalı kültür alanını seçmeden önce çalışma saatini, biletini ve açık olduğunu doğrulayın; bu nokta bir çevre önerisidir."
        : "Kaynak koordinatıyla hazırlanmış bölge önerisi. Harcamalar bütçe tahminidir; giriş, işletme ve menü bilgilerini ayrıca kontrol edin.", lat: place.lat, lon: place.lon };
  });
}

export function expandedDayTrips(city: City): NearbyDayTrip[] {
  const trip = (trips as Record<string, { name: string; lat: number; lon: number; sourceUrl: string }>)[city.id];
  if (!trip) return [];
  const distance = Math.round(haversineKm(city.lat, city.lon, trip.lat, trip.lon));
  return [{ id: `${city.id}-nearby`, destination: trip.name, badge: "🧭 Yakın rota · ulaşım bütçesi tahmini", transportType: "Uygun kara/deniz ulaşımını sağlayıcıdan kontrol edin",
    durationOneWay: "Güzergâh ve seferlere göre değişir", roundTripEur: Math.max(10, Math.round(city.transportEur * 3 + distance * 0.06)),
    highlights: `${city.name} çevresinde ${trip.name}. Yaklaşık ${distance} km kuş uçuşu mesafe; karayolu mesafesi değildir.`,
    proTip: `Ulaşım ücreti tahminidir. Seferler, giriş ücretleri ve varsa ülke sınırı koşullarını ayrıca kontrol edin. Yer bilgisi: ${trip.sourceUrl}` }];
}

export function expandedShopping(city: City): CityShoppingGuide {
  return { taxFree: { available: false, verified: false, minSpendEur: 0, minSpendLocalLabel: "Güncel koşullar doğrulanmalıdır", vatRatePercent: 0, netRefundPercent: 0,
    customsTip: "Bu kayıt için vergi iadesi uygunluğu, alt limit ve oran doğrulanmamıştır. Hesaplanan bir vergi iadesi vaadi verilmez; gümrük idaresi ve mağazanın resmî koşullarını inceleyin." },
    souvenirs: (["tasarruflu", "dengeli", "konforlu"] as const).map((tier, i) => ({ id: `${city.id}-souvenir-${tier}`, tier,
      name: ["Yerel kartpostal ve küçük hatıralar", "Yerel tasarım ve kitaplar", "Yerel sanat ve el işi ürünleri"][i], category: "Alışveriş bütçesi önerisi",
      avgEur: [5, 20, 50][i], whereToBuy: `${city.foodArea!.name} çevresindeki mağazaları karşılaştırın`,
      description: "Tutar bir bütçe örneğidir; ürün, stok veya mağaza fiyatı doğrulanmamıştır. Ülkeye girişte ürün kısıtlamalarını kontrol edin." })) };
}

const PLUGS: Record<string, [string, string]> = {
  gb:["G","230V / 50Hz"],ie:["G","230V / 50Hz"],ch:["C / J","230V / 50Hz"],dk:["C / E / F / K","230V / 50Hz"],
  kr:["C / F","220V / 60Hz"],sg:["G","230V / 50Hz"],my:["G","230V / 50Hz"],hk:["G","220V / 50Hz"],ph:["A / B / C","220V / 60Hz"],vn:["A / C","220V / 50Hz"],kh:["A / C / G","230V / 50Hz"],
  in:["C / D / M","230V / 50Hz"],lk:["G","230V / 50Hz"],np:["C / D / M","230V / 50Hz"],qa:["G","240V / 50Hz"],ae:["G","230V / 50Hz"],th:["A / B / C / O","230V / 50Hz"],
  us:["A / B","120V / 60Hz"],ca:["A / B","120V / 60Hz"],au:["I","230V / 50Hz"],nz:["I","230V / 50Hz"],eg:["C / F","220V / 50Hz"],za:["C / D / M / N","230V / 50Hz"],ke:["G","240V / 50Hz"]
};
export function expandedConnectivity(city: City): CityConnectivityGuide {
  const [types, voltage] = PLUGS[city.countryCode!] || ["C / F", "230V / 50Hz"];
  return { estimated: true, esimName: `${city.country} için uyumlu eSIM seçenekleri`, esimDataLabel: "Paket ve cihaz uyumluluğunu kontrol edin", esimPriceEur: 12,
    localSimName: "Resmî yerel operatörlerin ön ödemeli hatları", localSimDataLabel: "Paket, kimlik ve kayıt şartını kontrol edin", localSimPriceEur: 15,
    whereToBuySim: "Resmî operatör veya yetkili satış noktası; fiyatlar bütçe tahminidir.", trRoamingDailyTry: 0,
    tapWater: { drinkable: false, statusLabel: "İçme suyu durumunu yerel resmî kaynaktan doğrulayın", detail: "Bu şehir kaydı için musluk suyu güvenliği doğrulanmamıştır. Yerel su idaresinin ve konakladığınız tesisin güncel bilgisini kontrol edin." },
    plug: { types: `Tip ${types}`, voltage, adapterNeeded: types !== "C / F", detail: "Genel priz referansıdır; tesisin priz tipini ve cihazınızın gerilim/frekans uyumluluğunu seyahatten önce kontrol edin. Adaptör gerilim dönüştürmez." },
    essentialApps: [{ name: "Çevrimdışı harita", purpose: `${city.name} haritasını ve kayıtlı planı seyahatten önce hazırlayın` }, { name: "Resmî ulaşım uygulaması", purpose: "Hat, sefer ve bilet kurallarını yerel işletmeden kontrol edin" }, { name: "Çeviri uygulaması", purpose: "İhtiyacınız olan dil paketini çevrimdışı kullanıma hazırlayın" }] };
}

export function expandedPass(city: City): CityPassInfo {
  return { estimated: true, passName: "Müze ve kültür gezisi bütçesi (tahmini)", durationLabel: "Seçtiğiniz ziyaretlere göre", priceEur: 30,
    includes: "Bu tutar bir City Pass teklifi değildir. Gideceğiniz müzelerin tekil biletlerini ve varsa resmî şehir kartını karşılaştırmak için bütçe örneğidir.",
    transportCardName: "Toplu taşıma bütçesi (tahmini)", transportPassPriceEur: city.transportEur * 3, singleTicketEur: Math.round(city.transportEur / 3 * 10) / 10,
    freeMuseumTip: "Plana alınan gezi durakları dış alan yürüyüşü olarak hazırlanmıştır. Yapı içi ziyaretler, özel alanlar ve turlar ayrıca ücretli olabilir.",
    officialHint: "Gerçek kart/bilet türü, kapsam, havalimanı geçerliliği ve tarifeler yerel resmî satış kanalında kontrol edilmelidir." };
}

export function referenceCurrency(code: string): LocalCurrencyInfo {
  const rate = (currencyReference.rates as Record<string, number>)[code];
  return { code, name: new Intl.DisplayNames(["tr"], { type: "currency" }).of(code) || code, symbol: code, perEur: rate || 1,
    tippingRule: "Bahşiş ve servis bedelini menü/adisyonda kontrol edin; ek ücret varsaymayın.", tippingPercent: 0,
    atmWarning: "Kur dönüşümü ve ATM komisyonunu işlem öncesinde kontrol edin. Bu bilgi kişisel bir banka/kur teklifi değildir." };
}

export function expandedClimate(city: City): ClimateProfile {
  const tropical = Math.abs(city.lat) < 24, southern = city.lat < 0;
  return { idealMonths: tropical ? "Yağış ve sıcaklık dönemini kontrol edin" : southern ? "Eylül–Kasım / Mart–Mayıs" : city.lat > 50 ? "Mayıs–Eylül" : "İlkbahar / Sonbahar",
    idealSeason: tropical ? "Yerel iklim dönemine göre" : "Ilıman dönemler", summary: `${city.tagline}. Bu bölüm genel mevsim rehberidir; tarihli hava tahmini değildir.`,
    seasonTips: { spring: "Güncel sıcaklık ve yağışa göre katmanlı giyinin; açık alan ziyaretlerini hava tahminiyle planlayın.", summer: "Açık alanlarda sıcaklık, güneş ve varsa yağış koşullarını kontrol edin.", autumn: "Gün uzunluğu ve yağışa göre yürüyüş planını ayarlayın.", winter: "Sıcaklık ve gün ışığı koşullarını kontrol edin; bulunduğunuz yarımküreyi dikkate alın." },
    packingTips: "Hava tahminine uygun giysiler, rahat ayakkabılar ve gerekli priz adaptörünü hazırlayın.", bestFor: city.tagline };
}
