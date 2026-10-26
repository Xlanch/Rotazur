# Otel konumları ve ücretsiz harita katmanları — 23 Ekim 2026

## Yapılan düzeltmeler

- Leaflet'in yapısal CSS dosyası gecikmeli harita bileşeninden uygulamanın kök layout'una taşındı. Canlı tarayıcı kontrolünde `.leaflet-pane`, `.leaflet-tile` ve işaretçilerin `position: static` kaldığı görüldü: doğru GPS verisi bile bu durumda yanlış hizalanıyordu. Yeniden yükleme sonrasında yapısal konumlandırma `absolute` olarak doğrulandı. Genel tasarım CSS'i değiştirilmedi.
- Her otelin Booking tesis kimliği, doğrudan tesis URL yolu, ülke, kaynak adresi, kaynak GPS koordinatı ve kontrol zamanı birlikte tutulur. Haritadaki sayılar bu kaynak kaydıyla birebir aynı olmalıdır. Enlem/boylam sırası değiştirilmez, yuvarlanan gösterim değerleri yönlendirmede kullanılmaz.
- Uygulamadaki 26 şehrin Booking ülke yolları denetlenir. Yanlış ülke, şehirden çok uzak konum, çevrilmiş enlem/boylam, eksik adres veya kimliği tutarsız kayıt harita/yol tarifi kaynağı olamaz. Mevcut normalleştirme 150 km, geniş Bali destinasyonu için 250 km çevre sınırını da korur; bu sınır belediye sınırı veya bina girişi doğrulaması değildir.
- Katalog tahminleri, kimlik/adres kaydı olmayan eski planlar ve Booking tesisiyle eşleştirilmemiş Google Hotels konumları otel iğnesi olarak gösterilmez. Bunların yerine şehir merkezine sahte bir otel noktası konmaz. Eski plan fiyatı silinmez; konum kaydı olmayan otel için yeni arama gerekir.
- Oteller sekmesinde arama yanıtındaki bütün uygun tesisler ayrı kimliklerle gösterilir. Seçili tesis H işaretidir; diğer tesisler pembe noktalardır. Aynı binadaki farklı tesisler tek otel yapılmaz. İşaretçilerin erişilebilir otel adları vardır; tıklamak kart seçimini ve odağı günceller.
- Google Harita bağlantısı artık şehir merkezini değil seçili/fokuslanan noktanın tam koordinatını açar. Karttaki GPS bağlantısı da aynı noktayı kullanır. Eski check-in koordinatı yeni seçilen otelin navigasyon noktasını değiştiremez. Haritada tek otel için yinelenen H/check-in iğneleri kaldırıldı.

## Ücretsiz uydu kaynağı

Kaynak: **ESA WorldCover Sentinel-2 2021 True Colour Composite**, Terrascope'un herkese açık WMTS servisi. API anahtarı, kart, hesap veya ücretli paket eklenmedi. ESA ürünü ücretsiz ve CC BY 4.0 lisanslıdır. Haritada kaynak ve lisans atfı görünür.

- Görüntü yılı: **2021**. Kaynak çözünürlüğü yaklaşık **10 m**; güncel veya bina kapısı düzeyinde bir görüntü değildir. Bu bilgi Uydu düğmesinde ve harita üzerinde gösterilir.
- Katman `esa-worldcover-s2rgbnir-10m-2021-v2_tcc`, EPSG:3857, XYZ/üstten başlayan satır düzeni kullanır. WMTS `TILECOL=x`, `TILEROW=y` değerleri Leaflet ile aynıdır. Street ve Satellite geçişi otel GPS'ini değiştirmez.
- Servis yetenekleri bu katman için enlem -60…83, yerel döşeme zoom 8…14 bildirir. Uygulamanın 26 şehrinin tamamı bu coğrafi kapsamda. Arayüzde 14 üzeri yakınlaştırma yalnızca görüntüyü büyütür; yeni ayrıntı uydurulmaz.
- Servisin duyurduğu REST şablonu canlı kontrolde `Missing WMTS SERVICE parameter` hatası döndürdü. Çalışan standart WMTS KVP/GetTile uç noktası kullanıldı; HTTP 200 / PNG 256×256 yanıtı doğrulandı.
- Uydu yüklenmezse veya başlangıçta 20 saniye boyunca hiçbir döşeme gelmezse aynı GPS noktalarıyla sokak haritasına dönülür. Kısmi yükleme hataları görünürdür. Kapsam dışındaki noktada uydu açılmaz. Sokak haritası OSM'dir; iki kaynak da normal tarayıcı önbelleğini kullanır, çevrimdışı paket için toplu döşeme indirilmez.
- Karanlık tema renk filtresi uyduya uygulanmaz. Katman kaldırılırken kaynak atıfları da doğru sırada kaldırılır.

