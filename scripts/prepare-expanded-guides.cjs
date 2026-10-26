const fs=require("node:fs"),path=require("node:path");
const catalog=require("../src/lib/data/destinations.json");
const destinations=`Toledo, Spain|Como|Padua|Dachau|Heidelberg|Lübeck|Bruges|Howth|North Berwick|Chester|Chester|Stirling|Uppsala|Roskilde|Drøbak|Lucerne|Lausanne|Antibes|Delft|Þingvellir|Cobh|Clifden|Bangor, County Down|Woodstock, Oxfordshire|Bradford-on-Avon|Marstrand|Suwon|Pulau Ubin|Batu Caves|Lantau Island|Tagaytay|Ninh Bình|Củ Chi tunnels|Japanese Covered Bridge|Banteay Srei|Oudong|Elephanta Island|Agra|Amer, India|Negombo|Nuwara Eliya|Bhaktapur|Zubarah|Al Ain|Dubai|Ko Lan|Kota Tinggi|Nandi Hills, India|Ramoji Film City|Beacon, New York|Everglades National Park|Red Rock Canyon National Conservation Area|Niagara Falls, Ontario|Bowen Island|Quebec City|Montmorency Falls|Gatineau Park|Niagara-on-the-Lake|Sidney, British Columbia|Peggys Cove, Nova Scotia|Lake Louise, Alberta|Blue Mountains (New South Wales)|Geelong|Gold Coast, Queensland|Fremantle|Hahndorf, South Australia|Waiheke Island|Lower Hutt|Arrowtown|Akaroa|Giza|Stellenbosch|Umhlanga, KwaZulu-Natal|Nairobi National Park`.split("|");
const rows=catalog.filter(c=>c.guideSource);
const base=path.resolve("data/city-expansion-research");
async function json(url){const r=await fetch(url,{headers:{"User-Agent":"Rotazur/1.0 (https://rotazur.com/contact)"},signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error("Public guide metadata unavailable");return r.json();}
async function main(){
 if(destinations.length!==rows.length)throw Error("Daytrip count mismatch");
 let pages={};const titles=[...new Set(destinations)];
 for(let i=0;i<titles.length;i+=40){const cache=path.join(base,`daytrips-v3-${i}.json`);const d=fs.existsSync(cache)?JSON.parse(fs.readFileSync(cache,"utf8")):await json(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({action:"query",format:"json",formatversion:"2",redirects:"1",prop:"coordinates|pageprops",colimit:"max",titles:titles.slice(i,i+40).join("|")})}`);fs.writeFileSync(cache,JSON.stringify(d));for(const p of d.query?.pages||[])pages[p.title]=p;for(let n=0;n<3;n++)for(const a of [...d.query?.normalized||[],...d.query?.redirects||[]])if(pages[a.to])pages[a.from]=pages[a.to];}
 const noPoint=Object.values(pages).filter(p=>!p.coordinates?.length&&p.pageprops?.wikibase_item);
 if(noPoint.length){const ids=[...new Set(noPoint.map(p=>p.pageprops.wikibase_item))];const d=await json('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',format:'json',props:'claims',ids:ids.join('|')}));for(const p of noPoint){const v=d.entities?.[p.pageprops.wikibase_item]?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;if(v)p.coordinates=[{lat:v.latitude,lon:v.longitude}];}}
 const result={},missing=[];
 for(let i=0;i<rows.length;i++){const p=pages[destinations[i]];if(!p?.coordinates?.length||p.pageprops?.disambiguation!==undefined){missing.push({city:rows[i].id,title:destinations[i]});continue;}const v=p.coordinates[0];result[rows[i].id]={name:destinations[i],lat:v.lat,lon:v.lon,sourceUrl:`https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replaceAll(" ","_"))}`};}
 if(missing.length)throw Error(JSON.stringify({missing}));
 fs.writeFileSync("src/lib/data/day-trips.json",JSON.stringify(result,null,2)+"\n");
 const rateFile=path.join(base,"eur-rates.json");const rates=fs.existsSync(rateFile)?JSON.parse(fs.readFileSync(rateFile,"utf8")):await json("https://open.er-api.com/v6/latest/EUR");if(rates.result!=="success")throw Error("Reference rates unavailable");fs.writeFileSync(rateFile,JSON.stringify(rates));
 fs.writeFileSync("src/lib/data/currency-reference.json",JSON.stringify({source:"https://www.exchangerate-api.com/",checkedAt:rates.time_last_update_utc,rates:Object.fromEntries([...new Set(catalog.map(c=>c.currencyCode))].map(code=>[code,rates.rates[code]]))},null,2)+"\n");
 console.log(JSON.stringify({dayTrips:Object.keys(result).length,referenceCurrencies:new Set(catalog.map(c=>c.currencyCode)).size}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
