const fs=require("node:fs"),path=require("node:path");
const rows=require("../data/city-expansion-research/editorial-rows.json"), pages=require("../data/city-expansion-research/place-index.json");
const base=path.resolve("data/city-expansion-research");
const plain=html=>String(html||"").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();
async function json(url){const r=await fetch(url,{headers:{"User-Agent":"Rotazur/1.0 (https://rotazur.com/contact)"},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error("Public asset metadata unavailable");return r.json();}
async function main(){
 const imageTitles=[...new Set(rows.flatMap(r=>[r.wiki,...r.places].map(t=>pages[t]?.pageimage)).filter(Boolean))];let metadata={};
 for(let i=0;i<imageTitles.length;i+=40){
   const cache=path.join(base,`commons-v2-${i}.json`);
   const q=new URLSearchParams({action:"query",format:"json",formatversion:"2",prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"1000",titles:imageTitles.slice(i,i+40).map(t=>"File:"+t).join("|")});
   const response=fs.existsSync(cache)?JSON.parse(fs.readFileSync(cache,"utf8")):await json(`https://commons.wikimedia.org/w/api.php?${q}`);
   fs.writeFileSync(cache,JSON.stringify(response));
   for(const p of response.query?.pages||[])metadata[p.title.replace(/^File:/,"").replaceAll("_"," ")]=p.imageinfo?.[0];
 }
 const images={};
 for(const r of rows){const p=[r.wiki,...r.places].map(t=>pages[t]).find(p=>{const i=metadata[p?.pageimage?.replaceAll("_"," ")];return i?.thumburl&&i.extmetadata?.Artist?.value&&/CC|Public domain|PD|PDM/i.test(plain(i.extmetadata?.LicenseShortName?.value));});const info=metadata[p?.pageimage?.replaceAll("_"," ")],m=info?.extmetadata;
   if(!info?.thumburl||!m?.LicenseShortName?.value||!m?.Artist?.value)throw Error(`Missing image provenance ${r.id}`);
   const license=plain(m.LicenseShortName.value);
   if(!/CC|Public domain|PD|PDM/i.test(license))throw Error(`Unsupported image license ${r.id}`);
   images[r.id]={url:info.thumburl,city:r.name,wiki:r.wiki,author:plain(m.Artist.value),license,licenseUrl:plain(m.LicenseUrl?.value)||info.descriptionurl,source:info.descriptionurl,credit:plain(m.Credit?.value),title:p.pageimage};
 }
 fs.writeFileSync("src/lib/data/city-images.json",JSON.stringify(images,null,2)+"\n");
 const csvFile=path.join(base,"airports.csv");
 if(!fs.existsSync(csvFile)){const r=await fetch("https://davidmegginson.github.io/ourairports-data/airports.csv",{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error("Airport data unavailable");fs.writeFileSync(csvFile,await r.text());}
 console.log(JSON.stringify({cityImages:Object.keys(images).length,licenseRecords:Object.keys(images).length,airportCsvDownloaded:true}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
