/* Public copy only. Never reads .env, account databases, saved plans or provider keys. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const normalize = s => s.replace(/\s+/gu, ' ').trim();
const messages = new Map();
const aliases = new Map();
const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', hellip: '…', mdash: '—', ndash: '–' };
const decode = value => value.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (all, name) => {
  if (name.startsWith('#')) return String.fromCodePoint(parseInt(name.slice(name[1].toLowerCase() === 'x' ? 2 : 1), name[1].toLowerCase() === 'x' ? 16 : 10));
  return entities[name] ?? all;
});
function jsxText(value) {
  const lines = value.split(/\r\n|\n|\r/);
  let last = 0; lines.forEach((line, i) => { if (/[^ \t]/.test(line)) last = i; });
  return decode(lines.map((line, i) => {
    let text = line.replace(/\t/g, ' ');
    if (i !== 0) text = text.replace(/^ +/, '');
    if (i !== lines.length - 1) text = text.replace(/ +$/, '');
    return text ? text + (i !== last ? ' ' : '') : '';
  }).join(''));
}
function aliased(value, old, file) {
  add(value, file);
  const key = normalize(value), previous = normalize(old);
  if (human(key) && key !== previous) aliases.set(key, previous);
}
function human(s) {
  return s.length > 1 && s.length < 5000 && /\p{L}/u.test(s)
    && !/^(?:https?:|mailto:|\/|@\/|\.|#|data:|var\(|rotazur[-_:])/i.test(s)
    && !/(?:class=|<\/?(?:html|div|table|script|span)|CREATE TABLE|SELECT .* FROM|bg-|dark:|text-\[|font-|rounded-|grid-cols-|transition-|^application\/)/i.test(s)
    && !/^[a-zA-Z0-9_.:-]+\/[a-zA-Z0-9_.:/-]+$/.test(s)
    && !/^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)+$/.test(s)
    && !/^[a-z]{2}-[A-Z]{2}$/.test(s);
}
function add(value, file) {
  for (const raw of [value, ...value.split(/\r?\n/), ...value.split(/(?<=[.!?])\s+(?=[\p{Lu}])/u)]) {
    const key = normalize(raw);
    if (!human(key)) continue;
    if (!messages.has(key)) messages.set(key, new Set());
    messages.get(key).add(path.relative(root, file).replaceAll('\\', '/'));
  }
}
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(x => x.isDirectory() ? walk(path.join(dir, x.name)) : [path.join(dir, x.name)]); }
function extract() {
  messages.clear();
  aliases.clear();
  const files = walk(path.join(root, 'src')).filter(f => /\.(tsx?|json|cjs)$/.test(f)
    && !/[\\/]i18n[\\/]/.test(f) && !/[\\/](?:email|db|auth|google-auth|search-security|security)\.[^.]+$/.test(f)
    && !/[\\/]api[\\/]/.test(f) && !f.endsWith('Localize.tsx') && !f.endsWith('LanguageContext.tsx'));
  for (const file of files) {
    if (file.endsWith('.json')) {
      const visit = x => { if (typeof x === 'string') add(x, file); else if (x && typeof x === 'object') Object.values(x).forEach(visit); };
      visit(JSON.parse(fs.readFileSync(file, 'utf8')));
      continue;
    }
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(n) {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
        if (ts.isJsxAttribute(n.parent)) aliased(decode(n.text), n.text, file);
        else add(n.text, file);
      }
      if (ts.isTemplateExpression(n)) add(n.head.text + n.templateSpans.map((s, i) => `{${i}}` + s.literal.text).join(''), file);
      if (ts.isJsxText(n)) aliased(jsxText(n.text), n.text, file);
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken
        && !(ts.isBinaryExpression(n.parent) && n.parent.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
        let index = 0;
        const join = expression => ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression) ? expression.text
          : ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken
            ? join(expression.left) + join(expression.right) : `{${index++}}`;
        add(join(n), file);
      }
      // Preserve whole messages across JSX expressions (city, counts, prices, inline emphasis).
      if (ts.isJsxElement(n) || ts.isJsxFragment(n)) {
        let i = 0;
        const text = n.children.map(c => ts.isJsxText(c) ? jsxText(c.text) : `{${i++}}`).join('');
        let j = 0;
        const previous = n.children.map(c => ts.isJsxText(c) ? c.text.replace(/\s+/g, ' ') : `{${j++}}`).join('');
        if (i) aliased(text, previous, file);
      }
      ts.forEachChild(n, visit);
    }
    visit(source);
  }
  const { createServerLoader } = require('./lib/load-server-module.cjs');
  const load = createServerLoader(root);
  const { DICTIONARY } = load('src/lib/i18n/translations.ts');
  for (const value of Object.values(DICTIONARY.tr)) add(value, path.join(root, 'src/lib/i18n/translations.ts'));
  // Room descriptions/amenities are public source copy. Property names, addresses and prices are excluded.
  const snapshots = path.join(root, 'data/booking-snapshots');
  if (fs.existsSync(snapshots)) for (const file of walk(snapshots).filter(f => f.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const h of data.hotels || []) {
      for (const v of [...(h.amenities || []), h.capacityLabel, h.bookingQuote?.disclaimer,
        ...(h.bookingQuote?.roomOffers || []).map(r => r.name)]) if (v) add(v, file);
    }
  }
  return [...messages].map(([source, files]) => ({ source, files: [...files] })).sort((a, b) => a.source.localeCompare(b.source, 'tr'));
}
module.exports = { extract, normalize, human, aliases };
if (require.main === module) {
  const rows = extract();
  const dir = path.join(root, 'data/i18n-research'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'source-messages.json'), JSON.stringify(rows, null, 2) + '\n');
  console.log(JSON.stringify({ messages: rows.length, characters: rows.reduce((n, r) => n + r.source.length, 0) }));
}
