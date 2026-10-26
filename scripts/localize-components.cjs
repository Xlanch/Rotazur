/* Idempotent source migration: presentation boundaries only, no provider/business-state rewrites. */
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(f => f.isDirectory() ? walk(path.join(d, f.name)) : [path.join(d, f.name)]);
const excluded = new Set(['Localize.tsx', 'LanguageContext.tsx', 'AuthContext.tsx', 'CurrencyContext.tsx', 'OfflineRegistration.tsx', 'Navbar.tsx', 'layout.tsx']);
let changed = 0;
for (const file of walk(path.join(root, 'src')).filter(f => f.endsWith('.tsx') && !excluded.has(path.basename(f)))) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes('import { Localize }')) continue;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  function visit(n) {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) {
      let parent = n.parent, nested = false;
      while (parent) {
        if (ts.isJsxElement(parent) || ts.isJsxSelfClosingElement(parent) || ts.isJsxFragment(parent)) { nested = true; break; }
        parent = parent.parent;
      }
      if (!nested) { edits.push([n.getStart(tree), '<Localize>'], [n.end, '</Localize>']); return; }
    }
    ts.forEachChild(n, visit);
  }
  visit(tree);
  if (!edits.length) continue;
  for (const [pos, text] of edits.sort((a, b) => b[0] - a[0])) source = source.slice(0, pos) + text + source.slice(pos);
  const directive = /^(?:"use client"|'use client');?\r?\n/.exec(source);
  const at = directive ? directive[0].length : 0;
  source = source.slice(0, at) + '\nimport { Localize } from "@/components/Localize";\n' + source.slice(at);
  fs.writeFileSync(file, source); changed++;
}
console.log(`Localized presentation boundaries in ${changed} components/pages.`);
