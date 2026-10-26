/* One-time editorial preparation. Public Wikimedia metadata only; no price API calls. */
const fs = require("node:fs");
const path = require("node:path");

// id | Turkish name | country code | airport | Wikipedia title | IANA zone | tagline | three real places | food area
const rows = `
madrid|Madrid|es|MAD|Madrid|Europe/Madrid|Meydanlar, sanat ve tapas kültürü|Plaza Mayor, Madrid;El Retiro Park;Puerta del Sol|Mercado de San Miguel
milano|Milano|it|MXP|Milan|Europe/Rome|Duomo, tasarım ve tarihi pasajlar|Milan Cathedral;Galleria Vittorio Emanuele II;Sforza Castle|Navigli
venedik|Venedik|it|VCE|Venice|Europe/Rome|Kanallar, köprüler ve lagün manzaraları|Piazza San Marco;Rialto Bridge;Grand Canal (Venice)|Rialto Bridge
munih|Münih|de|MUC|Munich|Europe/Berlin|Bavyera meydanları ve geniş şehir parkları|Marienplatz;Englischer Garten;Nymphenburg Palace|Viktualienmarkt
frankfurt|Frankfurt|de|FRA|Frankfurt|Europe/Berlin|Main kıyısında eski kent ve modern silüet|Römer;Eiserner Steg;Palmengarten|Kleinmarkthalle
hamburg|Hamburg|de|HAM|Hamburg|Europe/Berlin|Liman, tuğla depolar ve su yolları|Speicherstadt;Elbphilharmonie;St. Michael's Church, Hamburg|St. Pauli
bruksel|Brüksel|be|BRU|Brussels|Europe/Brussels|Büyük meydan, çizgi romanlar ve Belçika lezzetleri|Grand-Place;Atomium;Parc du Cinquantenaire|Place Sainte-Catherine
dublin|Dublin|ie|DUB|Dublin|Europe/Dublin|Liffey kıyısı, edebiyat ve canlı sokaklar|Trinity College Dublin;St Stephen's Green;Ha'penny Bridge|Temple Bar, Dublin
edinburgh|Edinburgh|gb|EDI|Edinburgh|Europe/London|Taş sokaklar ve tepeler üzerinde tarihi başkent|Edinburgh Castle;Royal Mile;Calton Hill|Grassmarket
manchester|Manchester|gb|MAN|Manchester|Europe/London|Müzik, sanayi mirası ve futbol kültürü|Manchester Cathedral;Science and Industry Museum;Castlefield|Northern Quarter (Manchester)
liverpool|Liverpool|gb|LPL|Liverpool|Europe/London|Mersey kıyısında liman ve müzik mirası|Royal Albert Dock, Liverpool;Liverpool Cathedral;Pier Head|Bold Street
glasgow|Glasgow|gb|GLA|Glasgow|Europe/London|Victorian mimari, müzeler ve sokak sanatı|Kelvingrove Art Gallery and Museum;Glasgow Cathedral;George Square|Merchant City
stockholm|Stockholm|se|ARN|Stockholm|Europe/Stockholm|Adalar, eski kent ve İskandinav tasarımı|Gamla stan;Stockholm City Hall;Djurgården|Östermalm
kopenhag|Kopenhag|dk|CPH|Copenhagen|Europe/Copenhagen|Renkli liman evleri ve bisikletli şehir hayatı|Nyhavn;Rosenborg Castle;The Little Mermaid (statue)|Torvehallerne
oslo|Oslo|no|OSL|Oslo|Europe/Oslo|Fiyort kıyısı, heykel parkı ve çağdaş mimari|Oslo Opera House;Frogner Park;Akershus Fortress|Mathallen Oslo
zurih|Zürih|ch|ZRH|Zürich|Europe/Zurich|Limmat kıyısı, göl ve eski kent sokakları|Grossmünster;Lindenhof hill;Bahnhofstrasse|Niederdorf
cenevre|Cenevre|ch|GVA|Geneva|Europe/Zurich|Göl kıyısında parklar ve uluslararası şehir hayatı|Jet d'Eau;St. Pierre Cathedral;Palace of Nations|Carouge
nice|Nice|fr|NCE|Nice|Europe/Paris|Akdeniz kordonu ve renkli eski kent|Promenade des Anglais;Place Masséna;Castle Hill, Nice|Cours Saleya
rotterdam|Rotterdam|nl|RTM|Rotterdam|Europe/Amsterdam|Modern mimari, köprüler ve liman kültürü|Erasmusbrug;Cube house;Markthal|Markthal
reykjavik|Reykjavik|is|KEF|Reykjavík|Atlantic/Reykjavik|Kuzey Atlantik kıyısında renkli evler ve tasarım|Hallgrímskirkja;Harpa (concert hall);The Sun Voyager|Laugavegur (Reykjavík)
cork|Cork|ie|ORK|Cork (city)|Europe/Dublin|Lee Nehri adalarında pazar ve şehir yaşamı|English Market;Saint Fin Barre's Cathedral;Elizabeth Fort|English Market
galway|Galway|ie|SNN|Galway|Europe/Dublin|Atlantik kıyısında sokak müziği ve tarihi mahalleler|Spanish Arch;Eyre Square;Galway Cathedral|Quay Street
belfast|Belfast|gb|BFS|Belfast|Europe/London|Tersane mirası, tarihi binalar ve kültür|Belfast City Hall;Titanic Belfast;Botanic Gardens (Belfast)|St George's Market
oxford|Oxford|gb|LHR|Oxford|Europe/London|Kolej avluları, kütüphaneler ve nehir yürüyüşleri|Radcliffe Camera;Bodleian Library;Christ Church Meadow|Covered Market, Oxford
bath|Bath|gb|BRS|Bath, Somerset|Europe/London|Roma mirası ve bal rengi Georgian sokaklar|Roman Baths (Bath);Royal Crescent;Pulteney Bridge|Green Park Station
goteborg|Göteborg|se|GOT|Gothenburg|Europe/Stockholm|Kanallar, ahşap evler ve İsveç kahve molaları|Haga, Gothenburg;Gothenburg Botanical Garden;Götaplatsen|Feskekörka
seul|Seul|kr|ICN|Seoul|Asia/Seoul|Saraylar, geleneksel sokaklar ve modern Kore|Gyeongbokgung;Bukchon Hanok Village;N Seoul Tower|Gwangjang Market
singapur|Singapur|sg|SIN|Singapore|Asia/Singapore|Bahçeler, körfez manzaraları ve hawker kültürü|Gardens by the Bay;Merlion;Singapore Botanic Gardens|Lau Pa Sat
kuala-lumpur|Kuala Lumpur|my|KUL|Kuala Lumpur|Asia/Kuala_Lumpur|Gökdelenler ve çok kültürlü pazar sokakları|Petronas Towers;Merdeka Square, Kuala Lumpur;KLCC Park|Central Market, Kuala Lumpur
hong-kong|Hong Kong|hk|HKG|Hong Kong|Asia/Hong_Kong|Körfez silüeti, tramvaylar ve yamaç mahalleleri|Victoria Peak;Tsim Sha Tsui Promenade;Tian Tan Buddha|Temple Street, Hong Kong
manila|Manila|ph|MNL|Manila|Asia/Manila|Tarihi surlar, körfez ve Filipin şehir yaşamı|Intramuros;Rizal Park;Fort Santiago|Binondo
hanoi|Hanoi|vn|HAN|Hanoi|Asia/Ho_Chi_Minh|Eski mahalleler, göller ve Vietnam mutfağı|Hoàn Kiếm Lake;Temple of Literature, Hanoi;Old Quarter, Hanoi|Đồng Xuân Market
ho-chi-minh|Ho Chi Minh|vn|SGN|Ho Chi Minh City|Asia/Ho_Chi_Minh|Tarihi yapılar, pazarlar ve hareketli bulvarlar|Saigon Central Post Office;Saigon Notre-Dame Cathedral;Independence Palace|Bến Thành Market
da-nang|Da Nang|vn|DAD|Da Nang|Asia/Ho_Chi_Minh|Nehir köprüleri ve Vietnam'ın sahil yaşamı|Dragon Bridge (Da Nang);Marble Mountains (Vietnam);Museum of Cham Sculpture|Hàn Market
siem-reap|Siem Reap|kh|SAI|Siem Reap|Asia/Phnom_Penh|Angkor'un kapısında Khmer kültürü ve pazarlar|Angkor Wat;Angkor National Museum;Wat Preah Prom Rath|Old Market (Siem Reap)
phnom-penh|Phnom Penh|kh|PNH|Phnom Penh|Asia/Phnom_Penh|Mekong kıyısında saraylar ve Khmer başkenti|Royal Palace of Cambodia;Wat Phnom;Independence Monument, Phnom Penh|Central Market, Phnom Penh
mumbai|Mumbai|in|BOM|Mumbai|Asia/Kolkata|Deniz kıyısı, kolonyal mimari ve Hint sineması|Gateway of India;Chhatrapati Shivaji Terminus;Marine Drive, Mumbai|Colaba Causeway
yeni-delhi|Yeni Delhi|in|DEL|New Delhi|Asia/Kolkata|Anıtsal bulvarlar ve çok katmanlı tarih|India Gate;Humayun's Tomb;Lodhi Gardens|Chandni Chowk
jaipur|Jaipur|in|JAI|Jaipur|Asia/Kolkata|Pembe kentte saraylar ve Rajasthan el sanatları|Hawa Mahal;City Palace, Jaipur;Jantar Mantar, Jaipur|Johari Bazaar
kolombo|Kolombo|lk|CMB|Colombo|Asia/Colombo|Hint Okyanusu kıyısında pazarlar ve tapınaklar|Galle Face Green;Gangaramaya Temple;Independence Memorial Hall|Pettah, Sri Lanka
kandy|Kandy|lk|CMB|Kandy|Asia/Colombo|Göl kıyısında Sri Lanka kültürü ve yeşil tepeler|Temple of the Tooth;Kandy Lake;Royal Botanical Gardens, Peradeniya|Kandy City Centre
katmandu|Katmandu|np|KTM|Kathmandu|Asia/Kathmandu|Tarihi meydanlar ve Himalaya kültürünün kapısı|Kathmandu Durbar Square;Swayambhunath;Boudhanath|Thamel
doha|Doha|qa|DOH|Doha|Asia/Qatar|Körfez kıyısı, çarşılar ve çağdaş müzeler|Souq Waqif;Museum of Islamic Art, Doha;Doha Corniche|Souq Waqif
abu-dabi|Abu Dabi|ae|AUH|Abu Dhabi|Asia/Dubai|Beyaz kubbeler, sahil kordonu ve kültür adası|Sheikh Zayed Grand Mosque;Louvre Abu Dhabi;Qasr Al Watan|Abu Dhabi Corniche
sharjah|Sharjah|ae|SHJ|Sharjah|Asia/Dubai|Müzeler, pazarlar ve Körfez kültürü|Sharjah Museum of Islamic Civilization;Al Noor Mosque;Al Majaz|Central Souq, Sharjah
pattaya|Pattaya|th|UTP|Pattaya|Asia/Bangkok|Tayland körfezinde plajlar ve ahşap mimari|Sanctuary of Truth;Jomtien Beach;Pattaya Beach|Pattaya Floating Market
johor-bahru|Johor Bahru|my|JHB|Johor Bahru|Asia/Kuala_Lumpur|Tarihi sokaklar ve Malezya'nın güney kapısı|Sultan Abu Bakar State Mosque;Johor Bahru Old Chinese Temple;Istana Besar|Jalan Tan Hiok Nee
bengaluru|Bengaluru|in|BLR|Bengaluru|Asia/Kolkata|Bahçeler ve çağdaş Hindistan'ın teknoloji kenti|Lalbagh;Cubbon Park;Bangalore Palace|Commercial Street, Bangalore
haydarabad|Haydarabad|in|HYD|Hyderabad|Asia/Kolkata|Dekkan mimarisi, çarşılar ve baharatlı mutfak|Charminar;Golconda Fort;Hussain Sagar|Laad Bazaar
new-york|New York|us|JFK|New York City|America/New_York|Parklar, gökdelenler ve mahalle kültürleri|Central Park;Brooklyn Bridge;Times Square|Chelsea Market
miami|Miami|us|MIA|Miami|America/New_York|Art Deco cepheler ve Atlantik sahilleri|Ocean Drive (Miami Beach);Bayfront Park;Wynwood|Little Havana
las-vegas|Las Vegas|us|LAS|Las Vegas|America/Los_Angeles|Çölün ortasında ışıklar ve büyük gösteriler|Las Vegas Strip;Fremont Street Experience;Fountains of Bellagio|Downtown Las Vegas
toronto|Toronto|ca|YYZ|Toronto|America/Toronto|Ontario kıyısında gökdelenler ve çok kültürlü mahalleler|CN Tower;Distillery District;Toronto Islands|St. Lawrence Market
vancouver|Vancouver|ca|YVR|Vancouver|America/Vancouver|Okyanus, orman ve dağlar arasında şehir gezisi|Stanley Park;Granville Island;Gastown|Granville Island Public Market
montreal|Montreal|ca|YUL|Montreal|America/Toronto|Eski liman ve Fransızca yaşayan mahalleler|Old Montreal;Mount Royal;Notre-Dame Basilica (Montreal)|Jean-Talon Market
quebec|Québec|ca|YQB|Quebec City|America/Toronto|Surlu eski kent ve Saint Lawrence manzaraları|Château Frontenac;Old Quebec;Plains of Abraham|Quartier Petit Champlain
ottawa|Ottawa|ca|YOW|Ottawa|America/Toronto|Kanallar, parklar ve Kanada'nın başkenti|Parliament Hill;Rideau Canal;National Gallery of Canada|ByWard Market
niagara|Niagara Falls|ca|YYZ|Niagara Falls, Ontario|America/Toronto|Şelale kıyısı ve Ontario manzaraları|Horseshoe Falls;Queen Victoria Park;Clifton Hill, Niagara Falls|Clifton Hill, Niagara Falls
victoria|Victoria|ca|YYJ|Victoria, British Columbia|America/Vancouver|Vancouver Adası'nda liman ve bahçeler|British Columbia Parliament Buildings;Royal British Columbia Museum;Beacon Hill Park|Chinatown, Victoria
halifax|Halifax|ca|YHZ|Halifax, Nova Scotia|America/Halifax|Atlantik limanında denizcilik mirası ve yürüyüşler|Halifax Citadel;Halifax Public Gardens;Maritime Museum of the Atlantic|Halifax Seaport Farmers' Market
banff|Banff|ca|YYC|Banff, Alberta|America/Edmonton|Rocky Dağları'nda kasaba ve doğa yürüyüşleri|Banff Avenue;Bow Falls;Banff Park Museum|Banff Avenue
sidney|Sidney|au|SYD|Sydney|Australia/Sydney|Liman, sahiller ve Avustralya'nın simge mimarisi|Sydney Opera House;Sydney Harbour Bridge;Royal Botanic Garden, Sydney|The Rocks, New South Wales
melbourne|Melbourne|au|MEL|Melbourne|Australia/Melbourne|Kahve kültürü, pasajlar ve nehir kıyısı|Federation Square;Royal Botanic Gardens Victoria;Flinders Street railway station|Queen Victoria Market
brisbane|Brisbane|au|BNE|Brisbane|Australia/Brisbane|Nehir kıyısında parklar ve subtropikal şehir hayatı|South Bank Parklands;Story Bridge;City Botanic Gardens|South Bank, Queensland
perth|Perth|au|PER|Perth|Australia/Perth|Swan Nehri ve batı kıyısının açık havası|Kings Park, Western Australia;Elizabeth Quay;Fremantle Markets|Fremantle Markets
adelaide|Adelaide|au|ADL|Adelaide|Australia/Adelaide|Parklarla çevrili merkez ve pazar kültürü|Adelaide Central Market;Adelaide Botanic Garden;Victoria Square, Adelaide|Adelaide Central Market
auckland|Auckland|nz|AKL|Auckland|Pacific/Auckland|Limanlar, volkan tepeleri ve Yeni Zelanda şehir hayatı|Sky Tower (Auckland);Auckland War Memorial Museum;Mount Eden|Viaduct Harbour
wellington|Wellington|nz|WLG|Wellington|Pacific/Auckland|Rüzgârlı liman kentinde sanat ve yürüyüşler|Museum of New Zealand Te Papa Tongarewa;Wellington Cable Car;Wellington Botanic Garden|Cuba Street, Wellington
queenstown|Queenstown|nz|ZQN|Queenstown, New Zealand|Pacific/Auckland|Wakatipu Gölü kıyısında dağ manzaraları|Queenstown Gardens;Lake Wakatipu;Queenstown Hill|Queenstown, New Zealand
christchurch|Christchurch|nz|CHC|Christchurch|Pacific/Auckland|Bahçe kentinde nehir kıyısı ve yeniden doğan merkez|Christchurch Botanic Gardens;Hagley Park;Christchurch Transitional Cathedral|Riverside Market, Christchurch
kahire|Kahire|eg|CAI|Cairo|Africa/Cairo|Nil kıyısı, tarihi çarşılar ve büyük müzeler|Egyptian Museum;Khan el-Khalili;Cairo Citadel|Khan el-Khalili
cape-town|Cape Town|za|CPT|Cape Town|Africa/Johannesburg|Masa Dağı eteklerinde kıyılar ve renkli mahalleler|Table Mountain;Victoria & Alfred Waterfront;Bo-Kaap|Victoria & Alfred Waterfront
durban|Durban|za|DUR|Durban|Africa/Johannesburg|Hint Okyanusu kıyısında plajlar ve baharat kültürü|Golden Mile, Durban;Durban Botanic Gardens;Moses Mabhida Stadium|Victoria Street Market
nairobi|Nairobi|ke|NBO|Nairobi|Africa/Nairobi|Yeşil parklar ve Doğu Afrika'nın şehir yaşamı|Nairobi National Museum;Uhuru Park;Karura Forest|City Market, Nairobi
`.trim().split("\n").map(line => {
  const [id,name,countryCode,iata,wiki,timeZone,tagline,places,foodArea] = line.split("|");
  return {id,name,countryCode,iata,wiki,timeZone,tagline,places:places.split(";"),foodArea};
});

