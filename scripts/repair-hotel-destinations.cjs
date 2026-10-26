// Bounded maintenance repair: four diagnosed city searches, at most two attempts each.
// Requires a verified free account; shares the application's persistent search quota.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createServerLoader}=require('./lib/load-server-module.cjs');
const http=require('../src/lib/automation/flight-sync.cjs');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'data/booking-snapshots');
function write(file,value){const tmp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');fs.renameSync(tmp,file);}
async function main(){
 process.chdir(root);require('node:process').loadEnvFile(path.join(root,'.env.local'));
 if(!process.argv.includes('--repair'))throw Error('Explicit --repair flag required.');
 const checkpoint=path.join(root,'data/city-expansion-research/hotel-repairs-20261024.json');
 if(fs.existsSync(checkpoint)){
  const done=JSON.parse(fs.readFileSync(checkpoint));
  if(['cenevre','cork','munih','abu-dabi'].every(id=>done.some(r=>r.city===id&&r.status==='repaired'))){console.log('Repairs already completed; no account or hotel query made.');return;}
 }
 const key=process.env.SERPAPI_KEY?.trim();if(!key)throw Error('Missing server key.');
 const load=createServerLoader(root),{fetchJson}=load('src/lib/server-utils.ts'),{normalizeBookingResults}=load('src/lib/providers/booking-serp.ts');
 const file=path.join(root,'src/lib/data/destinations.json'),cities=JSON.parse(fs.readFileSync(file)),manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json')));
 const candidates={cenevre:['Geneva','Genève'],cork:['Cork','Cork City'],munih:['Munich','München'],'abu-dabi':['Abu Dhabi','Abu Dhabi city']};
 const query={checkin:'2026-11-22',checkout:'2026-11-26',adults:2,rooms:1,device:'desktop'};
 const lock=path.join(folder,'repair.lock');fs.writeFileSync(lock,JSON.stringify({pid:process.pid}),{flag:'wx'});
 const outcomes=[];
 try{for(const [id,variants] of Object.entries(candidates)){
  const city=cities.find(c=>c.id===id);let complete=false;
  for(const q of variants){
   const accountUrl=new URL('https://serpapi.com/account.json');accountUrl.searchParams.set('api_key',key);
   const a=await http.requestJson(accountUrl.href);
   if(a.plan_monthly_price!==0||!/^free\b/i.test(a.plan_name)||a.extra_credits!==0||a.searches_per_month!==250||!Number.isFinite(a.plan_searches_left)||a.plan_searches_left<25)throw Error('Free account guard refused further searches.');
   const params=new URLSearchParams({engine:'booking',q,check_in_date:query.checkin,check_out_date:query.checkout,adults:'2',rooms:'1',children:'0',currency:'TRY',hl:'tr',device:'desktop',sort_by:'price',limit:'25',no_cache:'true',api_key:key});
   let raw;
   try{
    raw=await fetchJson('https://serpapi.com/search.json?'+params,undefined,30000);
    const hotels=normalizeBookingResults(raw,{...city,bookingQuery:q},query.checkin,query.checkout,2,1,{device:'desktop'});
    if(!hotels.length)throw Error('No matching city hotels.');
    const checkedAt=new Date().toISOString();
    write(path.join(folder,id+'.json'),{version:1,cityId:id,query,importedAt:checkedAt,hotels,sourceDestination:String(raw.search_information?.destination||'').slice(0,200)});
    city.bookingQuery=q;manifest.cities[id]={status:'complete',checkedAt,hotels:hotels.length,locations:hotels.filter(h=>h.hotelLocation).length};
    write(file,cities);write(path.join(folder,'manifest.json'),manifest);
    const result={city:id,status:'repaired',hotels:hotels.length,nearestKm:Math.min(...hotels.map(h=>h.distanceKm)),farthestKm:Math.max(...hotels.map(h=>h.distanceKm)),sourceDestination:String(raw.search_information?.destination||'').slice(0,200)};
    outcomes.push(result);console.log(JSON.stringify(result));complete=true;break;
   }catch{console.log(JSON.stringify({city:id,status:'source-not-validated',sourceDestination:typeof raw?.search_information?.destination==='string'?raw.search_information.destination.slice(0,200):null}));}
  }
  if(!complete)outcomes.push({city:id,status:'not-repaired'});
 }
 write(path.join(root,'data/city-expansion-research/hotel-repairs-20261024.json'),outcomes);
 if(outcomes.some(r=>r.status!=='repaired'))process.exitCode=1;
 }finally{fs.unlinkSync(lock);}
}
main().catch(()=>{console.error('Repair stopped safely; no paid subscription, extra credit or email was enabled.');process.exitCode=1;});
