const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createLoader}=require('./test-helpers.cjs');
const engine=require('../src/lib/automation/flight-sync.cjs'),links=require('../src/lib/flight-links.cjs');
const load=createLoader(),{CITIES,ORIGINS}=load('src/lib/cities.ts');
const {importedBookingHotels}=load('src/lib/booking-snapshots.ts'),{hotelCoordinates,hotelTotal}=load('src/lib/hotel-data.ts');
const {hotelSearchRadiusKm}=load('src/lib/hotel-location.ts'),{haversineKm,addDays,todayIso}=load('src/lib/travel-utils.ts');
const START=addDays(todayIso(),30),END=addDays(START,5),ARCHIVE_START='2026-11-22',ARCHIVE_END='2026-11-26';
const fare={price:1234.56,airline:'TK',departure_at:START+'T10:00:00+03:00',return_at:END+'T15:00:00+03:00'};
function temp(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'rotazur-full-audit-'));t.after(()=>{assert.equal(path.dirname(root),os.tmpdir());fs.rmSync(root,{recursive:true,force:true});});return root;}

test('all 100 catalogues retain valid physical source points and correct budgets/links for 1/5/14 nights and 1/2/4/9 adults',()=>{
 let records=0,scenarios=0;
 for(const city of CITIES){
  const original=importedBookingHotels(city,ARCHIVE_START,ARCHIVE_END,2,55);assert.ok(original.length>0,city.id);records+=original.length;
  for(const h of original){assert.ok(haversineKm(city.lat,city.lon,h.lat,h.lon)<=hotelSearchRadiusKm(city.id));if(hotelCoordinates(h)){assert.equal(h.hotelLocation.cityId,city.id);assert.equal(h.hotelLocation.propertyId,h.bookingQuote.hotelId);}}
  for(const nights of [1,5,14])for(const adults of [1,2,4,9]){
   const end=addDays(START,nights),device=['desktop','mobile','tablet'][scenarios%3],hotels=importedBookingHotels(city,START,end,adults,55,{device});assert.equal(hotels.length,original.length,city.id);
   for(const h of hotels){assert.equal(h.bookingQuote,undefined);assert.ok(h.bookingCatalog);assert.equal(hotelTotal(h,nights),Math.round(city.hotelEur*55*Math.ceil(adults/2))*nights);const u=new URL(h.bookingUrl);assert.equal(u.searchParams.get('checkin'),START);assert.equal(u.searchParams.get('checkout'),end);assert.equal(u.searchParams.get('group_adults'),String(adults));assert.equal(u.searchParams.get('no_rooms'),String(Math.ceil(adults/2)));assert.equal(u.searchParams.get('selected_currency'),'TRY');assert.equal(h.hotelLocation?.lat,original.find(x=>x.id===h.id).hotelLocation?.lat);}
   scenarios++;
  }
 }
 assert.equal(scenarios,1200);assert.ok(records>=2400);
});

test('500 airport routes use exact requested dates and passenger links across 100 cities and 1/2/4/9 adults',async()=>{
 let calls=0;const boundary={...engine,freshRoute:()=>null};
 const isolated=createLoader({'../automation/flight-sync.cjs':boundary,'../server-utils':{cached:(_k,_t,fn)=>fn(),seeded:()=>()=>0.5,fetchJson:async value=>{calls++;const u=new URL(value);assert.equal(u.hostname,'api.travelpayouts.com');const p=u.searchParams;assert.equal(p.get('one_way'),'false');return {currency:'try',data:[{...fare,origin_airport:p.get('origin'),destination_airport:p.get('destination'),departure_at:p.get('departure_at')+'T10:00:00+03:00',return_at:p.get('return_at')+'T15:00:00+03:00'}]};}}},{...process,env:{TRAVELPAYOUTS_TOKEN:'test-only',FLIGHT_PRICE_PROVIDER:'travelpayouts-data'}});
 const {searchFlights}=isolated('src/lib/providers/flights.ts');
 for(const city of CITIES)for(const origin of ORIGINS)for(const adults of [1,2,4,9]){
  const r=await searchFlights(city,origin,START,END,55,adults);assert.equal(r.live,false);assert.equal(r.flights.length,1);const f=r.flights[0];assert.equal(f.outbound.from,origin.code);assert.equal(f.outbound.to,city.iata);assert.equal(f.outbound.departure.slice(0,10),START);assert.equal(f.inbound.departure.slice(0,10),END);assert.equal(f.priceTry,1234.56);assert.equal(f.pricedAdults,1);assert.equal(f.availabilityVerified,false);assert.equal(new URL(f.skyscannerUrl).searchParams.get('adultsv2'),String(adults));assert.ok(new URL(f.googleFlightsUrl).searchParams.get('q').includes(`for ${adults} adults`));
 }
 assert.equal(calls,2000);
});

