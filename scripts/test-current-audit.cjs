const test = require('node:test'), assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createLoader } = require('./test-helpers.cjs');
const load = createLoader();
const format = load('src/lib/format.ts');
const currency = load('src/lib/currency-rates.ts');

test('currency tables reject partial, nonnumeric, overflowing, negative and incorrectly based quotes', () => {
  assert.deepEqual(currency.readCurrencyRates(format.DEFAULT_RATES), format.DEFAULT_RATES);
  for (const bad of [null, [], {}, { EUR: 50, USD: 40 }, { ...format.DEFAULT_RATES, TRY: 2 }])
    assert.equal(currency.readCurrencyRates(bad), null);
  for (const code of currency.CURRENCY_CODES) for (const value of [0, -1, NaN, Infinity, '50', Number.MIN_VALUE])
    assert.equal(currency.readCurrencyRates({ ...format.DEFAULT_RATES, [code]: value }), null);
  for (const code of currency.CURRENCY_CODES) assert.equal(currency.isCurrencyCode(code), true);
  for (const value of ['constructor', '__proto__', 'JPY', null]) assert.equal(currency.isCurrencyCode(value), false);
  for (const value of [0, -5, Infinity, '50', Number.MIN_VALUE]) {
    assert.equal(format.fmtCur(100, 'USD', { USD: value }), format.fmtCur(100, 'USD'));
    assert.equal(format.fmtMoney(100, 'USD', { USD: value }), format.fmtMoney(100, 'USD'));
  }
});

function provider(fetchJson, previous) {
  return createLoader({
    'node:fs': { existsSync: () => !!previous, readFileSync: () => JSON.stringify(previous), mkdirSync() {}, writeFileSync() {} },
    '../server-utils': { cached: (_key, _ttl, callback) => callback(), fetchJson },
  })('src/lib/providers/currency.ts');
}
const feedQuotes = { EUR: 0.02, USD: 0.025, GBP: 0.016, RUB: 1.7, CNY: 0.14, SAR: 0.09, AED: 0.088 };

function walk(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(walk);
  return [node, ...walk(node.props?.children)];
}

/** Exercise event handlers/effect cleanup with React's external I/O replaced. */
function hookHarness(overrides) {
  const hooks = []; let index = 0, pending = [];
  const react = { ...React,
    useState(initial) { const i = index++; if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial;
      return [hooks[i], next => { hooks[i] = typeof next === 'function' ? next(hooks[i]) : next; }]; },
    useRef(initial) { const i = index++; return hooks[i] ||= { current: initial }; },
    useEffect(effect, deps) { const i = index++, old = hooks[i];
      if (!old || deps.some((value, j) => value !== old.deps[j])) {
        old?.cleanup?.(); hooks[i] = { deps }; pending.push(() => { hooks[i].cleanup = effect(); });
      } },
    useMemo: fn => fn(),
  };
  const isolated = createLoader({ ...overrides, react });
  return { load: isolated, render(component, props) { index = 0; pending = []; const tree = component(props); pending.forEach(fn => fn()); return tree; },
    cleanup() { for (const hook of hooks) hook?.cleanup?.(); } };
}

test('price alert success depends on the server, survives blocked local storage and prevents simultaneous duplicate submits', async () => {
  let requests = [], finish;
  const oldFetch = global.fetch, oldStorage = global.localStorage;
  global.localStorage = { setItem() { throw new Error('Storage blocked'); } };
  global.fetch = (url, options) => { requests.push({ url, options }); return new Promise(resolve => { finish = resolve; }); };
  const runner = hookHarness({
    './AuthContext': { useAuth: () => ({ user: { id: 'A', email: 'a@example.invalid' }, openAuthModal() {} }) },
    './CurrencyContext': { useCurrency: () => ({ currency: 'TRY', rates: format.DEFAULT_RATES }) },
    '@/components/useLocaleFormat': { useLocaleFormat: () => format },
  });
  try {
    const Modal = runner.load('src/components/PriceAlertModal.tsx').PriceAlertModal;
    const props = { isOpen: true, onClose() {}, cityId: 'roma', cityName: 'Roma', currentPrice: 1000 };
    runner.render(Modal, props);
    const tree = runner.render(Modal, props), submit = walk(tree).find(node => node.type === 'form').props.onSubmit;
    const first = submit({ preventDefault() {} });
    await submit({ preventDefault() {} }); assert.equal(requests.length, 1);
    finish(Response.json({ ok: true, alert: { id: 'test' } })); await first;
    const result = runner.render(Modal, props);
    assert.ok(walk(result).some(node => node.type === 'h4' && node.props.children === 'Alarm Başarıyla Kuruldu!'));
    assert.ok(walk(result).some(node => node.type === 'p' && String(node.props.children).includes('henüz etkin değil')));
    assert.equal(JSON.parse(requests[0].options.body).targetPriceTry, 850);
  } finally { runner.cleanup(); global.fetch = oldFetch; global.localStorage = oldStorage; }
});

