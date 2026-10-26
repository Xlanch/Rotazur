# Dil kapsamı ve rota ekranı düzeltmeleri — 24 Ekim 2026

## Neden oluşuyordu?

Eski dil sözlüğü ana sayfa, arama formu ve bazı menü başlıklarını kapsıyordu. Rota ekranının büyük kısmı, sağlayıcı açıklamaları, günlük program, rehberler, harita uyarıları ve yardımcı pencereler doğrudan Türkçe metin üretiyordu. Seçicide EN/DE vb. görünmesi bu metinleri çevirmiyordu. Tarihler ve bazı para/sayı gösterimleri de `tr-TR` biçimine sabitlenmişti.

## Yapılanlar

- Türkçe, İngilizce, Almanca, Rusça, Çince (basitleştirilmiş), İspanyolca, Fransızca ve Arapça için ortak bir sunum katmanı uygulandı. **10.053 güncel metin/şablon**, Türkçe dışındaki yedi yerel sözlükte kapsanıyor. Sekiz dilin tümü aynı hesap ve veri modelini kullanır.
- Rota sekmeleri, günlük etkinlikler, otel oda açıklamaları, uçuş/fiyat uyarıları, restoran/şehir bilgileri, hava durumu, harita metinleri, menüler, yardımcı pencereler ve rehber/paylaşım çıktıları bu katmana bağlandı. JSX içindeki kesme işaretleri, tırnaklar, simgeler ve kalın yazılı parçalar da ele alındı.
- Çeviri React öğeleri üzerinden yapılır; sayfa DOM'una dışarıdan müdahale edilmez, HTML enjekte edilmez ve yeni bir yerleşim kutusu eklenmez. Kontrol değerleri, olay işleyicileri ve bileşen kimlikleri korunur. Dil değişiminde eldeki plan verileri kullanılır.
- Kaydedilen planın asıl verisi, tutarlar, kişi/oda sayıları, tarihler, tesis kimlikleri, GPS ve rezervasyon bağlantıları çevrilip değiştirilmez. Kişisel gezi notları, kullanıcı adları ve konuşma kartlarının hedef dildeki özgün cümleleri korunur.
- Tarih, süre, sayı ve para biçimleri seçilen dile bağlandı. Arapça sağdan sola gösterilir; seyahat tarihleri için Miladi takvim korunur. Para birimi kodları, havaalanı kodları, marka adı ve ₺ simgesi korunur.
- Dil tercihi yerel depolama ve tercih çereziyle hatırlanır. İlk sunucu çıktısı seçili dilin sözlüğünü alır; sayfa yenilenince yeniden Türkçe içerikle başlanmaz. Tarayıcı sekmesinin başlığı da dil ve sayfayla güncellenir. Bozuk dil değerleri ve dosya yolu denemeleri reddedilir.
- Çevrimdışı pakete yedi sözlük eklendi. Kullanılan sözlük ayrıca aynı kaynaktan statik dosya olarak önbelleğe alınır. Önceki çevrimdışı önbellek silinmedi; API veya özel kullanıcı sayfaları önbelleğe eklenmedi.

## Ücret ve çeviri yöntemi

İlk taslaklar yalnızca projenin herkese açık sabit metinlerinden tek seferlik ve anahtarsız olarak hazırlandı; fiyat/oda/kişi/garanti terimleri ve örnek ekranlar ayrıca gözden geçirildi. Ziyaretçinin yazdığı metin, hesabı veya kişisel planı dışarıya çeviriye gönderilmez. Çalışan site Google Translate, Cloud Translation veya başka bir çevrimiçi çeviri API'si çağırmaz; kendi `/i18n/*.json` dosyalarını kullanır.

Ücretli hesap, kredi, abonelik veya yeni bağımlılık açılmadı. E-posta ayarları ve gönderimi etkinleştirilmedi. Hazırlama betiği zamanlanmış görev, uygulama başlangıcı veya yayın kontrolü sırasında çalışmaz.

Dil dosyaları bakım yapılabilir sabit sözlüklerdir. Sonradan eklenen sabit metinlerde eksik kapsam yayın testini durdurur. Yeni/öngörülemeyen serbest sağlayıcı metni, özel isim veya kullanıcı notu için anlam uydurulmaz; özgün metin korunur. Bütün şehir metinleri için ana dili editörü tarafından yapılmış bir üslup incelemesi iddiası yoktur.

## Doğrulama

- **173/173 test**, TypeScript, üretim derlemesi ve hedefli güvenlik taraması başarılı; `npm audit` **0 açık** bildirdi.
- Sözlük kapsamı ve değişken yer tutucuları yedi dilde kontrol edildi. 100 şehrin üretilen günlük program açıklamaları, kaynak veri değişmeden İngilizce sunumla sınandı.
- Gerçek üretim ekranında sekiz dil sırayla seçildi: her dilde 25 otel kaldı, otel ekranı başlığı çevrildi, denetlenen Türkçe fiyat etiketleri kalmadı ve 25 Booking bağlantısı birebir aynı kaldı. Arapça `rtl`, diğerleri `ltr` olarak doğrulandı. Dil değişirken açık otel sekmesi korundu; tarayıcı konsolunda hata görülmedi.
- Matris kaydı: `data/i18n-research/browser-language-checks.json`. Test kaydı: `data/i18n-research/release-check.log`. Üretim derlemesi localhost geliştirme dizininden ayrı geçici klasörde yapıldı.
- Yedek: `AppData/Local/Rotazur/backups/i18n-audit-20261024`. Genel stil dosyası ve e-posta modülü korunmuştur.
- Tasarım karşılaştırmasında 49 mevcut TSX dosyasının `className` değerlerinde değişiklik yok. Derlenen 160 kaynak dosyası güncel projeyle aynı. Localhost ana sayfa ve rota HTML'i, İngilizce tercih çereziyle İngilizce `lang` ve çevrilmiş sunucu başlığı döndürdü (HTTP 200).
- Son üretim derlemesinde sekiz dilin ekran matrisi tekrarlandı; sekme başlıkları da çevrildi, açık otel sekmesi/25 tesis/rezervasyon bağlantıları korundu ve konsolda hata görülmedi. Geçici test sekmesi ve sunucusu kapatıldı; kullanıcının `localhost:3000` sunucusu açık bırakıldı.

## Ekranlar

- `rotazur-dil-ingilizce-kontrolu-20261024.png`
- `rotazur-dil-arapca-kontrolu-20261024.png`