const countries = {
  es:["İspanya","EUR","schengen",40,8,120,240,4.5], it:["İtalya","EUR","schengen",42,8,145,220,3],
  de:["Almanya","EUR","schengen",42,10,125,230,3.3], be:["Belçika","EUR","schengen",45,9,130,240,3.5],
  ie:["İrlanda","EUR","vize",55,10,165,290,4.5], gb:["Birleşik Krallık","GBP","vize",50,12,140,270,4],
  se:["İsveç","SEK","schengen",55,12,145,280,4], dk:["Danimarka","DKK","schengen",65,12,160,280,3.5],
  no:["Norveç","NOK","schengen",65,12,160,290,4], ch:["İsviçre","CHF","schengen",70,13,185,270,3],
  fr:["Fransa","EUR","schengen",48,8,140,260,3.5], nl:["Hollanda","EUR","schengen",48,10,145,250,3.5],
  is:["İzlanda","ISK","schengen",70,14,180,450,7], kr:["Güney Kore","KRW","vizesiz",30,6,100,650,10],
  sg:["Singapur","SGD","vizesiz",35,8,150,650,11], my:["Malezya","MYR","vizesiz",22,5,65,600,11],
  hk:["Hong Kong","HKD","vizesiz",40,9,140,650,10], ph:["Filipinler","PHP","vizesiz",22,5,65,650,12],
  vn:["Vietnam","VND","vize",20,5,55,650,10], kh:["Kamboçya","KHR","vize",22,5,55,700,12],
  in:["Hindistan","INR","vize",22,5,65,450,7], lk:["Sri Lanka","LKR","vize",22,5,60,500,8],
  np:["Nepal","NPR","vize",20,5,50,550,8], qa:["Katar","QAR","vizesiz",40,7,110,350,4.5],
  ae:["Birleşik Arap Emirlikleri","AED","vize",45,8,120,320,4.5], th:["Tayland","THB","vizesiz",25,6,70,550,10],
  us:["ABD","USD","vize",65,13,200,700,12], ca:["Kanada","CAD","vize",55,12,160,750,12],
  au:["Avustralya","AUD","vize",55,12,160,1000,21], nz:["Yeni Zelanda","NZD","vize",55,12,160,1100,23],
  eg:["Mısır","EGP","vize",22,5,70,250,2.5], za:["Güney Afrika","ZAR","vize",30,7,90,650,11],
  ke:["Kenya","KES","vize",25,6,80,550,7],
};

