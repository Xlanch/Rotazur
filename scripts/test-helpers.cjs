const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Execute project TypeScript in isolation, replacing only external boundaries.
// No project database, SMTP account or paid provider is touched by these tests.
exports.createLoader = function createLoader(overrides = {}, testProcess = process) {
  const cache = new Map();
  const runtimeGlobals = Object.create(null);
  function load(filename) {
    const full = path.resolve(filename);
    if (cache.has(full)) return cache.get(full).exports;
    const module = { exports: {} };
    cache.set(full, module);
    const source = ts.transpileModule(fs.readFileSync(full, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    function localRequire(id) {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      // Next enforces this build-time boundary; isolated Node tests stay server-side.
      if (id === "server-only") return {};
      if (id.startsWith("@/") && /\.(cjs|json)$/.test(id)) return require(path.resolve("src", id.slice(2)));
      if (id.startsWith(".") && /\.(cjs|json)$/.test(id)) return require(path.resolve(path.dirname(full), id));
      let resolved;
      if (id.startsWith("@/")) resolved = path.resolve("src", id.slice(2)) + ".ts";
      else if (id.startsWith(".")) resolved = path.resolve(path.dirname(full), id) + ".ts";
      if (resolved) {
        if (!fs.existsSync(resolved) && fs.existsSync(resolved + "x")) resolved += "x";
        const key = path.relative(process.cwd(), resolved).replaceAll(path.sep, "/");
        if (Object.hasOwn(overrides, key)) return overrides[key];
        return load(resolved);
      }
      return require(id);
    }
    new Function("require", "module", "exports", "process", "globalThis", source)(localRequire, module, module.exports, testProcess, runtimeGlobals);
    return module.exports;
  }
  return load;
};
