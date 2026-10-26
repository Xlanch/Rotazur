# Güvenlik ve yayın — 23 Ekim 2026

Bu değişiklikler ücretli servis, abonelik veya e-posta kurulumu gerektirmez.

## İlk üç ek madde ve şifre geçmişi — güncel uygulama

- Kullanıcının açık tercihiyle yeni/sıfırlanan şifrelerde alt sınır **10 karakterdir**; üst sınır 1024 UTF-16 kod birimidir. Alt sınır Unicode karakterleriyle sayılır. Tarayıcı ve sunucu ortak `password-policy.ts` kuralını kullanır. Yaygın şifreler, basit marka/sözcük + rakam kalıpları ve tek karakter tekrarları yerel olarak reddedilir; dışarıya şifre gönderilmez ve ücretli parola kontrolü kullanılmaz. Liste, tüm sızmış şifreleri kapsayan bir veri tabanı değildir. OWASP'ın MFA olmadan 15 karakter önerisi önceki değerlendirmede belirtilmişti; uygulanan 10 sınırı kullanıcının tercihidir.
- Mevcut hesaplar eski şifreleriyle giriş yapmaya devam edebilir. **Yeni şifre seçerken** mevcut şifre ve önceki beş şifre tekrar kullanılamaz. `password_history` yalnızca tuzlu özetleri saklar, düz şifre saklamaz. Geçmiş bu özellikten sonra yapılan başarılı değişikliklerle oluşur; daha önce silinmiş eski şifreler geriye dönük bilinemez. Geçmiş beş kayıtla sınırlanır.
- Sıfırlamada önce kod doğrulanır. Şifre/geçmiş karşılaştırmaları ve yeni özetin üretilmesi asenkrondur; bu hesaplamalar sırasında SQLite yazma kilidi tutulmaz. Sonrasında kod kimliği/süresi, mevcut şifre ve hesap türü tekrar denetlenir. Şifre güncellemesi, geçmiş, kod tüketimi ve oturum iptali tek işlemde tamamlanır veya birlikte geri alınır. Hatalı/reddedilen yeni şifre kodu tüketmez; deneme sınırları işlemeye devam eder.
- Üretimde kayıt/kurtarma talepleri hesap mevcut/yok/Google türünden bağımsız olarak aynı HTTP 200, `success/message` alanları ve `private, no-store` ile yanıtlanır. `devCode`, `realEmailSent`, kullanıcı veya hesap türü dönmez. Hesap kontrolü ve mevcut gönderim fonksiyonu, Next.js `after()` ile yanıt tamamlandıktan sonra çalışır; SMTP gecikmesi açık yanıt süresine eklenmez. Bu yeni bir otomasyon veya ücretli kuyruk değildir. Standart Next Node sunucusu destekler; farklı serverless adaptörlerinde `after/waitUntil` desteği yayın sırasında doğrulanmalıdır: https://nextjs.org/docs/15/app/api-reference/functions/after
- Yerel geliştirmede SMTP olmadan test için kod gösterimi korunur; uygun olmayan taleplerde aynı biçimde, veritabanına yazılmayan bir test kodu döner. Geliştirme sunucusu internete açılmamalıdır. Üretim gönderim hataları adrese/koda yer vermeyen sunucu kaydına yazılır; hesap varlığını açıklayan ayrı HTTP hatası döndürülmez. Yanıt kabul edilmiş talep anlamındadır, teslimat garantisi değildir.
- Kayıt ve sıfırlama doğrulamasında eksik/yanlış/süresi geçmiş/uygunsuz hesaba ait kodlar aynı 400 mesajıyla reddedilir. Kod talebini aynılaştırıp bu adımı farklı bırakmakla oluşabilecek dolaylı hesap sorgulaması da azaltılmıştır.
- Ortak JSON okuyucusu gerçek gelen baytları okurken sınırlar ve **toplam 10 saniye** sonunda 408 döner; her parçada süreyi sıfırlamaz. İptal edilen, bozuk veya geçersiz UTF-8 gövdeler 400 döner. İptal işlemi takılırsa yanıt onu beklemez. Süre, uygulama okuyucusuna ulaşan gövde için geçerlidir; başlık/yavaş bağlantı korumaları gerçek ters vekilde ayrıca yapılandırılmalıdır.
- Ertelenen plan e-postası uç noktası aynı okuyucuyu 64 KiB sınırıyla kullanır; tüm gövdeyi sınırsız belleğe alıp sonra boyut kontrolü yapmaz. SMTP taşıyıcısı/ayarları ve e-posta şablonları değiştirilmedi; gerçek gönderim veya servis kurulumu yapılmadı.

