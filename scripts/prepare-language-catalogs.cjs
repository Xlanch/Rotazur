/* One-time, anonymous preparation of PUBLIC static copy. Not an application provider or scheduled job.
 * No API key, billing account, .env loading, visitor content, itinerary details or hotel prices.
 * Output is reviewed/versioned locally; the running site only reads same-origin JSON dictionaries.
 */
const fs = require('node:fs');
const path = require('node:path');
const { extract } = require('./i18n-catalog.cjs');
const root = path.resolve(__dirname, '..');
const languages = ['en', 'de', 'ru', 'zh', 'es', 'fr', 'ar'];
const directory = path.join(root, 'public/i18n');
fs.mkdirSync(directory, { recursive: true });
const rows = extract();
const sleep = ms => new Promise(r => setTimeout(r, ms));
function placeholders(s) { return [...s.matchAll(/\{(\d+)\}/g)].map(m => m[0]).sort().join('|'); }
async function translate(batch, lang, attempt = 0) {
  const q = batch.length === 1 ? batch[0].source : batch.map((row, i) => {
    const id = String(i).padStart(6, '0'); return `⟦${id}⟧ ${row.source} ⟪${id}⟫`;
  }).join('\n');
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.search = new URLSearchParams({ client: 'gtx', sl: 'tr', tl: lang === 'zh' ? 'zh-CN' : lang, dt: 't', q });
  const split = async () => {
    const middle = Math.ceil(batch.length / 2);
    return { ...await translate(batch.slice(0, middle), lang), ...await translate(batch.slice(middle), lang) };
  };
  if (url.href.length > 12500 && batch.length > 1) return split();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(35000), credentials: 'omit' });
    if (response.status === 400 && batch.length > 1) return split();
    if (!response.ok) throw new Error(`HTTP ${response.status} (${lang}, ${batch.length} messages, ${q.length} characters)`);
    const data = await response.json();
    const text = data[0].map(part => part[0] || '').join('');
    if (batch.length === 1) {
      const translated = text.trim().replace(/\{\s*(\d+)\s*\}/g, '{$1}');
      if (translated && placeholders(batch[0].source) === placeholders(translated)) return { [batch[0].source]: translated };
      throw new Error('Translation placeholders were not preserved');
    }
    const chunks = [...text.matchAll(/⟦\s*(\d{6})\s*⟧\s*([\s\S]*?)\s*⟪\s*\1\s*⟫/g)];
    const result = {};
    for (const chunk of chunks) {
      const row = batch[Number(chunk[1])]; if (!row) continue;
      const translated = chunk[2].trim().replace(/\{\s*(\d+)\s*\}/g, '{$1}');
      if (translated && !translated.includes('\n') && /\p{L}/u.test(translated.replace(/\{\d+\}/g, ''))
        && placeholders(row.source) === placeholders(translated)) result[row.source] = translated;
    }
    if (!Object.keys(result).length) throw new Error('Unusable public translation response');
    return result;
  } catch (error) {
    if (attempt >= 4) throw error;
    await sleep(Math.min(30000, 2500 * 2 ** attempt));
    return translate(batch, lang, attempt + 1);
  }
}
async function language(lang) {
  const file = path.join(directory, `${lang}.json`);
  const dictionary = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  // Reject line-boundary drift from old batches, including the following message whose prefix moved.
  const invalid = new Set();
  for (let i = 0; i < rows.length; i++) {
    const value = dictionary[rows[i].source];
    if (value && (value.includes('\n') || !/\p{L}/u.test(value.replace(/\{\d+\}/g, ''))))
      for (const row of rows.slice(i, i + 3)) invalid.add(row.source);
  }
  for (const source of invalid) delete dictionary[source];
  const pending = rows.filter(row => !dictionary[row.source]);
  const batches = []; let batch = [], chars = 0;
  for (const row of pending) {
    if (chars + row.source.length + 26 > 2800 && batch.length) { batches.push(batch); batch = []; chars = 0; }
    batch.push(row); chars += row.source.length + 26;
  }
  if (batch.length) batches.push(batch);
  let done = 0;
  for (const batch of batches) {
    Object.assign(dictionary, await translate(batch, lang));
    fs.writeFileSync(file + '.tmp', JSON.stringify(dictionary) + '\n'); fs.renameSync(file + '.tmp', file);
    if (++done % 15 === 0 || done === batches.length) console.log(`${lang}: ${done}/${batches.length} batches; ${Object.keys(dictionary).length}/${rows.length} messages`);
    await sleep(220);
  }
  const missing = rows.filter(row => !dictionary[row.source]);
  // Retry unaligned batches individually; placeholder loss never enters the shipped catalog.
  for (const row of missing) Object.assign(dictionary, await translate([row], lang));
  fs.writeFileSync(file, JSON.stringify(dictionary) + '\n');
  const left = rows.filter(row => !dictionary[row.source]);
  console.log(`${lang}: complete=${rows.length - left.length}/${rows.length}`);
  return { lang, messages: rows.length, translated: rows.length - left.length, missing: left.map(r => r.source) };
}
(async () => {
  const report = [];
  // Two bounded workers; every successful batch is checkpointed. No unbounded request fan-out.
  let cursor = 0;
  await Promise.all(Array.from({ length: 2 }, async () => { while (cursor < languages.length) report.push(await language(languages[cursor++])); }));
  fs.mkdirSync(path.join(root, 'data/i18n-research'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data/i18n-research/catalog-coverage.json'), JSON.stringify(report, null, 2) + '\n');
  if (report.some(r => r.missing.length)) process.exitCode = 1;
})().catch(error => { console.error('Public copy preparation stopped:', error.message); process.exitCode = 1; });
