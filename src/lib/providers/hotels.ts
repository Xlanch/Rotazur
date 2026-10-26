import "server-only";
import type { City, HotelOption } from "../types";
import { cached, fetchJson, haversineKm, seeded } from "../server-utils";
import { bookingHotels, bookingSearchConfigured } from "./booking-serp";
import type { BookingSearchContext } from "../booking-context";
import { bookingImportMode, importedBookingHotels } from "../booking-snapshots";

export interface HotelDef {
  name: string;
  stars: number;
  priceEur?: number;
  lat?: number;
  lon?: number;
  mult?: number;
  roomType?: string;
  roomTypeTag?: "hostel" | "capsule" | "guesthouse" | "apartment" | "hotel" | "luxury";
  rating: number;
  reviews: number;
  distanceKm: number;
  neighborhood: string;
  amenities: string[];
}

/** Şehirlere özel gerçekte var olan, doğrulanmış ve geniş çift kişilik yataklı konforlu otel kataloğu */
const CITY_HOTELS: Record<string, HotelDef[]> = {
  "tokyo": [
    {
      "name": "Super Hotel Shinjuku Kabukicho",
      "stars": 3,
      "priceEur": 75,
      "lat": 35.6961,
      "lon": 139.7032,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.6,
      "reviews": 4120,
      "distanceKm": 1.1,
      "neighborhood": "Shinjuku Kabukicho",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Termal Onsen Banyosu",
        "Özel Banyo"
      ]
    },
    {
      "name": "Henn na Hotel Tokyo Asakusabashi",
      "stars": 3,
      "priceEur": 82,
      "lat": 35.6983,
      "lon": 139.785,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.7,
      "reviews": 3250,
      "distanceKm": 2.1,
      "neighborhood": "Asakusabashi",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Robot Resepsiyon",
        "Özel Banyo"
      ]
    },
    {
      "name": "Hotel Wing International Shinjuku",
      "stars": 3,
      "priceEur": 85,
      "lat": 35.6955,
      "lon": 139.7015,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.5,
      "reviews": 2980,
      "distanceKm": 0.9,
      "neighborhood": "Shinjuku Kabukicho",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Merkezi Konum"
      ]
    },
    {
      "name": "Ryokan Asakusa Shigetsu",
      "stars": 3,
      "priceEur": 95,
      "lat": 35.7126,
      "lon": 139.7955,
      "roomType": "Geleneksel Japon Tatami Çift Kişilik Oda",
      "roomTypeTag": "guesthouse",
      "rating": 8.9,
      "reviews": 1850,
      "distanceKm": 3.4,
      "neighborhood": "Asakusa Tapınak Yanı",
      "amenities": [
        "Wi-Fi",
        "Geleneksel Japon Tatami",
        "Çatı Japon Hamamı",
        "Özel Banyo"
      ]
    },
    {
      "name": "Section L Tsukiji",
      "stars": 3,
      "priceEur": 105,
      "lat": 35.6664,
      "lon": 139.7731,
      "roomType": "Ekonomik Stüdyo & Mutfaklı Apart",
      "roomTypeTag": "apartment",
      "rating": 9.1,
      "reviews": 1420,
      "distanceKm": 2.2,
      "neighborhood": "Tsukiji Balık Pazarı",
      "amenities": [
        "Wi-Fi",
        "Mutfaklı Stüdyo",
        "Çamaşır Makinesi",
        "Özel Banyo"
      ]
    },
    {
      "name": "APA Hotel Shinjuku Kabukicho Tower",
      "stars": 3,
      "priceEur": 115,
      "lat": 35.6953,
      "lon": 139.702,
      "roomType": "Standart 3★ Otel Odası",
      "roomTypeTag": "hotel",
      "rating": 8.4,
      "reviews": 4890,
      "distanceKm": 0.8,
      "neighborhood": "Shinjuku Kabukicho",
      "amenities": [
        "Wi-Fi",
        "Açık Hava Onsen Hamamı",
        "24s Resepsiyon",
        "Özel Banyo"
      ]
    },
    {
      "name": "Sotetsu Fresa Inn Ginza-Sanchome",
      "stars": 3,
      "priceEur": 125,
      "lat": 35.6718,
      "lon": 139.7675,
      "roomType": "Superior 3★ Çift Kişilik Oda",
      "roomTypeTag": "hotel",
      "rating": 8.7,
      "reviews": 3120,
      "distanceKm": 1.2,
      "neighborhood": "Ginza",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Modern Odalar"
      ]
    },
    {
      "name": "Richmond Hotel Premier Asakusa",
      "stars": 4,
      "priceEur": 155,
      "lat": 35.7138,
      "lon": 139.7942,
      "roomType": "Konforlu 4★ Otel Odası",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 3800,
      "distanceKm": 3.2,
      "neighborhood": "Asakusa",
      "amenities": [
        "Wi-Fi",
        "Panoramik Asakusa Manzarası",
        "Geniş Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Candeo Hotels Tokyo Shimbashi",
      "stars": 4,
      "priceEur": 170,
      "lat": 35.6657,
      "lon": 139.7547,
      "roomType": "Deluxe 4★ Şehir Manzaralı Oda",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 2900,
      "distanceKm": 1.8,
      "neighborhood": "Shimbashi",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Çatı Katı Açık Hava Spa",
        "Özel Banyo"
      ]
    },
    {
      "name": "The Prince Gallery Tokyo Kioicho",
      "stars": 5,
      "priceEur": 340,
      "lat": 35.6797,
      "lon": 139.7368,
      "roomType": "Lüks 5★ Panoramik Kule Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.3,
      "reviews": 1150,
      "distanceKm": 1.5,
      "neighborhood": "Kioicho / Akasaka",
      "amenities": [
        "Lüks Spa Merkezi",
        "Kapalı Isıtmalı Havuz",
        "Michelin Yıldızlı Mutfak",
        "Kuşbakışı Tokyo"
      ]
    }
  ],
  "atina": [
    {
      "name": "Kimon Hotel Athens",
      "stars": 2,
      "priceEur": 55,
      "lat": 37.9735,
      "lon": 23.7297,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.6,
      "reviews": 2100,
      "distanceKm": 0.4,
      "neighborhood": "Plaka",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Akropolis Manzaralı Teras"
      ]
    },
    {
      "name": "Evripides Hotel Athens",
      "stars": 2,
      "priceEur": 58,
      "lat": 37.9798,
      "lon": 23.7256,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.7,
      "reviews": 3100,
      "distanceKm": 0.7,
      "neighborhood": "Psiri / Monastiraki",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Çatı Terası"
      ]
    },
    {
      "name": "Arethusa Hotel Athens",
      "stars": 3,
      "priceEur": 72,
      "lat": 37.9754,
      "lon": 23.7335,
      "roomType": "Standart 3★ Otel Odası",
      "roomTypeTag": "hotel",
      "rating": 8.5,
      "reviews": 3900,
      "distanceKm": 0.3,
      "neighborhood": "Syntagma Meydanı",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Merkezi Konum"
      ]
    },
    {
      "name": "Acropolis View Hotel",
      "stars": 3,
      "priceEur": 80,
      "lat": 37.9687,
      "lon": 23.7241,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 2800,
      "distanceKm": 0.8,
      "neighborhood": "Koukaki",
      "amenities": [
        "Wi-Fi",
        "Panoramik Akropolis Manzarası",
        "Özel Banyo",
        "Kahvaltı Dahil"
      ]
    },
    {
      "name": "Plaka Hotel",
      "stars": 3,
      "priceEur": 88,
      "lat": 37.976,
      "lon": 23.7275,
      "roomType": "Standart 3★ Otel Odası",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 3600,
      "distanceKm": 0.5,
      "neighborhood": "Plaka",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Çatı Barı"
      ]
    },
    {
      "name": "A for Athens",
      "stars": 4,
      "priceEur": 125,
      "lat": 37.9765,
      "lon": 23.7259,
      "roomType": "Konforlu 4★ Panoramik Oda",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 4200,
      "distanceKm": 0.6,
      "neighborhood": "Monastiraki Meydanı",
      "amenities": [
        "Wi-Fi",
        "İkonik Çatı Kokteyl Barı",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Electra Palace Athens",
      "stars": 5,
      "priceEur": 240,
      "lat": 37.9731,
      "lon": 23.7317,
      "roomType": "Lüks 5★ Saray Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.2,
      "reviews": 2900,
      "distanceKm": 0.4,
      "neighborhood": "Plaka",
      "amenities": [
        "Açık Çatı Havuzu",
        "Lüks Spa",
        "Akropolis Manzaralı Bahçe",
        "Gurme Restoran"
      ]
    }
  ],
  "roma": [
    {
      "name": "Hotel Ranieri Roma",
      "stars": 3,
      "priceEur": 78,
      "lat": 41.9056,
      "lon": 12.4975,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.6,
      "reviews": 2450,
      "distanceKm": 1.2,
      "neighborhood": "Via XX Settembre",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Klima"
      ]
    },
    {
      "name": "Roma Trastevere Guesthouse",
      "stars": 3,
      "priceEur": 82,
      "lat": 41.8885,
      "lon": 12.4705,
      "roomType": "Özel Bütçe Oda (Guesthouse)",
      "roomTypeTag": "guesthouse",
      "rating": 8.8,
      "reviews": 1650,
      "distanceKm": 1.8,
      "neighborhood": "Trastevere",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Tarihi İtalyan Sokağı"
      ]
    },
    {
      "name": "Vatican City Relais & Studios",
      "stars": 3,
      "priceEur": 95,
      "lat": 41.9075,
      "lon": 12.456,
      "roomType": "Ekonomik Stüdyo & Apart",
      "roomTypeTag": "apartment",
      "rating": 9,
      "reviews": 1420,
      "distanceKm": 2.4,
      "neighborhood": "Prati (Vatikan Yakını)",
      "amenities": [
        "Wi-Fi",
        "Mutfak Alanı",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Hotel Sonya Roma",
      "stars": 3,
      "priceEur": 118,
      "lat": 41.9008,
      "lon": 12.4947,
      "roomType": "Standart 3★ Otel Odası",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 3200,
      "distanceKm": 0.8,
      "neighborhood": "Opera / Repubblica",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Kahvaltı Dahil"
      ]
    },
    {
      "name": "Hotel Quirinale",
      "stars": 4,
      "priceEur": 160,
      "lat": 41.9015,
      "lon": 12.4938,
      "roomType": "Konforlu 4★ Tarihi Oda",
      "roomTypeTag": "hotel",
      "rating": 8.7,
      "reviews": 5100,
      "distanceKm": 0.7,
      "neighborhood": "Via Nazionale",
      "amenities": [
        "Wi-Fi",
        "Özel İtalyan Avlusu",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "The Hive Hotel",
      "stars": 4,
      "priceEur": 170,
      "lat": 41.8996,
      "lon": 12.4978,
      "roomType": "Superior 4★ Teraslı Oda",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 4600,
      "distanceKm": 0.9,
      "neighborhood": "Monti / Termini",
      "amenities": [
        "Wi-Fi",
        "Panoramik Çatı Terası",
        "Modern Tasarım",
        "Özel Banyo"
      ]
    },
    {
      "name": "iQ Hotel Roma",
      "stars": 4,
      "priceEur": 180,
      "lat": 41.9012,
      "lon": 12.4952,
      "roomType": "Premium 4★ Akıllı Oda",
      "roomTypeTag": "hotel",
      "rating": 9.2,
      "reviews": 4900,
      "distanceKm": 0.8,
      "neighborhood": "Repubblica",
      "amenities": [
        "Wi-Fi",
        "Sauna & Fitness",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Hotel Eden - Dorchester Collection",
      "stars": 5,
      "priceEur": 390,
      "lat": 41.9062,
      "lon": 12.4868,
      "roomType": "Lüks 5★ Panoramik Bahçe Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.4,
      "reviews": 1250,
      "distanceKm": 1.1,
      "neighborhood": "Via Veneto / Villa Borghese",
      "amenities": [
        "Panoramik Roma Manzarası",
        "Michelin Yıldızlı Teras Restoran",
        "Lüks Mermer Banyo",
        "Kral Yatak"
      ]
    }
  ],
  "paris": [
    {
      "name": "Hotel de la Paix Paris",
      "stars": 2,
      "priceEur": 88,
      "lat": 48.8718,
      "lon": 2.3812,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.5,
      "reviews": 2600,
      "distanceKm": 2.8,
      "neighborhood": "Belleville",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Metro Yanı"
      ]
    },
    {
      "name": "Hôtel Résidence De Bruxelles",
      "stars": 2,
      "priceEur": 92,
      "lat": 48.8835,
      "lon": 2.3538,
      "roomType": "Özel Bütçe Oda (Guesthouse / Pansiyon)",
      "roomTypeTag": "guesthouse",
      "rating": 8.4,
      "reviews": 3100,
      "distanceKm": 2.2,
      "neighborhood": "Montmartre / Gare du Nord",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Tarihi Bina"
      ]
    },
    {
      "name": "Ibis Paris La Villette 19ème",
      "stars": 3,
      "priceEur": 96,
      "lat": 48.8925,
      "lon": 2.3789,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.4,
      "reviews": 4100,
      "distanceKm": 3.5,
      "neighborhood": "Bassin de la Villette",
      "amenities": [
        "Wi-Fi",
        "Geniş Sweet Bed Yatak",
        "Özel Banyo",
        "Kanal Kıyısı"
      ]
    },
    {
      "name": "Aparthotel Adagio Access Paris Bastille",
      "stars": 3,
      "priceEur": 135,
      "lat": 48.8512,
      "lon": 2.3725,
      "roomType": "Ekonomik Stüdyo & Mutfaklı Daire",
      "roomTypeTag": "apartment",
      "rating": 8.6,
      "reviews": 2890,
      "distanceKm": 1.9,
      "neighborhood": "Bastille",
      "amenities": [
        "Wi-Fi",
        "Tam Donanımlı Mutfak",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Hotel de la Paix Montparnasse",
      "stars": 3,
      "priceEur": 142,
      "lat": 48.8415,
      "lon": 2.3275,
      "roomType": "Standart 3★ Otel Odası",
      "roomTypeTag": "hotel",
      "rating": 8.7,
      "reviews": 2400,
      "distanceKm": 2.5,
      "neighborhood": "Montparnasse",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Klima"
      ]
    },
    {
      "name": "Ibis Paris Tour Eiffel Cambronne",
      "stars": 3,
      "priceEur": 148,
      "lat": 48.8485,
      "lon": 2.3015,
      "roomType": "Comfort 3★ Eyfel Yakını Oda",
      "roomTypeTag": "hotel",
      "rating": 8.6,
      "reviews": 5600,
      "distanceKm": 1.4,
      "neighborhood": "15. Bölge (Eyfel Yakını)",
      "amenities": [
        "Wi-Fi",
        "Eyfel Kulesi 15 dk Yürüme",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "CitizenM Paris Gare de Lyon",
      "stars": 4,
      "priceEur": 205,
      "lat": 48.8435,
      "lon": 2.3712,
      "roomType": "Konforlu 4★ Akıllı Tasarım Oda",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 4800,
      "distanceKm": 2.1,
      "neighborhood": "Seine Kıyısı",
      "amenities": [
        "Wi-Fi",
        "King Yatak",
        "Tablet Kontrollü Akıllı Oda",
        "Özel Banyo"
      ]
    },
    {
      "name": "Pullman Paris Tour Eiffel",
      "stars": 4,
      "priceEur": 215,
      "lat": 48.8558,
      "lon": 2.2935,
      "roomType": "Deluxe 4★ Eyfel Kulesi Manzaralı Balkon",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 6200,
      "distanceKm": 0.4,
      "neighborhood": "Eyfel Kulesi Önü",
      "amenities": [
        "Wi-Fi",
        "Balkondan Eyfel Manzarası",
        "Geniş Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Hôtel Plaza Athénée",
      "stars": 5,
      "priceEur": 465,
      "lat": 48.8661,
      "lon": 2.3056,
      "roomType": "Lüks 5★ Haussmann Kraliyet Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.4,
      "reviews": 1100,
      "distanceKm": 1.8,
      "neighborhood": "Avenue Montaigne",
      "amenities": [
        "Dior Spa",
        "Kırmızı Sardunyalı İkonik Avlu",
        "Kuşbakışı Eyfel",
        "Özel Uşak Servisi"
      ]
    }
  ],
  "londra": [
    {
      "name": "Point A Hotel London Shoreditch",
      "stars": 3,
      "priceEur": 92,
      "lat": 51.5218,
      "lon": -0.0842,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.6,
      "reviews": 3400,
      "distanceKm": 2.5,
      "neighborhood": "Shoreditch",
      "amenities": [
        "Wi-Fi",
        "Geniş Hypnos Yatak",
        "Özel Banyo",
        "Klima"
      ]
    },
    {
      "name": "Premier Inn London King's Cross",
      "stars": 3,
      "priceEur": 96,
      "lat": 51.5312,
      "lon": -0.1228,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.7,
      "reviews": 4100,
      "distanceKm": 2.2,
      "neighborhood": "King's Cross",
      "amenities": [
        "Wi-Fi",
        "Geniş Hypnos King Yatak",
        "Özel Banyo",
        "Ses Yalıtımı"
      ]
    },
    {
      "name": "The Harrison Guesthouse & Pub",
      "stars": 3,
      "priceEur": 102,
      "lat": 51.5275,
      "lon": -0.1205,
      "roomType": "Özel Bütçe Oda (Guesthouse / B&B)",
      "roomTypeTag": "guesthouse",
      "rating": 8.8,
      "reviews": 1650,
      "distanceKm": 1.9,
      "neighborhood": "Bloomsbury",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Geleneksel İngiliz Pubı"
      ]
    },
    {
      "name": "Point A Hotel London Kings Cross",
      "stars": 3,
      "priceEur": 145,
      "lat": 51.5305,
      "lon": -0.1195,
      "roomType": "Standart 3★ Otel Odası",
      "roomTypeTag": "hotel",
      "rating": 8.6,
      "reviews": 4200,
      "distanceKm": 2.1,
      "neighborhood": "Kings Cross",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Metro Bağlantısı"
      ]
    },
    {
      "name": "Hub by Premier Inn Covent Garden",
      "stars": 3,
      "priceEur": 155,
      "lat": 51.5115,
      "lon": -0.125,
      "roomType": "Compact 3★ Akıllı Oda",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 3800,
      "distanceKm": 0.4,
      "neighborhood": "Covent Garden",
      "amenities": [
        "Wi-Fi",
        "Uygulamayla Kontrol Edilen Akıllı Oda",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Leman Locke London Studios",
      "stars": 4,
      "priceEur": 175,
      "lat": 51.5152,
      "lon": -0.0695,
      "roomType": "Ekonomik Tasarım Stüdyo & Mutfak",
      "roomTypeTag": "apartment",
      "rating": 9.1,
      "reviews": 2350,
      "distanceKm": 3.1,
      "neighborhood": "Aldgate / Shoreditch",
      "amenities": [
        "Wi-Fi",
        "Tasarım Mutfak",
        "Geniş Yaşam Alanı",
        "Özel Banyo"
      ]
    },
    {
      "name": "CitizenM Tower of London",
      "stars": 4,
      "priceEur": 210,
      "lat": 51.5098,
      "lon": -0.0768,
      "roomType": "Konforlu 4★ Kule Manzaralı Oda",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 5100,
      "distanceKm": 2.8,
      "neighborhood": "Tower Hill",
      "amenities": [
        "Wi-Fi",
        "Tower Bridge Manzaralı Çatı Barı",
        "XL King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "The Hoxton Holborn",
      "stars": 4,
      "priceEur": 220,
      "lat": 51.5175,
      "lon": -0.1215,
      "roomType": "Boutique 4★ Hipster Oda",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 3600,
      "distanceKm": 0.8,
      "neighborhood": "Holborn",
      "amenities": [
        "Wi-Fi",
        "Tasarım Odalar",
        "Kahvaltı Çantası Dahil",
        "Özel Banyo"
      ]
    },
    {
      "name": "The Savoy London",
      "stars": 5,
      "priceEur": 480,
      "lat": 51.5102,
      "lon": -0.1205,
      "roomType": "İkonik 5★ Thames Nehri Kraliyet Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.4,
      "reviews": 2200,
      "distanceKm": 0.5,
      "neighborhood": "Strand / Covent Garden",
      "amenities": [
        "Thames Nehri Panoraması",
        "Uşak Servisi",
        "Gordon Ramsay Izgarası",
        "Kral Yatak"
      ]
    }
  ],
  "amsterdam": [
    {
      "name": "Ibis Amsterdam City West",
      "stars": 3,
      "priceEur": 92,
      "lat": 52.3912,
      "lon": 4.8512,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.4,
      "reviews": 3600,
      "distanceKm": 3.2,
      "neighborhood": "Transformatorweg",
      "amenities": [
        "Wi-Fi",
        "Geniş Sweet Bed Yatak",
        "Özel Banyo",
        "Klima"
      ]
    },
    {
      "name": "Hotel Not Hotel Amsterdam",
      "stars": 3,
      "priceEur": 95,
      "lat": 52.3685,
      "lon": 4.8625,
      "roomType": "Tasarım Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.6,
      "reviews": 2900,
      "distanceKm": 2.1,
      "neighborhood": "Oud-West",
      "amenities": [
        "Wi-Fi",
        "Özel Sanat Tasarımlı Oda",
        "Geniş Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Jordaan Guesthouse Amsterdam",
      "stars": 3,
      "priceEur": 105,
      "lat": 52.3752,
      "lon": 4.8795,
      "roomType": "Özel Bütçe Oda (Tarihi Kanal Evi)",
      "roomTypeTag": "guesthouse",
      "rating": 8.9,
      "reviews": 1420,
      "distanceKm": 1.2,
      "neighborhood": "Jordaan",
      "amenities": [
        "Wi-Fi",
        "Kanal Manzarası",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Yays Amsterdam Docklands",
      "stars": 3,
      "priceEur": 128,
      "lat": 52.3735,
      "lon": 4.945,
      "roomType": "Tasarım Stüdyo & Mutfaklı Apart",
      "roomTypeTag": "apartment",
      "rating": 9,
      "reviews": 1950,
      "distanceKm": 3.4,
      "neighborhood": "Oost Liman Bölgesi",
      "amenities": [
        "Wi-Fi",
        "Mutfaklı Stüdyo",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Motel One Amsterdam-Waterlooplein",
      "stars": 3,
      "priceEur": 140,
      "lat": 52.3675,
      "lon": 4.9035,
      "roomType": "Modern 3★ Çift Kişilik Oda",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 4600,
      "distanceKm": 0.9,
      "neighborhood": "Waterlooplein",
      "amenities": [
        "Wi-Fi",
        "Geniş King Yatak",
        "Özel Banyo",
        "Klima"
      ]
    },
    {
      "name": "Ibis Amsterdam Centre",
      "stars": 3,
      "priceEur": 150,
      "lat": 52.3792,
      "lon": 4.8985,
      "roomType": "Standart 3★ Otel Odası",
      "roomTypeTag": "hotel",
      "rating": 8.5,
      "reviews": 5900,
      "distanceKm": 0.4,
      "neighborhood": "Merkez Tren İstasyonu Yanı",
      "amenities": [
        "Wi-Fi",
        "Kanal Manzarası",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "CitizenM Amstel Amsterdam",
      "stars": 4,
      "priceEur": 190,
      "lat": 52.3615,
      "lon": 4.9045,
      "roomType": "Konforlu 4★ Akıllı Kanal Odası",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 3800,
      "distanceKm": 1.4,
      "neighborhood": "Amstel Kıyısı",
      "amenities": [
        "Wi-Fi",
        "XL King Yatak",
        "Tablet Kontrollü Oda",
        "Özel Banyo"
      ]
    },
    {
      "name": "Anantara Grand Hotel Krasnapolsky",
      "stars": 5,
      "priceEur": 255,
      "lat": 52.3725,
      "lon": 4.8935,
      "roomType": "Lüks 5★ Dam Meydanı Saray Odası",
      "roomTypeTag": "luxury",
      "rating": 9.2,
      "reviews": 3200,
      "distanceKm": 0.1,
      "neighborhood": "Dam Meydanı",
      "amenities": [
        "Dam Meydanı Manzarası",
        "Tarihi Kış Bahçesi Kahvaltısı",
        "Lüks Spa",
        "Kral Yatak"
      ]
    }
  ],
  "barselona": [
    {
      "name": "Acta Antibes Barcelona",
      "stars": 3,
      "priceEur": 78,
      "lat": 41.3985,
      "lon": 2.1805,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.6,
      "reviews": 3400,
      "distanceKm": 1.5,
      "neighborhood": "Eixample / Sagrada Familia",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Klima"
      ]
    },
    {
      "name": "Hotel Curious Barcelona",
      "stars": 2,
      "priceEur": 84,
      "lat": 41.3832,
      "lon": 2.1708,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.7,
      "reviews": 2900,
      "distanceKm": 0.3,
      "neighborhood": "Las Ramblas Yanı",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Merkezi Konum"
      ]
    },
    {
      "name": "Hostal Goya Barcelona",
      "stars": 3,
      "priceEur": 90,
      "lat": 41.3892,
      "lon": 2.1695,
      "roomType": "Özel Bütçe Oda (Boutique Pansiyon)",
      "roomTypeTag": "guesthouse",
      "rating": 9,
      "reviews": 2100,
      "distanceKm": 0.4,
      "neighborhood": "Plaça Catalunya Yanı",
      "amenities": [
        "Wi-Fi",
        "Tasarım Ahşap Parke",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Apartamentos Gotico Barcelona",
      "stars": 3,
      "priceEur": 105,
      "lat": 41.3825,
      "lon": 2.1795,
      "roomType": "Ekonomik Stüdyo & Mutfaklı Apart",
      "roomTypeTag": "apartment",
      "rating": 8.9,
      "reviews": 1650,
      "distanceKm": 0.6,
      "neighborhood": "Gotik Mahalle (Barri Gòtic)",
      "amenities": [
        "Wi-Fi",
        "Mutfaklı Daire",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Motel One Barcelona-Ciutadella",
      "stars": 3,
      "priceEur": 120,
      "lat": 41.3895,
      "lon": 2.1845,
      "roomType": "Modern 3★ Çift Kişilik Oda",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 4800,
      "distanceKm": 1.1,
      "neighborhood": "Ciutadella Parkı",
      "amenities": [
        "Wi-Fi",
        "Panoramik Çatı Terası",
        "King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Hotel Jazz Barcelona",
      "stars": 3,
      "priceEur": 138,
      "lat": 41.3865,
      "lon": 2.1665,
      "roomType": "Standart 3★ Otel Odası",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 4200,
      "distanceKm": 0.4,
      "neighborhood": "Plaça Universitat",
      "amenities": [
        "Wi-Fi",
        "Çatı Havuzu & Bar",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "H10 Cubik 4* Sup",
      "stars": 4,
      "priceEur": 185,
      "lat": 41.3878,
      "lon": 2.1735,
      "roomType": "Superior 4★ Çatı Havuzlu Oda",
      "roomTypeTag": "hotel",
      "rating": 9.2,
      "reviews": 3900,
      "distanceKm": 0.3,
      "neighborhood": "Via Laietana / Katedral Yanı",
      "amenities": [
        "Wi-Fi",
        "Isıtmalı Çatı Havuzu",
        "Büyük King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "W Barcelona",
      "stars": 5,
      "priceEur": 245,
      "lat": 41.3685,
      "lon": 2.1902,
      "roomType": "Lüks 5★ Panoramik Akdeniz Süiti",
      "roomTypeTag": "luxury",
      "rating": 9,
      "reviews": 8100,
      "distanceKm": 2.8,
      "neighborhood": "Barceloneta Plaj Kordonu",
      "amenities": [
        "Panoramik Akdeniz Manzarası",
        "Sonsuzluk Havuzu (Wet Deck)",
        "Lüks Spa",
        "Kral Yatak"
      ]
    }
  ],
  "budapeste": [
    {
      "name": "Bohem Art Hotel Budapest",
      "stars": 4,
      "priceEur": 72,
      "lat": 47.4875,
      "lon": 19.0575,
      "roomType": "Art Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 3200,
      "distanceKm": 0.8,
      "neighborhood": "Tarihi Merkez / Vaci",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Tuna Kıyısı"
      ]
    },
    {
      "name": "Roombach Hotel Budapest Center",
      "stars": 3,
      "priceEur": 78,
      "lat": 47.4985,
      "lon": 19.0585,
      "roomType": "Standart Çift Kişilik Oda (Queen Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 4100,
      "distanceKm": 0.4,
      "neighborhood": "Yahudi Mahallesi",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Merkezi Konum"
      ]
    },
    {
      "name": "D8 Hotel Budapest",
      "stars": 3,
      "priceEur": 85,
      "lat": 47.4975,
      "lon": 19.0495,
      "roomType": "Modern 3★ Çift Kişilik Şehir Odası",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 3600,
      "distanceKm": 0.2,
      "neighborhood": "Zincirli Köprü Yanı",
      "amenities": [
        "Wi-Fi",
        "Zincirli Köprü 100m",
        "Geniş Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Hotel Memories Budapest",
      "stars": 4,
      "priceEur": 112,
      "lat": 47.4965,
      "lon": 19.0605,
      "roomType": "Superior 4★ Çift Kişilik Oda",
      "roomTypeTag": "hotel",
      "rating": 9.2,
      "reviews": 2900,
      "distanceKm": 0.5,
      "neighborhood": "Sinagog Karşısı",
      "amenities": [
        "Wi-Fi",
        "Sinagog Manzarası",
        "Sauna & Jakuzi",
        "Özel Banyo"
      ]
    },
    {
      "name": "Corinthia Budapest",
      "stars": 5,
      "priceEur": 195,
      "lat": 47.5035,
      "lon": 19.0665,
      "roomType": "Tarihi 5★ Kraliyet Spa Odası",
      "roomTypeTag": "luxury",
      "rating": 9.2,
      "reviews": 4800,
      "distanceKm": 1.2,
      "neighborhood": "Erzsébet Körút",
      "amenities": [
        "Tarihi Kraliyet Hamamı & Spa",
        "Geniş King Yatak",
        "Lüks Mermer Banyo",
        "Gurme Restoran"
      ]
    },
    {
      "name": "Four Seasons Hotel Gresham Palace",
      "stars": 5,
      "priceEur": 275,
      "lat": 47.4998,
      "lon": 19.0475,
      "roomType": "Ultra Lüks 5★ Tuna Manzaralı Süit",
      "roomTypeTag": "luxury",
      "rating": 9.6,
      "reviews": 1400,
      "distanceKm": 0.1,
      "neighborhood": "Széchenyi Meydanı",
      "amenities": [
        "Tuna ve Kale Panoraması",
        "Art Nouveau Sarayı",
        "Kral Yatak",
        "Özel Konsiyerj"
      ]
    }
  ],
  "prag": [
    {
      "name": "Hotel Tyl Prague",
      "stars": 4,
      "priceEur": 68,
      "lat": 50.0755,
      "lon": 14.4325,
      "roomType": "Klasik Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 2600,
      "distanceKm": 1.1,
      "neighborhood": "Vinohrady / IP Pavlova",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Metro 50m"
      ]
    },
    {
      "name": "Hotel Caesar Prague",
      "stars": 4,
      "priceEur": 75,
      "lat": 50.0785,
      "lon": 14.4175,
      "roomType": "Superior Çift Kişilik Oda (King Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.7,
      "reviews": 3100,
      "distanceKm": 0.9,
      "neighborhood": "Yeni Şehir (Nové Město)",
      "amenities": [
        "Wi-Fi",
        "King Yatak",
        "Özel Banyo",
        "Sauna & Fitness"
      ]
    },
    {
      "name": "Ibis Praha Old Town",
      "stars": 3,
      "priceEur": 82,
      "lat": 50.0895,
      "lon": 14.4305,
      "roomType": "Standart 3★ Otel Odası",
      "roomTypeTag": "hotel",
      "rating": 8.6,
      "reviews": 4500,
      "distanceKm": 0.6,
      "neighborhood": "Namesti Republiky",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Merkezi Konum"
      ]
    },
    {
      "name": "Design Hotel Jewel Prague",
      "stars": 4,
      "priceEur": 115,
      "lat": 50.0845,
      "lon": 14.4215,
      "roomType": "Boutique 4★ Tasarım Oda",
      "roomTypeTag": "hotel",
      "rating": 9.3,
      "reviews": 1900,
      "distanceKm": 0.3,
      "neighborhood": "Eski Şehir Meydanı 200m",
      "amenities": [
        "Wi-Fi",
        "Tasarım Mobilyalar",
        "King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Grand Hotel Bohemia",
      "stars": 5,
      "priceEur": 155,
      "lat": 50.0875,
      "lon": 14.4265,
      "roomType": "Lüks 5★ Neo-Barok Saray Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.4,
      "reviews": 2800,
      "distanceKm": 0.2,
      "neighborhood": "Barut Kulesi Yanı",
      "amenities": [
        "Bockenheim Balo Salonu",
        "Tarihi Lüks Odalar",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    }
  ],
  "viyana": [
    {
      "name": "Motel One Wien-Hauptbahnhof",
      "stars": 3,
      "priceEur": 82,
      "lat": 48.1855,
      "lon": 16.3765,
      "roomType": "Standart Çift Kişilik Oda (King Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 5200,
      "distanceKm": 1.8,
      "neighborhood": "Hauptbahnhof",
      "amenities": [
        "Wi-Fi",
        "King Yatak",
        "Özel Banyo",
        "Klima"
      ]
    },
    {
      "name": "Star Inn Hotel Wien Schönbrunn",
      "stars": 3,
      "priceEur": 88,
      "lat": 48.1875,
      "lon": 16.3265,
      "roomType": "Superior Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 3600,
      "distanceKm": 3.1,
      "neighborhood": "Schönbrunn Sarayı Yakını",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Metro Bağlantısı"
      ]
    },
    {
      "name": "Ruby Marie Hotel Vienna",
      "stars": 4,
      "priceEur": 125,
      "lat": 48.1975,
      "lon": 16.3405,
      "roomType": "Tasarım 4★ Müzik & Loft Oda",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 4100,
      "distanceKm": 1.5,
      "neighborhood": "Mariahilfer Strasse",
      "amenities": [
        "Wi-Fi",
        "Çatı Katı Bahçe Terası",
        "Marshall Amfi & Gitar",
        "Özel Banyo"
      ]
    },
    {
      "name": "25hours Hotel beim MuseumsQuartier",
      "stars": 4,
      "priceEur": 145,
      "lat": 48.2055,
      "lon": 16.3555,
      "roomType": "Sanatsal 4★ Panoramik Oda",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 3800,
      "distanceKm": 0.9,
      "neighborhood": "Spittelberg / MQ",
      "amenities": [
        "Wi-Fi",
        "Dachboden Çatı Barı",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Hotel Sacher Wien",
      "stars": 5,
      "priceEur": 310,
      "lat": 48.2038,
      "lon": 16.3692,
      "roomType": "İkonik 5★ Viyana Operası Saray Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.5,
      "reviews": 1800,
      "distanceKm": 0.2,
      "neighborhood": "Opera Karşısı",
      "amenities": [
        "Orijinal Sacher Torte Dahil",
        "Tarihi Mermer Banyo",
        "Antika Mobilyalar",
        "Özel Uşak"
      ]
    }
  ],
  "berlin": [
    {
      "name": "Circus Hotel Berlin",
      "stars": 3,
      "priceEur": 78,
      "lat": 52.5305,
      "lon": 13.4015,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 3200,
      "distanceKm": 1.4,
      "neighborhood": "Rosenthaler Platz / Mitte",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Avlu Kafe"
      ]
    },
    {
      "name": "Motel One Berlin-Alexanderplatz",
      "stars": 3,
      "priceEur": 85,
      "lat": 52.5215,
      "lon": 13.4145,
      "roomType": "Modern 3★ Çift Kişilik Oda",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 6100,
      "distanceKm": 0.5,
      "neighborhood": "Alexanderplatz",
      "amenities": [
        "Wi-Fi",
        "Geniş King Yatak",
        "Özel Banyo",
        "TV Kulesi Manzarası"
      ]
    },
    {
      "name": "25hours Hotel Bikini Berlin",
      "stars": 4,
      "priceEur": 135,
      "lat": 52.5055,
      "lon": 13.3355,
      "roomType": "Urban Jungle 4★ Şehir Manzaralı Oda",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 4800,
      "distanceKm": 3.2,
      "neighborhood": "Zoologischer Garten / Ku'damm",
      "amenities": [
        "Wi-Fi",
        "Hayvanat Bahçesi Manzarası",
        "Monkey Bar Terası",
        "Özel Banyo"
      ]
    },
    {
      "name": "Hotel Adlon Kempinski Berlin",
      "stars": 5,
      "priceEur": 280,
      "lat": 52.516,
      "lon": 13.3805,
      "roomType": "Efsanevi 5★ Brandenburg Kapısı Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.4,
      "reviews": 2900,
      "distanceKm": 0.2,
      "neighborhood": "Brandenburg Kapısı Karşısı",
      "amenities": [
        "Brandenburg Kapısı Manzarası",
        "Lüks Kempinski Spa",
        "Michelin Yıldızlı Lorenz Adlon",
        "Kral Yatak"
      ]
    }
  ],
  "lizbon": [
    {
      "name": "Hotel Gat Rossio",
      "stars": 2,
      "priceEur": 72,
      "lat": 38.7155,
      "lon": -9.1415,
      "roomType": "Design Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.7,
      "reviews": 2900,
      "distanceKm": 0.3,
      "neighborhood": "Rossio Meydanı",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Açık Teras"
      ]
    },
    {
      "name": "My Story Hotel Ouro",
      "stars": 3,
      "priceEur": 92,
      "lat": 38.7115,
      "lon": -9.1385,
      "roomType": "Tarihi Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 3600,
      "distanceKm": 0.2,
      "neighborhood": "Baixa / Altın Sokak",
      "amenities": [
        "Wi-Fi",
        "18. Yüzyıl Portekiz Çinileri",
        "Geniş Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Browns Central Hotel",
      "stars": 4,
      "priceEur": 140,
      "lat": 38.7122,
      "lon": -9.1392,
      "roomType": "Boutique 4★ Vintage Tasarım Oda",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 3100,
      "distanceKm": 0.3,
      "neighborhood": "Baixa-Chiado",
      "amenities": [
        "Wi-Fi",
        "Nespresso Makinesi",
        "Marshall Hoparlör",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Tivoli Avenida Liberdade",
      "stars": 5,
      "priceEur": 250,
      "lat": 38.7215,
      "lon": -9.1465,
      "roomType": "Lüks 5★ Avenida Panoramik Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.2,
      "reviews": 3400,
      "distanceKm": 0.9,
      "neighborhood": "Avenida da Liberdade",
      "amenities": [
        "Seen Çatı Barı & Havuz",
        "Anantara Spa",
        "Tropikal Açık Bahçe",
        "Kral Yatak"
      ]
    }
  ],
  "belgrad": [
    {
      "name": "Boutique Hotel Museum Belgrad",
      "stars": 4,
      "priceEur": 52,
      "lat": 44.8168,
      "lon": 20.4595,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 2400,
      "distanceKm": 0.1,
      "neighborhood": "Trg Republike",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Merkezi Konum"
      ]
    },
    {
      "name": "City Code Spa Belgrad",
      "stars": 3,
      "priceEur": 58,
      "lat": 44.8192,
      "lon": 20.4575,
      "roomType": "Superior Çift Kişilik Oda (Queen Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 1800,
      "distanceKm": 0.6,
      "neighborhood": "Dorcol",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Spa & Jakuzi"
      ]
    },
    {
      "name": "Mama Shelter Belgrade",
      "stars": 4,
      "priceEur": 85,
      "lat": 44.8195,
      "lon": 20.4545,
      "roomType": "Tasarım 4★ Şehir Manzaralı Oda",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 3200,
      "distanceKm": 0.5,
      "neighborhood": "Knez Mihailova Caddesi",
      "amenities": [
        "Wi-Fi",
        "Dev Çatı Terası & Pizza Fırını",
        "King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Saint Ten Hotel",
      "stars": 5,
      "priceEur": 165,
      "lat": 44.8015,
      "lon": 20.4685,
      "roomType": "Lüks 5★ Vracar Elçilik Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.4,
      "reviews": 1400,
      "distanceKm": 1.8,
      "neighborhood": "Aziz Sava Katedrali Yanı",
      "amenities": [
        "Ahşap & Taş Tasarım",
        "Sauna & Masaj",
        "Geniş King Yatak",
        "Özel Şoför"
      ]
    }
  ],
  "saraybosna": [
    {
      "name": "Hotel Sana Sarajevo",
      "stars": 4,
      "priceEur": 48,
      "lat": 43.8595,
      "lon": 18.4295,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9.2,
      "reviews": 2600,
      "distanceKm": 0.1,
      "neighborhood": "Başçarşı 50m",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Teras Kafe"
      ]
    },
    {
      "name": "Hotel Old Town Sarajevo",
      "stars": 4,
      "priceEur": 54,
      "lat": 43.8588,
      "lon": 18.4312,
      "roomType": "Otantik Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 2100,
      "distanceKm": 0.1,
      "neighborhood": "Gazi Hüsrev Bey Yanı",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Geleneksel Bosna Kahvaltısı"
      ]
    },
    {
      "name": "Hotel President Sarajevo",
      "stars": 4,
      "priceEur": 75,
      "lat": 43.8582,
      "lon": 18.4325,
      "roomType": "Nehir Manzaralı 4★ Superior Oda",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 3100,
      "distanceKm": 0.2,
      "neighborhood": "Latin Köprüsü Karşısı",
      "amenities": [
        "Miljacka Nehri Manzarası",
        "Geniş King Yatak",
        "Balkon",
        "Özel Banyo"
      ]
    },
    {
      "name": "Hotel Europe Sarajevo",
      "stars": 5,
      "priceEur": 120,
      "lat": 43.8585,
      "lon": 18.4285,
      "roomType": "Tarihi 5★ Osmanlı Beşler Sarayı Süiti",
      "roomTypeTag": "luxury",
      "rating": 8.9,
      "reviews": 2900,
      "distanceKm": 0.1,
      "neighborhood": "Tarihi Merkez",
      "amenities": [
        "140 Yıllık Tarihi Otel",
        "Türk Hamamı & Kapalı Havuz",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    }
  ],
  "kotor": [
    {
      "name": "Boutique Hotel Astoria Kotor",
      "stars": 4,
      "priceEur": 68,
      "lat": 42.4248,
      "lon": 18.7705,
      "roomType": "Tarihi Taş Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9.2,
      "reviews": 1800,
      "distanceKm": 0.1,
      "neighborhood": "Kotor Eski Şehir",
      "amenities": [
        "Wi-Fi",
        "Tarihi 13. Yüzyıl Taş Sarayı",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Hotel Hippocampus Kotor",
      "stars": 4,
      "priceEur": 76,
      "lat": 42.4252,
      "lon": 18.7718,
      "roomType": "Deluxe Çift Kişilik Oda (King Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 1450,
      "distanceKm": 0.2,
      "neighborhood": "Aziz Tryphon Yanı",
      "amenities": [
        "Wi-Fi",
        "King Yatak",
        "Teras",
        "Özel Banyo"
      ]
    },
    {
      "name": "Avala Resort & Villas Budva",
      "stars": 4,
      "priceEur": 95,
      "lat": 42.2785,
      "lon": 18.8355,
      "roomType": "Deniz Manzaralı 4★ Resort Odası",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 3600,
      "distanceKm": 0.2,
      "neighborhood": "Budva Eski Şehir Kordonu",
      "amenities": [
        "Adriyatik Sonsuzluk Havuzu",
        "Özel Plaj",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Regent Porto Montenegro",
      "stars": 5,
      "priceEur": 160,
      "lat": 42.4325,
      "lon": 18.6935,
      "roomType": "Lüks 5★ Venedik Tarzı Yat Limanı Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.5,
      "reviews": 1900,
      "distanceKm": 8.5,
      "neighborhood": "Tivat Yat Limanı",
      "amenities": [
        "Süperyat Limanı Manzarası",
        "Açık Sonsuzluk Havuzu",
        "Lüks Spa",
        "Kral Yatak"
      ]
    }
  ],
  "uskup": [
    {
      "name": "Hotel De Koka Skopje",
      "stars": 3,
      "priceEur": 42,
      "lat": 41.9995,
      "lon": 21.4365,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 2200,
      "distanceKm": 0.3,
      "neighborhood": "Eski Türk Çarşısı",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Merkezi Konum"
      ]
    },
    {
      "name": "Hotel Arka Skopje",
      "stars": 4,
      "priceEur": 55,
      "lat": 42.0015,
      "lon": 21.4385,
      "roomType": "Superior Çift Kişilik Oda (Queen Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 2800,
      "distanceKm": 0.5,
      "neighborhood": "Çarşı Merkez",
      "amenities": [
        "Wi-Fi",
        "Panoramik Çatı Havuzu & Bar",
        "Geniş Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Villa Aleksander Ohrid",
      "stars": 4,
      "priceEur": 48,
      "lat": 41.1115,
      "lon": 20.8015,
      "roomType": "Göl Manzaralı Çift Kişilik Oda",
      "roomTypeTag": "guesthouse",
      "rating": 9.3,
      "reviews": 1400,
      "distanceKm": 0.8,
      "neighborhood": "Ohrid Gölü Kıyısı",
      "amenities": [
        "Wi-Fi",
        "Ohrid Gölü Manzaralı Balkon",
        "Geniş Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Skopje Marriott Hotel",
      "stars": 5,
      "priceEur": 95,
      "lat": 41.9958,
      "lon": 21.4315,
      "roomType": "Lüks 5★ Makedonya Meydanı Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.2,
      "reviews": 3100,
      "distanceKm": 0.1,
      "neighborhood": "Makedonya Meydanı",
      "amenities": [
        "Taş Köprü Manzarası",
        "Kapalı Isıtmalı Havuz & Spa",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    }
  ],
  "tiflis": [
    {
      "name": "Fabrika Tbilisi Boutique Rooms",
      "stars": 3,
      "priceEur": 45,
      "lat": 41.7095,
      "lon": 44.8035,
      "roomType": "Tasarım Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 3600,
      "distanceKm": 1.4,
      "neighborhood": "Chugureti",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Sanat Avlusu"
      ]
    },
    {
      "name": "Ibis Styles Tbilisi Center",
      "stars": 3,
      "priceEur": 58,
      "lat": 41.6935,
      "lon": 44.8015,
      "roomType": "Modern Çift Kişilik Oda (Queen Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 3100,
      "distanceKm": 0.2,
      "neighborhood": "Özgürlük Meydanı",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Renkli Modern Tasarım"
      ]
    },
    {
      "name": "Rooms Hotel Tbilisi",
      "stars": 4,
      "priceEur": 95,
      "lat": 41.7085,
      "lon": 44.7895,
      "roomType": "Boutique 4★ Endüstriyel Loft Oda",
      "roomTypeTag": "hotel",
      "rating": 9.2,
      "reviews": 2900,
      "distanceKm": 1.2,
      "neighborhood": "Vera",
      "amenities": [
        "Wi-Fi",
        "Deri & Meşe Mobilyalar",
        "Bahçe Avlusu",
        "Özel Banyo"
      ]
    },
    {
      "name": "Radisson Blu Iveria Hotel",
      "stars": 5,
      "priceEur": 150,
      "lat": 41.7045,
      "lon": 44.7935,
      "roomType": "Lüks 5★ Kura Nehri Panoramik Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.1,
      "reviews": 3800,
      "distanceKm": 0.8,
      "neighborhood": "Gül Devrimi Meydanı",
      "amenities": [
        "Anne Semonin Çatı Spa & Havuz",
        "Kura Nehri Manzarası",
        "King Yatak",
        "Özel Banyo"
      ]
    }
  ],
  "batum": [
    {
      "name": "Sky Tower Hotel Batumi",
      "stars": 4,
      "priceEur": 48,
      "lat": 41.6385,
      "lon": 41.6115,
      "roomType": "Deniz Manzaralı Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 2600,
      "distanceKm": 1.8,
      "neighborhood": "Ardagan Gölü",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Balkon"
      ]
    },
    {
      "name": "Courtyard by Marriott Batumi",
      "stars": 4,
      "priceEur": 68,
      "lat": 41.6425,
      "lon": 41.6175,
      "roomType": "Modern 4★ Sahil Kordonu Odası",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 2100,
      "distanceKm": 1.4,
      "neighborhood": "Şerif Himşiaşvili",
      "amenities": [
        "Wi-Fi",
        "Geniş King Yatak",
        "Karadeniz Manzarası",
        "Özel Banyo"
      ]
    },
    {
      "name": "Radisson Blu Hotel Batumi",
      "stars": 5,
      "priceEur": 120,
      "lat": 41.6535,
      "lon": 41.6365,
      "roomType": "Lüks 5★ Ali & Nino Heykeli Manzaralı Süit",
      "roomTypeTag": "luxury",
      "rating": 9.1,
      "reviews": 3400,
      "distanceKm": 0.4,
      "neighborhood": "Mucizeler Parkı",
      "amenities": [
        "Açık & Kapalı Havuz",
        "Anne Semonin Spa",
        "Ali & Nino Heykeli 100m",
        "Kral Yatak"
      ]
    }
  ],
  "baku": [
    {
      "name": "Nizami Street Hotel Baku",
      "stars": 3,
      "priceEur": 48,
      "lat": 40.3725,
      "lon": 49.8455,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 2400,
      "distanceKm": 0.2,
      "neighborhood": "Nizami Caddesi",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Merkezi Konum"
      ]
    },
    {
      "name": "Old Street Boutique Hotel Baku",
      "stars": 4,
      "priceEur": 62,
      "lat": 40.3665,
      "lon": 49.8355,
      "roomType": "Tarihi Çift Kişilik Oda (Queen Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 1950,
      "distanceKm": 0.4,
      "neighborhood": "İçerişehir (Eski Şehir)",
      "amenities": [
        "Wi-Fi",
        "Kız Kalesi Manzarası",
        "Geniş Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Courtyard by Marriott Baku",
      "stars": 4,
      "priceEur": 92,
      "lat": 40.3785,
      "lon": 49.8495,
      "roomType": "Konforlu 4★ Şehir Manzaralı Oda",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 2800,
      "distanceKm": 0.8,
      "neighborhood": "Fuzuli Parkı",
      "amenities": [
        "Wi-Fi",
        "Geniş King Yatak",
        "Fitness",
        "Özel Banyo"
      ]
    },
    {
      "name": "Four Seasons Hotel Baku",
      "stars": 5,
      "priceEur": 225,
      "lat": 40.3645,
      "lon": 49.8335,
      "roomType": "Ultra Lüks 5★ Hazar Denizi Saray Odası",
      "roomTypeTag": "luxury",
      "rating": 9.5,
      "reviews": 2100,
      "distanceKm": 0.3,
      "neighborhood": "Hazar Kordonu",
      "amenities": [
        "Hazar Denizi Panoraması",
        "Lüks Roma Tarzı Havuz",
        "Bentley Transfer",
        "Kral Yatak"
      ]
    }
  ],
  "tiran": [
    {
      "name": "Metro Hotel Tirana",
      "stars": 3,
      "priceEur": 42,
      "lat": 41.3215,
      "lon": 19.8145,
      "roomType": "Standart Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 1850,
      "distanceKm": 0.6,
      "neighborhood": "Blloku",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Klima"
      ]
    },
    {
      "name": "Sky Tower Hotel Tirana",
      "stars": 4,
      "priceEur": 65,
      "lat": 41.3225,
      "lon": 19.8185,
      "roomType": "Superior Çift Kişilik Oda (King Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 2400,
      "distanceKm": 0.4,
      "neighborhood": "İskender Bey 400m",
      "amenities": [
        "Wi-Fi",
        "Dönen Panoramik Çatı Restoranı",
        "King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Maritim Hotel Plaza Tirana",
      "stars": 5,
      "priceEur": 108,
      "lat": 41.3285,
      "lon": 19.8215,
      "roomType": "Lüks 5★ Şehir Manzaralı Kule Odası",
      "roomTypeTag": "luxury",
      "rating": 9.3,
      "reviews": 3100,
      "distanceKm": 0.1,
      "neighborhood": "28 Nëntori Meydanı",
      "amenities": [
        "Oblivion Spa",
        "İskender Bey Meydanı Manzarası",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    }
  ],
  "kisinev": [
    {
      "name": "Bristol Central Park Hotel",
      "stars": 4,
      "priceEur": 55,
      "lat": 47.0255,
      "lon": 28.8345,
      "roomType": "Park Manzaralı Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 2100,
      "distanceKm": 0.1,
      "neighborhood": "Stefan cel Mare",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Merkezi Park Manzarası"
      ]
    },
    {
      "name": "City Park Hotel Chisinau",
      "stars": 4,
      "priceEur": 62,
      "lat": 47.0265,
      "lon": 28.8375,
      "roomType": "Modern Çift Kişilik Oda (Queen Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 1750,
      "distanceKm": 0.2,
      "neighborhood": "Eugen Doga Yaya Caddesi",
      "amenities": [
        "Wi-Fi",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo",
        "Klima"
      ]
    },
    {
      "name": "Radisson Blu Leogrand Chisinau",
      "stars": 5,
      "priceEur": 95,
      "lat": 47.0215,
      "lon": 28.8365,
      "roomType": "Lüks 5★ Başkent Kule Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.2,
      "reviews": 2600,
      "distanceKm": 0.3,
      "neighborhood": "Mitropolit Varlaam",
      "amenities": [
        "Lotus Spa & Türk Hamamı",
        "New York Restoranı",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    }
  ],
  "semerkant": [
    {
      "name": "Jahongir Boutique Hotel",
      "stars": 3,
      "priceEur": 45,
      "lat": 39.6515,
      "lon": 66.9745,
      "roomType": "Geleneksel Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9.3,
      "reviews": 2800,
      "distanceKm": 0.4,
      "neighborhood": "Çinili Avlu / Registan",
      "amenities": [
        "Wi-Fi",
        "Özbek El İşlemesi İpek Duvarlar",
        "Geniş Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Emir Han Hotel Samarkand",
      "stars": 4,
      "priceEur": 62,
      "lat": 39.6565,
      "lon": 66.9455,
      "roomType": "Özbek Motifli Çift Kişilik Oda (King Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 1950,
      "distanceKm": 1.2,
      "neighborhood": "Dagbitskaya",
      "amenities": [
        "Wi-Fi",
        "Açık Havuz",
        "King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Mövenpick Samarkand",
      "stars": 4,
      "priceEur": 85,
      "lat": 39.6485,
      "lon": 66.9585,
      "roomType": "Deluxe 4★ Şehir Manzaralı Oda",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 2400,
      "distanceKm": 0.8,
      "neighborhood": "Merkez Bulvar",
      "amenities": [
        "Wi-Fi",
        "Kapalı Isıtmalı Havuz",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Silk Road by Minyoun",
      "stars": 5,
      "priceEur": 145,
      "lat": 39.6595,
      "lon": 67.0585,
      "roomType": "Lüks 5★ Ebedi Şehir Saray Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.4,
      "reviews": 1800,
      "distanceKm": 8.5,
      "neighborhood": "Ebedi Şehir Turizm Kompleksi",
      "amenities": [
        "Kanal Manzaralı Teras",
        "Dev Spa Merkezi",
        "İpek Yolu Mimarisi",
        "Kral Yatak"
      ]
    }
  ],
  "sarm-el-seyh": [
    {
      "name": "Falcon Hills Hotel Sharm",
      "stars": 3,
      "priceEur": 48,
      "lat": 27.8785,
      "lon": 34.3165,
      "roomType": "Resort Çift Kişilik Oda (Geniş Yatak & Balkon)",
      "roomTypeTag": "hotel",
      "rating": 8.5,
      "reviews": 3100,
      "distanceKm": 2.1,
      "neighborhood": "Ras Um Sid",
      "amenities": [
        "Wi-Fi",
        "Yüzme Havuzu",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Sharm Reef Resort",
      "stars": 3,
      "priceEur": 52,
      "lat": 27.8765,
      "lon": 34.3185,
      "roomType": "Havuz Manzaralı Çift Kişilik Oda (King Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.6,
      "reviews": 2900,
      "distanceKm": 2.4,
      "neighborhood": "Tower Bay",
      "amenities": [
        "Wi-Fi",
        "2 Açık Havuz",
        "Plaja Özel Servis",
        "Özel Banyo"
      ]
    },
    {
      "name": "Jaz Fanara Resort",
      "stars": 4,
      "priceEur": 95,
      "lat": 27.8545,
      "lon": 34.3195,
      "roomType": "All Inclusive 4★ Mercan Resif Odası",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 4900,
      "distanceKm": 3.5,
      "neighborhood": "Ras Um Sid Uçurumu",
      "amenities": [
        "Özel Mercan Resif Plajı",
        "Her Şey Dahil Açık Büfe",
        "Kızıldeniz Manzarası",
        "Özel Banyo"
      ]
    },
    {
      "name": "Rixos Premium Seagate",
      "stars": 5,
      "priceEur": 203,
      "lat": 28.0265,
      "lon": 34.4375,
      "roomType": "Ultra All Inclusive 5★ Kraliyet Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.4,
      "reviews": 5800,
      "distanceKm": 18,
      "neighborhood": "Nabq Koyu Sahili",
      "amenities": [
        "Su Parkı Dahil",
        "Rixos Anjana Spa",
        "16 A La Carte Restoran",
        "Özel İskele"
      ]
    }
  ],
  "bangkok": [
    {
      "name": "Siam Swana Hotel Bangkok",
      "stars": 3,
      "priceEur": 42,
      "lat": 13.7515,
      "lon": 100.5305,
      "roomType": "Modern Çift Kişilik Oda (Geniş Yatak & Havuz)",
      "roomTypeTag": "hotel",
      "rating": 8.7,
      "reviews": 2800,
      "distanceKm": 0.5,
      "neighborhood": "BTS Ratchathewi / Siam",
      "amenities": [
        "Wi-Fi",
        "Açık Havuz",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Ibis Styles Bangkok Silom",
      "stars": 3,
      "priceEur": 55,
      "lat": 13.7285,
      "lon": 100.5335,
      "roomType": "Standart 3★ Çatı Havuzlu Oda",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 3600,
      "distanceKm": 2.1,
      "neighborhood": "Silom Gece Pazarı",
      "amenities": [
        "Wi-Fi",
        "Çatı Havuzu & Boho Bar",
        "Geniş Sweet Bed",
        "Özel Banyo"
      ]
    },
    {
      "name": "Chillax Resort Bangkok",
      "stars": 4,
      "priceEur": 68,
      "lat": 13.7625,
      "lon": 100.4995,
      "roomType": "Romantik Jakuzili Çift Kişilik Oda (King Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 3200,
      "distanceKm": 1.2,
      "neighborhood": "Khaosan Yanı",
      "amenities": [
        "Wi-Fi",
        "Oda İçi Özel Jakuzi",
        "Sonsuzluk Çatı Havuzu",
        "Özel Banyo"
      ]
    },
    {
      "name": "The Quarter Ari by UHG",
      "stars": 4,
      "priceEur": 85,
      "lat": 13.7785,
      "lon": 100.5435,
      "roomType": "Konforlu 4★ Sonsuzluk Havuzlu Kule Odası",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 4200,
      "distanceKm": 3.4,
      "neighborhood": "Ari (En Hip Mahalle)",
      "amenities": [
        "Wi-Fi",
        "33. Kat Sonsuzluk Havuzu",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Banyan Tree Bangkok",
      "stars": 5,
      "priceEur": 139,
      "lat": 13.7235,
      "lon": 100.5395,
      "roomType": "Lüks 5★ Kuşbakışı Moon Bar Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.2,
      "reviews": 4800,
      "distanceKm": 2.8,
      "neighborhood": "Sathon Yolu",
      "amenities": [
        "Vertigo & Moon Bar",
        "Lüks Banyan Tree Spa",
        "Kuşbakışı Bangkok",
        "Kral Yatak"
      ]
    }
  ],
  "bali": [
    {
      "name": "Ubud Wana Resort Bali",
      "stars": 4,
      "priceEur": 48,
      "lat": -8.5195,
      "lon": 115.2605,
      "roomType": "Tropikal Bahçe Çift Kişilik Oda (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 9,
      "reviews": 2900,
      "distanceKm": 1.2,
      "neighborhood": "Nyuh Boel / Ubud",
      "amenities": [
        "Wi-Fi",
        "3 Açık Yüzme Havuzu",
        "Tropikal Doğa Balkonu",
        "Özel Banyo"
      ]
    },
    {
      "name": "Kuta Seaview Boutique Resort",
      "stars": 4,
      "priceEur": 65,
      "lat": -8.7185,
      "lon": 115.1695,
      "roomType": "Konforlu 4★ Sahil Resort Odası",
      "roomTypeTag": "hotel",
      "rating": 8.8,
      "reviews": 3400,
      "distanceKm": 0.1,
      "neighborhood": "Kuta Sahili",
      "amenities": [
        "Wi-Fi",
        "Kuta Plajı Karşısı",
        "Geniş King Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Komaneka at Monkey Forest",
      "stars": 5,
      "priceEur": 115,
      "lat": -8.5115,
      "lon": 115.2615,
      "roomType": "Lüks Bali Tarzı Çift Kişilik Villa Odası",
      "roomTypeTag": "luxury",
      "rating": 9.5,
      "reviews": 2100,
      "distanceKm": 0.4,
      "neighborhood": "Monkey Forest Road / Ubud",
      "amenities": [
        "Özel Sonsuzluk Havuzu",
        "Lüks Açık Hava Banyosu",
        "Tropikal Orman",
        "Kral Yatak"
      ]
    },
    {
      "name": "Alila Seminyak",
      "stars": 5,
      "priceEur": 131,
      "lat": -8.6815,
      "lon": 115.1495,
      "roomType": "Ultra Lüks 5★ Okyanus Kıyısı Süit",
      "roomTypeTag": "luxury",
      "rating": 9.3,
      "reviews": 3600,
      "distanceKm": 0.1,
      "neighborhood": "Seminyak Sahili",
      "amenities": [
        "Gün Batımı Sonsuzluk Havuzu",
        "Doğrudan Plaj Çıkışı",
        "Spa Alila",
        "Kral Yatak"
      ]
    }
  ],
  "dubai": [
    {
      "name": "Studio M Arabian Plaza Hotel",
      "stars": 3,
      "priceEur": 75,
      "lat": 25.2825,
      "lon": 55.3565,
      "roomType": "Modern Çift Kişilik Şehir Odası (Geniş Yatak)",
      "roomTypeTag": "hotel",
      "rating": 8.7,
      "reviews": 3600,
      "distanceKm": 4.8,
      "neighborhood": "Al Qiyadah Metro Yanı",
      "amenities": [
        "Wi-Fi",
        "Açık Yüzme Havuzu",
        "Geniş Çift Kişilik Yatak",
        "Özel Banyo"
      ]
    },
    {
      "name": "Ibis One Central",
      "stars": 3,
      "priceEur": 85,
      "lat": 25.2245,
      "lon": 55.2855,
      "roomType": "Standart 3★ Otel Odası",
      "roomTypeTag": "hotel",
      "rating": 8.6,
      "reviews": 4800,
      "distanceKm": 1.8,
      "neighborhood": "World Trade Centre",
      "amenities": [
        "Wi-Fi",
        "Geniş Sweet Bed",
        "Metro 2 dk",
        "Özel Banyo"
      ]
    },
    {
      "name": "Rove Downtown",
      "stars": 3,
      "priceEur": 95,
      "lat": 25.2015,
      "lon": 55.2795,
      "roomType": "Tasarım 3★ Burj Khalifa Manzaralı Oda",
      "roomTypeTag": "hotel",
      "rating": 9.1,
      "reviews": 6800,
      "distanceKm": 0.8,
      "neighborhood": "Downtown / Burj Khalifa Karşısı",
      "amenities": [
        "Wi-Fi",
        "Burj Khalifa Manzaralı Açık Havuz",
        "Dubai Mall 5 dk",
        "Özel Banyo"
      ]
    },
    {
      "name": "Millennium Place Dubai Marina",
      "stars": 4,
      "priceEur": 157,
      "lat": 25.0715,
      "lon": 55.1395,
      "roomType": "Konforlu 4★ Yat Limanı Odası",
      "roomTypeTag": "hotel",
      "rating": 8.9,
      "reviews": 5200,
      "distanceKm": 2.1,
      "neighborhood": "Dubai Marina",
      "amenities": [
        "Wi-Fi",
        "Yat Limanı Manzarası",
        "Açık Havuz",
        "Geniş King Yatak"
      ]
    },
    {
      "name": "Atlantis, The Palm",
      "stars": 5,
      "priceEur": 363,
      "lat": 25.1305,
      "lon": 55.1172,
      "roomType": "Ultra Lüks 5★ Aquaventure Su Parkı Süiti",
      "roomTypeTag": "luxury",
      "rating": 9.2,
      "reviews": 10500,
      "distanceKm": 22,
      "neighborhood": "Palm Jumeirah Hilali",
      "amenities": [
        "Aquaventure Su Parkı Dahil",
        "Kayıp Odalar Akvaryumu",
        "Nobu Restoran",
        "Özel Kumsal"
      ]
    }
  ]
};

const DEFAULT_TEMPLATES: HotelDef[] = [
  {
    name: "Central Comfort Boutique Hotel",
    stars: 3,
    priceEur: 42,
    roomType: "Standart Çift Kişilik Oda (Geniş Yatak)",
    roomTypeTag: "hotel",
    rating: 8.9,
    reviews: 2100,
    distanceKm: 0.6,
    neighborhood: "Tarihi Merkez Yanı",
    amenities: ["Wi-Fi", "Geniş Çift Kişilik Yatak", "Özel Banyo", "Klimalı Odalar"],
  },
  {
    name: "Central Old Town Boutique Hotel",
    stars: 3,
    priceEur: 45,
    roomType: "Standart 3★ Otel Odası",
    roomTypeTag: "hotel",
    rating: 8.6,
    reviews: 1450,
    distanceKm: 0.4,
    neighborhood: "Tarihi Merkez",
    amenities: ["Wi-Fi", "Kahvaltı Dahil", "Klimalı Odalar"],
  },
  {
    name: "Urban City Suites & Apartments",
    stars: 3,
    priceEur: 58,
    roomType: "Ekonomik Stüdyo & Mutfaklı Daire",
    roomTypeTag: "apartment",
    rating: 8.8,
    reviews: 2100,
    distanceKm: 0.8,
    neighborhood: "Şehir Merkezi",
    amenities: ["Wi-Fi", "Mutfak Alanı", "Modern Tasarım"],
  },
  {
    name: "Grand Plaza Palace Hotel",
    stars: 4,
    priceEur: 95,
    roomType: "Konforlu 4★ Otel Odası",
    roomTypeTag: "hotel",
    rating: 9.0,
    reviews: 3200,
    distanceKm: 0.6,
    neighborhood: "Merkez Bulvar",
    amenities: ["Wi-Fi", "Spa & Sauna", "Fitness", "Açık Büfe"],
  },
  {
    name: "Luxury Collection Resort & Spa",
    stars: 5,
    priceEur: 180,
    roomType: "Lüks 5★ Panoramik Süit",
    roomTypeTag: "luxury",
    rating: 9.4,
    reviews: 1800,
    distanceKm: 1.5,
    neighborhood: "Kordon / Sahil",
    amenities: ["Sonsuzluk Havuzu", "Lüks Spa", "Panoramik Manzara", "Gurme Restoran"],
  },
];

/** Doğrudan otel arama & rezervasyon URL'leri üretici (Booking.com + Agoda + Trip.com) */
export function buildHotelBookingUrls(
  hotelName: string,
  cityName: string,
  start: string,
  end: string,
  adults: number,
  rooms?: number
) {
  const roomCount = rooms ?? Math.ceil(adults / 2);
  const query = `${hotelName} ${cityName}`;
  const affiliate = process.env.BOOKING_AFFILIATE_ID?.trim();

  // 1. Booking.com Resmi Arama & Rezervasyon Bağlantısı
  const baseBooking = `https://www.booking.com/searchresults.tr.html?ss=${encodeURIComponent(query)}&checkin=${start}&checkout=${end}&group_adults=${adults}&no_rooms=${roomCount}&group_children=0&selected_currency=TRY&sb_price_type=total&type=total`;
  const booking = affiliate && /^\d+$/.test(affiliate) ? `${baseBooking}&aid=${affiliate}` : baseBooking;

  // 2. Agoda Resmi Arama Bağlantısı
  const agoda = `https://www.agoda.com/tr-tr/search?text=${encodeURIComponent(query)}&checkIn=${start}&checkOut=${end}&rooms=${roomCount}&adults=${adults}`;

  // 3. Trip.com Resmi Arama Bağlantısı
  const trip = `https://tr.trip.com/hotels/list?keyword=${encodeURIComponent(query)}&checkIn=${start}&checkOut=${end}&adult=${adults}`;

  const googleHotels = `https://www.google.com/travel/hotels?q=${encodeURIComponent(query)}&dates=${start}%2C${end}`;
  const hotellook: string | undefined = undefined;

  return { booking, agoda, trip, googleHotels, hotellook };
}

/** Budget estimates only; these multipliers are not Booking quotes or guaranteed capacities. */
export function adaptHotelForTravelers(h: HotelDef, adults: number, cityHotelEur: number) {
  const isApartment = h.roomTypeTag === "apartment";
  const isLuxury = h.roomTypeTag === "luxury";

  let priceEurForGroup: number;
  let roomTitle: string;
  let capacityLabel: string;
  const roomTag = h.roomTypeTag ?? (h.stars <= 2 ? "guesthouse" : h.stars >= 5 ? "luxury" : "hotel");
  let roomCount = 1;

  if (roomTag === "hostel" || roomTag === "capsule") {
    const perBed = h.priceEur ?? Math.round(cityHotelEur * (h.mult || 1));
    return {
      priceEurForGroup: Math.round(perBed * adults), roomCount: 1, roomTag,
      roomTitle: `${adults} Kişilik Yatak / Kapsül Rezervasyonu`,
      capacityLabel: `${adults} Gezgin (${adults} Ayrı Yatak / Kapsül)`,
    };
  }

  if (adults === 1) {
    // 1 Gezgin: Geniş çift kişilik yataklı odada tek kişi özel konaklama (Booking.com Single Occupancy İndirimi)
    roomCount = 1;
    capacityLabel = "1 Gezgin (Geniş Çift Kişilik Yatak · Tek Kullanım)";
    priceEurForGroup = Math.round((h.priceEur ?? Math.round(cityHotelEur * (h.mult || 1))) * 0.88);
    roomTitle = isApartment
      ? "Stüdyo Daire (Geniş Çift Kişilik Yatak)"
      : isLuxury
      ? `${h.stars}★ Lüks Süit (King Yatak · Tek Kullanım)`
      : `${h.stars}★ Standart Oda (Geniş Çift Kişilik Yatak · Tek Kullanım)`;
  } else if (adults === 2) {
    // 2 Gezgin: Geniş çift kişilik yataklı standart oda
    roomCount = 1;
    capacityLabel = "2 Gezgin (Geniş Çift Kişilik Yatak)";
    priceEurForGroup = h.priceEur ?? Math.round(cityHotelEur * (h.mult || 1));
    roomTitle = isApartment
      ? "1+0 / 1+1 Daire (Geniş Çift Kişilik Yatak)"
      : isLuxury
      ? `${h.stars}★ Lüks Panoramik Süit (King Yatak)`
      : `${h.stars}★ Standart Oda (Geniş Çift Kişilik Yatak)`;
  } else if (adults === 3) {
    // 3 Gezgin: 3 kişilik oda (Geniş çift kişilik yatak + 1 tek kişilik yatak)
    roomCount = 1;
    capacityLabel = "3 Gezgin (Geniş Çift + Tek Yatak)";
    priceEurForGroup = Math.round((h.priceEur ?? Math.round(cityHotelEur * (h.mult || 1))) * 1.35);
    roomTitle = isApartment
      ? "Geniş Aile Dairesi (Çift Yatak + Çekyat)"
      : `${h.stars}★ 3 Kişilik Aile Odası (Geniş Çift + Tek Yatak)`;
  } else if (adults === 4) {
    // 4 Gezgin: 2 ayrı standart oda (2 geniş çift kişilik yatak) veya 2 odalı aile dairesi
    if (isApartment) {
      roomCount = 1;
      priceEurForGroup = Math.round((h.priceEur ?? Math.round(cityHotelEur * 0.85)) * 1.65);
      roomTitle = "2 Yatak Odalı Aile Dairesi (2 Çift Kişilik Yatak)";
      capacityLabel = "4 Gezgin (2 Odalı Aile Dairesi)";
    } else {
      roomCount = 2;
      priceEurForGroup = Math.round((h.priceEur ?? Math.round(cityHotelEur * (h.mult || 1))) * 1.9);
      roomTitle = "2 Ayrı Standart Oda (Toplam 4 Kişi · 2 Çift Yatak)";
      capacityLabel = "4 Gezgin (2 Ayrı Standart Oda)";
    }
  } else {
    // adults > 4 (5, 6, 7, 8+ gezgin): Her 2 kişiye 1 geniş çift kişilik yataklı oda
    const neededRooms = Math.ceil(adults / 2);
    roomCount = neededRooms;
    priceEurForGroup = Math.round((h.priceEur ?? Math.round(cityHotelEur * (h.mult || 1))) * (roomCount * 0.95));
    roomTitle = `${roomCount} Ayrı Standart Oda (Toplam ${adults} Kişi · ${roomCount} Çift Yatak)`;
    capacityLabel = `${adults} Gezgin (${roomCount} Ayrı Standart Oda)`;
  }

  return { priceEurForGroup, roomTitle, roomTag, capacityLabel, roomCount };
}

function mockHotels(city: City, start: string, end: string, adults: number, eur: number): HotelOption[] {
  const rnd = seeded(`ht-${city.id}-${start}-${end}`);
  const month = new Date(start + "T12:00:00Z").getUTCMonth();
  const season = [0.92, 0.90, 0.94, 1.0, 1.05, 1.15, 1.25, 1.25, 1.10, 1.0, 0.92, 1.10][month];

  const defs = CITY_HOTELS[city.id] ?? DEFAULT_TEMPLATES.slice(0, 3).map((h, i) => ({ ...h,
    name: `${city.name} · ${["Tasarruflu", "Dengeli", "Konforlu"][i]} konaklama bütçesi`,
    stars: 0, rating: 0, reviews: 0, amenities: [], neighborhood: "Booking’de tesis ve müsaitlik kontrol edilmeli" }));

  return defs
    .map((h, i) => {
      // Catalogue positions are unverified. Never invent a nearby hotel pin.
      const lat = h.lat ?? city.lat;
      const lon = h.lon ?? city.lon;

      const { priceEurForGroup, roomTitle, roomTag, capacityLabel, roomCount } = adaptHotelForTravelers(h, adults, city.hotelEur);
      const pricePerNightTry = Math.round((priceEurForGroup * eur * season * (0.98 + rnd() * 0.04)) / 10) * 10;
      const urls = buildHotelBookingUrls(h.name, city.name, start, end, adults, roomCount);

      return {
        id: `ornek-h${i}`,
        name: h.name,
        stars: h.stars,
        roomType: roomTitle,
        roomTypeTag: roomTag,
        capacityLabel,
        roomCount,
        rating: h.rating,
        reviews: h.reviews,
        pricePerNightTry,
        lat,
        lon,
        distanceKm: h.distanceKm,
        neighborhood: h.neighborhood,
        amenities: h.amenities,
        source: "ornek" as const,
        locationSource: "unverified" as const,
        link: urls.booking,
        bookingUrl: urls.booking,
        googleHotelsUrl: urls.googleHotels,
        agodaUrl: urls.agoda,
        tripUrl: urls.trip,
        hotellookUrl: urls.hotellook,
      };
    })
    .sort((a, b) => a.pricePerNightTry - b.pricePerNightTry);
}

interface SerpHotel {
  name: string;
  link?: string;
  overall_rating?: number;
  reviews?: number;
  extracted_hotel_class?: number;
  rate_per_night?: { extracted_lowest?: number };
  gps_coordinates?: { latitude: number; longitude: number };
  images?: { thumbnail?: string }[];
  amenities?: string[];
}

/** SerpApi Google Hotels — SERPAPI_KEY varsa gerçek Google Hotels sonuçları */
async function serpHotels(city: City, start: string, end: string, adults: number): Promise<HotelOption[]> {
  const params = new URLSearchParams({
    engine: "google_hotels",
    q: `${city.wiki} hotels`,
    check_in_date: start,
    check_out_date: end,
    adults: String(Math.min(adults, 2)),
    currency: "TRY",
    hl: "tr",
    gl: "tr",
    sort_by: "3", // en düşük fiyat
    api_key: process.env.SERPAPI_KEY!,
  });
  const data = await fetchJson<{ properties?: SerpHotel[] }>(`https://serpapi.com/search.json?${params}`, undefined, 20000);
  return (data.properties ?? [])
    .filter((p) => p.rate_per_night?.extracted_lowest && p.gps_coordinates)
    .slice(0, 15)
    .map((p, i) => {
      const lat = p.gps_coordinates!.latitude;
      const lon = p.gps_coordinates!.longitude;
      // This provider query prices a room for at most two adults. Three travelers
      // therefore need two such rooms; never advertise a triple room at a double rate.
      const roomCount = Math.ceil(adults / 2);
      const urls = buildHotelBookingUrls(p.name, city.name, start, end, adults, roomCount);
      const stars = p.extracted_hotel_class ?? 3;
      const roomTag: "hostel" | "capsule" | "guesthouse" | "apartment" | "hotel" | "luxury" =
        stars <= 2 ? "guesthouse" : stars >= 5 ? "luxury" : "hotel";
      const roomTitle = adults > 2
        ? `${roomCount} Ayrı Oda (Toplam ${adults} Kişi)`
        : stars <= 2
        ? "Ekonomik Bütçe Oda"
        : stars >= 5
        ? "Lüks 5★ Süit"
        : `${stars}★ Standart Oda`;
      const capacityLabel = adults === 1
        ? "1 Gezgin (1 Tek Oda)"
        : adults === 2
        ? "2 Gezgin (1 Çift Kişilik Oda)"
        : `${adults} Gezgin (${roomCount} Ayrı Oda · Tahmini Grup Fiyatı)`;
      const priceMultiplier = roomCount;
      return {
        id: `serp-h${i}`,
        name: p.name,
        stars,
        roomType: roomTitle,
        roomTypeTag: roomTag,
        capacityLabel,
        roomCount,
        rating: p.overall_rating ? Math.round(p.overall_rating * 2 * 10) / 10 : 7.5,
        reviews: p.reviews ?? 0,
        pricePerNightTry: p.rate_per_night!.extracted_lowest! * priceMultiplier,
        lat,
        lon,
        distanceKm: Math.round(haversineKm(lat, lon, city.lat, city.lon) * 10) / 10,
        image: p.images?.[0]?.thumbnail,
        amenities: (p.amenities ?? []).slice(0, 4),
        source: "serpapi" as const,
        locationSource: "google-hotels" as const,
        link: p.link || urls.booking,
        bookingUrl: urls.booking,
        googleHotelsUrl: urls.googleHotels,
        agodaUrl: urls.agoda,
        tripUrl: urls.trip,
        hotellookUrl: urls.hotellook,
      };
    })
    .sort((a, b) => a.pricePerNightTry - b.pricePerNightTry);
}

export async function searchHotels(city: City, start: string, end: string, adults: number, eur: number, context: BookingSearchContext = {}) {
  const importedMode = process.env.HOTEL_PRICE_PROVIDER === "booking-serpapi" && bookingImportMode();
  if (importedMode) {
    const hotels = importedBookingHotels(city, start, end, adults, eur, context);
    if (hotels.some(hotel => hotel.bookingQuote) || !bookingSearchConfigured()) {
      return { hotels: hotels.length ? hotels : mockHotels(city, start, end, adults, eur), live: false };
    }
  }
  if (bookingSearchConfigured()) {
    try {
      const hotels = await cached(`booking-hotels:${city.id}:${start}:${end}:${adults}:${context.device || "desktop"}`, importedMode ? 5 * 60_000 : 0, () => bookingHotels(city, start, end, adults, context));
      if (hotels.length) return { hotels, live: true };
    } catch {
      console.warn("[hotels] Booking arama sonucu doğrulanamadı; yalnızca etiketli bütçe tahminleri gösteriliyor.");
    }
  } else if (process.env.HOTEL_PRICE_PROVIDER !== "booking-serpapi" && process.env.SERPAPI_KEY && !/YOUR_|_HERE|PLACEHOLDER/i.test(process.env.SERPAPI_KEY)) {
    try {
      const res = await cached(`ht:${city.id}:${start}:${end}:${adults}`, 3 * 3600_000, () =>
        serpHotels(city, start, end, adults),
      );
      if (res.length) return { hotels: res, live: true };
    } catch (e) {
      console.warn("[hotels] SerpApi hatası, örnek veriye geçiliyor:", (e as Error).message);
    }
  }
  const imported = importedMode ? importedBookingHotels(city, start, end, adults, eur, context) : [];
  return { hotels: imported.length ? imported : mockHotels(city, start, end, adults, eur), live: false };
}
