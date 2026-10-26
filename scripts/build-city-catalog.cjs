const fs=require("node:fs"), path=require("node:path");
const {createLoader}=require("./test-helpers.cjs");
const research=path.resolve("data/city-expansion-research");
const baselineFile=path.join(research,"original-26.json");
if(!fs.existsSync(baselineFile)) {
  const original=createLoader()("src/lib/cities.ts").CITIES;
  if(original.length!==26) throw new Error("Original catalogue must contain 26 destinations");
  fs.writeFileSync(baselineFile,JSON.stringify(original,null,2));
}
const baseline=JSON.parse(fs.readFileSync(baselineFile,"utf8"));
const rows=require("../data/city-expansion-research/editorial-rows.json");
const countries=require("../data/city-expansion-research/country-profiles.json");
const pages=require("../data/city-expansion-research/place-index.json");
const oldCodes={belgrad:"rs",saraybosna:"ba",kotor:"me",uskup:"mk",tiflis:"ge",baku:"az",budapeste:"hu",prag:"cz",roma:"it",barselona:"es",paris:"fr",amsterdam:"nl",atina:"gr",viyana:"at",bangkok:"th",tokyo:"jp",tiran:"al",batum:"ge","sarm-el-seyh":"eg",semerkant:"uz",kisinev:"md",londra:"gb",berlin:"de",lizbon:"pt",bali:"id",dubai:"ae"};
const oldZones={belgrad:"Europe/Belgrade",saraybosna:"Europe/Sarajevo",kotor:"Europe/Podgorica",uskup:"Europe/Skopje",tiflis:"Asia/Tbilisi",baku:"Asia/Baku",budapeste:"Europe/Budapest",prag:"Europe/Prague",roma:"Europe/Rome",barselona:"Europe/Madrid",paris:"Europe/Paris",amsterdam:"Europe/Amsterdam",atina:"Europe/Athens",viyana:"Europe/Vienna",bangkok:"Asia/Bangkok",tokyo:"Asia/Tokyo",tiran:"Europe/Tirane",batum:"Asia/Tbilisi","sarm-el-seyh":"Africa/Cairo",semerkant:"Asia/Samarkand",kisinev:"Europe/Chisinau",londra:"Europe/London",dubai:"Asia/Dubai",berlin:"Europe/Berlin",lizbon:"Europe/Lisbon",bali:"Asia/Makassar"};
const emergency={gb:"999 / 112",kr:"Polis 112 · Ambulans/itfaiye 119",sg:"Polis 999 · Ambulans/itfaiye 995",my:"999",hk:"999",ph:"911",vn:"Polis 113 · İtfaiye 114 · Ambulans 115",kh:"Polis 117 · Ambulans 119",in:"112",lk:"Polis 119 · Ambulans 1990",np:"Polis 100 · Ambulans 102",qa:"999",ae:"Polis 999 · Ambulans 998",th:"Polis 191 · Turist polisi 1155 · Ambulans 1669",us:"911",ca:"911",au:"000",nz:"111",eg:"Polis 122 · Ambulans 123",za:"Cep telefonu 112 · Polis 10111",ke:"999 / 112"};
const officialVisa="https://www.mfa.gov.tr/turk-vatandaslarinin-tabi-oldugu-vize-uygulamalari.tr.mfa";
function point(title){const p=pages[title];if(!p?.coordinates?.[0]||p.pageprops?.disambiguation!==undefined)throw new Error(`Unverified place ${title}`);return {lat:p.coordinates[0].lat,lon:p.coordinates[0].lon};}
function wikiUrl(title){return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ","_"))}`;}
const catalog=baseline.map(c=>({...c,countryCode:oldCodes[c.id],timeZone:oldZones[c.id],bookingQuery:c.wiki.replaceAll("_"," "),flightSyncEnabled:true}));
for(const r of rows){
  const [country,currencyCode,visaType,foodEur,transportEur,hotelEur,flightEur,flightHours]=countries[r.countryCode];
  const flag=String.fromCodePoint(...r.countryCode.toUpperCase().split("").map(c=>127397+c.charCodeAt(0)));
  const visa=visaType==="schengen"?"Umuma mahsus pasaport için Schengen vizesi; pasaport türünüzü ve güncel koşulları resmî kaynaktan kontrol edin.":visaType==="vizesiz"?"Kısa turistik seyahatlerde vize muafiyeti; kalış süresi ve elektronik giriş/ön kayıt şartlarını resmî kaynaktan kontrol edin.":r.countryCode==="ke"?"Umuma mahsus pasaport için seyahat öncesi Kenya eTA onayını kontrol edin.":r.countryCode==="za"?"Pasaport türüne göre vize/varışta giriş koşullarını resmî kaynaktan kontrol edin.":"Umuma mahsus pasaport için vize/e-vize veya elektronik izin koşullarını seyahatten önce resmî kaynaktan kontrol edin.";
  const attractions=r.places.map((title,i)=>({id:`${r.id}-place-${i+1}`,name:title,description:`${r.name} gezisinde ${title} çevresini keşfedin. Bu durak dış alan/çevre yürüyüşüdür; yapı içi giriş, özel bölümler ve turlar ayrıca ücretli olabilir.`,...point(title),priceEur:0,hours:1.5,tags:i===1?["doga","fotograf"]:["tarih","fotograf"],sourceUrl:wikiUrl(pages[title].title)}));
  catalog.push({id:r.id,name:r.name,country,flag,iata:r.id==="phnom-penh"?"KTI":r.iata,...point(r.wiki),wiki:r.wiki,tagline:r.tagline,visa,visaType,visaSource:officialVisa,currencyCode,emergencyPhone:emergency[r.countryCode]||"112",foodEur,transportEur,hotelEur,flightEur,flightHours,tags:["tarih","fotograf","yemek"],attractions,countryCode:r.countryCode,timeZone:r.timeZone,bookingQuery:r.countryCode === "sg" || r.countryCode === "hk" ? r.wiki : `${r.wiki.replaceAll("_"," ")}, ${new Intl.DisplayNames(["en"], {type:"region"}).of(r.countryCode.toUpperCase())}`,flightSyncEnabled:false,guideSource:wikiUrl(pages[r.wiki].title),bookingSource:"https://www.booking.com/city.en-gb.html",guideNote:"Yemek, ulaşım ve uçuş tutarları planlama tahminidir. Gezi durakları dış alan yürüyüşü olarak hazırlanmıştır; giriş ücretleri ve saatleri resmî kaynakta ayrıca kontrol edilmelidir.",foodArea:{name:r.foodArea,...point(r.foodArea),sourceUrl:wikiUrl(pages[r.foodArea].title)}});
}
const verifiedBookingQueries={cenevre:"Geneva",cork:"Cork",munih:"Munich","abu-dabi":"Abu Dhabi"};
for(const city of catalog){if(verifiedBookingQueries[city.id])city.bookingQuery=verifiedBookingQueries[city.id];city.flightSyncEnabled=true;}
if(catalog.length!==100||new Set(catalog.map(c=>c.id)).size!==100)throw new Error("Expected 100 unique destinations");
for(const c of catalog)new Intl.DateTimeFormat("tr-TR",{timeZone:c.timeZone}).format();
fs.mkdirSync("src/lib/data",{recursive:true});
fs.writeFileSync("src/lib/data/destinations.json",JSON.stringify(catalog,null,2)+"\n");
fs.writeFileSync("data/cities_coords.json",JSON.stringify(catalog.map(({id,name,country,flag,iata,lat,lon,timeZone,countryCode})=>({id,name,country,flag,iata,lat,lon,timeZone,countryCode})),null,2)+"\n");
console.log(JSON.stringify({destinations:catalog.length,newDestinations:rows.length,verifiedNewStops:rows.length*3,originalIdsPreserved:baseline.every((c,i)=>catalog[i].id===c.id)}));
