# Rotazur — GitHub için temiz proje kopyası

Bu kopyada gerçek API anahtarı, .env.local, kullanıcı veritabanı, kişisel alarmlar, çalışma günlükleri veya derleme dosyaları yoktur. Kaynak kod, tasarım, çeviriler ve 100 şehrin mevcut otel katalogları korunmuştur.

## Yerelde çalıştırma

Node.js 22.16 veya üzeri gerekir.

```sh
npm ci
npm run dev
```

Gerekli ortam değişkenleri `.env.example` içindedir. Anahtar alanları boş bırakılmıştır. Gerçek anahtarlar yalnızca yerel `.env.local` dosyasına veya yayın ortamının gizli değişkenlerine eklenmelidir. Bu dosyayı GitHub’a göndermeyin.

Anahtar olmadan mevcut otel katalogları ve tahmini veriler kullanılabilir; anahtarlı canlı sağlayıcı sorguları çalışmaz. E-posta gönderimi etkinleştirilmemiştir. Bu kopyanın oluşturulması ücretli bir hizmet veya abonelik açmaz.

## Kontrol

```sh
npm run check:release
npm run build
```

Üretimde `NEXT_PUBLIC_SITE_URL` ve gerçek ters vekil düzenine uygun `TRUST_PROXY_HOPS` ayarlanmalıdır. Güncel kullanıcı veritabanı bu depoya eklenmez; uygulama yerelde ihtiyacı olan çalışma dosyalarını oluşturur.

Bu depo asıl çalışma projesinden ayrı hazırlanmış temiz kopyadır. Gerçek API anahtarları ve kullanıcı verileri bu depoda tutulmaz; yerel ortam ayarları ve anahtar yedeği ayrı korunur.
