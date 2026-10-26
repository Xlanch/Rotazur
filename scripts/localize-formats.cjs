const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(f => f.isDirectory() ? walk(path.join(d, f.name)) : [path.join(d, f.name)]);
const formatters = new Set(['tl', 'num', 'fmtCur', 'fmtMoney', 'fmtDate', 'fmtDuration', 'timeOf', 'weatherIcon']);
for (const file of walk(path.join(root, 'src')).filter(f => f.endsWith('.tsx'))) {
  let source = fs.readFileSync(file, 'utf8');
  if (!source.startsWith('"use client"') || source.includes('import { useLocaleFormat }')) continue;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const aliases = new Map();
  for (const statement of tree.statements) {
    if (ts.isImportDeclaration(statement) && /(?:^|\/)format$/.test(statement.moduleSpecifier.text)) {
      for (const binding of statement.importClause?.namedBindings?.elements || []) {
        if (binding.propertyName && formatters.has(binding.propertyName.text)) aliases.set(binding.name.text, binding.propertyName.text);
      }
    }
  }
  const edits = [];
  function visit(n) {
    if (ts.isFunctionDeclaration(n) && n.body && n.name && /^[A-Z]/.test(n.name.text)) {
      const names = new Set(); let needLocale = false;
      function calls(c) {
        if (ts.isCallExpression(c)) {
          if (ts.isIdentifier(c.expression) && formatters.has(c.expression.text)) names.add(c.expression.text);
          if (ts.isPropertyAccessExpression(c.expression) && /^toLocale(?:DateString|String|TimeString)$/.test(c.expression.name.text)
            && c.arguments[0] && ts.isStringLiteral(c.arguments[0]) && c.arguments[0].text === 'tr-TR') {
            needLocale = true; edits.push([c.arguments[0].getStart(tree), c.arguments[0].end, 'locale']);
          }
        }
        ts.forEachChild(c, calls);
      }
      calls(n.body);
      if (names.size || needLocale) edits.push([n.body.getStart(tree) + 1, n.body.getStart(tree) + 1,
        `\n  const { ${[...[...names].map(name => aliases.has(name) ? `${aliases.get(name)}: ${name}` : name), ...(needLocale ? ['locale'] : [])].join(', ')} } = useLocaleFormat();`]);
      return;
    }
    ts.forEachChild(n, visit);
  }
  visit(tree);
  if (!edits.length) continue;
  for (const [a, b, text] of edits.sort((a, b) => b[0] - a[0])) source = source.slice(0, a) + text + source.slice(b);
  const at = /^(?:"use client"|'use client');?\r?\n/.exec(source)[0].length;
  source = source.slice(0, at) + '\nimport { useLocaleFormat } from "@/components/useLocaleFormat";\n' + source.slice(at);
  fs.writeFileSync(file, source);
}