test('closing/changing an alert aborts old work; an old account response cannot overwrite the new city or account', async () => {
  let account = { id: 'A', email: 'a@example.invalid' }, requests = [], finish;
  const oldFetch = global.fetch;
  global.fetch = (url, options) => { requests.push(options); return new Promise(resolve => { finish = resolve; }); };
  const runner = hookHarness({
    './AuthContext': { useAuth: () => ({ user: account, openAuthModal() {} }) },
    './CurrencyContext': { useCurrency: () => ({ currency: 'TRY', rates: format.DEFAULT_RATES }) },
    '@/components/useLocaleFormat': { useLocaleFormat: () => format },
  });
  try {
    const Modal = runner.load('src/components/PriceAlertModal.tsx').PriceAlertModal;
    let props = { isOpen: true, onClose() { throw new Error('Old request closed the new dialog'); }, cityId: 'roma', cityName: 'Roma', currentPrice: 1000 };
    runner.render(Modal, props);
    const oldTree = runner.render(Modal, props);
    const submitting = walk(oldTree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    account = { id: 'B', email: 'b@example.invalid' };
    props = { ...props, cityId: 'paris', cityName: 'Paris', currentPrice: 2000 };
    runner.render(Modal, props);
    assert.equal(requests[0].signal.aborted, true);
    finish(Response.json({ ok: true })); await submitting;
    const current = runner.render(Modal, props), nodes = walk(current);
    assert.ok(nodes.some(node => node.type === 'form'));
    assert.equal(nodes.find(node => node.type === 'input' && node.props.type === 'email').props.value, account.email);
    assert.equal(nodes.find(node => node.type === 'input' && node.props.type === 'range').props.value, 1700);
  } finally { runner.cleanup(); global.fetch = oldFetch; }
});

test('reference, undated, old and future currency rates never receive a new collection time or live label', async () => {
  const unavailable = async () => null;
  const fallback = await provider(unavailable).getRates();
  assert.equal(fallback.live, false); assert.equal(fallback.updatedAt, undefined);
  for (const timestamp of [undefined, 'invalid', '2000-01-01', new Date(Date.now() + 86400_000).toISOString()]) {
    const result = await provider(async () => ({ result: 'success', rates: feedQuotes, time_last_update_utc: timestamp })).getRates();
    assert.equal(result.live, false); assert.equal(result.EUR, 50);
    if (timestamp === '2000-01-01') assert.equal(result.updatedAt, timestamp);
    else assert.equal(result.updatedAt, undefined);
  }
  const timestamp = new Date(Date.now() - 3600_000).toISOString();
  const recent = await provider(async () => ({ result: 'success', rates: feedQuotes, time_last_update_utc: timestamp })).getRates();
  assert.equal(recent.live, true); assert.equal(recent.updatedAt, timestamp);
});

test('malformed provider and saved currency values fall back without polluting offline cross rates', async () => {
  const prior = { ...format.DEFAULT_RATES, updatedAt: '2000-01-01', live: true, localPerEur: { JPY: 180, USD: -1, EUR: '1', GBP: null, RSD: 117 } };
  const rates = await provider(async () => ({ result: 'success', rates: { ...feedQuotes, EUR: Number.MIN_VALUE } }), prior).getRates();
  assert.equal(rates.live, false); assert.equal(rates.updatedAt, prior.updatedAt);
  assert.deepEqual(rates.localPerEur, { JPY: 180, RSD: 117 });
  const invalidCache = await provider(async () => null, { ...prior, TRY: 2 }).getRates();
  assert.equal(invalidCache.updatedAt, undefined);
  const rolledDate = await provider(async url => url.includes('open.er-api') ? null
    : Object.entries(feedQuotes).map(([quote, rate]) => ({ base: 'TRY', quote, rate, date: '2026-02-30' }))).getRates();
  assert.equal(rolledDate.updatedAt, undefined); assert.equal(rolledDate.live, false);
});

test('actual wallet entries and group settlements preserve fractional money in rendered output across all eight languages/currencies', () => {
  const { LANGUAGE_LOCALES } = load('src/lib/i18n/runtime.ts');
  const city = load('src/lib/cities.ts').CITIES[0];
  const entry = { id: 'entry', day: 1, title: 'Cent expense', category: 'yemek', originalCurrency: 'TRY', originalAmount: 0.5, amountTry: 0.5, amountEur: 0.01 };
  for (const locale of Object.values(LANGUAGE_LOCALES)) for (const code of currency.CURRENCY_CODES) {
    const isolated = createLoader({
      './LanguageContext': { useLanguage: () => ({ locale, translate: text => text, currentMeta: { flag: '' } }) },
      './CurrencyContext': { useCurrency: () => ({ currency: code, rates: format.DEFAULT_RATES }) },
      '@/lib/use-local-record': { useLocalRecord: key => ({ value: key.includes('split')
        ? { members: ['Alice', 'Bob'], expenses: [{ id: 'payment', title: 'Cent expense', category: 'yemek', amountTry: 0.5, paidBy: 'Alice' }] }
        : [entry], update() {}, error: '', legacyAvailable: false, importLegacy() {} }) },
    });
    const Wallet = isolated('src/components/LiveTravelWallet.tsx').LiveTravelWallet;
    const Split = isolated('src/components/ExpenseSplitterModal.tsx').ExpenseSplitterModal;
    const data = { city, input: { origin: 'IST', destination: city.id, startDate: '2026-11-01', endDate: '2026-11-04', travelers: 2 }, nights: 3, rates: format.DEFAULT_RATES };
    const wallet = renderToStaticMarkup(React.createElement(Wallet, { data, cur: code, budgetTier: 'dengeli', plannedPocketTry: 100, travelers: 2 }));
    const group = renderToStaticMarkup(React.createElement(Split, { isOpen: true, onClose() {}, cityId: city.id, cityName: city.name, tripKey: 'test', rates: format.DEFAULT_RATES, travelersCount: 2 }));
    const literal = value => renderToStaticMarkup(React.createElement('span', null, format.fmtMoney(value, code, format.DEFAULT_RATES, locale))).slice(6, -7);
    assert.ok(wallet.includes(literal(0.5)), locale + '/' + code + ': wallet');
    assert.ok(group.includes(literal(0.5)), locale + '/' + code + ': group total');
    assert.ok(group.includes(literal(0.25)), locale + '/' + code + ': settlement');
  }
});

test('city phrase copy shows success only after the clipboard resolves and reports rejection in the selected language', async () => {
  let release, reject, alerts = [], changes = [];
  const isolated = createLoader({
    react: { ...React, useMemo: fn => fn(), useRef: value => ({ current: value }), useEffect() {}, useState: value => [typeof value === 'function' ? value() : value, next => changes.push(next)] },
    './LanguageContext': { useLanguage: () => ({ currentMeta: { flag: '' }, locale: 'en-US', translate: text => 'Localized: ' + text }) },
    '@/lib/clipboard': { copyText: () => new Promise((ok, fail) => { release = ok; reject = fail; }) },
  });
  const city = load('src/lib/cities.ts').CITIES[0];
  const element = isolated('src/components/CityDiscoveryHub.tsx').CityDiscoveryHub({ data: { city, rates: format.DEFAULT_RATES }, cur: 'TRY', budgetTier: 'dengeli', travelers: 2, activeDay: 1 });
  function buttons(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(buttons);
    return [...(node.type === 'button' ? [node] : []), ...buttons(node.props?.children)];
  }
  const button = buttons(element).find(item => item.props.className.includes('ml-2 inline-flex shrink-0'));
  assert.ok(button);
  const oldWindow = global.window, oldTimeout = global.setTimeout;
  global.window = { alert: text => alerts.push(text) }; global.setTimeout = () => 0;
  try {
    const copying = button.props.onClick();
    assert.deepEqual(changes, [null]);
    release(); await copying; assert.equal(typeof changes[1], 'string');
    changes = [];
    const failed = button.props.onClick(); reject(new Error('Clipboard denied')); await failed;
    assert.deepEqual(changes, [null]); assert.deepEqual(alerts, ['Localized: Clipboard denied']);
  } finally { global.window = oldWindow; global.setTimeout = oldTimeout; }
});

test('composed trip durations and practical guide fragments remain fully localized in seven languages', () => {
  const fs = require('node:fs');
  const { LANGUAGE_LOCALES, createTranslator } = load('src/lib/i18n/runtime.ts');
  const cities = load('src/lib/cities.ts').CITIES.filter(city => ['roma', 'belgrad', 'saraybosna'].includes(city.id));
  const discovery = load('src/lib/providers/city-discovery.ts');
  for (const language of Object.keys(LANGUAGE_LOCALES).filter(code => code !== 'tr')) {
    const translate = createTranslator(JSON.parse(fs.readFileSync(`public/i18n/${language}.json`, 'utf8')), language);
    const isolated = createLoader({ './LanguageContext': { useLanguage: () => ({ translate, locale: LANGUAGE_LOCALES[language] }) } });
    const Trips = isolated('src/components/SpontaneousAndDayTrips.tsx').SpontaneousAndDayTrips;
    const { localizeTree } = isolated('src/components/Localize.tsx');
    for (const city of cities) {
      const trips = renderToStaticMarkup(React.createElement(Trips, { data: { city, rates: format.DEFAULT_RATES }, cur: 'TRY', activeDay: 1 }));
      assert.doesNotMatch(trips, /\bSaat\b|\bDakika\b/, language + ': trip duration');
      const info = discovery.getConnectivityInfo(city);
      const practical = React.createElement('div', null, translate(info.plug.types), ' · ', info.plug.voltage, '. ', translate(info.plug.detail),
        React.createElement('p', null, translate(info.tapWater.statusLabel), '. ', translate(info.tapWater.detail)));
      const html = renderToStaticMarkup(localizeTree(practical, translate));
      assert.doesNotMatch(html, /Tip F|Çeşmeleri|Arıtılmış|uyumludur|içilebilir/, language + ': guide');
    }
  }
});