## Şifre ve oturum geçişi

- Yeni şifreler scrypt `N=16384, r=8, p=5` (yaklaşık 16 MiB) profili ve rastgele 16 bayt tuz ile saklanır. Algoritma/sürüm/maliyet bilgisi özetin içinde yer alır. Veritabanından gelen keyfî maliyet parametreleri çalıştırılmaz. Profil, OWASP'ın önerdiği scrypt seçeneklerinden biridir: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Eski şifre özetleri doğrulanabilir. Başarılı girişte yeni profile geçirilir; yanlış girişte değiştirilmez. Girişteki hesaplama asenkrondur; işçi başına en fazla dört işlem kabul edilir, doluysa kısa süre sonra tekrar denemek için 503 döner. Kayıt/sıfırlamanın mevcut işlemsel akışları ve e-posta yapılandırması korunur.
- Asenkron doğrulama sırasında şifre sıfırlanırsa eski şifreyle oturum açılamaz. Şifre güncellemesi ve oturum oluşturma öncesinde kimlik bilgileri aynı SQLite işlemi içinde yeniden kontrol edilir.
- Girişte mevcut modern hesap, eski özetli hesap ve bulunmayan hesap için hem modern hem eski scrypt profili aynı sırayla çalıştırılır. Böylece özet maliyeti farkından hesap varlığı/türü çıkarılması azaltılır. Bu, ağ ve sunucu koşullarında mutlak sabit yanıt süresi garantisi değildir; mevcut işlem kapasitesi ve istek sınırları korunur.
- Yeni oturumlarda tarayıcıdaki rastgele anahtarın SHA-256 özeti saklanır. Mevcut **doğrulanmış** oturumlar ilk veritabanı açılışında tek işlemde dönüştürülür; çerez geçerliliğini korur. Önceden güvenilmez olan `auth_version=0` kayıtları etkinleştirilmez. Veritabanındaki özet çerez olarak kullanılamaz. Önceki yedeklerdeki veya disk geçmişindeki eski verilerin silindiği iddia edilmez.

## Tarayıcı ve sunucu sınırı

- HTML isteklerinde her isteğe özel kriptografik nonce üretilir. Next'in betikleri, tema ve JSON-LD betikleri aynı nonce ile çalışır. İstemciden gönderilen nonce/policy başlıkları üzerine yazılır. HTML yanıtları `private, no-store` olur.
- CSP, nonce taşımayan satır içi betikleri ve HTML olay işleyicilerini engeller. Üretimde `unsafe-eval` yoktur. Leaflet/Framer Motion için satır içi **stiller** korunur; HTTPS görselleri, veri/blob görselleri, yerel fontlar, aynı kaynaktaki API ve service worker çalışabilir. Bu CSP, girdi/çıktı temizleme ve yetkilendirmenin yerine geçmez.
- Nonce nedeniyle sayfalar dinamik render edilir; statik HTML/CDN sayfa önbelleğinin performans avantajı kullanılmaz. Hashli JS/CSS/font dosyaları statik kalır. Çevrimdışı pakette yalnızca herkese açık shell ve statik dosyalar saklanır; shell kendi CSP/nonce eşleşmesiyle geri döner, hesap API'leri saklanmaz.
- Veritabanı, kimlik doğrulama, parola ve hassas sağlayıcı modüllerine `server-only` sınırı eklenmiştir. Yanlışlıkla tarayıcı bileşenine aktarılmaları derlemeyi durdurur. Test yükleyicisindeki marker istisnası yalnızca izole Node testlerinde geçerlidir.

## Yayın komutları