## Kontrol kapsamı ve sınırlar

- 115 otomatik test geçti; önceki 106 teste 9 harita/konum testi eklendi. 26 destinasyonda kaynak kimliği/adres/GPS birleşimi, ülke eşleştirmesi, hatalı konumu eleme, bütün tesislerin gösterimi, eski check-in verisi, Google koordinatı ve Web Mercator döşeme hesabı test edildi. Gerçek MapView bileşeni izole Leaflet sınırıyla iki katmanda aynı koordinatları çizdi ve uydu hatasında sokak katmanına döndü.
- Yoğun makinede HTTP bağlantısı kurulmadan dolan 120 ms'lik eski ağ testi, 1.500 ms'lik bütçeyle gerçek gövde verisinin geldiğini de zorunlu kılacak şekilde düzeltildi; toplam zaman aşımı koşulu korunur.
- İlk canlı uydu kapsam denemesinde bağlantı/gövde zaman aşımları oldu. IPv4 ve sıkıştırmasız okuma ile başarısız şehirler yeniden kontrol edildi; 26 şehirden **16'sında PNG yanıtı tamamlandı**, 10'unda zaman aşımı/bağlantı sıfırlanması nedeniyle tam görüntü doğrulanamadı. Ayrıntılar `data/map-coverage-check.json` dosyasında. Bu bir ücretli SLA servisi değildir; tüm şehirlerde kesintisiz uydu görüntüsü doğrulandı denilmez. `node scripts/check-map-coverage.cjs` elle yapılan bir kontroldür; otomatik testte veya zamanlayıcıda çalışmaz ve SerpApi çağırmaz.
- Bangkok canlı tarayıcı kontrolünde güncel aramada dönen 25/25 tesis kaynak kayıtlarıyla işaretlendi. Kullanıcının Bang lumphu home stay örneği için adres ve `13.7606315,100.4965923` noktası, kart/popup/Google bağlantısında aynıydı. Sokak ekranı `rotazur-otel-sokak-konum.png` olarak kaydedildi.
- Aynı Bangkok noktası ücretsiz uydu katmanında gerçek yüklenmiş Terrascope PNG döşemesiyle de kontrol edildi; Google bağlantısı değişmedi. Görsel kayıt `rotazur-otel-uydu-konum.png`. Karanlık temada uydu görüntüsüne sokak renk filtresi uygulanmadığı, kaynak/lisans atfının kaldığı ve katman geçişinde eski atıfların temizlendiği görüldü.
- TypeScript, 152 dosyada hedefli statik güvenlik kontrolleri ve ayrı çalışma kopyasında Next.js üretim derlemesi geçti. Ana geliştirme `.next` klasörü üretim derlemesiyle değiştirilmedi.
- Bu çalışma tüm Booking envanterini indirmek veya bütün tesislerin giriş kapısını bağımsız saha ölçümüyle doğrulamak anlamına gelmez. Mevcut arama sonuçları aynı korumalı akıştan geçer. Booking'deki kaynak kaydı yanlış veya eskiyse salt aktarım kontrolü bunu kesin olarak kanıtlayamaz. Kaynaksız bir konum kesinmiş gibi gösterilmez.

## Resmî kaynaklar

- [ESA WorldCover veri, lisans ve kaynak gösterimi](https://esa-worldcover.org/en/data-access)
- [Terrascope WMTS/WMS ve kimlik doğrulamasız genel katmanlar](https://docs.terrascope.be/Developers/WebServices/OGC/WMTSv2.html)
- [Canlı WMTS yetenekleri](https://wmts.terrascope.be/?service=WMTS&request=GetCapabilities)
- [OpenStreetMap döşeme kullanım politikası](https://operations.osmfoundation.org/policies/tiles/)
- [SerpApi Booking tesis kimliği, adres ve GPS şeması](https://serpapi.com/booking-search-api)

E-posta kurulumu/gönderimi ve fiyat otomasyonu ertelenmiş kalır. Yeni ücretli abonelik veya ödeme işlemi yapılmadı.
