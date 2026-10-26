const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createLoader } = require('./test-helpers.cjs');
const { extract } = require('./i18n-catalog.cjs');
const load = createLoader();
const { createTranslator, isLanguage, LANGUAGE_LOCALES } = load('src/lib/i18n/runtime.ts');
const { CITIES } = load('src/lib/cities.ts');
const languages = Object.keys(LANGUAGE_LOCALES);
const catalog = lang => lang === 'tr' ? {} : JSON.parse(fs.readFileSync(`public/i18n/${lang}.json`, 'utf8'));
const slots = s => [...s.matchAll(/\{\d+\}/g)].map(m => m[0]).sort();

test('all eight language codes are explicitly validated; storage prototype names never become a language', () => {
  assert.equal(languages.length, 8);
  for (const lang of languages) assert.equal(isLanguage(lang), true);
  for (const value of ['constructor', '__proto__', 'toString', 'en-US', '', null, 1]) assert.equal(isLanguage(value), false);
  for (const locale of Object.values(LANGUAGE_LOCALES)) assert.equal(new Intl.DateTimeFormat(locale).resolvedOptions().calendar, 'gregory');
});

test('server-rendered locale restores the preference and rejects arbitrary cookie paths before filesystem access', async () => {
  const { initialLanguage } = load('src/lib/i18n/server.ts');
  for (const language of languages) {
    const result = await initialLanguage(language);
    assert.equal(result.language, language);
    if (language !== 'tr') assert.ok(Object.keys(result.catalog).length > 6000);
  }
  let reads = 0;
  const isolated = createLoader({ 'node:fs/promises': { readFile: async () => { reads++; throw new Error('Unexpected filesystem access'); } } })('src/lib/i18n/server.ts');
  for (const bad of ['../../.env.local', '__proto__', 'constructor', 'en/../../data', '', undefined])
    assert.equal((await isolated.initialLanguage(bad)).language, 'tr');
  assert.equal(reads, 0);
});

test('streamed metadata translates titles and descriptions while preserving canonical links, images and robots', () => {
  const { translateMetadata } = load('src/lib/i18n/server.ts');
  const metadata = { title: { default: 'Günlük Rota', template: '%s | Rotazur' }, description: 'Uçuş bütçesi tahmini',
    metadataBase: new URL('https://rotazur.com'), alternates: { canonical: '/plan' }, robots: { index: false },
    openGraph: { title: 'Günlük Rota', description: 'Uçuş bütçesi tahmini', url: 'https://rotazur.com/plan', images: ['/logo.png'] },
    twitter: { title: 'Günlük Rota', card: 'summary_large_image', images: ['/logo.png'] } };
  const before = JSON.stringify(metadata);
  for (const language of languages) {
    const result = translateMetadata(metadata, language, catalog(language));
    if (language !== 'tr') assert.notEqual(result.title.default, metadata.title.default, language);
    assert.deepEqual(result.alternates, metadata.alternates);
    assert.deepEqual(result.robots, metadata.robots);
    assert.equal(result.openGraph.url, metadata.openGraph.url);
    assert.deepEqual(result.openGraph.images, metadata.openGraph.images);
    assert.deepEqual(result.twitter.images, metadata.twitter.images);
    assert.equal(result.metadataBase.href, 'https://rotazur.com/');
  }
  assert.equal(JSON.stringify(metadata), before);
});

test('all seven non-Turkish catalogs cover current public UI, 100 city guides and archived room descriptions with intact placeholders', () => {
  const rows = extract(); assert.ok(rows.length > 6000);
  for (const lang of languages.filter(l => l !== 'tr')) {
    const dictionary = catalog(lang);
    const missing = rows.filter(row => !Object.hasOwn(dictionary, row.source));
    assert.deepEqual(missing.map(row => row.source), [], lang);
    for (const [source, target] of Object.entries(dictionary)) {
      assert.ok(typeof target === 'string' && target.trim().length, lang + ': ' + source);
      assert.deepEqual(slots(target), slots(source), lang + ': ' + source);
      assert.equal(target.includes('\n'), false, lang + ': cross-message drift in ' + source);
      assert.doesNotMatch(target, /⟦\d+⟧|⟪\d+⟫/, lang + ': preparation marker leaked');
    }
  }
});

test('dynamic hotel conditions retain requested quantities, dates, source brands, currency and airport codes in every language', () => {
  for (const lang of languages) {
    const tr = createTranslator(catalog(lang), lang);
    const source = 'Ana tutar 5 gece ve 4 yetişkin için arama bedeli ile bilinen ek vergilerin toplamıdır.';
    const output = tr(source);
    assert.ok(output.includes('5') && output.includes('4'), lang);
    if (lang !== 'tr') assert.notEqual(output, source, lang);
    for (const code of ['TRY', 'EUR', 'USD', 'IST', 'GVA', 'SAW', 'DE', 'EN']) assert.equal(tr(code), code, lang);
    assert.equal(tr('https://www.booking.com/hotel/ch/test.html?checkin=2026-11-22&group_adults=4'), 'https://www.booking.com/hotel/ch/test.html?checkin=2026-11-22&group_adults=4');
    if (lang !== 'tr') assert.notEqual(tr('2 × Üç Kişilik Oda'), '2 × Üç Kişilik Oda');
  }
});