- `npm run check:release`: hedefli güvenlik taraması → TypeScript → tüm regresyon testleri → geliştirme bağımlılıkları dahil `npm audit`. Başarısızlık veya bağımlılık taramasına erişilememesi kontrolü durdurur; paket yüklemez/güncellemez, ücretli sağlayıcı çağırmaz.
- `npm run build` aynı kontrolleri `prebuild` üzerinden zorunlu çalıştırır. Doğrudan `next build` bu npm kancasını atlar; yayın sistemi **npm run build** kullanmalıdır.
- `npm start` önce üretim ayarlarını doğrular. `NEXT_PUBLIC_SITE_URL` gerçek **HTTPS** site kökü olmalıdır; yerel HTTP ayarı üretim için kabul edilmez. `npm run dev` etkilenmez. `TRUST_PROXY_HOPS` gerçek güvenilir proxy sayısı olmalı; proxy dışarıdan gelen `X-Forwarded-For` değerini güvenli şekilde yeniden oluşturmalıdır. Yanlış proxy güveni IP sınırlarını zayıflatır.
- Ayar doğrulaması sertifika kurmaz ve HTTPS'in gerçekte çalıştığını kanıtlamaz. Yayın sunucusunda TLS, HTTP→HTTPS yönlendirmesi, veri/ortam dosyası izinleri ve ağ erişimi ayrıca doğrulanmalıdır. İnternete yayın veya hosting yapılandırması bu çalışmada yapılmamıştır.
- Çalışan geliştirme sunucusunun `.next` dizininin üzerine üretim derlemesi yapmayın; ayrı kopya kullanın.

## Ücretsiz şifreli yedek ve geri yükleme kontrolü

- `npm run backup:db`, açık SQLite veritabanını backup API ile tutarlı biçimde alır; henüz ana dosyaya aktarılmamış WAL kayıtlarını içerir. Kaynak veritabanına yazmaz.
- Yedek AES-256-GCM ile şifrelenir, sonra geçici bir veritabanına geri açılarak `PRAGMA integrity_check` ile doğrulanır. Geçici açık dosyalar temizlenir. Mevcut uygulama veritabanının üzerine geri yükleme yapılmaz.
- Windows'ta yedekler `%LOCALAPPDATA%\Rotazur\database-backups` içine yazılır; OneDrive/proje/public klasörüne yazılmaz. Klasör erişimi mevcut Windows kullanıcısı ve SYSTEM ile sınırlandırılır. Linux'ta klasör 0700, dosyalar 0600 kullanır. Yöntem 512 MiB üzerindeki veritabanlarında durur; akış tabanlı yedekleme gerekir.
- `backup-key.bin` gizlidir; paylaşmayın veya kaynak kontrolüne eklemeyin. Anahtar kaybolursa yedekler açılamaz. Disk kaybına karşı yedeğin ve anahtarın ayrı güvenli cihazda kopyaları gerekir; aynı diskteki şifreleme disk arızasına karşı yedeklilik sağlamaz.
- Mevcut bir yedeği kaynak veritabanına dokunmadan sınamak: `npm run backup:db -- --verify "YEDEGIN_TAM_YOLU.rotabak"`.
- Zamanlanmış görev/otomasyon kurulmadı. Bu komut elle çalıştırılır; barındırma ortamındaki düzenli yedekleme sıklığı yayın aşamasında belirlenmelidir.

## Yapılan doğrulama

Son kaynaklarla **135 test**, TypeScript, 163 dosyada hedefli statik tarama ve bağımlılık taraması geçti; bilinen bağımlılık açığı bildirilmedi. Ayrı kopyada `npm run build`, zorunlu yayın kontrolleriyle tamamlandı. SMTP ve dış sağlayıcı anahtarları boş olan üretim test sunucusunda kayıt/kurtarma yanıtlarının eşitliği, mevcut ve önceki şifrenin reddi, sıfırlamada oturum iptali ve büyük gövde için 413 doğrulandı. Yavaş gövde 10.019 saniyede 408 döndürdü. Gerçek kullanıcı hesabı veya şifresi değiştirilmedi. Üretim tarayıcısında kayıt alanı `minLength=10`, `maxLength=1024` olarak ve mevcut tasarımıyla doğrulandı. AuthModal içindeki 168 `className` niteliği, genel CSS, Navbar ve e-posta modülü değişiklik öncesiyle aynı.

Şifreli SQLite yedeği alındı; geçici veritabanına geri açılarak bütünlüğü doğrulandı. Önceki doğrulamada üretim ana sayfa/plan geçişi, harita stilleri ve çevrimdışı paket hazırlığı çalışmıştı. Test sunucusu kapatıldıktan sonra kaydedilen plan service worker'ın sakladığı CSP/nonce eşleşmesiyle yeniden açılmış, tarih ve bütçe korunmuştu. Bu sonuçlar kapsamlı sızma testi veya gerçek yayın sunucusunun güvenlik onayı değildir.