test('expired/foreign-currency/one-way/over-14-night and malformed flight offers cannot become budget quotes',()=>{
 for(const patch of [{currency:'usd'},{expires_at:new Date(Date.now()-1000).toISOString()},{expires_at:'bad'},{found_at:new Date(Date.now()-49*3600000).toISOString()},{found_at:new Date(Date.now()+3600000).toISOString()},{one_way:true},{return_at:addDays(START,15)},{departure_at:START+'T25:00:00+03:00'}])assert.equal(engine.normalizeFare({...fare,...patch},'IST','FCO'),null,JSON.stringify(patch));
 for(const number of [NaN,Infinity,-1,100000])assert.equal(engine.normalizeFare({...fare,flight_number:number},'IST','FCO').flightNumber,undefined);
 const valid=engine.normalizeFare({...fare,flight_number:123,found_at:new Date(Date.now()-1000).toISOString(),expires_at:new Date(Date.now()+60000).toISOString()},'IST','FCO');assert.equal(valid.flightNumber,'123');assert.ok(valid.expiresAt);assert.ok(valid.foundAt);
});

test('expired prices are rejected from both persistent and memory caches without changing their collection time',t=>{
 const root=temp(t),now=Date.now(),r=engine.normalizeFare({...fare,expires_at:new Date(now+30000).toISOString()},'IST','FCO',now);fs.mkdirSync(path.join(root,'data'));
 fs.writeFileSync(path.join(root,'data/daily_live_prices.json'),JSON.stringify({version:3,provider:engine.PROVIDER,lastSync:new Date(now).toISOString(),routes:{'IST-FCO':r}}));
 assert.equal(engine.freshRoute('IST','FCO',START,END,root,now).updatedAt,new Date(now).toISOString());assert.equal(engine.freshRoute('IST','FCO',START,END,root,now+31000),null);
 const {normalizeRoundTripFlights}=load('src/lib/flight-utils.ts');assert.deepEqual(normalizeRoundTripFlights([{id:'old',source:'travelpayouts',priceTry:1234,outbound:{departure:START},inbound:{departure:END},expiresAt:new Date(now-1000).toISOString()}],START,END),[]);
});

test('city metadata and distance guards reject country/region results while allowing the actual city and island destinations',()=>{
 const city=CITIES.find(c=>c.id==='cenevre'),{normalizeBookingResults}=load('src/lib/providers/booking-serp.ts');
 const raw={search_metadata:{status:'Success',processed_at:new Date().toISOString()},search_parameters:{engine:'booking',check_in_date:START,check_out_date:END,adults:2,rooms:1,currency:'TRY'},search_information:{destination:'Cenevre'},properties:[{property_id:1234,name:'Test',currency:'TRY',extracted_price:1234,link:`https://www.booking.com/hotel/ch/test.html?checkin=${START}&checkout=${END}&group_adults=2&no_rooms=1`,gps_coordinates:{latitude:city.lat,longitude:city.lon}}]};
 assert.equal(normalizeBookingResults(raw,city,START,END,2,1).length,1);
 for(const destination of ['Lake Geneva','Geneva Canton','Lausanne'])assert.throws(()=>normalizeBookingResults({...raw,search_information:{destination}},city,START,END,2,1));
 raw.properties[0].gps_coordinates.latitude+=0.6;assert.deepEqual(normalizeBookingResults(raw,city,START,END,2,1),[]);assert.equal(hotelSearchRadiusKm('bali'),150);
});

test('flight years and passenger counts survive year rollover and distant-year search links',()=>{
 const now=Date.parse('2026-10-24T09:00:00Z');assert.match(links.aviasalesUrl('IST','MAD','2026-12-30','2027-01-04',4,now),/IST3012MAD04014$/);
 const distant=new URL(links.aviasalesUrl('IST','MAD','2030-01-14','2030-01-19',9,now));assert.equal(distant.hostname,'www.skyscanner.com.tr');assert.ok(distant.pathname.includes('/300114/300119/'));assert.equal(distant.searchParams.get('adultsv2'),'9');
});

test('comfort selection considers transfers on both legs, not only the outbound flight',()=>{
 const {selectTierOptions}=load('src/lib/planner/budget.ts');
 const one={id:'both-direct',priceTry:1000,outbound:{stops:0},inbound:{stops:0}},two={id:'return-transfer',priceTry:2000,outbound:{stops:0},inbound:{stops:2}};
 assert.equal(selectTierOptions([one,two],[],'konforlu').flight.id,'both-direct');
});