test('React presentation translation preserves controls, handlers, keys and original user notes, without injecting HTML or layout wrappers', () => {
  const tr = createTranslator({ 'Kaydet': 'Save', 'Not': 'Note', 'Tarih: {0}': 'Date: {0}', 'Merhaba': '<img src=x onerror=alert(1)>' }, 'en');
  const { localizeTree } = createLoader({ './LanguageContext': { useLanguage: () => ({ lang: 'en', translate: tr }) } })('src/components/Localize.tsx');
  const handler = () => {};
  const source = React.createElement('section', { className: 'card' },
    React.createElement('button', { key: 'save', onClick: handler, title: 'Kaydet' }, 'Kaydet'),
    React.createElement('input', { value: 'Kaydet', placeholder: 'Not', readOnly: true }),
    React.createElement('p', { translate: 'no' }, 'Kaydet'),
    React.createElement('p', null, 'Tarih: ', '2026-11-22'), React.createElement('p', null, 'Merhaba'));
  const result = localizeTree(source, tr), html = renderToStaticMarkup(result);
  assert.equal(result.type, 'section'); assert.equal(result.props.className, 'card');
  assert.ok(html.includes('title="Save"') && html.includes('placeholder="Note"'));
  assert.ok(html.includes('value="Kaydet"') && html.includes('translate="no">Kaydet'));
  assert.ok(html.includes('Date: 2026-11-22'));
  assert.ok(html.includes('&lt;img')); assert.ok(!html.includes('<img'));
  const button = result.props.children[0].props.children;
  assert.equal(button.props.onClick, handler);
});

test('100-city generated itinerary descriptions and day headings translate locally without mutating saved plan data', () => {
  const { buildItinerary } = load('src/lib/planner/itinerary.ts');
  const tr = createTranslator(catalog('en'), 'en');
  const unchanged = [];
  let descriptions = 0;
  for (const city of CITIES) {
    const days = buildItinerary({ city, start: '2026-11-22', nights: 4, travelers: 2, interests: [], flight: null, hotel: null, dailyFood: 1800, eur: 55, tight: false });
    const before = JSON.stringify(days);
    for (const day of days) {
      assert.notEqual(tr(day.title), day.title, `${city.id}: ${day.title}`);
      for (const activity of day.activities) {
        const output = tr(activity.description); descriptions++;
        if (/[çğıİöşüÇĞÖŞÜ]/u.test(activity.description) && output === activity.description) unchanged.push({ city: city.id, text: activity.description });
      }
    }
    assert.equal(JSON.stringify(days), before);
  }
  assert.ok(descriptions > 1500);
  assert.deepEqual(unchanged, []);
});

test('composed source notices, room names, JSX punctuation and literal currency symbols translate without mixed Turkish fragments', () => {
  const translate = createTranslator(catalog('en'), 'en');
  for (const text of [
    'Geçmiş arama fiyatı · yeniden kontrol edin · 24/10/2026, 07:41:22',
    '🏨 Üç Kişilik Oda - Çift Kişilik Yataklı ve Ranzalı',
    'Arama bedeli: TRY 18,914.90. Toplama eklenen vergiler/ücretler: TRY 2,770.03.',
    '· Tahmin noktalarından günlük özet; bugün için modelde bulunan saatler gösterilir. Mevsim rehberi Rotazur tarafından hazırlanmıştır.',
    'İçme suyu durumunu yerel resmî kaynaktan doğrulayın. Bu şehir kaydı için musluk suyu güvenliği doğrulanmamıştır.',
    "Google Haritalar'da Aç", "Gün 1'e Ekle", 'Cenevre tamamlandı',
  ]) assert.doesNotMatch(translate(text), /Geçmiş|yeniden|Çift|Arama bedeli|Toplama|Tahmin|İçme|Haritalar|Gün|tamamlandı/, text);
  for (const lang of languages) {
    const text = createTranslator(catalog(lang), lang)('💶 1 EUR = 55.70 ₺ (Canlı)');
    assert.ok(text.includes('55.70') && text.includes('₺') && text.includes('EUR'), lang);
    assert.ok(!text.includes('$'), lang);
  }
});

test('free local assistant recognizes supported-language topics and leaves unknown personal questions intact', () => {
  const { assistantIntent } = load('src/lib/i18n/assistant-intent.ts');
  for (const word of ['weather', 'Wetter', 'погода', '天气', 'clima', 'météo', 'طقس']) assert.equal(assistantIntent(word), 'yağmur');
  for (const word of ['airport', 'Flughafen', 'аэропорт', '机场', 'aeropuerto', 'aéroport', 'مطار']) assert.equal(assistantIntent(word), 'havalimanı');
  for (const word of ['food', 'Essen', 'еда', '美食', 'comida', 'repas', 'طعام']) assert.equal(assistantIntent(word), 'yemek');
  assert.equal(assistantIntent('Kişisel notum 123'), 'Kişisel notum 123');
});

test('localized travel-guide export retains exact group costs, dates and unknown-time warnings', () => {
  const { buildTravelGuideText } = load('src/lib/travel-guide.ts');
  const tr = createTranslator(catalog('en'), 'en');
  const data = { city: CITIES[0], nights: 4, days: [{ day: 1, date: '2026-11-22', activities: [{ time: 'Saat bekleniyor', title: 'Akşam yemeği', description: 'Ücretsiz.', costTry: 0 }] }], flights: [], hotels: [], restaurants: [], budget: { flight: 1234.56, hotel: 2345.67, food: 0, transport: 0, activities: 0 } };
  const before = JSON.stringify(data);
  const text = buildTravelGuideText({ data, input: { startDate: '2026-11-22', endDate: '2026-11-26', travelers: 2, origin: 'IST' }, budgetTier: 'dengeli', totalTry: 3580.23, cur: 'TRY', rates: {}, includeFlightHotel: false, includeFood: true, includeTips: true, includeBudget: true, locale: 'en-GB', translate: tr });
  assert.ok(text.includes('2026-11-22') && text.includes('2026-11-26'));
  assert.doesNotMatch(text, /SEYAHAT REHBERİ|SAAT|Saat doğrulanmalı|TAHMİNİ BÜTÇE DAĞILIMI/);
  assert.equal(JSON.stringify(data), before);
});
