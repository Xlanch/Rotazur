/* User-authorised single import. No scheduler, subscriptions, flights or email. */
const fs=require("node:fs"),path=require("node:path"),https=require("node:https"),crypto=require("node:crypto");
const {createServerLoader}=require("./lib/load-server-module.cjs");
const ROOT=path.resolve(__dirname,".."), DIR=path.join(ROOT,"data/booking-snapshots");
const manifestFile=path.join(DIR,"manifest.json"),lockFile=path.join(DIR,"import.lock");
const query={checkin:"2026-11-22",checkout:"2026-11-26",adults:2,rooms:1,device:"desktop"};
function write(file,value){const tmp=file+"."+crypto.randomUUID()+".tmp";fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function getJson(url,timeout=35000){return new Promise((resolve,reject)=>{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
  const req=https.get(url,{family:4,signal:ctrl.signal,headers:{Accept:"application/json","Accept-Encoding":"identity","User-Agent":"Rotazur/1.0 one-time hotel import"}},res=>{
    if(res.statusCode!==200){res.destroy();reject(new Error(`HTTP ${res.statusCode}`));return;}
    const chunks=[];let size=0;
    res.on("data",c=>{size+=c.length;if(size>8*1024*1024){res.destroy();reject(new Error("Response too large"));}else chunks.push(c);});
    res.on("end",()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));}catch{reject(new Error("Invalid JSON"));}});
    res.on("error",()=>reject(new Error("Response failed")));
  });req.on("error",()=>reject(new Error("Network or deadline failure")));req.on("close",()=>clearTimeout(timer));
});}
async function account(key){
  const u=new URL("https://serpapi.com/account.json");u.searchParams.set("api_key",key);
  const a=await getJson(u,15000);
  if(a.plan_monthly_price!==0||!/^free\b/i.test(a.plan_name)||a.extra_credits!==0||a.searches_per_month!==250||!Number.isFinite(a.plan_searches_left))throw new Error("Free-account guard rejected this account");
  write(path.join(DIR,"account-allowance.json"),{version:1,monthlyPrice:0,monthlyLimit:250,extraCredits:0,hourlyLimit:a.account_rate_limit_per_hour,checkedAt:new Date().toISOString()});
  return a;
}
async function main(){
  process.chdir(ROOT);require("node:process").loadEnvFile(path.join(ROOT,".env.local"));
  const key=process.env.SERPAPI_KEY?.trim();if(!key)throw new Error("API key missing");
  const cities=require("../src/lib/data/destinations.json");if(cities.length!==100)throw new Error("Expected 100 destinations");
  fs.mkdirSync(DIR,{recursive:true});
  if(fs.existsSync(lockFile))throw new Error("An import lock already exists; inspect before resuming");
  fs.writeFileSync(lockFile,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}),{flag:"wx"});
  try{
    const load=createServerLoader(ROOT);
    const {normalizeBookingResults}=load("src/lib/providers/booking-serp.ts");
    const {reserveSerpApiSearch}=load("src/lib/provider-quota.ts");
    const {db}=load("src/lib/db.ts");
    const m=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,"utf8")):{version:1,mode:"once",query,startedAt:new Date().toISOString(),cities:{}};
    if(m.version!==1||m.mode!=="once"||JSON.stringify(m.query)!==JSON.stringify(query))throw new Error("Existing import context differs");
    write(manifestFile,m);
    let a=await account(key);
    console.log(JSON.stringify({event:"free-account-verified",plan:a.plan_name,monthlyPrice:a.plan_monthly_price,remaining:a.plan_searches_left,actualHourlyLimit:a.account_rate_limit_per_hour}));
    const retryFailed=process.argv.includes("--retry-failed");
    const pending=cities.filter(c=>!m.cities[c.id] || retryFailed && m.cities[c.id].status==="failed");
    if(a.plan_searches_left<pending.length+5)throw new Error("Not enough free searches with safety reserve");
    for(const city of pending){
      if(!/^[a-z0-9-]+$/.test(city.id))throw new Error("Invalid city ID");
      a=await account(key);
      if(a.plan_searches_left<=5)throw new Error("Free monthly reserve reached");
      const hourlyLimit=Math.min(200,Number(a.account_rate_limit_per_hour)-5);
      if(!Number.isInteger(hourlyLimit)||hourlyLimit<1)throw new Error("Unverified throughput");
      // Shares the installation's hard 200/31-day ledger. Provider throughput is
      // taken from this verified free account, not guessed from a plan name.
      reserveSerpApiSearch(Date.now(),hourlyLimit);
      const usage=db.prepare("SELECT COUNT(*) AS n FROM provider_search_usage WHERE created_at>?").get(Date.now()-3600000);
      if(Number(a.this_hour_searches)>=hourlyLimit||Number(usage.n)>hourlyLimit)throw new Error("Hourly allowance reached");
      m.cities[city.id]={status:"started",at:new Date().toISOString()};write(manifestFile,m);
      const correctedQueries={kopenhag:"Copenhagen, Denmark",rotterdam:"Rotterdam, Netherlands",singapur:"Singapore","da-nang":"Da Nang, Vietnam",kandy:"Kandy, Sri Lanka",katmandu:"Kathmandu, Nepal"};
      const params=new URLSearchParams({engine:"booking",q:correctedQueries[city.id]||city.bookingQuery||city.wiki.replaceAll("_"," "),check_in_date:query.checkin,check_out_date:query.checkout,adults:"2",children:"0",rooms:"1",currency:"TRY",hl:"tr",device:query.device,sort_by:"price",limit:"25",no_cache:"true",api_key:key});
      let diagnostics;
      try{
        const raw=await getJson(`https://serpapi.com/search.json?${params}`);
        diagnostics={status:raw.search_metadata?.status,properties:Array.isArray(raw.properties)?raw.properties.length:0,parameters:raw.search_parameters?Object.fromEntries(["engine","check_in_date","check_out_date","adults","rooms","currency","device"].map(k=>[k,raw.search_parameters[k]])):null};
        const hotels=normalizeBookingResults(raw,city,query.checkin,query.checkout,query.adults,query.rooms,{device:query.device}).slice(0,25);
        if(!hotels.length)throw new Error("No validated properties returned");
        const checkedAt=new Date().toISOString();
        write(path.join(DIR,city.id+".json"),{version:1,cityId:city.id,query,importedAt:checkedAt,hotels});
        m.cities[city.id]={status:"complete",checkedAt,hotels:hotels.length,locations:hotels.filter(h=>h.hotelLocation).length};
        console.log(JSON.stringify({city:city.id,...m.cities[city.id]}));
      }catch(error){
        // The request may already have consumed a search. Never silently repeat it.
        const reason=/^(Otel |No validated|HTTP \d|Network or|Invalid JSON|Response )/.test(error.message)?error.message:"Kaynak sonucu doğrulanamadı.";
        m.cities[city.id]={status:"failed",at:new Date().toISOString(),reason,diagnostics};
        console.log(JSON.stringify({city:city.id,status:"failed",reason,diagnostics}));
      }
      m.updatedAt=new Date().toISOString();write(manifestFile,m);
    }
    m.finishedAt=new Date().toISOString();write(manifestFile,m);
    a=await account(key);
    console.log(JSON.stringify({event:"finished",complete:Object.values(m.cities).filter(c=>c.status==="complete").length,failed:Object.values(m.cities).filter(c=>c.status!=="complete").length,remaining:a.plan_searches_left,monthlyPrice:a.plan_monthly_price}));
  }finally{fs.unlinkSync(lockFile);}
}
main().catch(()=>{console.error("Import stopped safely. No paid plan, flights or email was enabled; inspect checkpoint before resuming.");process.exitCode=1;});
