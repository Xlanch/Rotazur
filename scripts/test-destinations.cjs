const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createLoader}=require("./test-helpers.cjs");
const load=createLoader(),{CITIES}=load("src/lib/cities.ts");
const {normalizeBookingResults}=load("src/lib/providers/booking-serp.ts");
const {hotelCoordinates,hotelQuoteIsFresh,hotelTotal}=load("src/lib/hotel-data.ts");
const START="2026-11-22",END="2026-11-26";
function temp(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),"rotazur-destinations-"));t.after(()=>{assert.equal(path.dirname(root),os.tmpdir());fs.rmSync(root,{recursive:true,force:true});});return root;}
function fixture(city,start=START,end=END,adults=2,rooms=1,device="desktop",total=6000){return {search_metadata:{status:"Success",processed_at:new Date().toISOString()},search_parameters:{engine:"booking",check_in_date:start,check_out_date:end,adults,rooms,currency:"TRY",device},properties:[{property_id:1234,name:"Test hotel",address:"Test source street address",link:`https://www.booking.com/hotel/${city.countryCode}/test.html?checkin=${start}&checkout=${end}&group_adults=${adults}&no_rooms=${rooms}&group_children=0`,currency:"TRY",extracted_price:total,gps_coordinates:{latitude:city.lat,longitude:city.lon},thumbnail:"https://cf.bstatic.com/test.jpg"}]};}
function archive(root,city){const folder=path.join(root,"data/booking-snapshots");fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,"manifest.json"),JSON.stringify({version:1,mode:"once"}));const record={version:1,cityId:city.id,hotels:normalizeBookingResults(fixture(city),city,START,END,2,1)};fs.writeFileSync(path.join(folder,city.id+".json"),JSON.stringify(record));return {record,folder};}

test("100 unique destinations retain the original route IDs and have country, timezone, airport, image and map coverage",()=>{
 assert.equal(CITIES.length,100);assert.equal(new Set(CITIES.map(c=>c.id)).size,100);
 const {ZONES}=require("../src/lib/weather/met-client.cjs"),{bookingCountryCode}=load("src/lib/hotel-location.ts"),{CITY_IMAGE_MAP}=load("src/lib/providers/images.ts");
 const airports=require("../src/lib/data/airports.json");
 for(const c of CITIES){assert.match(c.id,/^[a-z0-9-]+$/);assert.match(c.countryCode,/^[a-z]{2}$/);assert.equal(bookingCountryCode(c.id),c.countryCode);assert.equal(ZONES[c.id],c.timeZone);new Intl.DateTimeFormat("tr-TR",{timeZone:c.timeZone}).format();assert.ok(airports.some(a=>a.iata_code===c.iata));assert.ok(CITY_IMAGE_MAP[c.id]);assert.ok(c.attractions.length>=3);for(const a of c.attractions){assert.ok(Number.isFinite(a.lat)&&Number.isFinite(a.lon));}}
 for(const id of ["belgrad","saraybosna","kotor","uskup","tiflis","baku","budapeste","prag","roma","barselona","paris","amsterdam","atina","viyana","bangkok","tokyo","tiran","batum","sarm-el-seyh","semerkant","kisinev","londra","berlin","lizbon","bali","dubai"])assert.ok(CITIES.find(c=>c.id===id));
});

test("all 74 additions use real source points for food/photo/ideas/day trips and preserve their actual currency",()=>{
 const discovery=load("src/lib/providers/city-discovery.ts"),tools=load("src/lib/providers/city-tools.ts"),{getCityRestaurants}=load("src/lib/providers/restaurants.ts");
 const {CITY_CLIMATE_GUIDES}=load("src/lib/weather/city-climate.ts");
 const added=CITIES.filter(c=>c.guideSource);assert.equal(added.length,74);
 for(const c of added){assert.equal(tools.getCityCurrencyInfo(c).code,c.currencyCode);const points=[...c.attractions,c.foodArea];for(const p of [...discovery.getPhotoSpots(c),...discovery.getSpontaneousIdeas(c)])assert.ok(points.some(a=>a.lat===p.lat&&a.lon===p.lon),c.id);assert.ok(discovery.getNearbyDayTrips(c).length);assert.equal(discovery.getAirportTransfers(c).airportCode,c.iata);assert.equal(discovery.getAirportTransfers(c).estimated,true);assert.equal(discovery.getShoppingAndTaxFree(c).taxFree.verified,false);assert.equal(discovery.getConnectivityInfo(c).estimated,true);assert.ok(CITY_CLIMATE_GUIDES[c.id]);for(const r of getCityRestaurants(c,55)){assert.equal(r.reviews,0);assert.equal(r.rating,0);assert.match(r.tip,/bölgesi/);}}
});

