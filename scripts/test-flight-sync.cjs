const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const engine = require('../src/lib/automation/flight-sync.cjs');
const { createLoader } = require('./test-helpers.cjs');
const start = new Date(Date.now()+30*86400000).toISOString().slice(0,10), end = new Date(Date.now()+35*86400000).toISOString().slice(0,10);
const fare = { price: 1234.56, airline: 'TK', departure_at: start+'T10:30:00', return_at: end+'T17:30:00' };
function temp(t) { const root=fs.mkdtempSync(path.join(os.tmpdir(),'rotazur-flights-')); t.after(()=>{assert.equal(path.dirname(root),os.tmpdir());fs.rmSync(root,{recursive:true,force:true});});return root; }
test('flight source rejects missing returns, fictional prices/dates, alternate routes and unsafe links',()=>{
 for(const patch of [{return_at:undefined},{price:0},{price:-5},{price:'123'},{price:Infinity},{departure_at:'2026-02-30'},{destination:'AAA'},{return_at:start}]) assert.equal(engine.normalizeFare({...fare,...patch},'IST','FCO'),null);
 const r=engine.normalizeFare({...fare,link:'https://evil.example/buy'},'IST','FCO');assert.equal(r.priceRoundTripTry,1234.56);assert.equal(r.stops,undefined);assert.equal(r.durationMin,undefined);assert.equal(r.priceKind,'indicative');assert.equal(r.availabilityVerified,false);assert.match(r.deepLink,/^https:\/\/www.aviasales.com\/search\//);
 for(const link of ['javascript:alert(1)','https://aviasales.com@evil.example/','//evil.example/path','https://aviasales.com:444/path'])assert.equal(engine.safeLink(link,'safe'),'safe');
});
test('100 cities and five origins deduplicate shared airports to 485 free-only route queries',async t=>{
 const root=temp(t);let calls=0;
 const result=await engine.syncFlights({root,token:'test-only',intervalMs:0,wait:async()=>{},request:async value=>{const u=new URL(value);assert.equal(u.hostname,'api.travelpayouts.com');assert.equal(u.pathname,'/aviasales/v3/prices_for_dates');assert.equal(u.searchParams.get('one_way'),'false');assert.equal(u.searchParams.get('currency'),'try');calls++;return {success:true,data:[fare]};}});
 assert.equal(calls,485);assert.equal(result.stats.updated,485);assert.equal(new Set(Object.values(result.routes).flatMap(r=>r.cityIds)).size,100);assert.equal(engine.readCache(root).totalRoutes,485);
 assert.ok(engine.freshRoute('IST','FCO',start,end,root));assert.equal(engine.freshRoute('IST','FCO',start,start,root),null);assert.equal(engine.freshRoute('IST','FCO',start,end,root,Date.now()+13*3600000),null);
});
test('empty/error refreshes never turn old prices into freshly checked offers; live process lock prevents duplicate runs',async t=>{
 const root=temp(t), options={root,token:'test-only',cities:[{id:'rome',name:'Rome',iata:'FCO'}],origins:['IST'],intervalMs:0,wait:async()=>{}};
 await engine.syncFlights({...options,request:async()=>({data:[fare]})});
 const checked=engine.readCache(root).routes['IST-FCO'].updatedAt;
 const failed=await engine.syncFlights({...options,request:async()=>{throw Error('network');}});assert.equal(failed.routes['IST-FCO'].updatedAt,checked);assert.equal(failed.stats.errors,1);assert.equal(engine.isStale(failed),true);
 const empty=await engine.syncFlights({...options,request:async()=>({data:[]})});assert.equal(empty.totalRoutes,0);assert.equal(empty.stats.empty,1);
 fs.writeFileSync(path.join(root,'data','flight-sync.lock'),JSON.stringify({pid:process.pid,nonce:'test'}));await assert.rejects(engine.syncFlights({...options,request:async()=>({data:[]})}),/zaten çalışıyor/);
});
test('legacy estimated cache is discarded; rate-limit response stops without retrying or switching provider',async t=>{
 const root=temp(t);fs.mkdirSync(path.join(root,'data'));fs.writeFileSync(path.join(root,'data/daily_live_prices.json'),JSON.stringify({lastSync:new Date().toISOString(),routes:{'IST-FCO':fare}}));assert.equal(engine.readCache(root),null);
 let calls=0;const r=await engine.syncFlights({root,token:'test-only',intervalMs:0,wait:async()=>{},request:async()=>{calls++;const e=Error('limited');e.status=429;throw e;}});assert.ok(calls<=3);assert.ok(r.stats.skipped>0);assert.equal(r.stats.checked+r.stats.skipped,485);
});
test('schedule boundaries are noon and midnight in Europe/Istanbul',()=>{
 assert.equal(engine.nextScheduled(Date.parse('2026-10-23T08:59:59Z')),'2026-10-23T09:00:00.000Z');assert.equal(engine.nextScheduled(Date.parse('2026-10-23T09:00:00Z')),'2026-10-23T21:00:00.000Z');
});
test('city aliases are accepted only with the matching actual source airports',()=>{
 const f={...fare,origin:'ANK',destination:'ROM',origin_airport:'ESB',destination_airport:'FCO'};
 assert.ok(engine.normalizeFare(f,'ESB','FCO'));
 assert.equal(engine.normalizeFare({...f,origin_airport:'SAW'},'ESB','FCO'),null);
 assert.equal(engine.normalizeFare({...f,destination_airport:'CIA'},'ESB','FCO'),null);
 assert.equal(engine.normalizeFare({...fare,origin:'IST',origin_airport:'SAW'},'IST','FCO'),null);
});
test('free-only flight mode cannot consume SerpApi or switch to paid flight providers',async()=>{
 let calls=0;const load=createLoader({'../automation/flight-sync.cjs':{...engine,freshRoute:()=>null},'../server-utils':{cached:(_k,_t,fn)=>fn(),seeded:()=>()=>0.5,fetchJson:async value=>{calls++;assert.equal(new URL(value).hostname,'api.travelpayouts.com');return {data:[]};}}},{...process,env:{FLIGHT_PRICE_PROVIDER:'travelpayouts-data',TRAVELPAYOUTS_TOKEN:'test-only',SERPAPI_KEY:'test-only',RAPIDAPI_KEY:'test-only',KIWI_API_KEY:'test-only',AMADEUS_CLIENT_ID:'test-only',AMADEUS_CLIENT_SECRET:'test-only'}});
 const city=load('src/lib/cities.ts').CITIES[0];const result=await load('src/lib/providers/flights.ts').searchFlights(city,{code:'IST',factor:1},start,end,55,4);assert.equal(calls,1);assert.equal(result.live,false);assert.equal(result.flights.length,1);assert.ok(result.flights.every(f=>f.source==='ornek'));assert.match(result.flights[0].airline,/bütçesi tahmini/);assert.equal(result.flights[0].outbound.departure,start);assert.equal(result.flights[0].outbound.arrival,'');assert.equal(result.flights[0].outbound.flightNumber,undefined);assert.equal(result.flights[0].outbound.stops,-1);assert.equal(result.flights[0].inbound.departure,end);assert.equal(result.flights[0].inbound.arrival,'');
});
test('a scheduled exact-date offer enters the plan without another query; group links and indicative labels remain accurate',async()=>{
 const r=engine.normalizeFare({...fare,link:'https://www.aviasales.com/search/test-offer'},'IST','MAD');
 const load=createLoader({'../automation/flight-sync.cjs':{...engine,freshRoute:(o,d,s,e)=>o==='IST'&&d==='MAD'&&s===start&&e===end?r:null},'../server-utils':{cached:(_k,_t,fn)=>fn(),seeded:()=>()=>0.5,fetchJson:async()=>{throw Error('unexpected provider query');}}},{...process,env:{FLIGHT_PRICE_PROVIDER:'travelpayouts-data'}});
 const city=load('src/lib/cities.ts').CITIES.find(c=>c.id==='madrid'),{searchFlights}=load('src/lib/providers/flights.ts');
 const single=await searchFlights(city,{code:'IST',factor:1},start,end,55,1),group=await searchFlights(city,{code:'IST',factor:1},start,end,55,4);
 assert.equal(single.live,false);assert.equal(single.flights[0].priceKind,'indicative');assert.equal(single.flights[0].availabilityVerified,false);assert.equal(single.flights[0].priceTry,1234.56);assert.equal(single.flights[0].link,r.deepLink);assert.notEqual(group.flights[0].link,r.deepLink);assert.match(group.flights[0].skyscannerUrl,/adultsv2=4/);assert.equal(group.flights[0].outbound.stops,-1);assert.match(group.flights[0].outbound.stopsDetail,/doğrulanmalı/);
});
test('anonymous sync status reads cannot trigger background provider requests, even with empty cache',async()=>{
 let calls=0;const load=createLoader({'@/lib/automation/sync-engine':{getLatestSyncedPrices:()=>null,isSyncStale:()=>true,syncAllDailyPrices:async()=>{calls++;throw Error('not allowed');}}});const response=await load('src/app/api/sync-prices/route.ts').GET(new Request('http://localhost/api/sync-prices'));assert.equal(response.status,200);assert.equal(calls,0);
});
