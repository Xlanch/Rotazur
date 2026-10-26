const fs = require('node:fs'), path = require('node:path');
const overrides = require('./i18n-overrides.cjs');
const languages = ['en', 'de', 'ru', 'zh', 'es', 'fr', 'ar'];
for (const [index, language] of languages.entries()) {
  const file = path.resolve(__dirname, `../public/i18n/${language}.json`);
  if (!fs.existsSync(file)) continue;
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [source, translations] of Object.entries(overrides)) catalog[source] = translations[index];
  fs.writeFileSync(file, JSON.stringify(catalog) + '\n');
}
console.log('Reviewed terminology applied to seven local catalogs. No network requests.');