test("the one-time catalogue contains validated source hotels for every destination and never marks stored prices as live",()=>{
 const snapshots=load("src/lib/booking-snapshots.ts");assert.equal(snapshots.bookingImportMode(),true);let hotels=0,locations=0;
 for(const c of CITIES){const list=snapshots.importedBookingHotels(c,START,END,2,55);assert.ok(list.length>0&&list.length<=25,c.id);for(const h of list){assert.equal(h.bookingQuote.kind,"snapshot");assert.equal(hotelQuoteIsFresh(h,Date.parse(h.bookingQuote.checkedAt)),false);assert.match(h.name,/\S/);assert.match(h.image,/^https:\/\/[^/]*bstatic\.com\//);assert.equal(hotelTotal(h,4),h.bookingQuote.knownTotalTry);if(hotelCoordinates(h))locations++;}hotels+=list.length;}assert.ok(hotels>=2000);assert.ok(locations>=2000);
});

test("five nights, different dates/occupancy or a different device cannot reuse the four-night Booking price",t=>{
 const root=temp(t),city=CITIES.find(c=>c.id==="madrid");archive(root,city);const isolated=createLoader({}, {...process,cwd:()=>root});const {importedBookingHotels}=isolated("src/lib/booking-snapshots.ts");
 for(const [start,end,adults,device] of [[START,"2026-11-27",2,"desktop"],["2026-12-01","2026-12-05",2,"desktop"],[START,END,4,"desktop"],[START,END,2,"mobile"]]){
   const [h]=importedBookingHotels(city,start,end,adults,55,{device});assert.ok(h);assert.equal(h.bookingQuote,undefined);assert.equal(h.bookingCatalog.hotelId,1234);assert.ok(hotelCoordinates(h));const u=new URL(h.bookingUrl);assert.equal(u.searchParams.get("checkin"),start);assert.equal(u.searchParams.get("checkout"),end);assert.equal(u.searchParams.get("group_adults"),String(adults));assert.equal(hotelTotal(h,5),Math.round(city.hotelEur*55*Math.ceil(adults/2))*5);assert.notEqual(hotelTotal(h,5),6000);
 }
});

test("changed searches call the Booking provider with the requested stay and group; matching imported searches spend no query",async t=>{
 const root=temp(t),city=CITIES.find(c=>c.id==="madrid");archive(root,city);let calls=0;
 const env={HOTEL_PRICE_PROVIDER:"booking-serpapi",SERPAPI_KEY:"test-only-key"};
 const isolated=createLoader({"../server-utils":{...load("src/lib/server-utils.ts"),cached:(_k,_ttl,fn)=>fn(),fetchJson:async url=>{calls++;const q=new URL(url).searchParams;assert.equal(q.get("check_out_date"),"2026-11-27");assert.equal(q.get("adults"),"4");assert.equal(q.get("rooms"),"2");return fixture(city,START,"2026-11-27",4,2,"desktop",12345.67);}}},{...process,cwd:()=>root,env});
 const {searchHotels}=isolated("src/lib/providers/hotels.ts");const initial=await searchHotels(city,START,END,2,55);assert.equal(calls,0);assert.equal(initial.live,false);assert.equal(initial.hotels[0].bookingQuote.knownTotalTry,6000);
 const changed=await searchHotels(city,START,"2026-11-27",4,55);assert.equal(calls,1);assert.equal(changed.live,true);assert.equal(changed.hotels[0].bookingQuote.knownTotalTry,12345.67);assert.equal(changed.hotels[0].bookingQuote.checkout,"2026-11-27");assert.equal(changed.hotels[0].bookingQuote.adults,4);
});

test("provider/quota failure keeps real hotel identities and locations while clearly falling back to a budget estimate",async t=>{
 const root=temp(t),city=CITIES.find(c=>c.id==="madrid");archive(root,city);
 const isolated=createLoader({"../server-utils":{...load("src/lib/server-utils.ts"),cached:(_k,_ttl,fn)=>fn(),fetchJson:async()=>{throw Error("test-only quota reached");}}},{...process,cwd:()=>root,env:{HOTEL_PRICE_PROVIDER:"booking-serpapi",SERPAPI_KEY:"test-only-key"}});
 const result=await isolated("src/lib/providers/hotels.ts").searchHotels(city,START,"2026-11-27",2,55);assert.equal(result.live,false);assert.equal(result.hotels[0].id,"booking-1234");assert.equal(result.hotels[0].bookingQuote,undefined);assert.ok(result.hotels[0].bookingCatalog);assert.ok(hotelCoordinates(result.hotels[0]));
});

test("tampered property identity/country or city metadata cannot be restored as a Booking hotel",t=>{
 const root=temp(t),city=CITIES.find(c=>c.id==="madrid"),{record,folder}=archive(root,city);const {importedBookingHotels}=createLoader({}, {...process,cwd:()=>root})("src/lib/booking-snapshots.ts");
 for(const patch of [{id:"booking-9999"},{bookingUrl:"https://www.booking.com/hotel/fr/test.html"},{lat:0,lon:0},{hotelLocation:{...record.hotels[0].hotelLocation,cityId:"paris"}}]){fs.writeFileSync(path.join(folder,city.id+".json"),JSON.stringify({...record,hotels:[{...record.hotels[0],...patch}]}));assert.deepEqual(importedBookingHotels(city,START,END,2,55),[]);}
});

test("verified free-account throughput never removes the 200-search rolling monthly cap",t=>{
 const root=temp(t),folder=path.join(root,"data/booking-snapshots");fs.mkdirSync(folder,{recursive:true});const now=Date.now();
 fs.writeFileSync(path.join(folder,"account-allowance.json"),JSON.stringify({version:1,monthlyPrice:0,monthlyLimit:250,extraCredits:0,hourlyLimit:250,checkedAt:new Date(now).toISOString()}));
 const isolated=createLoader({}, {...process,cwd:()=>root});const {db}=isolated("src/lib/db.ts");try{const {reserveSerpApiSearch}=isolated("src/lib/provider-quota.ts");for(let i=0;i<200;i++)reserveSerpApiSearch(now);assert.throws(()=>reserveSerpApiSearch(now),/kotası/);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM provider_search_usage").get().n,200);}finally{db.close();}
});

test("paid, stale or unverified allowance files cannot raise the ordinary hourly search limit",t=>{
 for(const patch of [{monthlyPrice:1},{extraCredits:1},{checkedAt:new Date(Date.now()-7200000).toISOString()},{hourlyLimit:"250"}]){
  const root=temp(t),folder=path.join(root,"data/booking-snapshots");fs.mkdirSync(folder,{recursive:true});const now=Date.now();fs.writeFileSync(path.join(folder,"account-allowance.json"),JSON.stringify({version:1,monthlyPrice:0,monthlyLimit:250,extraCredits:0,hourlyLimit:250,checkedAt:new Date(now).toISOString(),...patch}));const isolated=createLoader({}, {...process,cwd:()=>root});const {db}=isolated("src/lib/db.ts");try{const {reserveSerpApiSearch}=isolated("src/lib/provider-quota.ts");for(let i=0;i<45;i++)reserveSerpApiSearch(now);assert.throws(()=>reserveSerpApiSearch(now),/kotası/);}finally{db.close();}
 }
});