test('flight and hotel kuruş remain intact in total budgets and comfort-package estimates',()=>{
 const {computeBudget}=load('src/lib/planner/budget.ts'),{buildCityBudgetGuide}=load('src/lib/providers/restaurants.ts');const city=CITIES[0];
 const hotel={id:'test',pricePerNightTry:12591.28/5,bookingQuote:{hotelId:1,checkin:START,checkout:END,adults:9,rooms:5,currency:'TRY',displayTotalTry:12591.28,excludedTaxesTry:0,knownTotalTry:12591.28,checkedAt:new Date().toISOString()}};
 const b=computeBudget({flightPerPerson:1234.56,hotelPerNight:0,hotelTotalTry:12591.28,nights:5,rooms:5,travelers:9,dailyFood:0,dailyTransport:0,activitiesTotal:0,budget:50000});assert.equal(b.flight,11111.04);assert.equal(b.hotel,12591.28);assert.equal(b.total,23702.32);assert.equal(b.remaining,26297.68);
 const guide=buildCityBudgetGuide({city,nights:5,rooms:5,travelers:9,eurRate:55,flights:[{priceTry:1234.56,outbound:{stops:0}}],hotels:[hotel],activitiesTotalTry:0});
 for(const tier of ['tasarruflu','dengeli','konforlu']){const e=guide.tierTotalEstimates[tier];assert.equal(e.totalTripTry,computeBudget({flightPerPerson:1234.56,hotelPerNight:hotel.pricePerNightTry,hotelTotalTry:12591.28,nights:5,rooms:5,travelers:9,dailyFood:e.foodDailyTry,dailyTransport:e.transportDailyTry,airportTransferPerPerson:8*55,activitiesTotal:0,budget:0}).total);}
});

test('a changed stay discards old auxiliary links; Booking full dates override alternate date and occupancy flags',t=>{
 const root=temp(t),folder=path.join(root,'data/booking-snapshots');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify({version:1,mode:'once'}));const record=JSON.parse(fs.readFileSync('data/booking-snapshots/madrid.json'));record.hotels.forEach(h=>Object.assign(h,{agodaUrl:'https://www.agoda.com/old',tripUrl:'https://tr.trip.com/old',googleHotelsUrl:'https://www.google.com/old'}));fs.writeFileSync(path.join(folder,'madrid.json'),JSON.stringify(record));
 const restored=createLoader({},{...process,cwd:()=>root})('src/lib/booking-snapshots.ts').importedBookingHotels(CITIES.find(c=>c.id==='madrid'),START,END,4,55);assert.equal(restored[0].agodaUrl,undefined);assert.equal(restored[0].tripUrl,undefined);assert.equal(restored[0].googleHotelsUrl,undefined);
 const {bookingPropertyUrl}=load('src/lib/booking-context.ts');const u=new URL(bookingPropertyUrl(`https://www.booking.com/hotel/es/test.html?checkin=${START}&checkout=${END}&group_adults=4&no_rooms=2&checkin_year=2030&req_adults=1&flexible_date_search=1&selected_blocks=real-offer`,{checkin:START,checkout:END,adults:4,rooms:2}));for(const k of ['checkin_year','req_adults','flexible_date_search'])assert.equal(u.searchParams.has(k),false);assert.equal(u.searchParams.get('selected_blocks'),'real-offer');
});

test('estimated flexible dates contain no automatic discount or promised saving',async()=>{
 const f={id:'budget',source:'ornek',airline:'Budget',priceTry:1000,outbound:{departure:START,arrival:'',stops:-1,durationMin:0},inbound:{departure:END,arrival:'',stops:-1,durationMin:0}};
 const isolated=createLoader({'../providers/flights':{searchFlights:async()=>({flights:[f],live:false}),estimateFlightTry:()=>1000},'../providers/hotels':{searchHotels:async()=>({hotels:[],live:false})},'../providers/weather':{getWeather:async()=>null},'../providers/currency':{getRates:async()=>({EUR:55,USD:50,live:false})},'./gemini':{enhanceWithGemini:async()=>null}});
 const p=await isolated('src/lib/planner/index.ts').buildPlan({origin:'IST',destination:'madrid',startDate:START,endDate:END,travelers:2,budget:100000,comfort:'dengeli',interests:[]});assert.ok(p.flexDates.every(d=>d.priceTry===1000));
});
