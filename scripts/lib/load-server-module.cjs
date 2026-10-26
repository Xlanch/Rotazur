/* Local maintenance CLI loader. No HTTP entry point; never shipped to a browser. */
const fs=require("node:fs"),path=require("node:path"),ts=require("typescript");
exports.createServerLoader=function(root=path.resolve(__dirname,"../..")){
  const cache=new Map(), sourceRoot=path.join(root,"src");
  function load(file){
    const full=path.resolve(file);
    if(!full.startsWith(sourceRoot+path.sep))throw new Error("Maintenance import outside src");
    if(full.endsWith(".json")||full.endsWith(".cjs"))return require(full);
    if(cache.has(full))return cache.get(full).exports;
    const mod={exports:{}};cache.set(full,mod);
    const source=ts.transpileModule(fs.readFileSync(full,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
    const localRequire=id=>{
      if(id==="server-only")return {}; // Explicitly a Node-only maintenance process.
      if(id.startsWith(".")||id.startsWith("@/")){
        let resolved=id.startsWith("@/")?path.join(sourceRoot,id.slice(2)):path.resolve(path.dirname(full),id);
        if(!path.extname(resolved))resolved+=".ts";
        return load(resolved);
      }
      return require(id);
    };
    new Function("require","module","exports",source)(localRequire,mod,mod.exports);
    return mod.exports;
  }
  return file=>load(path.resolve(root,file));
};
