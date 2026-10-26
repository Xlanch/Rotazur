const fs = require('node:fs'), path = require('node:path');
const { extract, aliases } = require('./i18n-catalog.cjs');
extract();
for (const language of ['en', 'de', 'ru', 'zh', 'es', 'fr', 'ar']) {
  const file = path.resolve(__dirname, `../public/i18n/${language}.json`);
  if (!fs.existsSync(file)) continue;
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8')); let added = 0;
  for (const [key, source] of aliases) if (!catalog[key] && catalog[source]) { catalog[key] = catalog[source]; added++; }
  fs.writeFileSync(file, JSON.stringify(catalog) + '\n');
  console.log(`${language}: ${added} JSX entity/whitespace aliases derived locally`);
}