const UA = "Rotazur/1.0 (https://rotazur.com/contact; editorial city metadata)";
const fixes = {
  "El Retiro Park":"Buen Retiro Park", "Navigli":"Porta Ticinese", "Kleinmarkthalle":"Römer",
  "Torvehallerne":"Nyhavn", "Mathallen Oslo":"Aker Brygge", "Niederdorf":"Altstadt (Zürich)",
  "Castle Hill, Nice":"Château de Nice", "Cours Saleya":"Place Masséna",
  "Tsim Sha Tsui Promenade":"Avenue of Stars, Hong Kong", "Saigon Notre-Dame Cathedral":"Notre-Dame Cathedral Basilica of Saigon",
  "Hàn Market":"Dragon Bridge (Da Nang)", "Wat Preah Prom Rath":"Angkor Thom", "Johari Bazaar":"Hawa Mahal",
  "Abu Dhabi Corniche":"Corniche (Abu Dhabi)", "Central Souq, Sharjah":"Al Majaz",
  "Jalan Tan Hiok Nee":"Johor Bahru Old Chinese Temple", "Ocean Drive (Miami Beach)":"Ocean Drive (South Beach)",
  "Quartier Petit Champlain":"Petit Champlain", "Banff Avenue":"Banff railway station",
  "Christchurch Transitional Cathedral":"Cardboard Cathedral", "Riverside Market, Christchurch":"Cashel Street",
  "Victoria Street Market":"uShaka Marine World", "City Market, Nairobi":"Nairobi National Museum",
  "Old Quarter, Hanoi":"St. Joseph's Cathedral, Hanoi", "Al Noor Mosque":"Al Noor Mosque (Sharjah)",
  "Lalbagh":"Lal Bagh", "St. Lawrence Market":"St. Lawrence Market South",
  "Hagley Park":"Hagley Park, Christchurch", "Golden Mile, Durban":"Durban City Hall",
};
for (const row of rows) { row.places=row.places.map(t=>fixes[t]||t); row.foodArea=fixes[row.foodArea]||row.foodArea; }
const out = path.resolve("data/city-expansion-research");
fs.mkdirSync(out,{recursive:true});
function plain(html) { return String(html || "").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim(); }
async function json(url) {
  const r=await fetch(url,{headers:{"User-Agent":UA},signal:AbortSignal.timeout(30000)});
  if (!r.ok) throw new Error(`Public metadata HTTP ${r.status}`);
  return r.json();
}
async function main() {
  if (rows.length!==74 || new Set(rows.map(x=>x.id)).size!==74) throw new Error("Expected exactly 74 unique additions");
  const titles=[...new Set(rows.flatMap(r=>[r.wiki,...r.places,r.foodArea]))];
  let pages={};
  for(let i=0;i<titles.length;i+=40) {
    const cache=path.join(out,`wiki-v3-${i}.json`);
    let response;
    if(fs.existsSync(cache)) response=JSON.parse(fs.readFileSync(cache,"utf8"));
    else {
      const q=new URLSearchParams({action:"query",format:"json",formatversion:"2",redirects:"1",prop:"coordinates|pageimages|pageprops",coprimary:"primary",colimit:"max",piprop:"thumbnail|name",pithumbsize:"1000",titles:titles.slice(i,i+40).join("|")});
      response=await json(`https://en.wikipedia.org/w/api.php?${q}`);
      fs.writeFileSync(cache,JSON.stringify(response,null,2));
    }
    for(const p of response.query?.pages||[]) pages[p.title]=p;
    const aliases=[...(response.query?.normalized||[]),...(response.query?.redirects||[])];
    for(let k=0;k<4;k++) for(const a of aliases) if(pages[a.to]) pages[a.from]=pages[a.to];
    console.log(`Public city/place metadata ${Math.min(i+40,titles.length)}/${titles.length}`);
  }
  const qids=[...new Set(Object.values(pages).filter(p=>!p.coordinates?.length&&p.pageprops?.wikibase_item).map(p=>p.pageprops.wikibase_item))];
  for(let i=0;i<qids.length;i+=40) {
    const cache=path.join(out,`wikidata-v3-${i}.json`);
    const response=fs.existsSync(cache)?JSON.parse(fs.readFileSync(cache,"utf8")):await json(`https://www.wikidata.org/w/api.php?${new URLSearchParams({action:"wbgetentities",format:"json",props:"claims",ids:qids.slice(i,i+40).join("|")})}`);
    if(!fs.existsSync(cache))fs.writeFileSync(cache,JSON.stringify(response));
    for(const p of Object.values(pages)) {
      const id=p.pageprops?.wikibase_item;
      const point=response.entities?.[id]?.claims?.P625?.find(c=>c.mainsnak?.datavalue?.value?.globe==="http://www.wikidata.org/entity/Q2")?.mainsnak.datavalue.value;
      if(!p.coordinates?.length&&point) p.coordinates=[{lat:point.latitude,lon:point.longitude,source:`https://www.wikidata.org/wiki/${id}`}];
    }
  }
  const problems=[];
  for(const r of rows) for(const title of [r.wiki,...r.places,r.foodArea]) {
    const p=pages[title];
    if(!p || p.missing || !p.coordinates?.length) problems.push({city:r.id,title,missing:!!p?.missing,coordinates:!!p?.coordinates?.length});
  }
  fs.writeFileSync(path.join(out,"place-index.json"),JSON.stringify(pages,null,2));
  fs.writeFileSync(path.join(out,"editorial-rows.json"),JSON.stringify(rows,null,2));
  fs.writeFileSync(path.join(out,"country-profiles.json"),JSON.stringify(countries,null,2));
  fs.writeFileSync(path.join(out,"unresolved.json"),JSON.stringify(problems,null,2));
  console.log(JSON.stringify({cities:rows.length,places:titles.length,unresolved:problems}));
}
main().catch(()=>{console.error("Public metadata preparation failed; no price provider was called.");process.exitCode=1;});
