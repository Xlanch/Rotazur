# Rotazur servis kullanımı — 22 Ekim 2026

23 Ekim güncellemesi: 100 şehir, Booking tesis arşivi, Wikimedia lisanslı yeni görseller ve yalnızca ücretsiz Aviasales Data API kullanan uçuş otomasyonu eklendi. Güncel seçimler, fiyatların kapsamı ve kota kuralları [SEHIR-VE-UCUS-GUNCELLEMESI.md](SEHIR-VE-UCUS-GUNCELLEMESI.md) içindedir. Aşağıdaki tablo önceki aşamanın kaydıdır; artık varsayılan uçuş akışı diğer sağlayıcılara otomatik geçmez.

Bu kayıt teknik servis seçimini ve gerekli kaynak gösterimlerini açıklar. Ücretli hesap açılmaz veya abonelik etkinleştirilmez. Üretim ortamındaki hesapların faturalandırması sağlayıcının kendi panelinden yönetilir.

| İşlev | Etkin kaynak / davranış | Koşullar |
| --- | --- | --- |
| Hava tahmini | MET Norway Locationforecast 2.0 compact | Anahtarsız ve ücretsiz; CC BY 4.0 ticari yeniden kullanıma izin verir. MET Norway, lisans bağlantısı ve günlük özetleme bilgisi hava kartında ve alt bilgide gösterilir. |
| Döviz dönüşümü | ExchangeRate-API Open Access; hata halinde Frankfurter | Open Access ticari döviz dönüşümüne izin verir; `Rates By Exchange Rate API` bağlantısı alt bilgidedir. Veriler Rotazur içindeki dönüşümler içindir, ayrı bir kur veri ürünü olarak yeniden dağıtılmaz. Frankfurter için [koşullar](https://frankfurter.dev/). |
| Sokak haritası | OSM Foundation standart döşemeleri | Harita üzerinde görünür ve bağlantılı `© OpenStreetMap contributors` ibaresi bulunur. Normal tarayıcı önbelleği kullanılır; döşemeler çevrimdışı pakete indirilmez. Sunucular sınırlı kapasiteli ve hizmet garantisizdir; yüksek trafik için uygun kapasitede bir döşeme sağlayıcısı gerekir. |
| Uydu haritası | ESA WorldCover Sentinel-2 2021, Terrascope genel WMTS | Anahtarsız, ücretsiz; ESA'nın CC BY 4.0 ürünü ve görünür atıf kullanılır. 2021 / yaklaşık 10 m bilgisi gösterilir; güncel bina girişi görüntüsü değildir. Hata/zaman aşımında aynı GPS noktalarıyla OSM sokak haritasına dönülür. Serviste kesintisiz erişim garantisi yoktur. Ayrıntılar [HARITA-KONUM-KONTROLU.md](HARITA-KONUM-KONTROLU.md). |
| Uçuş verisi | Mevcut Travelpayouts entegrasyonu | Var olan token kullanılır; yeni abonelik veya ödeme işlemi yapılmaz. Sağlayıcı erişim ve ortaklık koşulları geçerlidir. |
| Booking otel araması | Kullanıcının eklediği anahtarla etkin SerpApi Booking Search adaptörü | Booking Demand API değildir. Üçüncü taraf hesap ve kullanım koşulları geçerlidir. Son hesap kontrolünde Free Plan / 0 dolar doğrulandı. Uygulama tüm SerpApi sorgularına toplam 45/saat ve 200/son 31 gün sınırı koyar. Ayrıntılar [BOOKING-ENTEGRASYONU.md](BOOKING-ENTEGRASYONU.md). Ücretli paket veya zamanlanmış tarama açılmadı. |
| İsteğe bağlı sağlayıcılar | SerpApi, RapidAPI, Amadeus, Kiwi, Google Places, Gemini | Anahtar tanımlanması ilgili kod yolunu etkinleştirebilir. Bunların ücretsiz veya sınırsız olduğu varsayılmamalıdır. Yerel kontrolde mevcut anahtarların değerleri çıktıya yazılmamıştır. |
| Şehir fotoğrafları | Mevcut Unsplash görsel bağlantıları | [Unsplash lisansı](https://unsplash.com/license) ticari kullanıma izin verir. Fotoğraflar ayrı bir fotoğraf ürünü olarak satılmaz. |

Hava durumu uygulaması ve zamanlanmış betik aynı `src/lib/weather/met-client.cjs` sağlayıcısını kullanır. Tanıtıcı User-Agent, dört ondalıklı koordinat, kalıcı önbellek, Expires, If-Modified-Since/304, eşzamanlı istek birleştirme ve hata/kota beklemesi uygulanır. Zorunlu senkronizasyon da kaynağın bekleme sürelerini atlamaz.

Önbellekler `data/met-weather-v1/` ve `data/daily_met_weather_v1.json` içindedir; önceki sağlayıcının dosyası bu akışa alınmaz. Günlük sıcaklık aralıkları tahmin noktalarından özetlenir; bugün için modelde bulunan saatler gösterilir. Eksik yağış olasılığı ve rüzgâr değerleri uydurulmaz. Şehir saat dilimi kullanılır. MET'nin yaklaşık dokuz günlük tahmin kapsamı dışındaki seyahatler için geçen yılın verilerine başvurulmaz; statik mevsim rehberi korunur.

Resmî kaynaklar:

- [MET kullanım şartları](https://api.met.no/doc/TermsOfService), [lisans](https://api.met.no/doc/License), [Locationforecast](https://api.met.no/doc/locationforecast/HowTO)
- [ExchangeRate-API Open Access](https://www.exchangerate-api.com/docs/free)
- [OSM döşeme kullanım politikası](https://operations.osmfoundation.org/policies/tiles/), [attribution](https://www.openstreetmap.org/copyright)
- [Esri servis şartları](https://www.esri.com/en-us/legal/terms/web-site-service), özellikle 2.2 ve 2.2.1

E-posta kurulumu bu değişiklik kapsamında ertelenmiş olarak kalır.
